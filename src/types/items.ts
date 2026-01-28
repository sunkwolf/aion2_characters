/**
 * Item database type definitions
 */

// Grade
export interface Grade {
  id: string;
  name: string;
  name_cn: string;
}

// Class
export interface GameClass {
  id: string;
  name: string;
  name_cn: string;
}

// Category
export interface Category {
  id: string;
  name: string;
  name_cn: string;
  parent_id: string | null;
  children?: Category[];
}

// Item list item
export interface ItemListItem {
  id: number;
  name: string;
  name_cn: string;
  image: string;
  grade: string;
  grade_name: string;
  grade_name_cn: string;
  category_id: string | null;
  category_name: string;
  category_name_cn: string;
  parent_category_id: string | null;
  tradable: boolean;
  enchantable: boolean;
  max_enchant_level: number;
  max_exceed_enchant_level: number;
  classes: string[];
  classes_cn: string[];
  options: string[];
}

// Item stat
export interface ItemStat {
  id: string;
  name: string;
  value: string;
  minValue?: string;
  extra?: string;
  exceed?: boolean;
}

// Set item
export interface SetItem {
  id: number;
  name: string;
  grade: string;
}

// Set bonus
export interface SetBonus {
  degree: number;
  descriptions: string[];
}

// Set info
export interface SetInfo {
  id: string;
  name: string;
  equippedCount: number;
  items: SetItem[];
  bonuses: SetBonus[];
}

// Item detail
export interface ItemDetail extends ItemListItem {
  level: number;
  equip_level: number;
  type: string | null;
  sources: string[];
  sources_cn: string[];
  currentEnchantLevel: number;
  currentExceedLevel: number;
  mainStats: ItemStat[];
  subStats: ItemStat[];
  availableStats: { enchant_level: number; exceed_level: number }[];
  // Additional fields
  race_name?: string;
  race_name_cn?: string;
  costumes?: string;
  costumes_cn?: string;
  magic_stone_slot_count?: number;
  god_stone_slot_count?: number;
  sub_stat_count?: number;
  sub_skill_count_max?: number;
  set?: SetInfo;
  set_cn?: SetInfo;
  // Non-equipment item fields
  desc?: string;
  desc_cn?: string;
  cool_time?: number;
  duration_min?: number;
  duration_max?: number;
  // Full API response - frontend can use any field directly
  raw_data?: Record<string, unknown>;
  raw_data_cn?: Record<string, unknown>;
}

// Pagination info
export interface Pagination {
  page: number;
  size: number;
  total: number;
  lastPage: number;
}

// Items list response
export interface ItemsListResponse {
  contents: ItemListItem[];
  pagination: Pagination;
}

// Filter options response
export interface FiltersResponse {
  grades: Grade[];
  classes: GameClass[];
  categories: Category[];
}

// Sync progress
export interface SyncProgress {
  phase: 'list' | 'details';
  categoryId: string | null;
  currentPage: number;
  totalPages: number;
  currentItemIndex: number;
  totalItems: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string | null;
  completedAt: string | null;
}

// Sync category
export interface SyncCategory {
  id: string;
  name: string;
}

// Sync status response
export interface SyncStatusResponse {
  isRunning: boolean;
  phase: 'list' | 'details' | null;
  currentCategory: string | null;
  hasScheduledBatch: boolean;
  progress: SyncProgress | null;
  stats: {
    itemCount: number;
    statsCount: number;
    lastSync: {
      phase: string;
      completedAt: string;
    } | null;
  };
  categories: SyncCategory[];
}

// Filter params
export interface ItemFiltersParams {
  page?: number;
  size?: number;
  grade?: string;
  categoryId?: string;
  classId?: string;
  keyword?: string;
}

// Grade color mapping
export const GRADE_COLORS: Record<string, string> = {
  Common: '#9d9d9d',
  Rare: '#4a90d9',
  Legend: '#9b59b6',
  Unique: '#e67e22',
  Epic: '#e74c3c',
};

// Grade order
export const GRADE_ORDER = ['Common', 'Rare', 'Legend', 'Unique', 'Epic'];
