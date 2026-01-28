// Daevanion data type definitions

/**
 * Class board mapping config type
 */
export interface ClassBoardMapping {
  classId: number;
  className: string;
  classNameSimplified: string;
  classNameEn: string;
  boardIds: number[];
}

export interface ClassBoardConfig {
  version: string;
  lastUpdated: string;
  classes: ClassBoardMapping[];
}

// Cached config data
let cachedConfig: ClassBoardConfig | null = null;

/**
 * Load class board mapping config
 */
async function loadClassBoardConfig(): Promise<ClassBoardConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    // Add timestamp parameter to avoid browser caching
    const timestamp = new Date().getTime();
    const response = await fetch(`/data/class_board_mapping.json?v=${timestamp}`);
    if (response.ok) {
      const config: ClassBoardConfig = await response.json();
      cachedConfig = config;
      return cachedConfig;
    }
  } catch (error) {
    console.warn('[Daevanion] Failed to load class board mapping config:', error);
  }

  // Return default config (empty class list)
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    classes: []
  };
}

/**
 * Get Daevanion board ID list by class English name
 * @param classNameEn Class English name (from character info ranking.className, e.g., "Gladiator")
 * @returns Daevanion board ID array, empty array if not found
 */
export async function getBoardIdsByClassName(classNameEn: string): Promise<number[]> {
  const config = await loadClassBoardConfig();
  console.log(`[Daevanion] Looking up class config: classNameEn=${classNameEn}`);
  console.log(`[Daevanion] Available class configs:`, config.classes.map(c => `${c.classNameEn}(${c.className})`));

  const classMapping = config.classes.find(c => c.classNameEn === classNameEn);

  if (classMapping) {
    console.log(`[Daevanion] Found config for class ${classNameEn}(${classMapping.className}):`, classMapping.boardIds);
    return classMapping.boardIds;
  } else {
    console.warn(`[Daevanion] Config not found for class ${classNameEn}, returning empty array`);
    return [];
  }
}

/**
 * Get classId by Chinese class name (supports simplified and traditional)
 * @param className Chinese class name (e.g., "劍星", "剑星", "弓星")
 * @returns classId or undefined
 */
export async function getClassIdByChineseName(className: string): Promise<number | undefined> {
  const config = await loadClassBoardConfig();
  console.log(`[Daevanion] Looking up classId by Chinese name: ${className}`);

  // Look up in config, supports traditional and simplified matching
  const classMapping = config.classes.find(c => {
    return c.className === className || c.classNameSimplified === className;
  });

  if (classMapping) {
    console.log(`[Daevanion] Found classId for class ${className}: ${classMapping.classId}`);
    return classMapping.classId;
  } else {
    console.warn(`[Daevanion] Config not found for class ${className}`);
    return undefined;
  }
}

/**
 * Get Daevanion board ID list by class ID
 * @param classId Class ID
 * @returns Daevanion board ID array, empty array if not found
 */
export async function getBoardIdsByClassId(classId: number): Promise<number[]> {
  const config = await loadClassBoardConfig();
  console.log(`[Daevanion] Looking up class config: classId=${classId}`);
  console.log(`[Daevanion] Available class configs:`, config.classes.map(c => `id:${c.classId}(${c.className})`));

  const classMapping = config.classes.find(c => c.classId === classId);

  if (classMapping) {
    console.log(`[Daevanion] Found config for classId ${classId}(${classMapping.className}):`, classMapping.boardIds);
    return classMapping.boardIds;
  } else {
    console.warn(`[Daevanion] Config not found for classId ${classId}, returning empty array`);
    return [];
  }
}

export interface DaevanionEffect {
  desc: string;
}

export interface DaevanionBoard {
  nodeList: Array<{
    boardId: number;
    nodeId: number;
    name: string;
    row: number;
    col: number;
    grade: string;
    type: string;
    icon: string;
    effectList: DaevanionEffect[];
    open: number;
  }>;
  openStatEffectList: DaevanionEffect[];
  openSkillEffectList: DaevanionEffect[];
}

export type DaevanionBoards = (DaevanionBoard | null)[];

/**
 * Aggregated Daevanion effect data
 */
export interface AggregatedDaevanionEffects {
  statEffects: string[];      // Aggregated stat effects
  skillEffects: string[];      // Aggregated skill effects
  totalStats: number;          // Total stat effects count
  totalSkills: number;         // Total skill effects count
}

/**
 * Merge all Daevanion board effects (aggregate same entries)
 * @param boards 6 Daevanion board data
 * @returns Aggregated stat effects and skill effects
 */
