// 军团相册后端服务器
// 提供图片上传、列表查询、审核管理功能

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const OpenCC = require('opencc-js'); // 繁简转换

// 物品数据库模块
const itemsDb = require('./db/itemsDb.cjs');
const itemsRouter = require('./routes/items.cjs');
const syncItems = require('./jobs/syncItems.cjs');

const app = express();
const PORT = 3001;
const TOOLS_CONFIG_PATH = path.join(__dirname, '../public/data/tools_config.json');
const DEFAULT_RIFT_CONFIG = {
  enabled: true,
  timezone: 'Asia/Shanghai',
  intervalHours: 3,
  durationMinutes: 60,
  doorOpenMinutes: 5,
  openTimes: ['02:00', '05:00', '08:00', '11:00', '14:00', '17:00', '20:00', '23:00']
};
const RIFT_CACHE_TTL = 60 * 1000;
let cachedRiftInfo = null;
let cachedRiftTimestamp = 0;

function ensureToolsConfigDefaults(config = {}) {
  return {
    rift: normalizeRiftConfig(config?.rift),
    tools: Array.isArray(config?.tools) ? config.tools : []
  };
}

function readToolsConfigFile() {
  try {
    if (fs.existsSync(TOOLS_CONFIG_PATH)) {
      const raw = fs.readFileSync(TOOLS_CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return ensureToolsConfigDefaults(parsed);
    }
  } catch (error) {
    console.error('[ToolsConfig] 读取配置失败:', error);
  }

  return ensureToolsConfigDefaults();
}

function normalizeRiftConfig(riftConfig = {}) {
  const merged = {
    ...DEFAULT_RIFT_CONFIG,
    ...(riftConfig || {})
  };

  let sanitizedTimes = merged.openTimes;
  if (!Array.isArray(sanitizedTimes) || !sanitizedTimes.length) {
    sanitizedTimes = DEFAULT_RIFT_CONFIG.openTimes;
  }

  sanitizedTimes = sanitizedTimes
    .filter(time => typeof time === 'string')
    .map(time => {
      const [h = '00', m = '00'] = time.split(':');
      const hours = String(Number(h) || 0).padStart(2, '0');
      const minutes = String(Number(m) || 0).padStart(2, '0');
      return `${hours}:${minutes}`;
    });

  return {
    enabled: merged.enabled !== false,
    timezone: merged.timezone || DEFAULT_RIFT_CONFIG.timezone,
    intervalHours: Number(merged.intervalHours) || DEFAULT_RIFT_CONFIG.intervalHours,
    durationMinutes: Number(merged.durationMinutes) || DEFAULT_RIFT_CONFIG.durationMinutes,
    doorOpenMinutes: Number(merged.doorOpenMinutes) || DEFAULT_RIFT_CONFIG.doorOpenMinutes,
    openTimes: sanitizedTimes
  };
}

function buildRiftDate(now, dayOffset, totalMinutes) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function formatCountdownData(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}小时`);
  }
  if (minutes > 0 || hours > 0) {
    parts.push(`${minutes}分`);
  }
  parts.push(`${seconds}秒`);

  return {
    hours,
    minutes,
    seconds,
    formatted: parts.join('')
  };
}

function formatDisplayDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

function buildRiftPayload(riftConfig = {}) {
  const config = normalizeRiftConfig(riftConfig);

  if (!config.enabled) {
    return {
      enabled: false,
      config,
      allOpenTimes: config.openTimes
    };
  }

  const now = new Date();
  const validOpenTimes = config.openTimes
    .map((time) => {
      const [hourStr = '0', minuteStr = '0'] = time.split(':');
      const hours = Number(hourStr);
      const minutes = Number(minuteStr);

      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
      }

      return {
        time,
        minutes: hours * 60 + minutes
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.minutes - b.minutes);

  if (!validOpenTimes.length) {
    return {
      enabled: false,
      config: { ...config, enabled: false },
      allOpenTimes: DEFAULT_RIFT_CONFIG.openTimes
    };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let nextSlot = validOpenTimes.find(slot => slot.minutes > currentMinutes);
  let dayOffset = 0;

  if (!nextSlot) {
    nextSlot = validOpenTimes[0];
    dayOffset = 1;
  }

  const nextOpenDate = buildRiftDate(now, dayOffset, nextSlot.minutes);
  const countdownSeconds = Math.max(0, Math.floor((nextOpenDate.getTime() - now.getTime()) / 1000));

  return {
    enabled: true,
    config,
    nextOpenTime: nextOpenDate.toISOString(),
    nextOpenTimeFormatted: formatDisplayDate(nextOpenDate),
    countdownSeconds,
    countdown: formatCountdownData(countdownSeconds),
    currentTime: now.toISOString(),
    allOpenTimes: config.openTimes
  };
}

// 初始化繁简转换器（繁体转简体）
const converter = OpenCC.Converter({ from: 'tw', to: 'cn' });

// 初始化物品数据库
itemsDb.initDatabase();
syncItems.setConverter(converter);

// ============= 定时任务状态管理 =============
let syncInterval = null;
let syncIntervalHours = 4; // 默认4小时
let lastSyncTime = null;
let isSyncing = false;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../public/images/gallery')));

// 注册物品数据库路由
app.use('/api/items', itemsRouter);

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../public/images/gallery');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substring(2, 11);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片格式：JPG, PNG, GIF, WEBP'));
    }
  }
});

// 数据库文件路径（使用 JSON 文件作为简单数据库）
const dbPath = path.join(__dirname, 'gallery.json');

// 读取数据库
const readDB = () => {
  if (!fs.existsSync(dbPath)) {
    return [];
  }
  try {
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取数据库失败:', error);
    return [];
  }
};

// 写入数据库
const writeDB = (data) => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('写入数据库失败:', error);
    return false;
  }
};

// ==================== API 接口 ====================

// 1. 图片上传接口
app.post('/api/gallery/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const { isAdmin } = req.body; // 前端传递是否为管理员
    const images = readDB();

    const newImage = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      showOnHome: false,
      approved: isAdmin === 'true', // 管理员上传默认通过
      uploadTime: new Date().toISOString()
    };

    images.push(newImage);
    writeDB(images);

    res.json({
      success: true,
      message: '上传成功',
      data: newImage
    });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ error: '上传失败: ' + error.message });
  }
});

// 2. 获取图片列表接口
app.get('/api/gallery/list', (req, res) => {
  try {
    const { approved, showOnHome } = req.query;
    let images = readDB();

    // 筛选已审核的图片（普通用户）
    if (approved === 'true') {
      images = images.filter(img => img.approved === true);
    }

    // 筛选首页展示的图片
    if (showOnHome === 'true') {
      images = images.filter(img => img.showOnHome === true && img.approved === true);
    }

    res.json({
      success: true,
      data: images
    });
  } catch (error) {
    console.error('获取列表失败:', error);
    res.status(500).json({ error: '获取列表失败: ' + error.message });
  }
});

// 3. 审核图片接口（管理员）
app.post('/api/gallery/approve/:id', (req, res) => {
  try {
    const { id } = req.params;
    const images = readDB();

    const index = images.findIndex(img => img.id === id);
    if (index === -1) {
      return res.status(404).json({ error: '图片不存在' });
    }

    images[index].approved = true;
    writeDB(images);

    res.json({
      success: true,
      message: '审核通过',
      data: images[index]
    });
  } catch (error) {
    console.error('审核失败:', error);
    res.status(500).json({ error: '审核失败: ' + error.message });
  }
});

// 4. 设置首页展示接口（管理员）
app.post('/api/gallery/toggle-home/:id', (req, res) => {
  try {
    const { id } = req.params;
    const images = readDB();

    const index = images.findIndex(img => img.id === id);
    if (index === -1) {
      return res.status(404).json({ error: '图片不存在' });
    }

    images[index].showOnHome = !images[index].showOnHome;
    writeDB(images);

    res.json({
      success: true,
      message: images[index].showOnHome ? '已设为首页展示' : '已取消首页展示',
      data: images[index]
    });
  } catch (error) {
    console.error('设置失败:', error);
    res.status(500).json({ error: '设置失败: ' + error.message });
  }
});

// 5. 删除图片接口（管理员）
app.delete('/api/gallery/:id', (req, res) => {
  try {
    const { id } = req.params;
    const images = readDB();

    const index = images.findIndex(img => img.id === id);
    if (index === -1) {
      return res.status(404).json({ error: '图片不存在' });
    }

    const image = images[index];

    // 删除文件
    const filePath = path.join(uploadDir, image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 从数据库删除
    images.splice(index, 1);
    writeDB(images);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除失败:', error);
    res.status(500).json({ error: '删除失败: ' + error.message });
  }
});

// ==================== 成员配置 API ====================

// 成员数据库文件路径
const membersDbPath = path.join(__dirname, '../public/data/members.json');

// 读取成员数据库
const readMembersDB = () => {
  if (!fs.existsSync(membersDbPath)) {
    return [];
  }
  try {
    const data = fs.readFileSync(membersDbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取成员数据库失败:', error);
    return [];
  }
};

// 写入成员数据库
const writeMembersDB = (data) => {
  try {
    // 确保目录存在
    const dir = path.dirname(membersDbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(membersDbPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('写入成员数据库失败:', error);
    return false;
  }
};

// 1. 获取所有成员配置
app.get('/api/members', (req, res) => {
  try {
    const members = readMembersDB();
    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    console.error('获取成员列表失败:', error);
    res.status(500).json({ error: '获取成员列表失败: ' + error.message });
  }
});

// 2. 保存所有成员配置（批量保存）
app.post('/api/members', (req, res) => {
  try {
    const members = req.body;

    if (!Array.isArray(members)) {
      return res.status(400).json({ error: '数据格式错误：需要数组' });
    }

    const success = writeMembersDB(members);

    if (success) {
      // 为每个成员创建文件夹
      members.forEach(member => {
        const memberDir = path.join(__dirname, '../public/data', member.id);
        if (!fs.existsSync(memberDir)) {
          fs.mkdirSync(memberDir, { recursive: true });
          console.log(`✓ 创建成员文件夹: ${member.id}`);
        }
      });

      res.json({
        success: true,
        message: '成员配置保存成功'
      });
    } else {
      res.status(500).json({ error: '保存失败' });
    }
  } catch (error) {
    console.error('保存成员配置失败:', error);
    res.status(500).json({ error: '保存失败: ' + error.message });
  }
});

// 3. 更新单个成员配置
app.put('/api/members/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updatedMember = req.body;
    const members = readMembersDB();

    const index = members.findIndex(m => m.id === id);
    if (index === -1) {
      return res.status(404).json({ error: '成员不存在' });
    }

    members[index] = { ...members[index], ...updatedMember };
    const success = writeMembersDB(members);

    if (success) {
      res.json({
        success: true,
        data: members[index]
      });
    } else {
      res.status(500).json({ error: '更新失败' });
    }
  } catch (error) {
    console.error('更新成员配置失败:', error);
    res.status(500).json({ error: '更新失败: ' + error.message });
  }
});

// 4. 删除成员
app.delete('/api/members/:id', (req, res) => {
  try {
    const { id } = req.params;
    const members = readMembersDB();

    const index = members.findIndex(m => m.id === id);
    if (index === -1) {
      return res.status(404).json({ error: '成员不存在' });
    }

    // 删除成员数据文件夹
    const memberDir = path.join(__dirname, '../public/data', id);
    console.log(`[删除成员] 准备删除文件夹: ${memberDir}`);
    console.log(`[删除成员] __dirname: ${__dirname}`);

    if (fs.existsSync(memberDir)) {
      try {
        // 递归删除文件夹及其所有内容
        fs.rmSync(memberDir, { recursive: true, force: true });
        console.log(`✓ 成功删除成员文件夹: ${id}`);
        console.log(`✓ 删除路径: ${memberDir}`);
      } catch (error) {
        console.error(`❌ 删除成员文件夹失败 (${id}):`, error);
        // 继续执行，即使文件夹删除失败也要删除配置
      }
    } else {
      console.warn(`⚠️  成员文件夹不存在: ${memberDir}`);
    }

    // 从配置中删除成员
    members.splice(index, 1);
    const success = writeMembersDB(members);

    if (success) {
      res.json({
        success: true,
        message: '删除成功'
      });
    } else {
      res.status(500).json({ error: '删除失败' });
    }
  } catch (error) {
    console.error('删除成员失败:', error);
    res.status(500).json({ error: '删除失败: ' + error.message });
  }
});

// ==================== 申请管理 API ====================

// 申请数据库文件路径
const applicationsDbPath = path.join(__dirname, '../public/data/applications.json');

// 读取申请数据库
const readApplicationsDB = () => {
  if (!fs.existsSync(applicationsDbPath)) {
    return [];
  }
  try {
    const data = fs.readFileSync(applicationsDbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取申请数据库失败:', error);
    return [];
  }
};

// 写入申请数据库
const writeApplicationsDB = (data) => {
  try {
    // 确保目录存在
    const dir = path.dirname(applicationsDbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(applicationsDbPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('写入申请数据库失败:', error);
    return false;
  }
};

// 1. 获取所有申请
app.get('/api/applications', (req, res) => {
  try {
    const applications = readApplicationsDB();
    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error('获取申请列表失败:', error);
    res.status(500).json({ error: '获取申请列表失败: ' + error.message });
  }
});

// 2. 提交新申请
app.post('/api/applications', (req, res) => {
  try {
    const application = req.body;
    const applications = readApplicationsDB();

    // 生成 ID 和时间戳
    const newApplication = {
      ...application,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };

    applications.push(newApplication);
    const success = writeApplicationsDB(applications);

    if (success) {
      res.json({
        success: true,
        data: newApplication
      });
    } else {
      res.status(500).json({ error: '提交失败' });
    }
  } catch (error) {
    console.error('提交申请失败:', error);
    res.status(500).json({ error: '提交失败: ' + error.message });
  }
});

// 3. 审核申请（通过/拒绝）
app.put('/api/applications/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNote } = req.body;
    const applications = readApplicationsDB();

    const index = applications.findIndex(a => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: '申请不存在' });
    }

    applications[index] = {
      ...applications[index],
      status,
      reviewedAt: new Date().toISOString(),
      reviewNote
    };

    const success = writeApplicationsDB(applications);

    if (success) {
      res.json({
        success: true,
        data: applications[index]
      });
    } else {
      res.status(500).json({ error: '审核失败' });
    }
  } catch (error) {
    console.error('审核申请失败:', error);
    res.status(500).json({ error: '审核失败: ' + error.message });
  }
});

// 4. 删除申请
app.delete('/api/applications/:id', (req, res) => {
  try {
    const { id } = req.params;
    const applications = readApplicationsDB();

    const index = applications.findIndex(a => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: '申请不存在' });
    }

    applications.splice(index, 1);
    const success = writeApplicationsDB(applications);

    if (success) {
      res.json({
        success: true,
        message: '删除成功'
      });
    } else {
      res.status(500).json({ error: '删除失败' });
    }
  } catch (error) {
    console.error('删除申请失败:', error);
    res.status(500).json({ error: '删除失败: ' + error.message });
  }
});

// ============= 全局配置管理 API =============

const configDbPath = path.join(__dirname, 'config.json');

// 读取全局配置
const readConfigDB = () => {
  try {
    if (fs.existsSync(configDbPath)) {
      const data = fs.readFileSync(configDbPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('读取配置文件失败:', error);
  }
  // 返回默认配置
  return {
    voiceChannelUrl: '',
    voiceChannelName: '军团语音',
    voiceChannelDescription: '点击加入我们的语音频道',
    defaultServerId: 1001,  // 默认服务器：希埃尔
    defaultServerName: '希埃爾'
  };
};

// 写入全局配置
const writeConfigDB = (config) => {
  try {
    fs.writeFileSync(configDbPath, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('写入配置文件失败:', error);
    return false;
  }
};

// 1. 获取全局配置
app.get('/api/config', (req, res) => {
  try {
    const config = readConfigDB();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({ error: '获取配置失败: ' + error.message });
  }
});

// 2. 更新全局配置
app.put('/api/config', (req, res) => {
  try {
    const config = req.body;
    const success = writeConfigDB(config);

    if (success) {
      res.json({
        success: true,
        message: '配置更新成功',
        data: config
      });
    } else {
      res.status(500).json({ error: '更新失败' });
    }
  } catch (error) {
    console.error('更新配置失败:', error);
    res.status(500).json({ error: '更新失败: ' + error.message });
  }
});

// ==================== 角色信息代理 API ====================

// 代理角色信息请求(解决CORS问题)
app.get('/api/character/info', (req, res) => {
  const { characterId, serverId } = req.query;

  if (!characterId || !serverId) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  // characterId 已经是编码过的,直接使用
  const url = `https://tw.ncsoft.com/aion2/api/character/info?lang=en&characterId=${characterId}&serverId=${serverId}`;

  https.get(url, (apiRes) => {
    let data = '';

    apiRes.on('data', (chunk) => {
      data += chunk;
    });

    apiRes.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        // 转换繁体为简体
        const simplifiedData = convertToSimplified(jsonData);
        res.json(simplifiedData);
      } catch (error) {
        console.error('解析API响应失败:', error);
        res.status(500).json({ error: '解析数据失败' });
      }
    });
  }).on('error', (error) => {
    console.error('请求角色API失败:', error);
    res.status(500).json({ error: '请求失败: ' + error.message });
  });
});

