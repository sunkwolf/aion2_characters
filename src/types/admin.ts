// 管理后台类型定义

// ============= 成员管理相关 =============

// 成员配置（扩展版，包含API配置）
export interface MemberConfig {
  id: string;                    // 成员ID（使用 characterId 作为唯一标识）
  name: string;                  // 显示名称
  role: 'leader' | 'elite' | 'member';
  title?: string;                // 称号
  // 角色标识
  characterId: string;           // tw.ncsoft.com 角色ID（Base64编码，作为文件夹名）
  serverId: number;              // 服务器ID（如 1001 = 希埃爾）
  // 元数据
  lastSyncTime?: string;         // 最后同步时间 (ISO 格式)
}

// ============= 入团申请相关 =============

export interface JoinApplication {
  id: string;                    // 申请ID (UUID)
  characterUrl: string;          // 角色页面URL
  characterId: string;           // 角色ID (提交时已解析)
  characterName: string;         // 角色名称 (提交时已解析)
  serverId: number;              // 服务器ID (提交时已解析)
  serverName: string;            // 服务器名称 (提交时已解析)
  submittedAt: string;           // 提交时间 (ISO 格式)
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;           // 审核时间
  reviewNote?: string;           // 审核备注
}

// ============= 装备详情相关 =============

// 装备属性
export interface EquipmentStat {
  id?: string;
  name: string;
  value: string;
  tooltip?: string;
  minValue?: string;     // 最小值
  extra?: string;        // 突破加成
  exceed?: boolean;      // 是否为突破属性
}

// 魔石属性
export interface MagicStoneStat {
  id?: string;
  name: string;
  value: string;
  grade?: string;
  slotPos?: number;
}

// 神石属性
export interface GodStoneStat {
  name: string;
  desc: string;
  grade?: string;
  icon?: string;
  slotPos?: number;
}

// 技能信息
export interface EquipmentSkill {
  id: number;
  name: string;
  level: number;
  icon: string;
}

// 套装效果
export interface SetBonus {
  degree: number;           // 件数要求 (2件套、4件套等)
  descriptions: string[];   // 效果描述列表
}

// 套装信息
export interface SetInfo {
  id: string;               // 套装ID
  name: string;             // 套装名称
  equippedCount: number;    // 已装备数量
  items?: any[];            // 套装包含的物品
  bonuses: SetBonus[];      // 套装效果
}

// 装备详情数据（来自 tw.ncsoft.com API）
export interface EquipmentDetail {
  id: number;
  name: string;
  grade: string;
  gradeName?: string;
  icon: string;
  level?: number;
  enchantLevel: number;
  maxEnchantLevel?: number;
  maxExceedEnchantLevel?: number;
  raceName?: string;
  classNames?: string[];
  categoryName?: string;
  equipLevel?: number;
  magicStoneSlotCount?: number;
  godStoneSlotCount?: number;
  soulBindRate?: string;        // 灵魂刻印进度(百分比)
  slotPos?: number;              // 装备槽位置,用于区分Ring1/Ring2等相同ID的装备
  slotPosName?: string;          // 装备槽名称
  // 属性
  mainStats?: EquipmentStat[];
  subStats?: EquipmentStat[];
  subSkills?: EquipmentSkill[];
  magicStoneStat?: MagicStoneStat[];
  godStoneStat?: GodStoneStat[];
  // 套装信息 (阿尔卡那)
  set?: SetInfo;
  // 套装效果 (阿尔卡那) - 兼容旧格式
  bonuses?: SetBonus[];
  // 来源
  sources?: string[];
}

// 装备详情缓存文件结构
export interface EquipmentDetailsCache {
  memberId: string;
  lastUpdate: string;  // ISO timestamp
  details: EquipmentDetail[];  // 装备详情数组
}

// ============= 管理后台状态 =============

export type AdminTab = 'members' | 'applications' | 'sync';

// ============= 工具类型 =============

// API 配置
export interface ApiConfig {
  characterId: string;
  serverId: number;
}

// 导入结果
export interface ImportResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// ============= PVE评分相关 =============

// 评分数据
export interface RatingScores {
  score: number;  // PVE评分分数
}

// 评分信息
export interface Rating {
  id: string;
  scores: RatingScores;
  modelType: string;      // 评分模型类型 (如 "PVE")
  modelVersion: string;   // 评分模型版本 (如 "PvE-1.1")
  ratedAt: string;        // 评分时间 (ISO格式)
}
