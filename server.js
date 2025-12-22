/**
 * AION2 数据同步后端服务
 *
 * 功能:
 * 1. 代理 AION2 API 请求,绕过 CORS
 * 2. 接收前端同步的数据,保存到 public/data/ 目录 (开发环境)
 * 3. 接收前端同步的数据,保存到 dist/data/ 目录 (生产环境)
 * 4. 托管静态文件 (生产环境)
 */

import express from 'express';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 根据环境确定数据目录
const DATA_DIR = NODE_ENV === 'production'
  ? path.join(__dirname, 'dist', 'data')  // 生产环境
  : path.join(__dirname, 'public', 'data'); // 开发环境

console.log(`环境: ${NODE_ENV}`);
console.log(`数据目录: ${DATA_DIR}`);

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 生产环境下托管静态文件
if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
}

// ============= 代理 AION2 API =============

/**
 * 代理请求到 AION2 台湾官方 API
 */
app.all('/api/aion2/*', async (req, res) => {
  const apiPath = req.params[0];
  const queryString = new URLSearchParams(req.query).toString();
  const targetUrl = `https://tw.ncsoft.com/aion2/api/${apiPath}${queryString ? '?' + queryString : ''}`;

  console.log(`[代理] ${req.method} ${targetUrl}`);

  const options = {
    method: req.method,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
  };

  https.get(targetUrl, options, (response) => {
    let data = '';

    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      res.set('Content-Type', 'application/json');
      res.send(data);
    });
  }).on('error', (error) => {
    console.error('[代理错误]', error.message);
    res.status(500).json({ error: error.message });
  });
});

// ============= 数据保存 API =============

/**
 * 保存成员数据到文件系统
 * POST /api/save-member-data
 */
app.post('/api/save-member-data', (req, res) => {
  const { memberId, characterInfo, equipmentData, equipmentDetails } = req.body;

  if (!memberId) {
    return res.status(400).json({ error: '缺少 memberId' });
  }

  try {
    const memberDir = path.join(DATA_DIR, memberId);

    // 确保目录存在
    if (!fs.existsSync(memberDir)) {
      fs.mkdirSync(memberDir, { recursive: true });
    }

    const savedFiles = [];

    // 保存角色信息
    if (characterInfo) {
      const infoFile = path.join(memberDir, 'character_info.json');
      fs.writeFileSync(infoFile, JSON.stringify(characterInfo, null, 2), 'utf-8');
      savedFiles.push('character_info.json');
      console.log(`✓ 已保存: ${infoFile}`);
    }

    // 保存装备列表
    if (equipmentData) {
      const equipFile = path.join(memberDir, 'character_equipment.json');
      fs.writeFileSync(equipFile, JSON.stringify(equipmentData, null, 2), 'utf-8');
      savedFiles.push('character_equipment.json');
      console.log(`✓ 已保存: ${equipFile}`);
    }

    // 保存装备详情
    if (equipmentDetails && equipmentDetails.length > 0) {
      const detailsCache = {
        memberId,
        lastUpdate: new Date().toISOString(),
        details: equipmentDetails,
      };
      const detailsFile = path.join(memberDir, 'equipment_details.json');
      fs.writeFileSync(detailsFile, JSON.stringify(detailsCache, null, 2), 'utf-8');
      savedFiles.push('equipment_details.json');
      console.log(`✓ 已保存: ${detailsFile} (${equipmentDetails.length} 件装备)`);
    }

    res.json({
      success: true,
      message: `成员 ${memberId} 数据已保存`,
      savedFiles,
      dataDir: memberDir,
    });
  } catch (error) {
    console.error('[保存错误]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 生产环境下,所有其他路由返回 index.html (SPA 路由支持)
if (NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// ============= 启动服务器 =============

app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('AION2 数据同步后端服务已启动');
  console.log('='.repeat(60));
  console.log(`环境: ${NODE_ENV}`);
  console.log(`端口: ${PORT}`);
  console.log(`数据目录: ${DATA_DIR}`);
  console.log(`API 代理: http://localhost:${PORT}/api/aion2/*`);
  console.log(`数据保存: http://localhost:${PORT}/api/save-member-data`);
  if (NODE_ENV === 'production') {
    console.log(`前端页面: http://localhost:${PORT}`);
  }
  console.log('='.repeat(60));
  console.log('');
});