// 获取角色装备信息
app.get('/api/character/equipment', (req, res) => {
  const { characterId, serverId } = req.query;

  if (!characterId || !serverId) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  // characterId 已经是编码过的,直接使用
  const url = `https://tw.ncsoft.com/aion2/api/character/equipment?lang=en&characterId=${characterId}&serverId=${serverId}`;

  https.get(url, (apiRes) => {
    let data = '';

    apiRes.on('data', (chunk) => {
      data += chunk;
    });

    apiRes.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        // 转换繁体为简体
        const simplifiedData = convertToSimplified(jsonData);
        res.json(simplifiedData);
      } catch (error) {
        console.error('解析装备API响应失败:', error);
        res.status(500).json({ error: '解析数据失败' });
      }
    });
  }).on('error', (error) => {
    console.error('请求装备API失败:', error);
    res.status(500).json({ error: '请求失败: ' + error.message });
  });
});

// 搜索角色 - 通过角色名和服务器ID
app.get('/api/character/search', async (req, res) => {
  const { name, serverId, race } = req.query;

  if (!name || !serverId) {
    return res.status(400).json({ success: false, error: '缺少必要参数：角色名和服务器ID' });
  }

  try {
    const character = await searchCharacter(name, parseInt(serverId), race ? parseInt(race) : undefined);
    res.json({ success: true, character });
  } catch (error) {
    console.error('搜索角色失败:', error);
    res.json({ success: false, error: error.message });
  }
});

