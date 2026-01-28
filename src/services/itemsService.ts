/**
 * Items Database API Service
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
 * Get items list
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
    throw new Error('Failed to get items list');
  }
  return response.json();
}

/**
 * Get item detail
 * @param id Item ID
 * @param totalLevel Total enchant level (enchant + exceed)
 */
export async function fetchItemDetail(
  id: number,
  totalLevel = 0
): Promise<ItemDetail> {
  const searchParams = new URLSearchParams();
  searchParams.set('level', String(totalLevel));

  const response = await fetch(`${API_BASE}/detail/${id}?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to get item detail');
  }
  return response.json();
}

/**
 * Get filter options
 */
export async function fetchFilters(): Promise<FiltersResponse> {
  const response = await fetch(`${API_BASE}/filters`);
  if (!response.ok) {
    throw new Error('Failed to get filter options');
  }
  return response.json();
}

/**
 * Get sync status
 */
export async function fetchSyncStatus(): Promise<SyncStatusResponse> {
  const response = await fetch(`${API_BASE}/sync/status`);
  if (!response.ok) {
    throw new Error('Failed to get sync status');
  }
  return response.json();
}

/**
 * Start sync task
 * @param force - Whether to force restart (ignore checkpoint)
 */
export async function startSync(force = false): Promise<{ success: boolean; message: string }> {
  const url = force ? `${API_BASE}/sync/start?force=true` : `${API_BASE}/sync/start`;
  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to start sync');
  }
  return response.json();
}

/**
 * Stop sync task
 */
export async function stopSync(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/sync/stop`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to stop sync');
  }
  return response.json();
}

/**
 * Sync specific category
 */
export async function syncCategory(categoryId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/sync/category/${categoryId}`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to sync category');
  }
  return response.json();
}

/**
 * Sync base data
 */
export async function syncBaseData(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/sync/base`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to sync base data');
  }
  return response.json();
}

/**
 * Sync subcategory (second level category) item details
 */
export async function syncSubCategory(subCategoryId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/sync/subcategory/${subCategoryId}`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to sync subcategory');
  }
  return response.json();
}