export function mergeDaevanionEffects(boards: DaevanionBoards): AggregatedDaevanionEffects {
  console.log('[Daevanion] Starting to aggregate Daevanion effects, boards count:', boards.length);
  console.log('[Daevanion] boards details:', boards);

  const statMap = new Map<string, { value: number; isPercentage: boolean }>();  // Stat name -> {accumulated value, is percentage}
  const skillMap = new Map<string, { value: number; isPercentage: boolean }>(); // Skill name -> {accumulated level, is percentage}

  // Iterate through all boards
  for (const board of boards) {
    if (!board) {
      console.log('[Daevanion] Skipping null board');
      continue;
    }

    console.log('[Daevanion] Processing board:', {
      hasOpenStatEffectList: !!board.openStatEffectList,
      hasOpenSkillEffectList: !!board.openSkillEffectList,
      statCount: board.openStatEffectList?.length || 0,
      skillCount: board.openSkillEffectList?.length || 0
    });

    // Aggregate stat effects
    if (board.openStatEffectList) {
      for (const effect of board.openStatEffectList) {
        console.log('[Daevanion] Aggregating stat effect:', effect.desc);
        aggregateEffect(effect.desc, statMap);
      }
    }

    // Aggregate skill effects
    if (board.openSkillEffectList) {
      for (const effect of board.openSkillEffectList) {
        console.log('[Daevanion] Aggregating skill effect:', effect.desc);
        aggregateEffect(effect.desc, skillMap);
      }
    }
  }

  console.log('[Daevanion] Aggregated statMap:', statMap);
  console.log('[Daevanion] Aggregated skillMap:', skillMap);

  // Convert to arrays, add correct symbol based on percentage
  const statEffects = Array.from(statMap.entries()).map(([name, data]) => {
    const valueStr = data.value > 0 ? `+${data.value}` : `${data.value}`;
    return data.isPercentage ? `${name} ${valueStr}%` : `${name} ${valueStr}`;
  });

  const skillEffects = Array.from(skillMap.entries()).map(([name, data]) => {
    const valueStr = data.value > 0 ? `+${data.value}` : `${data.value}`;
    return data.isPercentage ? `${name} ${valueStr}%` : `${name} ${valueStr}`;
  });

  console.log('[Daevanion] Final statEffects:', statEffects);
  console.log('[Daevanion] Final skillEffects:', skillEffects);

  return {
    statEffects,
    skillEffects,
    totalStats: statEffects.length,
    totalSkills: skillEffects.length
  };
}

/**
 * Aggregate single effect description
 * Supported formats:
 * - "Attack Power +100"
 * - "Cooldown Reduction +5%"
 * - "Skill Name +1"
 * - "Stat Name 100"
 */
function aggregateEffect(desc: string, map: Map<string, { value: number; isPercentage: boolean }>) {
  // Match format: "Name +Value%" or "Name +Value" or "Name Value"
  const match = desc.match(/^(.+?)\s+\+?(-?\d+(?:\.\d+)?)%?$/);

  if (match) {
    const name = match[1].trim();
    const valueStr = match[2];
    const value = parseFloat(valueStr);

    // Check if percentage format
    const isPercentage = desc.includes('%');

    if (map.has(name)) {
      const existing = map.get(name)!;
      map.set(name, { value: existing.value + value, isPercentage });
    } else {
      map.set(name, { value, isPercentage });
    }
  } else {
    // Format cannot be parsed, use description as key, count +1
    if (map.has(desc)) {
      const existing = map.get(desc)!;
      map.set(desc, { value: existing.value + 1, isPercentage: false });
    } else {
      map.set(desc, { value: 1, isPercentage: false });
    }
  }
}

/**
 * Load Daevanion data from member folder
 * @param memberId Member ID
 * @returns Daevanion board data
 */
export async function loadMemberDaevanion(memberId: string): Promise<DaevanionBoards | null> {
  try {
    const response = await fetch(`/data/${memberId}/daevanion_boards.json`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn(`Failed to load Daevanion data for member ${memberId}:`, error);
    return null;
  }
}

/**
 * Fetch character Daevanion data via API (6 boards) - concurrent requests
 * @param characterId Character ID
 * @param serverId Server ID
 * @param classId Class ID
 * @returns Daevanion board data
 */
export async function fetchDaevanionBoards(
  characterId: string,
  serverId: number,
  classId?: number
): Promise<DaevanionBoards | null> {
  try {
    console.log(`[Daevanion] fetchDaevanionBoards called:`, {
      characterId,
      serverId,
      classId,
      classIdType: typeof classId
    });

    if (!classId) {
      console.error(`[Daevanion] classId not provided or empty: ${classId}`);
      return null;
    }

    // Get corresponding board ID list by class ID
    const boardIds = await getBoardIdsByClassId(classId);
    console.log(`[Daevanion] Class ID: ${classId}, using board IDs:`, boardIds);

    if (boardIds.length === 0) {
      console.error(`[Daevanion] Board config not found for classId ${classId}, cannot fetch Daevanion data`);
      return null;
    }

    // Concurrent requests for all boards
    const promises = boardIds.map(async (boardId) => {
      try {
        const response = await fetch(
          `/api/character/daevanion?characterId=${encodeURIComponent(characterId)}&serverId=${serverId}&boardId=${boardId}`
        );

        if (response.ok) {
          const result = await response.json();
          console.log(`[Daevanion] Board ${boardId} API response:`, result);

          // Check data structure
          if (result.success && result.data) {
            console.log(`[Daevanion] Board ${boardId} data structure:`, {
              hasNodeList: !!result.data.nodeList,
              hasOpenStatEffectList: !!result.data.openStatEffectList,
              hasOpenSkillEffectList: !!result.data.openSkillEffectList,
              statCount: result.data.openStatEffectList?.length || 0,
              skillCount: result.data.openSkillEffectList?.length || 0
            });
            return result.data;
          } else {
            console.warn(`[Daevanion] Board ${boardId} data format incorrect:`, result);
            return null;
          }
        } else {
          console.warn(`[Daevanion] Failed to get Daevanion board ${boardId}: HTTP ${response.status}`);
          return null;
        }
      } catch (error) {
        console.warn(`[Daevanion] Failed to get Daevanion board ${boardId}:`, error);
        return null;
      }
    });

    // Wait for all requests to complete
    const boards = await Promise.all(promises);
    console.log(`[Daevanion] All board data:`, boards);
    return boards;
  } catch (error) {
    console.warn('[Daevanion] Failed to get Daevanion data:', error);
    return null;
  }
}
