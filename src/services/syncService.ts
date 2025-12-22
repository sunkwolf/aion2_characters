// 数据同步服务 - 通过代理调用 AION2 API

import type { MemberConfig } from '../types/admin';
import { parseApiUrl } from './apiService';

// 开发环境使用代理,生产环境需要后端支持
const API_PROXY_PREFIX = '/api/aion2';

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 发送代理请求
 */
async function fetchWithProxy(url: string): Promise<any> {
  // 将完整 URL 转换为代理 URL
  // 例如: https://tw.ncsoft.com/aion2/api/character/info?lang=zh&characterId=...&serverId=...
  // 转换为: /api/aion2/character/info?lang=zh&characterId=...&serverId=...

  let proxyUrl: string;

  if (url.startsWith('http')) {
    const urlObj = new URL(url);
    // pathname: /aion2/api/character/info
    // 需要移除 /aion2/api 前缀,因为代理会自动添加
    const apiPath = urlObj.pathname.replace('/aion2/api', '');
    proxyUrl = `${API_PROXY_PREFIX}${apiPath}${urlObj.search}`;
  } else if (url.startsWith('/api/aion2')) {
    // 已经是代理 URL 格式
    proxyUrl = url;
  } else {
    // 其他格式,假设是相对路径
    proxyUrl = `${API_PROXY_PREFIX}${url}`;
  }

  console.log('原始 URL:', url);
  console.log('代理 URL:', proxyUrl);

  const response = await fetch(proxyUrl);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * 获取角色信息
 */
async function getCharacterInfo(member: MemberConfig): Promise<any> {
  if (!member.characterInfoUrl) {
    throw new Error('未配置角色信息 URL');
  }

  console.log(`[${member.name}] 步骤 1/3: 请求角色信息...`);
  return await fetchWithProxy(member.characterInfoUrl);
}

/**
 * 获取角色装备列表
 */
async function getCharacterEquipment(member: MemberConfig): Promise<any> {
  if (!member.characterEquipmentUrl) {
    throw new Error('未配置角色装备 URL');
  }

  console.log(`[${member.name}] 步骤 2/3: 请求装备列表...`);
  return await fetchWithProxy(member.characterEquipmentUrl);
}

/**
 * 获取装备详情
 */
async function getEquipmentDetail(
  itemId: number,
  enchantLevel: number,
  slotPos: number,
  member: MemberConfig
): Promise<any> {
  // 从 URL 中提取参数
  if (!member.characterInfoUrl) {
    throw new Error('未配置角色信息 URL');
  }

  const params = parseApiUrl(member.characterInfoUrl);
  if (!params) {
    throw new Error('无法从 URL 中提取 characterId 和 serverId');
  }

  const { characterId, serverId } = params;

  // 构建装备详情 URL
  const url = `/api/aion2/character/equipment/item?id=${itemId}&enchantLevel=${enchantLevel}&characterId=${encodeURIComponent(characterId)}&serverId=${serverId}&slotPos=${slotPos}&lang=zh`;

  console.log(`[${member.name}] 请求装备详情: itemId=${itemId}, slotPos=${slotPos}`);
  return await fetchWithProxy(url);
}

/**
 * 同步单个成员的数据
 */
export async function syncMemberData(
  member: MemberConfig,
  onProgress?: (message: string, type?: 'info' | 'success' | 'error') => void
): Promise<{
  success: boolean;
  characterInfo?: any;
  equipmentData?: any;
  equipmentDetails?: any[];
  error?: string;
}> {
  const log = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    console.log(`[${member.name}] ${message}`);
    onProgress?.(message, type);
  };

  try {
    log(`开始同步成员: ${member.name} (${member.id})`, 'info');

    // 1. 获取角色信息
    const characterInfo = await getCharacterInfo(member);
    await delay(300);
    log('✓ 角色信息获取成功', 'success');

    // 2. 获取装备列表
    const equipmentData = await getCharacterEquipment(member);
    await delay(300);
    log('✓ 装备列表获取成功', 'success');

    // 3. 获取装备详情
    const equipmentList = equipmentData?.equipment?.equipmentList || [];

    if (equipmentList.length === 0) {
      log('该角色没有装备', 'info');
      return {
        success: true,
        characterInfo,
        equipmentData,
        equipmentDetails: [],
      };
    }

    log(`步骤 3/3: 获取装备详情 (共 ${equipmentList.length} 件装备)...`, 'info');

    const equipmentDetails: any[] = [];

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
        log(`✓ ${equip.slotPosName || equip.slotPos}: ${detail.name || equip.name}`, 'success');
        await delay(300);
      } catch (error: any) {
        log(`✗ ${equip.slotPosName || equip.slotPos}: ${error.message}`, 'error');
      }
    }

    log(`✓ 成功获取 ${equipmentDetails.length}/${equipmentList.length} 件装备详情`, 'success');

    // 4. 保存到服务器文件系统
    try {
      log('正在保存到服务器...', 'info');

      // 动态获取后端 URL (开发环境 localhost:3001, 生产环境使用当前域名)
      const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:3001/api/save-member-data'
        : '/api/save-member-data';

      const saveResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: member.id,
          characterInfo,
          equipmentData,
          equipmentDetails,
        }),
      });

      if (saveResponse.ok) {
        const saveResult = await saveResponse.json();
        log('✓ 数据已保存到服务器文件系统', 'success');
        console.log('保存结果:', saveResult);
      } else {
        log('⚠ 保存到服务器失败,但数据已保存到本地存储', 'info');
      }
    } catch (saveError: any) {
      log('⚠ 无法连接到后端服务,数据已保存到本地存储', 'info');
      console.warn('保存到服务器失败:', saveError.message);
    }

    log(`✓ 同步完成: ${member.name}`, 'success');

    return {
      success: true,
      characterInfo,
      equipmentData,
      equipmentDetails,
    };

  } catch (error: any) {
    log(`✗ 同步失败: ${error.message}`, 'error');
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 批量同步多个成员的数据
 */
export async function syncAllMembers(
  members: MemberConfig[],
  onProgress?: (message: string, type?: 'info' | 'success' | 'error') => void
): Promise<{
  total: number;
  success: number;
  failed: number;
  results: Map<string, any>;
}> {
  const results = new Map<string, any>();
  let successCount = 0;
  let failedCount = 0;

  onProgress?.(`开始批量同步 ${members.length} 名成员...`, 'info');

  for (const member of members) {
    const result = await syncMemberData(member, onProgress);
    results.set(member.id, result);

    if (result.success) {
      successCount++;

      // 保存到 localStorage
      if (result.characterInfo) {
        localStorage.setItem(
          `aion2_character_${member.id}`,
          JSON.stringify(result.characterInfo)
        );
      }

      if (result.equipmentDetails) {
        localStorage.setItem(
          `aion2_equipment_${member.id}`,
          JSON.stringify({
            memberId: member.id,
            lastUpdate: new Date().toISOString(),
            details: result.equipmentDetails,
          })
        );
      }
    } else {
      failedCount++;
    }

    // 成员之间延迟
    await delay(500);
  }

  onProgress?.(
    `同步完成: 成功 ${successCount} / 失败 ${failedCount} / 总计 ${members.length}`,
    successCount === members.length ? 'success' : 'info'
  );

  return {
    total: members.length,
    success: successCount,
    failed: failedCount,
    results,
  };
}