// 获取装备详情 - 按需请求单件装备的详细信息
app.get('/api/character/equipment-detail', (req, res) => {
  const { itemId, enchantLevel, characterId, serverId, slotPos } = req.query;

  console.log('[装备详情API] 接收到的参数:', { itemId, enchantLevel, characterId, serverId, slotPos });

  if (!itemId) {
    return res.status(400).json({ error: '缺少必要参数：itemId' });
  }

  // 检查是否提供了完整参数
  if (!enchantLevel || !characterId || !serverId || !slotPos) {
    console.warn('[装备详情API] 参数不完整，缺少:', {
      enchantLevel: !enchantLevel,
      characterId: !characterId,
      serverId: !serverId,
      slotPos: !slotPos
    });
  }

  // 构建装备详情API的URL - 必须提供完整参数
  const url = enchantLevel && characterId && serverId && slotPos
    ? `https://tw.ncsoft.com/aion2/api/character/equipment/item?id=${itemId}&enchantLevel=${enchantLevel}&characterId=${encodeURIComponent(characterId)}&serverId=${serverId}&slotPos=${slotPos}&lang=en`
    : `https://tw.ncsoft.com/aion2/api/character/equipment/item?id=${itemId}&lang=en`;

  console.log(`[装备详情API] 请求URL: ${url}`);

  https.get(url, (apiRes) => {
    let data = '';

    apiRes.on('data', (chunk) => {
      data += chunk;
    });

    apiRes.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        // 转换繁体为简体
        const simplifiedData = convertToSimplified(jsonData);
        res.json(simplifiedData);
      } catch (error) {
        console.error('解析装备详情API响应失败:', error);
        console.error('原始响应数据:', data);
        res.status(500).json({ error: '解析响应失败', rawData: data });
      }
    });
  }).on('error', (error) => {
    console.error('请求装备详情失败:', error);
    res.status(500).json({ error: '请求失败: ' + error.message });
  });
});

// 获取角色PVE评分 - 代理 aion-api.bnshive.com 的评分API
app.get('/api/character/rating', (req, res) => {
  const { characterId, serverId, refresh } = req.query;

  if (!characterId || !serverId) {
    return res.status(400).json({ error: '缺少必要参数：characterId 和 serverId' });
  }

  // 将 characterId 中的 = 转换为 %3D 进行URL编码
  const encodedCharacterId = characterId.replace(/=/g, '%3D');

  // 构建URL,如果有refresh参数则添加
  let url = `https://aion-api.bnshive.com/character/query?serverId=${serverId}&characterId=${encodedCharacterId}`;
  if (refresh === 'true') {
    url += '&refresh=true';
  }

  console.log(`[PVE评分API] 请求URL: ${url}`);

  https.get(url, (apiRes) => {
    let data = '';

    apiRes.on('data', (chunk) => {
      data += chunk;
    });

    apiRes.on('end', () => {
      try {
        // 检查响应是否为空或是错误消息
        if (!data || data.trim().startsWith('error code:')) {
          console.warn('PVE评分API返回错误:', data);
          return res.json({
            success: false,
            error: '评分服务暂时不可用'
          });
        }

        const jsonData = JSON.parse(data);

        // 提取评分数据
        if (jsonData.rating && jsonData.rating.scores) {
          res.json({
            success: true,
            rating: jsonData.rating
          });
        } else {
          res.json({
            success: false,
            error: '该角色暂无评分数据'
          });
        }
      } catch (error) {
        console.error('解析PVE评分API响应失败:', error);
        console.error('原始响应数据:', data);
        res.json({
          success: false,
          error: '评分服务暂时不可用'
        });
      }
    });
  }).on('error', (error) => {
    console.error('请求PVE评分API失败:', error);
    res.status(500).json({
      success: false,
      error: '请求评分数据失败: ' + error.message
    });
  });
});

// 获取守护力面板数据 - 代理官方API
app.get('/api/character/daevanion', (req, res) => {
  const { characterId, serverId, boardId } = req.query;

  if (!characterId || !serverId || !boardId) {
    return res.status(400).json({
      success: false,
      error: '缺少必要参数：characterId, serverId, boardId'
    });
  }

  // 官方API地址
  const url = `https://tw.ncsoft.com/aion2/api/character/daevanion/detail?lang=en&characterId=${encodeURIComponent(characterId)}&serverId=${serverId}&boardId=${boardId}`;

  console.log(`[守护力API] 请求面板 ${boardId}: ${url.substring(0, 100)}...`);

  https.get(url, (apiRes) => {
    let data = '';

    apiRes.on('data', (chunk) => {
      data += chunk;
    });

    apiRes.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        res.json({
          success: true,
          data: jsonData
        });
      } catch (error) {
        console.error(`解析守护力面板 ${boardId} 失败:`, error);
        res.json({
          success: false,
          error: '解析守护力数据失败'
        });
      }
    });
  }).on('error', (error) => {
    console.error(`请求守护力面板 ${boardId} 失败:`, error);
    res.status(500).json({
      success: false,
      error: '请求守护力数据失败: ' + error.message
    });
  });
});

// 保存守护力职业配置
app.put('/api/daevanion/config', (req, res) => {
  try {
    const config = req.body;

    // 验证配置格式
    if (!config || !config.classes || !Array.isArray(config.classes)) {
      return res.status(400).json({
        success: false,
        error: '配置格式错误'
      });
    }

    // 保存到配置文件
    const configPath = path.join(__dirname, '../public/data/class_board_mapping.json');

    // 确保目录存在
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // 写入配置文件
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    console.log('✓ 守护力职业配置已更新');

    res.json({
      success: true,
      message: '配置保存成功'
    });
  } catch (error) {
    console.error('保存守护力配置失败:', error);
    res.status(500).json({
      success: false,
      error: '保存失败: ' + error.message
    });
  }
});

// ==================== 成员数据保存 API ====================

