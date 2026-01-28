// Admin panel type definitions

// ============= Member Management Related =============

// Member config (extended version with API config)
export interface MemberConfig {
  id: string;                    // Member ID (uses characterId as unique identifier)
  name: string;                  // Display name
  role: 'leader' | 'elite' | 'member';
  title?: string;                // Title
  // Character identifiers
  characterId: string;           // tw.ncsoft.com character ID (Base64 encoded, used as folder name)
  serverId: number;              // Server ID (e.g., 1001 = Siel)
  // Metadata
  lastSyncTime?: string;         // Last sync time (ISO format)
}

// ============= Join Application Related =============

export interface JoinApplication {
  id: string;                    // Application ID (UUID)
  characterUrl: string;          // Character page URL
  characterId: string;           // Character ID (parsed on submit)
  characterName: string;         // Character name (parsed on submit)
  serverId: number;              // Server ID (parsed on submit)
  serverName: string;            // Server name (parsed on submit)
  submittedAt: string;           // Submit time (ISO format)
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;           // Review time
  reviewNote?: string;           // Review note
}

// ============= Equipment Details Related =============

// Equipment stat
export interface EquipmentStat {
  id?: string;
  name: string;
  value: string;
  tooltip?: string;
  minValue?: string;     // Minimum value
  extra?: string;        // Exceed bonus
  exceed?: boolean;      // Is exceed stat
}

// Magic stone stat
export interface MagicStoneStat {
  id?: string;
  name: string;
  value: string;
  grade?: string;
  slotPos?: number;
}

// God stone stat
export interface GodStoneStat {
  name: string;
  desc: string;
  grade?: string;
  icon?: string;
  slotPos?: number;
}

// Skill info
export interface EquipmentSkill {
  id: number;
  name: string;
  level: number;
  icon: string;
}

// Set bonus
export interface SetBonus {
  degree: number;           // Piece requirement (2-piece set, 4-piece set, etc.)
  descriptions: string[];   // Effect description list
}

// Set info
export interface SetInfo {
  id: string;               // Set ID
  name: string;             // Set name
  equippedCount: number;    // Equipped count
  items?: any[];            // Items in set
  bonuses: SetBonus[];      // Set effects
}

// Equipment detail data (from tw.ncsoft.com API)
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
  soulBindRate?: string;        // Soul bind progress (percentage)
  slotPos?: number;              // Equipment slot position, for distinguishing Ring1/Ring2 etc with same ID
  slotPosName?: string;          // Equipment slot name
  // Stats
  mainStats?: EquipmentStat[];
  subStats?: EquipmentStat[];
  subSkills?: EquipmentSkill[];
  magicStoneStat?: MagicStoneStat[];
  godStoneStat?: GodStoneStat[];
  // Set info (Arcana)
  set?: SetInfo;
  // Set effects (Arcana) - compatible with old format
  bonuses?: SetBonus[];
  // Sources
  sources?: string[];
}

// Equipment details cache file structure
export interface EquipmentDetailsCache {
  memberId: string;
  lastUpdate: string;  // ISO timestamp
  details: EquipmentDetail[];  // Equipment details array
}

// ============= Admin Panel State =============

export type AdminTab = 'members' | 'applications' | 'sync';

// ============= Utility Types =============

// API Config
export interface ApiConfig {
  characterId: string;
  serverId: number;
}

// Import result
export interface ImportResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// ============= PVE Rating Related =============

// Rating scores
export interface RatingScores {
  score: number;  // PVE rating score
}

// Rating info
export interface Rating {
  id: string;
  scores: RatingScores;
  modelType: string;      // Rating model type (e.g., "PVE")
  modelVersion: string;   // Rating model version (e.g., "PvE-1.1")
  ratedAt: string;        // Rating time (ISO format)
}
