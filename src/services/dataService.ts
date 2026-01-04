// 数据服务 - 处理成员和申请数据的加载、保存、导出

import type { MemberConfig, JoinApplication, EquipmentDetailsCache } from '../types/admin';

// ============= 常量 =============

const STORAGE_KEYS = {
  MEMBERS: 'chunxia_members',
  APPLICATIONS: 'chunxia_applications',
  EQUIPMENT_CACHE: 'chunxia_equipment_cache',
  ADMIN_LOGIN: 'chunxia_admin_login',
};

// ============= 成员管理 =============

/**
 * 加载成员列表
 * 从后端 API 加载，实现跨设备同步
 */
export async function loadMembers(): Promise<MemberConfig[]> {
  try {
    console.log('从后端 API 加载成员列表...');
    const response = await fetch('/api/members');
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log('成功加载成员列表:', result.data.length, '名成员');
        return result.data;
      }
    }
  } catch (e) {
    console.error('从后端加载成员列表失败:', e);
  }

  return [];
}

/**
 * 保存成员列表到后端
 */
export async function saveMembers(members: MemberConfig[]): Promise<boolean> {
  try {
    const response = await fetch('/api/members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(members),
    });

    const result = await response.json();
    if (result.success) {
      console.log('成员列表保存成功');
      return true;
    } else {
      console.error('保存失败:', result.error);
      return false;
    }
  } catch (e) {
    console.error('保存成员列表失败:', e);
    return false;
  }
}

/**
 * 添加成员
 */
export async function addMember(members: MemberConfig[], newMember: MemberConfig): Promise<MemberConfig[]> {
  // 检查 ID 是否重复
  if (members.some(m => m.id === newMember.id)) {
    throw new Error(`成员 ID "${newMember.id}" 已存在`);
  }
  const updated = [...members, newMember];
  await saveMembers(updated);
  return updated;
}

/**
 * 更新成员
 */
export async function updateMember(members: MemberConfig[], updatedMember: MemberConfig): Promise<MemberConfig[]> {
  const index = members.findIndex(m => m.id === updatedMember.id);
  if (index === -1) {
    throw new Error(`成员 "${updatedMember.id}" 不存在`);
  }
  const updated = [...members];
  updated[index] = updatedMember;
  await saveMembers(updated);
  return updated;
}

/**
 * 删除成员
 * 先调用后端 DELETE API 删除成员数据文件夹,然后更新 members.json
 */
export async function deleteMember(members: MemberConfig[], memberId: string): Promise<MemberConfig[]> {
  try {
    // 1. 调用后端 DELETE API 删除成员数据文件夹
    console.log(`正在删除成员: ${memberId}`);
    const response = await fetch(`/api/members/${encodeURIComponent(memberId)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知错误' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || '删除失败');
    }

    console.log(`✓ 成员 ${memberId} 删除成功`);

    // 2. 更新本地成员列表(从数组中移除)
    const updated = members.filter(m => m.id !== memberId);

    // 3. 保存更新后的列表到后端
    await saveMembers(updated);

    return updated;
  } catch (error: any) {
    console.error(`删除成员 ${memberId} 失败:`, error);
    throw new Error(`删除失败: ${error.message}`);
  }
}

/**
 * 导出成员列表为 JSON 文件
 */
export function exportMembersToFile(members: MemberConfig[]): void {
  const json = JSON.stringify(members, null, 2);
  downloadFile(json, 'members.json', 'application/json');
}

// ============= 申请管理 =============

/**
 * 加载申请列表
 * 从后端 API 加载，实现跨设备同步
 */
export async function loadApplications(): Promise<JoinApplication[]> {
  try {
    console.log('从后端 API 加载申请列表...');
    const response = await fetch('/api/applications');
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log('成功加载申请列表:', result.data.length, '条申请');
        return result.data;
      }
    }
  } catch (e) {
    console.error('从后端加载申请列表失败:', e);
  }

  return [];
}

/**
 * 添加新申请
 */
export async function addApplication(
  newApp: Omit<JoinApplication, 'id' | 'submittedAt' | 'status'>
): Promise<JoinApplication> {
  try {
    const response = await fetch('/api/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newApp),
    });

    const result = await response.json();
    if (result.success) {
      console.log('申请提交成功');
      return result.data;
    } else {
      throw new Error(result.error || '提交失败');
    }
  } catch (e) {
    console.error('提交申请失败:', e);
    throw e;
  }
}

/**
 * 审批申请
 */
export async function reviewApplication(
  applicationId: string,
  status: 'approved' | 'rejected',
  reviewNote?: string
): Promise<JoinApplication> {
  try {
    const response = await fetch(`/api/applications/${applicationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, reviewNote }),
    });

    const result = await response.json();
    if (result.success) {
      console.log('申请审核成功');
      return result.data;
    } else {
      throw new Error(result.error || '审核失败');
    }
  } catch (e) {
    console.error('审核申请失败:', e);
    throw e;
  }
}

