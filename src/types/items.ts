/**
 * 物品数据库类型定义
 */

// 品质
export interface Grade {
  id: string;
  name: string;
  name_cn: string;
}

// 职业
export interface GameClass {
  id: string;
  name: string;
  name_cn: string;
}

// 分类
export interface Category {
  id: string;
  name: string;
  name_cn: string;
  parent_id: string | null;
  children?: Category[];
}

// 物品列表项
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

// 物品属性
export interface ItemStat {
  id: string;
  name: string;
  value: string;
  minValue?: string;
  extra?: string;
  exceed?: boolean;
}

// 套装物品
export interface SetItem {
  id: number;
  name: string;
  grade: string;
}

// 套装效果
export interface SetBonus {
  degree: number;
  descriptions: string[];
}

// 套装信息
export interface SetInfo {
  id: string;
  name: string;
  equippedCount: number;
  items: SetItem[];
  bonuses: SetBonus[];
}

// 物品详情
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
  // 新增字段
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
  // 非装备类物品字段
  desc?: string;
  desc_cn?: string;
  cool_time?: number;
  duration_min?: number;
  duration_max?: number;
  // 完整API响应 - 前端可直接使用任意字段
  raw_data?: Record<string, unknown>;
  raw_data_cn?: Record<string, unknown>;
}

// 分页信息
export interface Pagination {
  page: number;
  size: number;
  total: number;
  lastPage: number;
}

// 物品列表响应
export interface ItemsListResponse {
  contents: ItemListItem[];
  pagination: Pagination;
}

// 筛选选项响应
export interface FiltersResponse {
  grades: Grade[];
  classes: GameClass[];
  categories: Category[];
}

// 同步进度
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

// 同步分类
export interface SyncCategory {
  id: string;
  name: string;
}

// 同步状态响应
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

// 筛选参数
export interface ItemFiltersParams {
  page?: number;
  size?: number;
  grade?: string;
  categoryId?: string;
  classId?: string;
  keyword?: string;
}

// 品质颜色映射
export const GRADE_COLORS: Record<string, string> = {
  Common: '#9d9d9d',
  Rare: '#4a90d9',
  Legend: '#9b59b6',
  Unique: '#e67e22',
  Epic: '#e74c3c',
};

// 品质顺序
export const GRADE_ORDER = ['Common', 'Rare', 'Legend', 'Unique', 'Epic'];
