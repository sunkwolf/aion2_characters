/**
 * Attack Power Calculator
 * Algorithm: Total Score = Attack Power × (Sum of Category %) ÷ 25
 */

/**
 * Attack power breakdown source
 */
export interface AttackPowerBreakdown {
  equipmentFlat: number;        // Equipment/accessory flat value
  daevanionFlat: number;        // Daevanion effect flat value (Extra Attack, PVE Attack, Boss Attack)
  equipmentPercent: number;     // Equipment/accessory percentage
  destruction: number;          // Destruction (Daevanion main stat)
  strength: number;             // Strength stat (equipment affix)
  wingBoss: number;             // Wing effect - Boss Attack (not implemented)
}

/**
 * Attack power calculation result
 */
export interface AttackPowerResult {
  breakdown: AttackPowerBreakdown;  // Source breakdown
  totalFlat: number;                // Total flat value
  totalPercent: number;             // Total percentage
  finalPower: number;               // Final attack power
}

/**
 * Equipment data interface
 */
export interface EquipmentData {
  equipment: {
    equipmentList: Array<{
      name: string;
      slotPosName: string;
      mainStats?: Array<{
        id: string;
        name: string;
        value: string;
        extra: string;
      }>;
      subStats?: Array<{
        id: string;
        name: string;
        value: string;
      }>;
      magicStoneStat?: Array<{
        id: string;
        name: string;
        value: string;
      }>;
    }>;
  };
}

/**
 * Character info interface
 */
export interface CharacterInfo {
  stat: {
    statList: Array<{
      type: string;
      name: string;
      value: number;
      statSecondList: string[] | null;
    }>;
  };
}

/**
 * Daevanion boards interface
 */
export interface DaevanionBoards {
  [key: number]: {
    nodeList: Array<{
      name: string;
      effectList: Array<{
        desc: string;
      }>;
      open: number;
    }>;
  } | null;
}

/**
 * Parse numeric value
 */
