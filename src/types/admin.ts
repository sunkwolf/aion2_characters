// 管理后台类型定义

// ============= 成员管理相关 =============

// 成员配置（扩展版，包含API配置）
export interface MemberConfig {
  id: string;                    // 成员ID（唯一标识，对应数据文件夹名）
  name: string;                  // 显示名称
  role: 'leader' | 'elite' | 'member';
  joinDate?: string;             // 入团日期
  // API 配置 - 使用完整 URL (新格式)
  characterInfoUrl?: string;     // 角色信息完整 URL (如: https://tw.ncsoft.com/aion2/api/character/info?lang=zh&characterId=...&serverId=...)
  characterEquipmentUrl?: string; // 角色装备完整 URL (如: https://tw.ncsoft.com/aion2/api/character/equipment?lang=zh&characterId=...&serverId=...)
  // API 配置 - 旧格式 (兼容性保留)
  characterId?: string;          // tw.ncsoft.com 角色ID（编码后的字符串）
  serverId?: number;             // 服务器ID（如 1001 = 希埃爾）
  // 元数据
  lastSyncTime?: string;         // 最后同步时间 (ISO 格式)
}

// ============= 入团申请相关 =============

export interface JoinApplication {
  id: string;                    // 申请ID (UUID)
  characterName: string;         // 角色名称
  className: string;             // 职业
  level?: number;                // 等级
  contact?: string;              // 联系方式
  message?: string;              // 自我介绍
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
}

// 技能信息
export interface EquipmentSkill {
  id: number;
  name: string;
  level: number;
  icon: string;
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
  // 属性
  mainStats?: EquipmentStat[];
  subStats?: EquipmentStat[];
  subSkills?: EquipmentSkill[];
  magicStoneStat?: MagicStoneStat[];
  godStoneStat?: GodStoneStat[];
  // 来源
  sources?: string[];
}

// 装备详情缓存文件结构
export interface EquipmentDetailsCache {
  memberId: string;
  updatedAt: string;
  items: Record<string, EquipmentDetail>; // key: `${slotPos}_${id}`
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