// 保存成员角色信息
app.post('/api/members/:memberId/character', (req, res) => {
  try {
    const { memberId } = req.params;
    const characterData = req.body;

    // 确保成员文件夹存在
    const memberDir = path.join(__dirname, '../public/data', memberId);
    if (!fs.existsSync(memberDir)) {
      fs.mkdirSync(memberDir, { recursive: true });
    }

    // 保存角色信息
    const filePath = path.join(memberDir, 'character_info.json');
    fs.writeFileSync(filePath, JSON.stringify(characterData, null, 2), 'utf-8');

    console.log(`✓ 保存角色信息: ${memberId}`);

    res.json({
      success: true,
      message: '角色信息保存成功',
      path: `/data/${memberId}/character_info.json`
    });
  } catch (error) {
    console.error('保存角色信息失败:', error);
    res.status(500).json({ error: '保存失败: ' + error.message });
  }
});

// 保存成员装备详情
app.post('/api/members/:memberId/equipment', (req, res) => {
  try {
    const { memberId } = req.params;
    const equipmentData = req.body;

    // 确保成员文件夹存在
    const memberDir = path.join(__dirname, '../public/data', memberId);
    if (!fs.existsSync(memberDir)) {
      fs.mkdirSync(memberDir, { recursive: true });
    }

    // 保存装备详情
    const filePath = path.join(memberDir, 'equipment_details.json');
    fs.writeFileSync(filePath, JSON.stringify(equipmentData, null, 2), 'utf-8');

    console.log(`✓ 保存装备详情: ${memberId}`);

    res.json({
      success: true,
      message: '装备详情保存成功',
      path: `/data/${memberId}/equipment_details.json`
    });
  } catch (error) {
    console.error('保存装备详情失败:', error);
    res.status(500).json({ error: '保存失败: ' + error.message });
  }
});

// ==================== 定时任务管理 API ====================

/**
 * 解析角色URL，提取serverId和characterId
 */
function parseCharacterUrl(url) {
  try {
    const match = url.match(/\/characters\/(\d+)\/([^/\s]+)/);
    if (!match) return null;

    return {
      serverId: match[1],
      characterId: decodeURIComponent(match[2])
    };
  } catch (error) {
    console.error('解析URL失败:', error);
    return null;
  }
}

/**
 * 从API获取角色信息
 */
