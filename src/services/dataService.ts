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
 * 优先从 localStorage 加载(管理员修改的数据),如果没有则从 public/data/members.json 加载
 */
export async function loadMembers(): Promise<MemberConfig[]> {
  // 优先从 localStorage 加载
  const stored = localStorage.getItem(STORAGE_KEYS.MEMBERS);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      console.log('从 localStorage 加载成员列表:', data.length, '名成员');
      return data;
    } catch {
      console.error('解析本地成员数据失败');
    }
  }

  // 如果 localStorage 没有数据,从服务器加载初始数据
  try {
    console.log('从服务器加载初始成员列表...');
    const response = await fetch('/data/members.json');
    if (response.ok) {
      const data = await response.json();
      // 同步到 localStorage
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(data));
      console.log('初始数据已加载:', data.length, '名成员');
      return data;
    }
  } catch (e) {
    console.warn('从服务器加载成员列表失败', e);
  }

  return [];
}

/**
 * 保存成员列表到 localStorage
 */
export function saveMembers(members: MemberConfig[]): void {
  localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
}

/**
 * 添加成员
 */
export function addMember(members: MemberConfig[], newMember: MemberConfig): MemberConfig[] {
  // 检查 ID 是否重复
  if (members.some(m => m.id === newMember.id)) {
    throw new Error(`成员 ID "${newMember.id}" 已存在`);
  }
  const updated = [...members, newMember];
  saveMembers(updated);
  return updated;
}

/**
 * 更新成员
 */
export function updateMember(members: MemberConfig[], updatedMember: MemberConfig): MemberConfig[] {
  const index = members.findIndex(m => m.id === updatedMember.id);
  if (index === -1) {
    throw new Error(`成员 "${updatedMember.id}" 不存在`);
  }
  const updated = [...members];
  updated[index] = updatedMember;
  saveMembers(updated);
  return updated;
}

/**
 * 删除成员
 */
export function deleteMember(members: MemberConfig[], memberId: string): MemberConfig[] {
  const updated = members.filter(m => m.id !== memberId);
  saveMembers(updated);
  return updated;
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
 */
export async function loadApplications(): Promise<JoinApplication[]> {
  try {
    // 尝试从服务器加载
    const response = await fetch('/data/applications.json');
    if (response.ok) {
      const data = await response.json();
      // 同步到 localStorage
      localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    console.warn('从服务器加载申请列表失败，尝试从本地存储加载', e);
  }

  // 从 localStorage 加载
  const stored = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      console.error('解析本地申请数据失败');
    }
  }

  return [];
}

/**
 * 保存申请列表到 localStorage
 */
export function saveApplications(applications: JoinApplication[]): void {
  localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(applications));
}

/**
 * 添加新申请
 */
export function addApplication(
  applications: JoinApplication[],
  newApp: Omit<JoinApplication, 'id' | 'submittedAt' | 'status'>
): JoinApplication[] {
  const application: JoinApplication = {
    ...newApp,
    id: generateUUID(),
    submittedAt: new Date().toISOString(),
    status: 'pending',
  };
  const updated = [...applications, application];
  saveApplications(updated);
  return updated;
}

/**
 * 审批申请
 */
export function reviewApplication(
  applications: JoinApplication[],
  applicationId: string,
  status: 'approved' | 'rejected',
  reviewNote?: string
): JoinApplication[] {
  const index = applications.findIndex(a => a.id === applicationId);
  if (index === -1) {
    throw new Error(`申请 "${applicationId}" 不存在`);
  }

  const updated = [...applications];
  updated[index] = {
    ...updated[index],
    status,
    reviewedAt: new Date().toISOString(),
    reviewNote,
  };
  saveApplications(updated);
  return updated;
}

/**
 * 删除申请
 */
export function deleteApplication(applications: JoinApplication[], applicationId: string): JoinApplication[] {
  const updated = applications.filter(a => a.id !== applicationId);
  saveApplications(updated);
  return updated;
}

/**
 * 从审批通过的申请创建成员配置
 */
export function createMemberFromApplication(application: JoinApplication): Omit<MemberConfig, 'characterId' | 'serverId'> {
  return {
    id: application.characterName.toLowerCase().replace(/\s+/g, '_'),
    name: application.characterName,
    role: 'member',
    joinDate: new Date().toISOString().split('T')[0],
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
    const response = await fetch(`/data/${memberId}/equipment_details.json`);
    if (response.ok) {
      return await response.json();
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
 * 生成 UUID
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
