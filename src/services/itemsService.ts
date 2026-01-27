/**
 * 物品数据库 API 服务
 */

import type {
  ItemsListResponse,
  ItemDetail,
  FiltersResponse,
  SyncStatusResponse,
  ItemFiltersParams,
} from '../types/items';

const API_BASE = '/api/items';

/**
 * 获取物品列表
 */
export async function fetchItemsList(params: ItemFiltersParams = {}): Promise<ItemsListResponse> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', String(params.page));
  if (params.size) searchParams.set('size', String(params.size));
  if (params.grade) searchParams.set('grade', params.grade);
  if (params.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params.classId) searchParams.set('classId', params.classId);
  if (params.keyword) searchParams.set('keyword', params.keyword);

  const response = await fetch(`${API_BASE}/list?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error('获取物品列表失败');
  }
  return response.json();
}

/**
 * 获取物品详情
 * @param id 物品ID
 * @param totalLevel 总强化等级（强化+突破）
 */
export async function fetchItemDetail(
  id: number,
  totalLevel = 0
): Promise<ItemDetail> {
  const searchParams = new URLSearchParams();
  searchParams.set('level', String(totalLevel));

  const response = await fetch(`${API_BASE}/detail/${id}?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error('获取物品详情失败');
  }
  return response.json();
}

/**
 * 获取筛选选项
 */
export async function fetchFilters(): Promise<FiltersResponse> {
  const response = await fetch(`${API_BASE}/filters`);
  if (!response.ok) {
    throw new Error('获取筛选选项失败');
  }
  return response.json();
}

/**
 * 获取同步状态
 */
export async function fetchSyncStatus(): Promise<SyncStatusResponse> {
  const response = await fetch(`${API_BASE}/sync/status`);
  if (!response.ok) {
    throw new Error('获取同步状态失败');
  }
  return response.json();
}

/**
 * 启动同步任务
 * @param force - 是否强制重新开始（忽略断点续存）
 */
export async function startSync(force = false): Promise<{ success: boolean; message: string }> {
  const url = force ? `${API_BASE}/sync/start?force=true` : `${API_BASE}/sync/start`;
  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) {
    throw new Error('启动同步失败');
  }
  return response.json();
}

/**
 * 停止同步任务
 */
export async function stopSync(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/sync/stop`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('停止同步失败');
  }
  return response.json();
}

/**
 * 同步指定分类
 */
export async function syncCategory(categoryId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/sync/category/${categoryId}`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('同步分类失败');
  }
  return response.json();
}

/**
 * 同步基础数据
 */
export async function syncBaseData(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/sync/base`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('同步基础数据失败');
  }
  return response.json();
}

/**
 * 同步子分类（第二层分类）的物品详情
 */
export async function syncSubCategory(subCategoryId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/sync/subcategory/${subCategoryId}`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('同步子分类失败');
  }
  return response.json();
}