/**
 * 删除申请
 */
export async function deleteApplication(applicationId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/applications/${applicationId}`, {
      method: 'DELETE',
    });

    const result = await response.json();
    if (result.success) {
      console.log('申请删除成功');
      return true;
    } else {
      throw new Error(result.error || '删除失败');
    }
  } catch (e) {
    console.error('删除申请失败:', e);
    throw e;
  }
}

/**
 * 生成安全的成员 ID
 * 处理中文、特殊字符、数字等情况
 */
function generateSafeMemberId(name: string): string {
  // 移除所有空格
  let id = name.trim().replace(/\s+/g, '');

  // 如果是纯数字，添加前缀
  if (/^\d+$/.test(id)) {
    id = 'member_' + id;
  }

  // 如果包含中文或特殊字符，转换为拼音或使用时间戳
  // 这里使用简单的方案：保留字母数字，其他字符用下划线替换
  id = id.replace(/[^a-zA-Z0-9]/g, '_');

  // 转为小写
  id = id.toLowerCase();

  // 如果 ID 为空或只有下划线，使用时间戳
  if (!id || /^_+$/.test(id)) {
    id = 'member_' + Date.now();
  }

  // 确保 ID 不以数字开头（某些系统可能有此要求）
  if (/^\d/.test(id)) {
    id = 'm_' + id;
  }

  // 限制长度
  if (id.length > 50) {
    id = id.substring(0, 50);
  }

  return id;
}

/**
 * 从审批通过的申请创建成员配置
 */
export function createMemberFromApplication(application: JoinApplication): Omit<MemberConfig, 'characterId' | 'serverId'> {
  return {
    id: generateSafeMemberId(application.characterName),
    name: application.characterName,
    role: 'member',
  };
}

/**
 * 导出申请列表为 JSON 文件
 */
export function exportApplicationsToFile(applications: JoinApplication[]): void {
  const json = JSON.stringify(applications, null, 2);
  downloadFile(json, 'applications.json', 'application/json');
}

// ============= 装备缓存 =============

/**
 * 获取成员的装备详情缓存
 */
export async function getEquipmentCache(memberId: string): Promise<EquipmentDetailsCache | null> {
  try {
    const response = await fetch(`/data/${memberId}/equipment_details.json?t=${Date.now()}`);
    if (response.ok) {
      const data = await response.json();

      // 检查数据格式:
      // 新格式: {equipment: {...}, skill: {...}, petwing: {...}} (API原始格式)
      // 旧格式: {memberId, lastUpdate, details: [...]} (缓存格式)

      if (data.equipment && data.equipment.equipmentList) {
        // 新格式(API原始格式) - 转换为缓存格式
        const cache: EquipmentDetailsCache = {
          memberId,
          lastUpdate: new Date().toISOString(),
          details: data.equipment.equipmentList || []
        };
        return cache;
      } else if (data.details && Array.isArray(data.details)) {
        // 旧格式(缓存格式) - 直接返回
        return data;
      }
    }
  } catch (e) {
    console.warn(`加载成员 ${memberId} 的装备缓存失败`, e);
  }

  // 尝试从 localStorage
  const key = `${STORAGE_KEYS.EQUIPMENT_CACHE}_${memberId}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      console.error('解析装备缓存失败');
    }
  }

  return null;
}

/**
 * 保存装备详情缓存到 localStorage
 */
export function saveEquipmentCache(cache: EquipmentDetailsCache): void {
  const key = `${STORAGE_KEYS.EQUIPMENT_CACHE}_${cache.memberId}`;
  localStorage.setItem(key, JSON.stringify(cache));
}

/**
 * 导出装备缓存为 JSON 文件
 */
export function exportEquipmentCacheToFile(cache: EquipmentDetailsCache): void {
  const json = JSON.stringify(cache, null, 2);
  downloadFile(json, `${cache.memberId}_equipment_details.json`, 'application/json');
}

// ============= 管理员认证 =============

const ADMIN_PASSWORD = 'chunxia2025';

/**
 * 验证管理员密码
 */
export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

/**
 * 检查是否已登录
 */
export function isAdminLoggedIn(): boolean {
  return localStorage.getItem(STORAGE_KEYS.ADMIN_LOGIN) === 'true';
}

/**
 * 管理员登录
 */
export function adminLogin(password: string): boolean {
  if (verifyAdminPassword(password)) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_LOGIN, 'true');
    return true;
  }
  return false;
}

/**
 * 管理员登出
 */
export function adminLogout(): void {
  localStorage.removeItem(STORAGE_KEYS.ADMIN_LOGIN);
}

// ============= 工具函数 =============

/**
 * 下载文件
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 导入 JSON 文件
 */
export function importJsonFile<T>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        resolve(data);
      } catch (err) {
        reject(new Error('JSON 解析失败'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file, 'utf-8');
  });
}
