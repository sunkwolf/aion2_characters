/**
 * AION2 数据同步脚本
 *
 * 功能:
 * 1. 从 localStorage 或 public/data/members.json 读取成员配置
 * 2. 支持完整 URL 格式和旧格式(characterId + serverId)
 * 3. 步骤1: 请求角色信息 (character/info)
 * 4. 步骤2: 请求角色装备列表 (character/equipment)
 * 5. 步骤3: 根据装备列表逐个请求装备详情 (character/equipment/item)
 * 6. 将数据保存到对应的文件夹 (public/data/成员ID/)
 *
 * 使用方法:
 * node scripts/sync-data.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============= 配置 =============

const API_BASE_URL = 'https://tw.ncsoft.com/aion2/api';
const DATA_DIR = path.join(__dirname, '../public/data');
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');

// 请求延迟 (毫秒),避免请求过快
const REQUEST_DELAY = 500;

// ============= 工具函数 =============

/**
 * 发送 HTTPS GET 请求
 */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`JSON 解析失败: ${e.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    }).on('error', (e) => {
      reject(e);
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
 * 确保目录存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 保存 JSON 文件
 */
function saveJson(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, json, 'utf-8');
}

/**
 * 从完整 URL 中提取 characterId 和 serverId
 */
function parseApiUrl(url) {
  try {
    const urlObj = new URL(url);
    const characterId = urlObj.searchParams.get('characterId');
    const serverId = urlObj.searchParams.get('serverId');

    if (!characterId || !serverId) {
      return null;
    }

    return {
      characterId: decodeURIComponent(characterId),
      serverId: parseInt(serverId, 10),
    };
  } catch (e) {
    return null;
  }
}

// ============= 数据获取 =============

/**
 * 获取角色信息 (使用完整 URL 或参数)
 */
async function getCharacterInfo(member) {
  let url;

  // 优先使用完整 URL
  if (member.characterInfoUrl) {
    url = member.characterInfoUrl;
    console.log(`  使用完整 URL: ${url.substring(0, 100)}...`);
  } else if (member.characterId && member.serverId !== undefined) {
    // 兼容旧格式
    url = `${API_BASE_URL}/character/info?lang=zh&characterId=${member.characterId}&serverId=${member.serverId}`;
    console.log(`  使用旧格式参数构建 URL`);
  } else {
    throw new Error('未配置角色信息 URL');
  }

  console.log(`  步骤 1/3: 请求角色信息...`);
  return await httpsGet(url);
}

/**
 * 获取角色装备列表 (使用完整 URL 或参数)
 */
async function getCharacterEquipment(member) {
  let url;

  // 优先使用完整 URL
  if (member.characterEquipmentUrl) {
    url = member.characterEquipmentUrl;
  } else if (member.characterId && member.serverId !== undefined) {
    // 兼容旧格式
    url = `${API_BASE_URL}/character/equipment?lang=zh&characterId=${member.characterId}&serverId=${member.serverId}`;
  } else {
    throw new Error('未配置角色装备 URL');
  }

  console.log(`  步骤 2/3: 请求装备列表...`);
  return await httpsGet(url);
}

/**
 * 获取装备详情
 * 需要从完整 URL 中提取 characterId 和 serverId
 */
async function getEquipmentDetail(itemId, enchantLevel, slotPos, member) {
  let characterId, serverId;

  // 从 URL 中提取参数
  if (member.characterInfoUrl) {
    const params = parseApiUrl(member.characterInfoUrl);
    if (!params) {
      throw new Error('无法从 URL 中提取 characterId 和 serverId');
    }
    characterId = params.characterId;
    serverId = params.serverId;
  } else if (member.characterId && member.serverId !== undefined) {
    // 使用旧格式
    characterId = member.characterId;
    serverId = member.serverId;
  } else {
    throw new Error('无法获取 characterId 和 serverId');
  }

  const url = `${API_BASE_URL}/character/equipment/item?id=${itemId}&enchantLevel=${enchantLevel}&characterId=${characterId}&serverId=${serverId}&slotPos=${slotPos}&lang=zh`;
  console.log(`    请求装备详情: itemId=${itemId}, slotPos=${slotPos}`);
  return await httpsGet(url);
}

// ============= 同步逻辑 =============

/**
 * 同步单个成员的数据
 */
async function syncMemberData(member) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`开始同步成员: ${member.name} (${member.id})`);
  console.log('='.repeat(60));

  // 检查是否配置了 API 参数
  const hasNewFormat = member.characterInfoUrl && member.characterEquipmentUrl;
  const hasOldFormat = member.characterId && member.serverId !== undefined;

  if (!hasNewFormat && !hasOldFormat) {
    console.log(`  ✗ 跳过: 未配置 API URL`);
    return { success: false, reason: '未配置 API URL' };
  }

  try {
    // 1. 获取角色信息
    const characterInfo = await getCharacterInfo(member);
    await delay(REQUEST_DELAY);
    console.log(`  ✓ 角色信息获取成功`);

    // 2. 获取装备列表
    const equipmentData = await getCharacterEquipment(member);
    await delay(REQUEST_DELAY);
    console.log(`  ✓ 装备列表获取成功`);

    // 保存基础数据
    const memberDir = path.join(DATA_DIR, member.id);
    ensureDir(memberDir);

    const characterFile = path.join(memberDir, 'character_info.json');
    saveJson(characterFile, characterInfo);
    console.log(`  ✓ 角色信息已保存到: ${characterFile}`);

    const equipmentFile = path.join(memberDir, 'character_equipment.json');
    saveJson(equipmentFile, equipmentData);
    console.log(`  ✓ 装备列表已保存到: ${equipmentFile}`);

    // 3. 获取装备详情
    const equipmentList = equipmentData?.equipment?.equipmentList || [];
    if (equipmentList.length === 0) {
      console.log(`  ! 该角色没有装备`);
      return { success: true, equipmentCount: 0 };
    }

    console.log(`  步骤 3/3: 获取装备详情 (共 ${equipmentList.length} 件装备)...`);
    const equipmentDetails = [];

    for (const equip of equipmentList) {
      try {
        // 计算总强化等级
        const totalEnchantLevel = (equip.enchantLevel || 0) + (equip.exceedLevel || 0);

        const detail = await getEquipmentDetail(
          equip.id,
          totalEnchantLevel,
          equip.slotPos,
          member
        );

        equipmentDetails.push(detail);
        console.log(`    ✓ ${equip.slotPosName || equip.slotPos}: ${detail.name || equip.name}`);
        await delay(REQUEST_DELAY);
      } catch (error) {
        console.error(`    ✗ ${equip.slotPosName || equip.slotPos}: ${error.message}`);
      }
    }

    // 保存装备详情缓存
    const equipmentCache = {
      memberId: member.id,
      lastUpdate: new Date().toISOString(),
      details: equipmentDetails,
    };

    const equipmentDetailFile = path.join(memberDir, 'equipment_details.json');
    saveJson(equipmentDetailFile, equipmentCache);
    console.log(`  ✓ 装备详情已保存到: ${equipmentDetailFile}`);
    console.log(`  ✓ 成功获取 ${equipmentDetails.length}/${equipmentList.length} 件装备详情`);

    console.log(`\n✓ 同步完成: ${member.name}`);
    return { success: true, equipmentCount: equipmentDetails.length };

  } catch (error) {
    console.error(`\n✗ 同步失败: ${error.message}`);
    return { success: false, reason: error.message };
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('AION2 数据同步脚本 (支持完整 URL 格式)');
  console.log('='.repeat(60));

  // 1. 读取成员列表
  console.log(`\n读取成员配置: ${MEMBERS_FILE}`);

  if (!fs.existsSync(MEMBERS_FILE)) {
    console.error(`\n✗ 错误: 成员配置文件不存在: ${MEMBERS_FILE}`);
    console.error('  提示: 请先在管理后台添加成员并配置 API URL');
    process.exit(1);
  }

  const membersJson = fs.readFileSync(MEMBERS_FILE, 'utf-8');
  const members = JSON.parse(membersJson);
  console.log(`✓ 找到 ${members.length} 名成员`);

  // 2. 筛选需要同步的成员
  const syncableMembers = members.filter(m => {
    const hasNew = m.characterInfoUrl && m.characterEquipmentUrl;
    const hasOld = m.characterId && m.serverId !== undefined;
    return hasNew || hasOld;
  });

  console.log(`✓ 其中 ${syncableMembers.length} 名成员已配置 API`);

  if (syncableMembers.length === 0) {
    console.log('\n! 没有需要同步的成员');
    console.log('  提示: 请在管理后台为成员配置 API URL');
    process.exit(0);
  }

  // 显示将要同步的成员
  console.log('\n将要同步的成员:');
  syncableMembers.forEach((m, i) => {
    const hasUrl = m.characterInfoUrl ? '完整URL' : '旧格式';
    console.log(`  ${i + 1}. ${m.name} (${m.id}) - ${hasUrl}`);
  });

  // 3. 批量同步
  console.log('\n' + '='.repeat(60));
  console.log('开始批量同步...');
  console.log('='.repeat(60));

  const results = {
    total: syncableMembers.length,
    success: 0,
    failed: 0,
    failedMembers: [],
  };

  for (const member of syncableMembers) {
    const result = await syncMemberData(member);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.failedMembers.push({
        name: member.name,
        id: member.id,
        reason: result.reason,
      });
    }
  }

  // 4. 输出统计
  console.log('\n' + '='.repeat(60));
  console.log('同步完成');
  console.log('='.repeat(60));
  console.log(`总计: ${results.total} 名成员`);
  console.log(`✓ 成功: ${results.success} 名`);
  console.log(`✗ 失败: ${results.failed} 名`);

  if (results.failedMembers.length > 0) {
    console.log('\n失败的成员:');
    results.failedMembers.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.name} (${m.id})`);
      console.log(`     原因: ${m.reason}`);
    });
  }

  console.log('='.repeat(60) + '\n');

  if (results.failed > 0) {
    console.log('提示: 请检查失败成员的 API URL 配置是否正确');
  } else {
    console.log('🎉 所有成员数据同步成功!');
  }
}

// 运行
main().catch(error => {
  console.error('\n✗ 脚本执行失败:', error.message);
  console.error(error.stack);
  process.exit(1);
});
