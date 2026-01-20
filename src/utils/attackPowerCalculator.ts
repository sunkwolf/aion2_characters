/**
 * 攻击力计算工具
 * 算法: Total Score = Attack Power × (Sum of Category %) ÷ 25
 */

/**
 * 攻击力来源明细
 */
export interface AttackPowerBreakdown {
  equipmentFlat: number;        // 装备/首饰固定值
  daevanionFlat: number;        // 守护力效果固定值(额外攻击力、PVE攻击力、首领攻击力)
  equipmentPercent: number;     // 装备/饰品百分比
  destruction: number;          // 破坏(守护力主要能力值)
  strength: number;             // 威力属性(装备词缀)
  wingBoss: number;             // 翅膀效果-Boss攻击力(暂未实现)
}

/**
 * 攻击力计算结果
 */
export interface AttackPowerResult {
  breakdown: AttackPowerBreakdown;  // 来源明细
  totalFlat: number;                // 总固定值
  totalPercent: number;             // 总百分比
  finalPower: number;               // 最终攻击力
}

/**
 * 装备数据接口
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
 * 角色信息接口
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
 * 守护力面板接口
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
 * 解析数值
 */
function parseValue(value: string): number {
  if (!value) return 0;
  const match = value.match(/([+\-]?\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * 检查是否为百分比
 */
function isPercent(value: string): boolean {
  return value.includes('%');
}

/**
 * 计算攻击力
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

  console.log('[攻击力计算] 开始计算...');

  // ========== 1. 从装备中提取 ==========
  if (equipmentData?.equipment?.equipmentList) {
    for (const item of equipmentData.equipment.equipmentList) {
      // 1.1 主属性
      if (item.mainStats) {
        for (const stat of item.mainStats) {
          const value = parseValue(stat.value);
          const extra = parseValue(stat.extra);

          // 武器固定攻击力: 基础值 + 强化值
          if (stat.id === 'WeaponFixingDamage') {
            breakdown.equipmentFlat += value + extra;
            console.log(`  [主属性] ${item.slotPosName || item.name} - 攻击力固定值: ${value + extra} (${value} + ${extra})`);
          }
          // 装备百分比攻击力增加
          else if (stat.id === 'DamageRatio' && isPercent(stat.extra)) {
            breakdown.equipmentPercent += extra;
            console.log(`  [主属性] ${item.slotPosName || item.name} - 攻击力百分比: +${extra}%`);
          }
        }
      }

      // 1.2 副属性
      if (item.subStats) {
        for (const stat of item.subStats) {
          const value = parseValue(stat.value);

          if (stat.id === 'WeaponFixingDamage') {
            // 副属性固定攻击力
            breakdown.equipmentFlat += value;
            console.log(`  [副属性] ${item.slotPosName || item.name} - 攻击力固定值: +${value}`);
          } else if (stat.id === 'STR') {
            // 威力属性: 1威力 = 0.1% 攻击力
            const strPercent = value * 0.1;
            breakdown.strength += strPercent;
            console.log(`  [副属性] ${item.slotPosName || item.name} - 威力 ${value} = +${strPercent.toFixed(1)}% 攻击力`);
          }
        }
      }

      // 1.3 魔石
      if (item.magicStoneStat) {
        for (const stone of item.magicStoneStat) {
          const value = parseValue(stone.value);

          if (stone.id === 'WeaponFixingDamage') {
            breakdown.equipmentFlat += value;
            console.log(`  [魔石] ${item.slotPosName || item.name} - 攻击力固定值: +${value}`);
          }
        }
      }
    }
  }

  console.log('[装备解析完成]', {
    装备固定攻击: breakdown.equipmentFlat,
    装备百分比: breakdown.equipmentPercent,
    威力属性_装备副属性: breakdown.strength,
  });

  // ========== 2. 从角色主要能力值提取 ==========
  console.log('[开始解析角色主要能力值]');
  console.log('  characterInfo:', characterInfo ? '存在' : '不存在');
  console.log('  statList:', characterInfo?.stat?.statList?.length || 0, '个属性');

  if (characterInfo?.stat?.statList) {
    for (const stat of characterInfo.stat.statList) {
      if (!stat.statSecondList) continue;

      // 威力 (STR)
      if (stat.type === 'STR') {
        console.log(`  找到威力(STR)属性: 数值=${stat.value}, 二级属性=`, stat.statSecondList);
        for (const desc of stat.statSecondList) {
          // 兼容简体和繁体: 攻击力/攻擊力
          const match = desc.match(/攻[击擊]力增加\s*\+?(\d+(?:\.\d+)?)%/);
          if (match) {
            const beforeAdd = breakdown.strength;
            breakdown.strength += parseFloat(match[1]);
            console.log(`  [主要能力值] 威力 ${stat.value} = +${match[1]}% 攻击力 (累加前=${beforeAdd.toFixed(1)}%, 累加后=${breakdown.strength.toFixed(1)}%)`);
          }
        }
      }

      // 破坏 (Destruction)
      if (stat.type === 'Destruction') {
        console.log(`  找到破坏(Destruction)属性: 数值=${stat.value}, 二级属性=`, stat.statSecondList);
        for (const desc of stat.statSecondList) {
          // 兼容简体和繁体: 攻击力/攻擊力
          const match = desc.match(/攻[击擊]力增加\s*\+?(\d+(?:\.\d+)?)%/);
          if (match) {
            const beforeAdd = breakdown.destruction;
            breakdown.destruction += parseFloat(match[1]);
            console.log(`  [主要能力值] 破坏 ${stat.value} = +${match[1]}% 攻击力 (累加前=${beforeAdd.toFixed(1)}%, 累加后=${breakdown.destruction.toFixed(1)}%)`);
          }
        }
      }
    }
  }

  console.log('[主要能力值解析完成]', {
    威力: breakdown.strength,
    破坏: breakdown.destruction,
  });

  // ========== 3. 从守护力面板提取 ==========
  if (daevanionBoards && typeof daevanionBoards === 'object') {
    console.log('[守护力面板解析] 面板数量:', Array.isArray(daevanionBoards) ? daevanionBoards.length : Object.keys(daevanionBoards).length);

    // 支持数组格式和对象格式
    const boardsArray = Array.isArray(daevanionBoards)
      ? daevanionBoards
      : Object.values(daevanionBoards);

    for (const board of boardsArray) {
      if (!board) continue;

      // 使用已聚合的 openStatEffectList
      if (board.openStatEffectList && Array.isArray(board.openStatEffectList)) {
        console.log(`  [守护力] 该面板有 ${board.openStatEffectList.length} 个属性效果`);

        for (const effect of board.openStatEffectList) {
          const desc = effect.desc;

          // 额外攻击力 - 兼容简体和繁体
          const extraAtkMatch = desc.match(/^额外攻[击擊]力\s*\+?(\d+)$/);
          if (extraAtkMatch) {
            const value = parseFloat(extraAtkMatch[1]);
            breakdown.daevanionFlat += value;
            console.log(`  [守护力] 额外攻击力: +${value}`);
            continue;
          }

          // PVE攻击力 - 兼容简体和繁体
          const pveAtkMatch = desc.match(/^PVE攻[击擊]力\s*\+?(\d+)$/);
          if (pveAtkMatch) {
            const value = parseFloat(pveAtkMatch[1]);
            breakdown.daevanionFlat += value;
            console.log(`  [守护力] PVE攻击力: +${value}`);
            continue;
          }

          // 攻击力增加百分比 - 兼容简体和繁体
          const atkPercentMatch = desc.match(/^攻[击擊]力增加\s*\+?(\d+(?:\.\d+)?)%$/);
          if (atkPercentMatch) {
            const value = parseFloat(atkPercentMatch[1]);
            breakdown.equipmentPercent += value;
            console.log(`  [守护力] 攻击力增加: +${value}%`);
            continue;
          }
        }
      }
    }
  }

  console.log('[守护力面板解析完成]', {
    守护力固定攻击: breakdown.daevanionFlat,
    装备百分比更新: breakdown.equipmentPercent,
  });

  // ========== 4. 计算最终攻击力 ==========
  const totalFlat = breakdown.equipmentFlat + breakdown.daevanionFlat;
  const totalPercent = breakdown.equipmentPercent + breakdown.destruction + breakdown.strength;

  // 新算法: Attack Power = Flat Attack × (1 + Attack%/100)
  const finalPower = totalFlat * (1 + totalPercent / 100);

  console.log('[计算完成]', {
    总固定值: totalFlat,
    总百分比: totalPercent,
    最终攻击力: Math.round(finalPower),
    算法: `${totalFlat} × (1 + ${totalPercent}/100) = ${Math.round(finalPower)}`
  });

  return {
    breakdown,
    totalFlat: Math.round(totalFlat),
    totalPercent: Math.round(totalPercent * 10) / 10,
    finalPower: Math.round(finalPower),
  };
}

/**
 * 从成员文件夹加载并计算攻击力
 */
export async function loadAndCalculateAttackPower(
  memberId: string
): Promise<AttackPowerResult | null> {
  try {
    console.log(`[攻击力计算] 加载成员 ${memberId} 数据...`);

    const [equipRes, charRes, daevanionRes] = await Promise.all([
      fetch(`/data/${memberId}/equipment_details.json`),
      fetch(`/data/${memberId}/character_info.json`),
      fetch(`/data/${memberId}/daevanion_boards.json`).catch(() => null),
    ]);

    if (!equipRes.ok || !charRes.ok) {
      console.warn('[攻击力计算] 数据加载失败');
      return null;
    }

    const equipmentData = await equipRes.json();
    const characterInfo = await charRes.json();
    const daevanionBoards = daevanionRes?.ok ? await daevanionRes.json() : null;

    return calculateAttackPower(equipmentData, characterInfo, daevanionBoards);
  } catch (error) {
    console.error('[攻击力计算] 计算失败:', error);
    return null;
  }
}
