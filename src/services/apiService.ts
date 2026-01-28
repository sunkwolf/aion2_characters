// API Service - Generate AION2 Taiwan official API request URLs

import type { MemberConfig } from '../types/admin';

// ============= Constants =============

const API_BASE_URL = 'https://tw.ncsoft.com/aion2/api';

// ============= API URL Generation =============

/**
 * Generate character info API URL
 * @param characterId - Character ID (needs URL encoding)
 * @param serverId - Server ID
 * @returns API URL
 */
export function getCharacterInfoUrl(characterId: string, serverId: number): string {
  return `${API_BASE_URL}/character/info?lang=en&characterId=${characterId}&serverId=${serverId}`;
}

/**
 * Generate character equipment list API URL
 * @param characterId - Character ID (needs URL encoding)
 * @param serverId - Server ID
 * @returns API URL
 */
export function getCharacterEquipmentUrl(characterId: string, serverId: number): string {
  return `${API_BASE_URL}/character/equipment?lang=en&characterId=${characterId}&serverId=${serverId}`;
}

/**
 * Generate equipment detail API URL
 * @param itemId - Equipment ID
 * @param enchantLevel - Total enchant level (enchantLevel + exceedLevel)
 * @param characterId - Character ID (needs URL encoding)
 * @param serverId - Server ID
 * @param slotPos - Equipment slot position
 * @returns API URL
 */
export function getEquipmentDetailUrl(
  itemId: number,
  enchantLevel: number,
  characterId: string,
  serverId: number,
  slotPos: number
): string {
  return `${API_BASE_URL}/character/equipment/item?id=${itemId}&enchantLevel=${enchantLevel}&characterId=${characterId}&serverId=${serverId}&slotPos=${slotPos}&lang=en`;
}

/**
 * Generate character info URL from member config
 */
export function getCharacterUrlFromMember(member: MemberConfig): string | null {
  if (member.characterId && member.serverId !== undefined) {
    return getCharacterInfoUrl(member.characterId, member.serverId);
  }
  return null;
}

/**
 * Generate character equipment URL from member config
 */
export function getCharacterEquipmentUrlFromMember(member: MemberConfig): string | null {
  if (member.characterId && member.serverId !== undefined) {
    return getCharacterEquipmentUrl(member.characterId, member.serverId);
  }
  return null;
}

/**
 * Extract parameters from full URL
 */
export function parseApiUrl(url: string): { characterId: string; serverId: number } | null {
  try {
    const urlObj = new URL(url);
    const characterId = urlObj.searchParams.get('characterId');
    const serverId = urlObj.searchParams.get('serverId');

    if (!characterId || !serverId) {
      return null;
    }

    return {
      characterId: decodeURIComponent(characterId),
      serverId: parseInt(serverId, 10),
    };
  } catch {
    return null;
  }
}


// ============= Equipment Data Processing =============

/**
 * Calculate equipment actual enchant level
 * enchantLevel = enchantLevel + exceedLevel
 * @param enchantLevel - Base enchant level
 * @param exceedLevel - Exceed enchant level
 * @returns Actual enchant level
 */
export function calculateTotalEnchantLevel(enchantLevel: number, exceedLevel: number): number {
  return enchantLevel + exceedLevel;
}

/**
 * Extract parameters needed for detail request from equipment data
 * @param equipment - Equipment basic data (from character info)
 * @returns Equipment ID and total enchant level
 */
export function getEquipmentParams(equipment: {
  id: number;
  enchantLevel?: number;
  exceedLevel?: number;
}): { itemId: number; enchantLevel: number } {
  const enchantLevel = equipment.enchantLevel || 0;
  const exceedLevel = equipment.exceedLevel || 0;
  return {
    itemId: equipment.id,
    enchantLevel: calculateTotalEnchantLevel(enchantLevel, exceedLevel),
  };
}

// ============= Data Validation =============

/**
 * Validate if member config is complete (can make API request)
 */
export function validateMemberConfig(member: MemberConfig): {
  valid: boolean;
  message?: string;
} {
  const hasCharacterId = member.characterId && member.characterId.trim();
  const hasServerId = member.serverId !== undefined && member.serverId !== null;

  if (hasCharacterId && hasServerId) {
    return { valid: true };
  }

  if (!hasCharacterId && !hasServerId) {
    return { valid: false, message: 'Character info not configured' };
  }

  return { valid: false, message: 'Character config incomplete' };
}

/**
 * Check if API URL is valid
 */
export function isValidApiUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'tw.ncsoft.com' && urlObj.pathname.startsWith('/aion2/api/');
  } catch {
    return false;
  }
}

// ============= Error Handling Helpers =============

/**
 * API Error Types
 */
export const ApiErrorType = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  CORS_ERROR: 'CORS_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ApiErrorType = typeof ApiErrorType[keyof typeof ApiErrorType];

/**
 * Parse API error
 */
export function parseApiError(error: any): { type: ApiErrorType; message: string } {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: ApiErrorType.NETWORK_ERROR,
      message: 'Network request failed, please check your connection',
    };
  }

  if (error.message?.includes('CORS')) {
    return {
      type: ApiErrorType.CORS_ERROR,
      message: 'CORS error: Cannot request data directly from browser, please use sync script',
    };
  }

  if (error.status === 404) {
    return {
      type: ApiErrorType.NOT_FOUND,
      message: 'Data not found or invalid character ID/equipment ID',
    };
  }

  return {
    type: ApiErrorType.UNKNOWN,
    message: error.message || 'Unknown error',
  };
}

// ============= Local Data Path Generation =============

/**
 * Generate local path for member character data
 */
export function getMemberDataPath(memberId: string): string {
  return `/data/${memberId}/character.json`;
}

/**
 * Generate local path for member equipment details
 */
export function getMemberEquipmentPath(memberId: string): string {
  return `/data/${memberId}/equipment_details.json`;
}

/**
 * Generate equipment icon URL
 * @param iconPath - Icon path (from API response)
 * @returns Full icon URL
 */
export function getEquipmentIconUrl(iconPath: string): string {
  // If already full URL, return directly
  if (iconPath.startsWith('http://') || iconPath.startsWith('https://')) {
    return iconPath;
  }

  // Assume icons are hosted on official CDN
  return `https://tw.ncsoft.com${iconPath}`;
}