function parseValue(value: string): number {
  if (!value) return 0;
  const match = value.match(/([+\-]?\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Check if is percentage
 */
function isPercent(value: string): boolean {
  return value.includes('%');
}

/**
 * Calculate attack power
 */
export function calculateAttackPower(
  equipmentData: EquipmentData,
  characterInfo: CharacterInfo,
  daevanionBoards?: DaevanionBoards | null
): AttackPowerResult {

  const breakdown: AttackPowerBreakdown = {
    equipmentFlat: 0,
    daevanionFlat: 0,
    equipmentPercent: 0,
    destruction: 0,
    strength: 0,
    wingBoss: 0,
  };

  console.log('[Attack Power] Starting calculation...');

  // ========== 1. Extract from equipment ==========
  if (equipmentData?.equipment?.equipmentList) {
    for (const item of equipmentData.equipment.equipmentList) {
      // 1.1 Main stats
      if (item.mainStats) {
        for (const stat of item.mainStats) {
          const value = parseValue(stat.value);
          const extra = parseValue(stat.extra);

          // Weapon fixed attack: base value + enchant value
          if (stat.id === 'WeaponFixingDamage') {
            breakdown.equipmentFlat += value + extra;
            console.log(`  [Main Stat] ${item.slotPosName || item.name} - Attack Power flat: ${value + extra} (${value} + ${extra})`);
          }
          // Equipment percentage attack increase
          else if (stat.id === 'DamageRatio' && isPercent(stat.extra)) {
            breakdown.equipmentPercent += extra;
            console.log(`  [Main Stat] ${item.slotPosName || item.name} - Attack Power percent: +${extra}%`);
          }
        }
      }

      // 1.2 Sub stats
      if (item.subStats) {
        for (const stat of item.subStats) {
          const value = parseValue(stat.value);

          if (stat.id === 'WeaponFixingDamage') {
            // Sub stat fixed attack
            breakdown.equipmentFlat += value;
            console.log(`  [Sub Stat] ${item.slotPosName || item.name} - Attack Power flat: +${value}`);
          } else if (stat.id === 'STR') {
            // Strength stat: 1 STR = 0.1% attack power
            const strPercent = value * 0.1;
            breakdown.strength += strPercent;
            console.log(`  [Sub Stat] ${item.slotPosName || item.name} - Strength ${value} = +${strPercent.toFixed(1)}% Attack Power`);
          }
        }
      }

      // 1.3 Magic stones
      if (item.magicStoneStat) {
        for (const stone of item.magicStoneStat) {
          const value = parseValue(stone.value);

          if (stone.id === 'WeaponFixingDamage') {
            breakdown.equipmentFlat += value;
            console.log(`  [Magic Stone] ${item.slotPosName || item.name} - Attack Power flat: +${value}`);
          }
        }
      }
    }
  }

  console.log('[Equipment parsing complete]', {
    EquipmentFlat: breakdown.equipmentFlat,
    EquipmentPercent: breakdown.equipmentPercent,
    StrengthFromEquipSubStats: breakdown.strength,
  });

  // ========== 2. Extract from character main stats ==========
  console.log('[Starting character main stats parsing]');
  console.log('  characterInfo:', characterInfo ? 'exists' : 'does not exist');
  console.log('  statList:', characterInfo?.stat?.statList?.length || 0, 'stats');

  if (characterInfo?.stat?.statList) {
    for (const stat of characterInfo.stat.statList) {
      if (!stat.statSecondList) continue;

      // Strength (STR)
      if (stat.type === 'STR') {
        console.log(`  Found Strength (STR) stat: value=${stat.value}, secondary=`, stat.statSecondList);
        for (const desc of stat.statSecondList) {
          // Support simplified and traditional: 攻击力/攻擊力
          const match = desc.match(/攻[击擊]力增加\s*\+?(\d+(?:\.\d+)?)%/);
          if (match) {
            const beforeAdd = breakdown.strength;
            breakdown.strength += parseFloat(match[1]);
            console.log(`  [Main Stat] Strength ${stat.value} = +${match[1]}% Attack Power (before=${beforeAdd.toFixed(1)}%, after=${breakdown.strength.toFixed(1)}%)`);
          }
        }
      }

      // Destruction
      if (stat.type === 'Destruction') {
        console.log(`  Found Destruction stat: value=${stat.value}, secondary=`, stat.statSecondList);
        for (const desc of stat.statSecondList) {
          // Support simplified and traditional: 攻击力/攻擊力
          const match = desc.match(/攻[击擊]力增加\s*\+?(\d+(?:\.\d+)?)%/);
          if (match) {
            const beforeAdd = breakdown.destruction;
            breakdown.destruction += parseFloat(match[1]);
            console.log(`  [Main Stat] Destruction ${stat.value} = +${match[1]}% Attack Power (before=${beforeAdd.toFixed(1)}%, after=${breakdown.destruction.toFixed(1)}%)`);
          }
        }
      }
    }
  }

  console.log('[Main stats parsing complete]', {
    Strength: breakdown.strength,
    Destruction: breakdown.destruction,
  });

  // ========== 3. Extract from Daevanion boards ==========
  if (daevanionBoards && typeof daevanionBoards === 'object') {
    console.log('[Daevanion board parsing] Board count:', Array.isArray(daevanionBoards) ? daevanionBoards.length : Object.keys(daevanionBoards).length);

    // Support array and object formats
    const boardsArray = Array.isArray(daevanionBoards)
      ? daevanionBoards
      : Object.values(daevanionBoards);

    for (const board of boardsArray) {
      if (!board) continue;

      // Use aggregated openStatEffectList
      if (board.openStatEffectList && Array.isArray(board.openStatEffectList)) {
        console.log(`  [Daevanion] This board has ${board.openStatEffectList.length} stat effects`);

        for (const effect of board.openStatEffectList) {
          const desc = effect.desc;

          // Extra Attack Power - support simplified and traditional
          const extraAtkMatch = desc.match(/^额外攻[击擊]力\s*\+?(\d+)$/);
          if (extraAtkMatch) {
            const value = parseFloat(extraAtkMatch[1]);
            breakdown.daevanionFlat += value;
            console.log(`  [Daevanion] Extra Attack Power: +${value}`);
            continue;
          }

          // PVE Attack Power - support simplified and traditional
          const pveAtkMatch = desc.match(/^PVE攻[击擊]力\s*\+?(\d+)$/);
          if (pveAtkMatch) {
            const value = parseFloat(pveAtkMatch[1]);
            breakdown.daevanionFlat += value;
            console.log(`  [Daevanion] PVE Attack Power: +${value}`);
            continue;
          }

          // Attack Power increase percentage - support simplified and traditional
          const atkPercentMatch = desc.match(/^攻[击擊]力增加\s*\+?(\d+(?:\.\d+)?)%$/);
          if (atkPercentMatch) {
            const value = parseFloat(atkPercentMatch[1]);
            breakdown.equipmentPercent += value;
            console.log(`  [Daevanion] Attack Power increase: +${value}%`);
            continue;
          }
        }
      }
    }
  }

  console.log('[Daevanion board parsing complete]', {
    DaevanionFlatAttack: breakdown.daevanionFlat,
    EquipmentPercentUpdate: breakdown.equipmentPercent,
  });

  // ========== 4. Calculate final attack power ==========
  const totalFlat = breakdown.equipmentFlat + breakdown.daevanionFlat;
  const totalPercent = breakdown.equipmentPercent + breakdown.destruction + breakdown.strength;

  // New algorithm: Attack Power = Flat Attack × (1 + Attack%/100)
  const finalPower = totalFlat * (1 + totalPercent / 100);

  console.log('[Calculation complete]', {
    TotalFlat: totalFlat,
    TotalPercent: totalPercent,
    FinalAttackPower: Math.round(finalPower),
    Algorithm: `${totalFlat} × (1 + ${totalPercent}/100) = ${Math.round(finalPower)}`
  });

  return {
    breakdown,
    totalFlat: Math.round(totalFlat),
    totalPercent: Math.round(totalPercent * 10) / 10,
    finalPower: Math.round(finalPower),
  };
}

/**
 * Load and calculate attack power from member folder
 */
export async function loadAndCalculateAttackPower(
  memberId: string
): Promise<AttackPowerResult | null> {
  try {
    console.log(`[Attack Power] Loading data for member ${memberId}...`);

    const [equipRes, charRes, daevanionRes] = await Promise.all([
      fetch(`/data/${memberId}/equipment_details.json`),
      fetch(`/data/${memberId}/character_info.json`),
      fetch(`/data/${memberId}/daevanion_boards.json`).catch(() => null),
    ]);

    if (!equipRes.ok || !charRes.ok) {
      console.warn('[Attack Power] Data load failed');
      return null;
    }

    const equipmentData = await equipRes.json();
    const characterInfo = await charRes.json();
    const daevanionBoards = daevanionRes?.ok ? await daevanionRes.json() : null;

    return calculateAttackPower(equipmentData, characterInfo, daevanionBoards);
  } catch (error) {
    console.error('[Attack Power] Calculation failed:', error);
    return null;
  }
}