function fetchCharacterInfo(characterId, serverId) {
  return new Promise((resolve, reject) => {
    const url = `https://tw.ncsoft.com/aion2/api/character/info?lang=en&characterId=${encodeURIComponent(characterId)}&serverId=${serverId}`;

    https.get(url, (apiRes) => {
      let data = '';

      apiRes.on('data', (chunk) => {
        data += chunk;
      });

      apiRes.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          // 转换繁体为简体
          const simplifiedData = convertToSimplified(jsonData);
          resolve(simplifiedData);
        } catch (error) {
          reject(new Error('解析API响应失败'));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 从API获取角色装备列表
 */
function fetchCharacterEquipment(characterId, serverId) {
  return new Promise((resolve, reject) => {
    const url = `https://tw.ncsoft.com/aion2/api/character/equipment?lang=en&characterId=${encodeURIComponent(characterId)}&serverId=${serverId}`;

    https.get(url, (apiRes) => {
      let data = '';

      apiRes.on('data', (chunk) => {
        data += chunk;
      });

      apiRes.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          // 转换繁体为简体
          const simplifiedData = convertToSimplified(jsonData);
          resolve(simplifiedData);
        } catch (error) {
          reject(new Error('解析装备API响应失败'));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 从API获取角色PVE评分
 * @param {string} characterId - 角色ID
 * @param {number} serverId - 服务器ID
 * @param {boolean} forceRefresh - 是否强制刷新(用于同步成员数据时)
 */
function fetchCharacterRating(characterId, serverId, forceRefresh = false) {
  return new Promise((resolve, reject) => {
    // 将 characterId 中的 = 转换为 %3D 进行URL编码
    const encodedCharacterId = characterId.replace(/=/g, '%3D');
    let url = `https://aion-api.bnshive.com/character/query?serverId=${serverId}&characterId=${encodedCharacterId}`;

    // 如果需要强制刷新,添加refresh参数
    if (forceRefresh) {
      url += '&refresh=true';
    }

    https.get(url, (apiRes) => {
      let data = '';

      apiRes.on('data', (chunk) => {
        data += chunk;
      });

      apiRes.on('end', () => {
        try {
          const jsonData = JSON.parse(data);

          // 提取评分数据
          if (jsonData.rating && jsonData.rating.scores) {
            resolve(jsonData.rating);
          } else {
            resolve(null); // 没有评分数据时返回null
          }
        } catch (error) {
          reject(new Error('解析评分API响应失败'));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 搜索角色 - 通过角色名和服务器ID获取characterId
 */
function searchCharacter(characterName, serverId, race) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      keyword: characterName,
      serverId: serverId.toString(),
      page: '1',
      size: '30'
    });

    if (race) {
      params.append('race', race.toString());
    }

    const url = `https://tw.ncsoft.com/aion2/api/search/aion2tw/search/v2/character?${params}`;

    // 设置10秒超时
    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error('搜索超时(10秒),请稍后重试'));
    }, 10000);

    const req = https.get(url, (apiRes) => {
      let data = '';

      apiRes.on('data', (chunk) => {
        data += chunk;
      });

      apiRes.on('end', () => {
        clearTimeout(timeout);
        try {
          const jsonData = JSON.parse(data);

          if (!jsonData.list || jsonData.list.length === 0) {
            reject(new Error(`未找到角色: ${characterName}`));
            return;
          }

          // 完全匹配: 在搜索结果中查找名字完全一致的角色
          const exactMatch = jsonData.list.find(char => {
            const cleanName = char.name.replace(/<[^>]*>/g, ''); // 移除HTML标签
            return cleanName === characterName;
          });

          if (!exactMatch) {
            reject(new Error(`未找到名为"${characterName}"的角色，请确认角色名称是否正确`));
            return;
          }

          const character = exactMatch;
          const cleanName = character.name.replace(/<[^>]*>/g, ''); // 移除HTML标签

          resolve({
            characterId: character.characterId,
            serverId: character.serverId,
            serverName: character.serverName || '', // API已经返回serverName
            name: cleanName,
            characterName: cleanName, // 同时提供 characterName 字段
            level: character.level,
            race: character.race,
            pcId: character.pcId
          });
        } catch (error) {
          clearTimeout(timeout);
          reject(new Error('解析搜索API响应失败'));
        }
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 获取单件装备的详细信息
 */
function fetchEquipmentDetail(itemId, enchantLevel, characterId, serverId, slotPos) {
  return new Promise((resolve, reject) => {
    // 添加时间戳防止API缓存,确保相同装备ID但不同slotPos时能获取到不同数据
    const timestamp = Date.now();
    const url = `https://tw.ncsoft.com/aion2/api/character/equipment/item?id=${itemId}&enchantLevel=${enchantLevel}&characterId=${encodeURIComponent(characterId)}&serverId=${serverId}&slotPos=${slotPos}&lang=en&_t=${timestamp}`;

    https.get(url, (apiRes) => {
      let data = '';

      apiRes.on('data', (chunk) => {
        data += chunk;
      });

      apiRes.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          // 转换繁体为简体
          const simplifiedData = convertToSimplified(jsonData);
          resolve(simplifiedData);
        } catch (error) {
          reject(new Error('解析装备详情API响应失败'));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 加载职业面板映射配置
 */
function loadClassBoardConfig() {
  const configPath = path.join(__dirname, '../public/data/class_board_mapping.json');
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error('[Daevanion] 加载职业面板映射配置失败:', error);
  }

  // 返回默认配置
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    classes: []
  };
}

/**
 * 根据职业中文名获取 classId（支持简繁体）
 * 通过配置文件中的 className 和 classNameSimplified 字段进行匹配
 */
function getClassIdByChineseName(className) {
  const config = loadClassBoardConfig();
  console.log(`  [Daevanion] 通过中文名查找classId: ${className}`);

  // 在配置中查找，支持繁体和简体匹配
  const classMapping = config.classes.find(c => {
    return c.className === className || c.classNameSimplified === className;
  });

  if (classMapping) {
    console.log(`  [Daevanion] 找到职业 ${className} 的classId: ${classMapping.classId}`);
    return classMapping.classId;
  } else {
    console.warn(`  [Daevanion] 未找到职业 ${className} 的配置`);
    return undefined;
  }
}

/**
 * 根据职业ID获取守护力面板ID列表
 */
function getBoardIdsByClassId(classId) {
  const config = loadClassBoardConfig();
  console.log(`  [Daevanion] 查找职业配置: classId=${classId}`);

  const classMapping = config.classes.find(c => c.classId === classId);

  if (classMapping) {
    console.log(`  [Daevanion] 找到职业ID ${classId}(${classMapping.className}) 的配置:`, classMapping.boardIds);
    return classMapping.boardIds;
  } else {
    console.warn(`  [Daevanion] 未找到职业ID ${classId} 的配置,返回空数组`);
    return [];
  }
}

/**
 * 获取单个守护力面板数据
 */
function fetchDaevanionBoard(characterId, serverId, boardId) {
  return new Promise((resolve, reject) => {
    const url = `https://tw.ncsoft.com/aion2/api/character/daevanion/detail?lang=en&characterId=${encodeURIComponent(characterId)}&serverId=${serverId}&boardId=${boardId}`;

    https.get(url, (apiRes) => {
      let data = '';

      apiRes.on('data', (chunk) => {
        data += chunk;
      });

      apiRes.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          // 转换繁体为简体
          const simplifiedData = convertToSimplified(jsonData);
          resolve(simplifiedData);
        } catch (error) {
          reject(new Error('解析守护力API响应失败'));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 获取角色所有守护力面板数据（6个面板）- 顺序请求避免官方API频率限制
 */
async function fetchDaevanionBoards(characterId, serverId, characterInfo) {
  try {
    console.log(`  [Daevanion] 开始获取守护力数据`);

    // 从角色信息中获取中文职业名
    const chineseClassName = characterInfo?.profile?.className;

    if (!chineseClassName) {
      console.log(`  [Daevanion] 角色信息中没有职业名称，跳过守护力数据获取`);
      return null;
    }

    // 通过中文职业名映射到 classId
    const classId = getClassIdByChineseName(chineseClassName);

    if (!classId) {
      console.log(`  [Daevanion] 无法映射职业名称 "${chineseClassName}" 到 classId`);
      return null;
    }

    // 根据职业ID获取对应的面板ID列表
    const boardIds = getBoardIdsByClassId(classId);
    console.log(`  [Daevanion] 职业: ${chineseClassName}, classId: ${classId}, 使用面板ID:`, boardIds);

    if (boardIds.length === 0) {
      console.log(`  [Daevanion] 未找到职业ID ${classId} 的面板配置`);
      return null;
    }

    // 顺序请求所有面板,避免官方API频率限制返回 "Server Error"
    const boards = [];
    for (const boardId of boardIds) {
      try {
        const result = await fetchDaevanionBoard(characterId, serverId, boardId);

        if (result) {
          console.log(`  [Daevanion] ✓ 面板 ${boardId} 数据获取成功`);
          boards.push(result);
        } else {
          console.log(`  [Daevanion] ✗ 面板 ${boardId} 数据为空`);
          boards.push(null);
        }

        // 每次请求后延迟600ms,避免触发API频率限制
        await delay(600);
      } catch (error) {
        console.log(`  [Daevanion] ✗ 面板 ${boardId} 获取失败: ${error.message}`);
        boards.push(null);
        await delay(600);
      }
    }

    console.log(`  [Daevanion] 守护力数据获取完成，成功获取 ${boards.filter(b => b).length}/${boardIds.length} 个面板`);
    return boards;
  } catch (error) {
    console.error(`  [Daevanion] 获取守护力数据失败:`, error);
    return null;
  }
}

/**
 * 同步单个成员数据 (完整同步: 角色信息 + 装备列表 + 装备详情)
 * 与前端 syncService.ts 保持一致的逻辑
 */
async function syncMemberData(member) {
  try {
    console.log(`同步成员: ${member.name} (${member.id})`);

    // 检查必需的角色配置
    const characterId = member.characterId;
    const serverId = member.serverId;

    if (!characterId || !serverId) {
      console.log(`  ⚠️  成员 ${member.name} 缺少角色配置 (characterId 或 serverId)，跳过同步`);
      return { success: false, reason: '缺少角色配置' };
    }

    // 步骤 1/3: 获取角色信息
    console.log(`  [${member.name}] 步骤 1/3: 请求角色信息...`);
    const characterInfo = await fetchCharacterInfo(characterId, serverId);

    if (!characterInfo || !characterInfo.profile) {
      console.log(`  ❌ 获取成员 ${member.name} 角色信息失败`);
      return { success: false, reason: '获取角色信息失败' };
    }

    await delay(300);
    console.log(`  ✓ 角色信息获取成功`);

    // 步骤 2/3: 获取装备列表
    console.log(`  [${member.name}] 步骤 2/3: 请求装备列表...`);
    const equipmentData = await fetchCharacterEquipment(characterId, serverId);

    if (!equipmentData) {
      console.log(`  ⚠️  获取成员 ${member.name} 装备列表失败，仅保存角色信息`);

      // 只保存角色信息
      const memberDir = path.join(__dirname, '../public/data', member.id);
      if (!fs.existsSync(memberDir)) {
        fs.mkdirSync(memberDir, { recursive: true });
      }
      const characterFilePath = path.join(memberDir, 'character_info.json');
      fs.writeFileSync(characterFilePath, JSON.stringify(characterInfo, null, 2), 'utf-8');

      return { success: true };
    }

    await delay(300);
    console.log(`  ✓ 装备列表获取成功`);

    // 步骤 3/3: 获取装备详情
    const equipmentList = equipmentData?.equipment?.equipmentList || [];

    if (equipmentList.length === 0) {
      console.log(`  [${member.name}] 该角色没有装备`);
    } else {
      console.log(`  [${member.name}] 步骤 3/3: 获取装备详情 (共 ${equipmentList.length} 件装备)...`);

      const equipmentDetails = [];

      for (const equip of equipmentList) {
        try {
          // 计算总强化等级
          const totalEnchantLevel = (equip.enchantLevel || 0) + (equip.exceedLevel || 0);

          // 调试:打印即将请求的参数
          console.log(`  [调试] 请求装备详情: ${equip.slotPosName}, slotPos=${equip.slotPos}, id=${equip.id}`);

          const detail = await fetchEquipmentDetail(
            equip.id,
            totalEnchantLevel,
            characterId,
            serverId,
            equip.slotPos
          );

          // 将原始装备的 slotPos 和 slotPosName 合并到详情中
          const enrichedDetail = {
            ...detail,
            slotPos: equip.slotPos,
            slotPosName: equip.slotPosName
          };

          equipmentDetails.push(enrichedDetail);
          console.log(`  ✓ ${equip.slotPosName || equip.slotPos}: ${detail.name || equip.name}`);
          await delay(500); // 增加延迟至500ms,配合时间戳参数确保API返回正确数据
        } catch (error) {
          console.log(`  ✗ ${equip.slotPosName || equip.slotPos}: ${error.message}`);
        }
      }

      console.log(`  ✓ 成功获取 ${equipmentDetails.length}/${equipmentList.length} 件装备详情`);

      // 将装备详情合并到 equipmentList 中 (与前端逻辑一致)
      if (equipmentDetails.length > 0) {
        equipmentData.equipment.equipmentList = equipmentDetails;
      }
    }

    // 创建成员数据文件夹
    const memberDir = path.join(__dirname, '../public/data', member.id);
    if (!fs.existsSync(memberDir)) {
      fs.mkdirSync(memberDir, { recursive: true });
    }

    // 保存角色信息
    const characterFilePath = path.join(memberDir, 'character_info.json');
    fs.writeFileSync(characterFilePath, JSON.stringify(characterInfo, null, 2), 'utf-8');
    console.log(`  ✓ 角色信息已保存`);

    // 保存装备详情 (包含完整的装备数据)
    const equipmentFilePath = path.join(memberDir, 'equipment_details.json');
    fs.writeFileSync(equipmentFilePath, JSON.stringify(equipmentData, null, 2), 'utf-8');
    console.log(`  ✓ 装备详情已保存`);

    // 步骤 4/5: 获取PVE评分数据
    console.log(`  [${member.name}] 步骤 4/5: 请求PVE评分...`);
    try {
      await delay(300); // 添加延迟避免请求过快
      const ratingData = await fetchCharacterRating(characterId, serverId, true); // 传入true强制刷新

      if (ratingData) {
        // 保存评分数据到 score.json
        const scoreFilePath = path.join(memberDir, 'score.json');
        fs.writeFileSync(scoreFilePath, JSON.stringify(ratingData, null, 2), 'utf-8');
        console.log(`  ✓ PVE评分已保存到 score.json: ${Math.floor(ratingData.scores.score)}`);
      } else {
        console.log(`  ⚠️  该角色暂无评分数据`);
      }
    } catch (error) {
      console.log(`  ⚠️  获取PVE评分失败: ${error.message}`);
      // 评分获取失败不影响整体同步
    }

    // 步骤 5/5: 获取守护力数据
    console.log(`  [${member.name}] 步骤 5/5: 请求守护力数据...`);
    try {
      await delay(300);
      const daevanionBoards = await fetchDaevanionBoards(characterId, serverId, characterInfo);

      if (daevanionBoards && daevanionBoards.length > 0) {
        // 保存守护力数据到 daevanion_boards.json
        const daevanionFilePath = path.join(memberDir, 'daevanion_boards.json');
        fs.writeFileSync(daevanionFilePath, JSON.stringify(daevanionBoards, null, 2), 'utf-8');
        console.log(`  ✓ 守护力数据已保存到 daevanion_boards.json`);
      } else {
        console.log(`  ⚠️  该角色暂无守护力数据`);
      }
    } catch (error) {
      console.log(`  ⚠️  获取守护力数据失败: ${error.message}`);
      // 守护力获取失败不影响整体同步
    }

    console.log(`  ✓ 成员 ${member.name} 数据同步成功`);
    return { success: true };
  } catch (error) {
    console.error(`  ❌ 同步成员 ${member.name} 失败:`, error.message);
    return { success: false, reason: error.message };
  }
}

/**
 * 同步服务器列表
 */
async function syncServerList() {
  return new Promise((resolve, reject) => {
    console.log('🌐 正在同步服务器列表...');

    const url = 'https://tw.ncsoft.com/aion2/api/gameinfo/servers?lang=en';

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          // 调试: 打印原始响应结构
          console.log('[调试] API响应类型:', typeof response);
          console.log('[调试] API响应是否为数组:', Array.isArray(response));
          if (typeof response === 'object' && !Array.isArray(response)) {
            console.log('[调试] API响应的键:', Object.keys(response));
          }

          // 处理可能的数据格式: 可能是数组,也可能是对象包含data字段
          const servers = Array.isArray(response) ? response : (response.data || response.serverList || []);

          if (!Array.isArray(servers)) {
            throw new Error('服务器数据格式错误: 不是数组');
          }

          console.log(`[调试] 服务器数组长度: ${servers.length}`);
          if (servers.length > 0) {
            console.log('[调试] 第一个服务器数据样例:', JSON.stringify(servers[0]));
          }

          // 如果API返回空列表,不更新文件,保留现有数据
          if (servers.length === 0) {
            console.log('⚠️ API返回空服务器列表,跳过更新以保留现有数据');
            resolve({ success: false, message: 'API返回空列表', count: 0 });
            return;
          }

          const serverList = servers.map(server => {
            // 检查必需字段 - 兼容 id 或 serverId 字段
            const serverId = server.id || server.serverId;
            if (!serverId) {
              console.warn('⚠️  跳过无效服务器数据 (缺少id/serverId):', server);
              return null;
            }

            // 兼容不同的字段名
            const serverName = server.label || server.name || server.serverName || `服务器${serverId}`;

            return {
              raceId: server.raceId || 1,
              serverId: serverId,
              serverName: serverName,
              serverShortName: serverName.substring(0, 2)
            };
          }).filter(s => s !== null); // 过滤掉无效数据

          // 如果处理后没有有效服务器,不更新文件
          if (serverList.length === 0) {
            console.log('⚠️ 没有有效的服务器数据,跳过更新以保留现有数据');
            resolve({ success: false, message: '没有有效的服务器数据', count: 0 });
            return;
          }

          const outputPath = path.join(__dirname, '../public/data/serverId.json');
          const outputData = { serverList };

          // 确保目录存在
          const dir = path.dirname(outputPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 4), 'utf-8');
          console.log(`✅ 服务器列表已更新: ${serverList.length}个服务器`);
          resolve({ success: true, count: serverList.length });
        } catch (error) {
          console.error('❌ 服务器列表解析失败:', error);
          resolve({ success: false, error: error.message });
        }
      });
    }).on('error', (error) => {
      console.error('❌ 服务器列表请求失败:', error);
      resolve({ success: false, error: error.message });
    });
  });
}

/**
 * 同步所有成员数据
 */
async function syncAllMembers() {
  if (isSyncing) {
    console.log('⚠️  数据同步正在进行中，跳过本次任务');
    return { success: false, message: '同步正在进行中' };
  }

  isSyncing = true;
  const startTime = Date.now();

  console.log('\n========================================');
  console.log('🔄 开始同步所有成员数据');
  console.log(`⏰ 开始时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('========================================\n');

  try {
    // 先同步服务器列表
    const serverSyncResult = await syncServerList();

    const members = readMembersDB();
    const results = {
      total: members.length,
      success: 0,
      failed: 0,
      skipped: 0,
      details: [],
      serverSync: serverSyncResult
    };

    for (const member of members) {
      const result = await syncMemberData(member);

      if (result.success) {
        results.success++;
      } else if (result.reason === '缺少角色配置') {
        results.skipped++;
      } else {
        results.failed++;
      }

      results.details.push({
        memberId: member.id,
        memberName: member.name,
        ...result
      });

      // 避免请求过快，间隔500ms
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    lastSyncTime = new Date().toISOString();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n========================================');
    console.log('✅ 数据同步完成');
    console.log(`⏱️  耗时: ${duration}秒`);
    console.log(`📊 统计: 总计${results.total} | 成功${results.success} | 失败${results.failed} | 跳过${results.skipped}`);
    console.log('========================================\n');

    isSyncing = false;
    return { success: true, results, duration };
  } catch (error) {
    console.error('❌ 数据同步失败:', error);
    isSyncing = false;
    return { success: false, message: error.message };
  }
}

/**
 * 启动定时任务
 */
function startSyncTask(intervalHours) {
  // 停止现有任务
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  syncIntervalHours = intervalHours;
  const intervalMs = intervalHours * 60 * 60 * 1000;

  console.log(`\n⏰ 定时任务已启动: 每 ${intervalHours} 小时同步一次`);

  // 立即执行一次(异步,不阻塞)
  syncAllMembers().then(result => {
    console.log('✅ 首次同步完成:', result);
  }).catch(error => {
    console.error('❌ 首次同步失败:', error);
  });

  // 设置定时器
  syncInterval = setInterval(() => {
    syncAllMembers();
  }, intervalMs);
}

/**
 * 停止定时任务
 */
function stopSyncTask() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('\n⏹️  定时任务已停止');
    return true;
  }
  return false;
}

// 1. 获取定时任务状态
app.get('/api/sync/status', (req, res) => {
  res.json({
    success: true,
    data: {
      isRunning: syncInterval !== null,
      isSyncing,
      intervalHours: syncIntervalHours,
      lastSyncTime,
      nextSyncTime: syncInterval && lastSyncTime
        ? new Date(new Date(lastSyncTime).getTime() + syncIntervalHours * 60 * 60 * 1000).toISOString()
        : null
    }
  });
});

// 2. 启动定时任务
app.post('/api/sync/start', (req, res) => {
  try {
    const { intervalHours } = req.body;

    if (!intervalHours || intervalHours < 1 || intervalHours > 24) {
      return res.status(400).json({ error: '间隔时间必须在1-24小时之间' });
    }

    startSyncTask(intervalHours);

    res.json({
      success: true,
      message: `定时任务已启动，间隔：${intervalHours}小时`
    });
  } catch (error) {
    console.error('启动定时任务失败:', error);
    res.status(500).json({ error: '启动失败: ' + error.message });
  }
});

// 3. 停止定时任务
app.post('/api/sync/stop', (req, res) => {
  try {
    const stopped = stopSyncTask();

    if (stopped) {
      res.json({
        success: true,
        message: '定时任务已停止'
      });
    } else {
      res.json({
        success: false,
        message: '定时任务未运行'
      });
    }
  } catch (error) {
    console.error('停止定时任务失败:', error);
    res.status(500).json({ error: '停止失败: ' + error.message });
  }
});

// 4. 立即执行同步(手动触发) - 异步模式,不阻塞响应
app.post('/api/sync/now', async (req, res) => {
  try {
    // 立即返回响应,告诉前端同步已开始
    res.json({
      success: true,
      message: '数据同步已在后台启动,请稍后查看同步状态'
    });

    // 在后台异步执行同步,不等待结果
    syncAllMembers().then(result => {
      console.log('✅ 后台同步完成:', result);
    }).catch(error => {
      console.error('❌ 后台同步失败:', error);
    });
  } catch (error) {
    console.error('执行同步失败:', error);
    res.status(500).json({ error: '同步失败: ' + error.message });
  }
});

// 5. 同步单个成员（审批通过或添加成员时自动调用）
app.post('/api/sync/member', async (req, res) => {
  try {
    const memberData = req.body;

    if (!memberData || !memberData.characterId || !memberData.serverId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: characterId 和 serverId'
      });
    }

    console.log(`开始同步成员: ${memberData.name} (${memberData.characterId})`);

    const result = await syncMemberData(memberData);

    res.json({
      success: true,
      message: `成员 ${memberData.name} 数据同步成功`,
      data: result
    });
  } catch (error) {
    console.error('同步成员数据失败:', error);
    res.status(500).json({
      success: false,
      error: '同步失败: ' + error.message
    });
  }
});

// ==================== 角色完整数据API (角色查询专用) ====================

/**
 * 一次性获取角色所有数据 - 用于角色查询详情页
 * 包括: 角色信息 + 装备列表 + 装备详情 + PVE评分 + 守护力数据
 */
app.get('/api/character/complete', async (req, res) => {
  const { characterId, serverId, skipDaevanion } = req.query;

  if (!characterId || !serverId) {
    return res.status(400).json({
      success: false,
      error: '缺少必要参数: characterId 和 serverId'
    });
  }

  console.log(`\n========================================`);
  console.log(`🔍 [角色完整数据] 开始获取角色数据`);
  console.log(`📌 characterId: ${characterId}`);
  console.log(`📌 serverId: ${serverId}`);
  console.log(`📌 skipDaevanion: ${skipDaevanion || 'false'}`);
  console.log(`========================================\n`);

  try {
    // 步骤 1/5: 获取角色基础信息
    console.log(`[1/5] 获取角色信息...`);
    const characterInfo = await fetchCharacterInfo(characterId, serverId);

    if (!characterInfo || !characterInfo.profile) {
      return res.status(404).json({
        success: false,
        error: '角色信息获取失败'
      });
    }
    console.log(`✓ 角色信息获取成功: ${characterInfo.profile.characterName}`);

    // 步骤 2/5: 获取装备列表
    console.log(`[2/5] 获取装备列表...`);
    await delay(300);
    const equipmentData = await fetchCharacterEquipment(characterId, serverId);

    if (!equipmentData) {
      return res.status(404).json({
        success: false,
        error: '装备数据获取失败'
      });
    }
    console.log(`✓ 装备列表获取成功`);

    // 步骤 3/5: 获取装备详情
    const equipmentList = equipmentData?.equipment?.equipmentList || [];
    console.log(`[3/5] 获取装备详情 (共 ${equipmentList.length} 件装备)...`);

    const equipmentDetails = [];

    for (const equip of equipmentList) {
      try {
        const totalEnchantLevel = (equip.enchantLevel || 0) + (equip.exceedLevel || 0);

        const detail = await fetchEquipmentDetail(
          equip.id,
          totalEnchantLevel,
          characterId,
          serverId,
          equip.slotPos
        );

        const enrichedDetail = {
          ...detail,
          slotPos: equip.slotPos,
          slotPosName: equip.slotPosName
        };

        equipmentDetails.push(enrichedDetail);
        console.log(`  ✓ ${equip.slotPosName || equip.slotPos}: ${detail.name || equip.name}`);
        await delay(500);
      } catch (error) {
        console.log(`  ✗ ${equip.slotPosName || equip.slotPos}: 获取失败`);
      }
    }

    // 将装备详情合并到 equipmentData 中
    if (equipmentDetails.length > 0) {
      equipmentData.equipment.equipmentList = equipmentDetails;
    }
    console.log(`✓ 成功获取 ${equipmentDetails.length}/${equipmentList.length} 件装备详情`);

    // 步骤 4/5: 获取PVE评分
    console.log(`[4/5] 获取PVE评分...`);
    await delay(300);
    let ratingData = null;
    try {
      ratingData = await fetchCharacterRating(characterId, serverId, false);
      if (ratingData) {
        console.log(`✓ PVE评分获取成功: ${Math.floor(ratingData.scores.score)}`);
      } else {
        console.log(`⚠️  该角色暂无评分数据`);
      }
    } catch (error) {
      console.log(`⚠️  PVE评分获取失败: ${error.message}`);
    }

    // 步骤 5/5: 获取守护力数据 (可选)
    let daevanionBoards = null;
    if (skipDaevanion !== 'true') {
      console.log(`[5/5] 获取守护力数据...`);
      await delay(300);
      try {
        daevanionBoards = await fetchDaevanionBoards(characterId, serverId, characterInfo);
        if (daevanionBoards && daevanionBoards.length > 0) {
          console.log(`✓ 守护力数据获取成功: ${daevanionBoards.length} 个面板`);
        } else {
          console.log(`⚠️  该角色暂无守护力数据`);
        }
      } catch (error) {
        console.log(`⚠️  守护力数据获取失败: ${error.message}`);
      }
    } else {
      console.log(`[5/5] 跳过守护力数据获取 (skipDaevanion=true)`);
    }

    console.log(`\n========================================`);
    console.log(`✅ 角色完整数据获取成功`);
    console.log(`========================================\n`);

    // 返回完整数据
    res.json({
      success: true,
      data: {
        characterInfo,
        equipmentData,
        rating: ratingData,
        daevanionBoards,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error(`❌ 获取角色完整数据失败:`, error);
    res.status(500).json({
      success: false,
      error: '获取角色数据失败: ' + error.message
    });
  }
});

// ===== 工具API =====
// 获取工具列表
app.get('/api/tools', (req, res) => {
  try {
    const config = readToolsConfigFile();
    res.json({
      success: true,
      tools: config.tools || []
    });
  } catch (error) {
    console.error('获取工具列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取工具列表失败: ' + error.message
    });
  }
});

// ===== 工具管理API (管理员) =====
// 获取完整配置(包含rift和tools)
app.get('/api/admin/tools-config', (req, res) => {
  try {
    const config = readToolsConfigFile();
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('获取工具配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取工具配置失败: ' + error.message
    });
  }
});

// 更新完整配置(包含rift和tools)
app.post('/api/admin/tools-config', (req, res) => {
  try {
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({
        success: false,
        error: '缺少配置数据'
      });
    }

    const normalized = ensureToolsConfigDefaults(config);
    fs.writeFileSync(TOOLS_CONFIG_PATH, JSON.stringify(normalized, null, 2), 'utf-8');
    cachedRiftInfo = buildRiftPayload(normalized.rift);
    cachedRiftTimestamp = Date.now();

    console.log('✅ 工具配置已更新');

    res.json({
      success: true,
      message: '配置已更新',
      config: normalized
    });
  } catch (error) {
    console.error('更新工具配置失败:', error);
    res.status(500).json({
      success: false,
      error: '更新工具配置失败: ' + error.message
    });
  }
});

app.get('/api/rift/countdown', (req, res) => {
  try {
    if (!cachedRiftInfo || Date.now() - cachedRiftTimestamp > RIFT_CACHE_TTL) {
      const config = readToolsConfigFile();
      cachedRiftInfo = buildRiftPayload(config.rift);
      cachedRiftTimestamp = Date.now();
    }

    res.json({
      success: true,
      data: cachedRiftInfo
    });
  } catch (error) {
    console.error('[Rift] 倒计时生成失败:', error);
    res.status(500).json({
      success: false,
      error: '裂缝倒计时生成失败'
    });
  }
});


// ===== 静态文件服务配置 =====
// 1. /uploads 路径映射到用户上传的图片 (public/images/gallery/)
app.use('/uploads', express.static(path.join(__dirname, '../public/images/gallery')));

// 2. /data 路径映射到动态数据 (public/data/)
app.use('/data', express.static(path.join(__dirname, '../public/data')));

// 3. 其他静态资源从 dist/ 提供 (前端构建文件 + 静态图片)
app.use(express.static(path.join(__dirname, '../dist')));

// 处理客户端路由 - 所有非API和非uploads请求都返回index.html
// 这样React Router可以处理前端路由
app.get('*', (req, res) => {
  // 排除API接口、uploads路径和data路径
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/data')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  }
});

// ==================== 游戏通知模块 ====================

// 通知数据存储路径
const noticesDataPath = path.join(__dirname, '../public/data/new/game_notices.json');

// 通知定时任务状态
let noticesSyncInterval = null;
let lastNoticesSyncTime = null;
const NOTICES_SYNC_INTERVAL = 60 * 60 * 1000; // 1小时

/**
 * 从官方API获取数据的通用函数
 */
function fetchFromAPI(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (apiRes) => {
      let data = '';

      apiRes.on('data', (chunk) => {
        data += chunk;
      });

      apiRes.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error('解析API响应失败'));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 递归转换对象中的所有字符串从繁体到简体
 * @param {*} obj - 要转换的对象
 * @param {string} parentKey - 父级键名，用于判断是否跳过转换
 * @param {Array} pathKeys - 路径键数组，用于判断上下文
 */
function convertToSimplified(obj, parentKey = '', pathKeys = []) {
  // 精确匹配：只跳过特定路径的字段
  const skipPaths = [
    'profile.characterName',  // 角色信息中的角色名
    'profile.name',           // 角色信息中的名称
    'legion.legionName',      // 军团信息中的军团名
    'legion.name',            // 军团信息中的名称
  ];

  // 构建当前路径
  const currentPath = [...pathKeys, parentKey].filter(k => k).join('.');

  // 如果当前路径在跳过列表中，直接返回原值
  if (skipPaths.some(path => currentPath.endsWith(path))) {
    return obj;
  }

  if (typeof obj === 'string') {
    try {
      return converter(obj);
    } catch (error) {
      console.error('[convertToSimplified] 转换字符串失败:', obj, error);
      return obj; // 转换失败时返回原值
    }
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertToSimplified(item, parentKey, pathKeys));
  }

  if (obj !== null && typeof obj === 'object') {
    const converted = {};
    const newPathKeys = parentKey ? [...pathKeys, parentKey] : pathKeys;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        converted[key] = convertToSimplified(obj[key], key, newPathKeys);
      }
    }
    return converted;
  }

  return obj;
}

/**
 * 从官方API获取游戏通知(更新+公告)
 */
async function fetchGameNotices() {
  const updatesUrl = 'https://api-tw-community.ncsoft.com/aion2_tw/board/update_zh/article/search/moreArticle?isVote=true&moreSize=5&moreDirection=BEFORE&previousArticleId=0';
  const noticesUrl = 'https://api-tw-community.ncsoft.com/aion2_tw/board/notice_zh/article/search/moreArticle?isVote=true&moreSize=5&moreDirection=BEFORE&previousArticleId=0';

  try {
    const [updatesData, noticesData] = await Promise.all([
      fetchFromAPI(updatesUrl),
      fetchFromAPI(noticesUrl)
    ]);

    // 合并两个列表,并标记类型
    const updates = (updatesData.contentList || []).map(item => ({
      ...item,
      noticeType: 'update'
    }));

    const notices = (noticesData.contentList || []).map(item => ({
      ...item,
      noticeType: 'notice'
    }));

    const allNotices = [...notices, ...updates];

    // 为每篇文章获取详细内容
    console.log(`📥 开始获取 ${allNotices.length} 篇文章的详细内容...`);

    const noticesWithContent = await Promise.all(
      allNotices.map(async (notice) => {
        try {
          const boardAlias = notice.rootBoard?.board?.boardAlias || '';
          const articleUrl = `https://api-tw-community.ncsoft.com/aion2_tw/board/${boardAlias}/article/${notice.id}`;

          console.log(`  📄 获取文章: ${notice.title}`);
          const articleData = await fetchFromAPI(articleUrl);

          // 提取文章内容
          const content = articleData?.article?.content?.content || '';

          return {
            ...notice,
            articleContent: content // 添加文章详细内容
          };
        } catch (error) {
          console.error(`  ❌ 获取文章详情失败 [${notice.id}]:`, error.message);
          return {
            ...notice,
            articleContent: notice.summary || '' // 失败时使用 summary
          };
        }
      })
    );

    console.log(`✅ 成功获取 ${noticesWithContent.length} 篇文章内容\n`);

    return {
      contentList: noticesWithContent
    };
  } catch (error) {
    throw error;
  }
}

/**
 * 同步游戏通知数据
 */
async function syncGameNotices() {
  console.log('\n========================================');
  console.log('📰 开始同步游戏通知');
  console.log(`⏰ 时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  console.log('========================================\n');

  try {
    const noticesData = await fetchGameNotices();

    if (!noticesData || !noticesData.contentList) {
      console.log('⚠️  通知数据格式错误');
      return { success: false, message: '数据格式错误' };
    }

    // 确保目录存在
    const dir = path.dirname(noticesDataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 转换繁体为简体
    console.log('🔄 正在转换繁体为简体...');
    const simplifiedNotices = convertToSimplified(noticesData.contentList);
    console.log('✅ 繁简转换完成\n');

    // 保存完整的通知数据
    const saveData = {
      lastUpdate: new Date().toISOString(),
      notices: simplifiedNotices
    };

    fs.writeFileSync(noticesDataPath, JSON.stringify(saveData, null, 2), 'utf-8');

    lastNoticesSyncTime = new Date().toISOString();

    console.log(`✅ 通知同步成功: ${noticesData.contentList.length}条通知`);
    console.log('========================================\n');

    return { success: true, count: noticesData.contentList.length };
  } catch (error) {
    console.error('❌ 通知同步失败:', error.message);
    return { success: false, message: error.message };
  }
}

/**
 * 启动通知同步定时任务
 */
function startNoticesSyncTask() {
  console.log('\n⏰ 游戏通知定时任务已启动: 每1小时同步一次');

  // 立即执行一次
  syncGameNotices().then(result => {
    console.log('✅ 通知首次同步完成:', result);
  }).catch(error => {
    console.error('❌ 通知首次同步失败:', error);
  });

  // 设置定时器
  noticesSyncInterval = setInterval(() => {
    syncGameNotices();
  }, NOTICES_SYNC_INTERVAL);
}

// ==================== 通知API端点 ====================

// 获取游戏通知列表
app.get('/api/notices', (req, res) => {
  try {
    if (!fs.existsSync(noticesDataPath)) {
      return res.json({
        success: true,
        data: {
          lastUpdate: null,
          notices: []
        }
      });
    }

    const data = fs.readFileSync(noticesDataPath, 'utf-8');
    const noticesData = JSON.parse(data);

    res.json({
      success: true,
      data: noticesData
    });
  } catch (error) {
    console.error('获取通知列表失败:', error);
    res.status(500).json({ error: '获取通知列表失败: ' + error.message });
  }
});

// 手动触发通知同步
app.post('/api/notices/sync', async (req, res) => {
  try {
    res.json({
      success: true,
      message: '通知同步已在后台启动'
    });

    syncGameNotices().then(result => {
      console.log('✅ 后台通知同步完成:', result);
    }).catch(error => {
      console.error('❌ 后台通知同步失败:', error);
    });
  } catch (error) {
    console.error('执行通知同步失败:', error);
    res.status(500).json({ error: '同步失败: ' + error.message });
  }
});

// ==================== 工具和裂缝管理 API ====================

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🚀 军团后端服务器启动成功！`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📁 图片存储: ${uploadDir}`);
  console.log(`💾 相册数据库: ${dbPath}`);
  console.log(`💾 成员数据库: ${membersDbPath}`);
  console.log(`💾 申请数据库: ${applicationsDbPath}`);
  console.log(`💾 物品数据库: ${path.join(__dirname, 'items.db')}`);
  console.log(`========================================\n`);

  // 启动游戏通知定时任务
  startNoticesSyncTask();
});

