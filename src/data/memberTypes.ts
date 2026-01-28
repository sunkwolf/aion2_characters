// 成员角色类型定义
export type MemberRole = 'leader' | 'elite' | 'member';

// 成员基础信息
export interface MemberInfo {
  id: string;
  name: string;
  role: MemberRole;
  dataFolder: string;
  joinDate?: string;
}

// 角色 Profile 数据
export interface CharacterProfile {
  characterId: string;
  characterName: string;
  serverId: number;
  serverName: string;
  regionName: string;
  pcId: number;
  classId: number;  // 职业ID
  className: string;
  raceId: number;
  raceName: string;
  gender: number;
  genderName: string;
  characterLevel: number;
  titleId: number;
  titleName: string;
  titleGrade: string;
  profileImage: string;
}

// 属性数据
export interface StatItem {
  type: string;
  name: string;
  value: number;
  statSecondList: string[] | null;
}

// 排名数据
export interface RankingItem {
  rankingContentsType: number;
  rankingContentsName: string;
  rankingType: number | null;
  rank: number | null;
  rankChange: number | null;
  characterName: string | null;
  classId: number | null;
  className: string | null;
  guildName: string | null;
  point: number | null;
  gradeId: number | null;
  gradeName: string | null;
  gradeIcon: string | null;
}

// 装备数据
export interface EquipmentItem {
  id: number;
  name: string;
  enchantLevel: number;
  exceedLevel: number;
  maxEnchantLevel?: number; // 最大强化等级(金装15,红装20)
  maxExceedEnchantLevel?: number; // 最大突破等级
  grade: string;
  slotPos: number;
  slotPosName: string;
  icon: string;
}

// 技能数据
export interface SkillItem {
  id: number;
  name: string;
  needLevel: number;
  skillLevel: number;
  icon: string;
  category: string;
  acquired: number;
  equip: number;
}

// 天族纹章数据
export interface DaevanionBoard {
  id: number;
  name: string;
  totalNodeCount: number;
  openNodeCount: number;
  icon: string;
  open: number;
}

// 称号数据
export interface TitleItem {
  id: number;
  equipCategory: string;
  name: string;
  grade: string;
  totalCount: number;
  ownedCount: number;
  statList: { desc: string }[];
  equipStatList: { desc: string }[];
}

// 角色完整信息数据
export interface CharacterInfo {
  stat: { statList: StatItem[] };
  title: { totalCount: number; ownedCount: number; titleList: TitleItem[] };
  profile: CharacterProfile;
  ranking: { rankingList: RankingItem[] };
  daevanion: { boardList: DaevanionBoard[] };
}

// 装备数据
export interface CharacterEquipment {
  petwing: {
    pet: { id: number; name: string; level: number; icon: string } | null;
    wing: { id: number; name: string; enchantLevel: number; grade: string; icon: string } | null;
  };
  skill: { skillList: SkillItem[] };
  equipment: { equipmentList: EquipmentItem[]; skinList: EquipmentItem[] };
}

// 成员列表数据
export const members: MemberInfo[] = [
  {
    id: 'wenhe',
    name: '温禾',
    role: 'leader',
    dataFolder: 'wenhe',
    joinDate: 'Founding Member'
  },
];

// 获取角色等级名称
export const getRoleName = (role: MemberRole): string => {
  switch (role) {
    case 'leader': return 'Legion Leader';
    case 'elite': return 'Legion Elite';
    case 'member': return 'Legion Member';
  }
};

// 装备品质颜色 - 从低到高: 白 → 绿 → 蓝 → 金 → 青绿 → 红
export const gradeColors: Record<string, string> = {
  'Common': '#9d9d9d',    // 灰白色
  'Rare': '#4caf50',      // 绿色
  'Legend': '#2196f3',    // 蓝色
  'Unique': '#ff9800',    // 金色
  'Special': '#26a69a',   // 青绿色
  'Epic': '#f44336',      // 红色
};

// 职业图标 - 带职业名字（用于成员详情页面右上角大图标）
export const classIcons: Record<string, string> = {
  'Gladiator': 'https://download.plaync.com.tw/AION2/teaser/4th/class-icon-1-hover.webp',
  'Templar': 'https://download.plaync.com.tw/AION2/teaser/4th/class-icon-2-hover.webp',
  'Assassin': 'https://download.plaync.com.tw/AION2/teaser/4th/class-icon-3-hover.webp',
  'Ranger': 'https://download.plaync.com.tw/AION2/teaser/4th/class-icon-4-hover.webp',
  'Chanter': 'https://download.plaync.com.tw/AION2/teaser/4th/class-icon-5-hover.webp',
  'Cleric': 'https://download.plaync.com.tw/AION2/teaser/4th/class-icon-6-hover.webp',
  'Sorcerer': 'https://download.plaync.com.tw/AION2/teaser/4th/class-icon-7-hover.webp',
  'Spiritmaster': 'https://download.plaync.com.tw/AION2/teaser/4th/class-icon-8-hover.webp',
  // Otros
  'Songweaver': 'https://download.plaync.com.tw/AION2/teaser/4th/class-icon-1-hover.webp',
  'Gunslinger': 'https://download.plaync.com.tw/AION2/teaser/4th/class-icon-1-hover.webp',
  'Aethertech': 'https://download.plaync.com.tw/AION2/teaser/4th/class-icon-1-hover.webp',
  'Painter': 'https://download.plaync.com.tw/AION2/teaser/4th/class-icon-1-hover.webp'
};

// 职业小图标 - 不带职业名字（用于管理页面成员卡片）
export const classIconsSmall: Record<string, string> = {
  'Gladiator': 'https://assets.playnccdn.com/static-aion2/characters/img/class/class_icon_gladiator.png',
  'Templar': 'https://assets.playnccdn.com/static-aion2/characters/img/class/class_icon_templar.png',
  'Assassin': 'https://assets.playnccdn.com/static-aion2/characters/img/class/class_icon_assassin.png',
  'Ranger': 'https://assets.playnccdn.com/static-aion2/characters/img/class/class_icon_ranger.png',
  'Chanter': 'https://assets.playnccdn.com/static-aion2/characters/img/class/class_icon_chanter.png',
  'Cleric': 'https://assets.playnccdn.com/static-aion2/characters/img/class/class_icon_cleric.png',
  'Sorcerer': 'https://assets.playnccdn.com/static-aion2/characters/img/class/class_icon_sorcerer.png',
  'Spiritmaster': 'https://assets.playnccdn.com/static-aion2/characters/img/class/class_icon_elementalist.png',
  // Otros
  'Songweaver': 'https://assets.playnccdn.com/static-aion2/characters/img/class/class_icon_gladiator.png',
  'Gunslinger': 'https://assets.playnccdn.com/static-aion2/characters/img/class/class_icon_gladiator.png',
  'Aethertech': 'https://assets.playnccdn.com/static-aion2/characters/img/class/class_icon_gladiator.png',
  'Painter': 'https://assets.playnccdn.com/static-aion2/characters/img/class/class_icon_gladiator.png'
};

