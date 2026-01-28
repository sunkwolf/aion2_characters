// Stat names translation map (Chinese -> English)
// Used to translate stat names from the game API to English

export const STAT_TRANSLATIONS: Record<string, string> = {
    // Base Stats (6 basic attributes)
    '威力': 'Power',
    '敏捷': 'Agility',
    '知识': 'Knowledge',
    '体力': 'Health',
    '精神': 'Spirit',
    '意志': 'Will',

    // Combat Stats (combat attributes)
    '攻击力': 'Attack Power',
    '命中': 'Accuracy',
    '暴击': 'Critical Hit',
    '物理暴击': 'Physical Crit',
    '魔法暴击': 'Magic Crit',
    '攻击速度': 'Attack Speed',
    '施法速度': 'Casting Speed',
    '移动速度': 'Movement Speed',
    '武器攻击力': 'Weapon Attack',
    '魔法攻击': 'Magic Attack',
    '物理攻击': 'Physical Attack',

    // Defense Stats (defense attributes)
    '防御': 'Defense',
    '物理防御': 'Physical Defense',
    '魔法防御': 'Magic Defense',
    '格挡': 'Block',
    '招架': 'Parry',
    '回避': 'Evasion',
    '抵抗': 'Resistance',
    '魔法抵抗': 'Magic Resist',

    // HP/MP Stats (health/mana)
    '生命力': 'HP',
    '生命': 'HP',
    '最大生命力': 'Max HP',
    '法力': 'MP',
    '最大法力': 'Max MP',
    '生命恢复': 'HP Recovery',
    '法力恢复': 'MP Recovery',

    // Special Stats (special attributes)
    '穿透': 'Penetration',
    '物理穿透': 'Physical Penetration',
    '魔法穿透': 'Magic Penetration',
    'PVE伤害增幅': 'PVE Damage Amp',
    'PVP伤害增幅': 'PVP Damage Amp',
    '治疗量增加': 'Healing Increase',
    '治疗力': 'Healing Power',
    '飞行速度': 'Flight Speed',

    // Divine Stats (divine attributes - shown in Divine Stats panel)
    '正义[赛萨的]': 'Justice [Seisas]',
    '自由[白杰尔]': 'Freedom [Baijel]',
    '幻象[凯西内尔]': 'Illusion [Kaisinel]',
    '生命[尤斯迪埃]': 'Life [Yustiel]',
    '时间[希埃尔]': 'Time [Siel]',
    '破坏[吉凯尔]': 'Destruction [Zikel]',
    '死亡[崔妮尔]': 'Death [Triniel]',
    '智慧[露梅尔]': 'Wisdom [Lumiel]',
    '命运[玛尔库坦]': 'Fate [Marchutan]',
    '空间[伊斯拉佩尔]': 'Space [Israphel]',

    // Percentage increase/decrease terms
    '增加': 'Increase',
    '减少': 'Decrease',
    '增幅': 'Amplification',

    // Equipment related
    '装备等级': 'Item Level',
    '武器': 'Weapon',
    '防具': 'Armor',
    '饰品': 'Accessory',
    '可强化': 'Enchantable',
    '可交易': 'Tradable',
    '绑定': 'Bound',
    '灵魂刻印': 'Soul Binding',
    '穿透力': 'Penetration',
    '攻击力增加': 'Attack Power+',
    '暴击攻击力': 'Critical Attack',
    '暴击耐性': 'Crit Resist',
    '额外防御': 'Extra Defense',
    '额外回避': 'Extra Evasion',

    // Combat speed/rate
    '战斗速度': 'Combat Speed',
    '强击抵抗': 'Strike Resist',
    '强击攻击中': 'Strike Rate',
    '稳稳': 'Stability',

    // Source labels & Ranking categories
    '来源': 'Source',
    '制作': 'Crafting',
    '副本': 'Instance',
    '深渊': 'Abyss',
    '讨伐战': 'Siege Battle',
    '龙帝战': 'Dragon Emperor',
    '攻城战': 'Fortress War',
    '5等兵': 'Rank 5 Soldier',
    '金': 'Gold',
    '银': 'Silver',
    '铁': 'Iron',
};

// Server name translations (Traditional Chinese -> English)
// Based on Aion 2 Taiwan server names - all 36 servers
export const SERVER_TRANSLATIONS: Record<string, string> = {
    // === Elyos Servers (raceId: 1, serverId: 1001-1018) ===
    '希埃爾': 'Siel',           // 1001 - Lord of Time
    '奈薩肯': 'Nezekan',        // 1002 - Lord of Justice
    '白傑爾': 'Baijel',         // 1003 - Lord of Freedom (Vaizel)
    '凱西內爾': 'Kaisinel',      // 1004 - Lord of Illusion
    '尤斯迪埃': 'Yustiel',       // 1005 - Lord of Life
    '艾瑞爾': 'Ariel',          // 1006 - Lady of Light
    '普雷奇翁': 'Pernon',        // 1007 - Elyos city
    '梅斯蘭泰達': 'Meslamtaeda',  // 1008 - Dragon Lord
    '希塔尼耶': 'Suthran',       // 1009 - Location
    '納尼亞': 'Nania',          // 1010 - Location  
    '塔哈巴達': 'Tiamat',        // 1011 - Dragon Lord
    '路特斯': 'Lutes',          // 1012 - Location
    '菲爾諾斯': 'Pernos',        // 1013 - Location
    '達彌努': 'Daminu',         // 1014 - NPC name
    '卡薩卡': 'Kasaka',         // 1015 - Location
    '巴卡爾摩': 'Bakarma',       // 1016 - Fortress
    '天加隆': 'Theobomos',      // 1017 - Location (Tengalong)
    '科奇隆': 'Kocheron',       // 1018 - Location

    // === Asmodian Servers (raceId: 2, serverId: 2001-2018) ===
    '伊斯拉佩爾': 'Israphel',    // 2001 - Lord of Space
    '吉凱爾': 'Zikel',          // 2002 - Lord of Destruction
    '崔妮爾': 'Triniel',        // 2003 - Lady of Death
    '露梅爾': 'Lumiel',         // 2004 - Lady of Wisdom
    '瑪爾庫坦': 'Marchutan',     // 2005 - Lord of Fate
    '阿斯佩爾': 'Azphel',        // 2006 - Lord of Shadow
    '艾萊修奇卡': 'Ereshkigal',   // 2007 - Dragon Lord
    '布里特拉': 'Beritra',       // 2008 - Dragon Lord
    '奈蒙': 'Nemon',            // 2009 - Location
    '哈達爾': 'Hadar',          // 2010 - Location
    '盧德萊': 'Rudra',          // 2011 - NPC name
    '鄔爾古倫': 'Urgorn',        // 2012 - Location (Brusthonin)
    '默尼': 'Moni',             // 2013 - Location
    '奧達爾': 'Odal',           // 2014 - Location
    '簡卡卡': 'Janka',          // 2015 - Location
    '克羅梅德': 'Kromede',       // 2016 - Famous NPC
    '奎靈': 'Kuiren',           // 2017 - Location
    '巴巴隆': 'Babylon',        // 2018 - Location
};

/**
 * Translate a server name from Chinese to English
 * @param chineseName - The Chinese server name
 * @returns The English translation, or the original if not found
 */
export function translateServerName(chineseName: string): string {
    if (SERVER_TRANSLATIONS[chineseName]) {
        return SERVER_TRANSLATIONS[chineseName];
    }
    return chineseName; // Return original if no translation found
}

// Ranking content type translations (Chinese -> English)
export const RANKING_TRANSLATIONS: Record<string, string> = {
    // Ranking Categories
    '深淵': 'Abyss',
    '夢魘': 'Nightmare',
    '超越': 'Transcendence',
    '突襲': 'Raid',
    '飛升試煉': 'Ascension Trial',

    // Grade Names
    '第五階級士兵': 'Fifth-Class Soldier',
    '第四階級士兵': 'Fourth-Class Soldier',
    '第三階級士兵': 'Third-Class Soldier',
    '第二階級士兵': 'Second-Class Soldier',
    '第一階級士兵': 'First-Class Soldier',
    '九級執行官': 'Grade 9 Officer',
    '八級執行官': 'Grade 8 Officer',
    '七級執行官': 'Grade 7 Officer',
    '六級執行官': 'Grade 6 Officer',
    '五級執行官': 'Grade 5 Officer',
    '四級執行官': 'Grade 4 Officer',
    '三級執行官': 'Grade 3 Officer',
    '二級執行官': 'Grade 2 Officer',
    '一級執行官': 'Grade 1 Officer',
    '一星將軍': 'One-Star General',
    '二星將軍': 'Two-Star General',
    '三星將軍': 'Three-Star General',
    '四星將軍': 'Four-Star General',
    '五星將軍': 'Five-Star General',
    '統帥': 'Supreme Commander',

    // Common terms
    '青銅': 'Bronze',
    '白銀': 'Silver',
    '黃金': 'Gold',
    '鉑金': 'Platinum',
    '鑽石': 'Diamond',
    '大師': 'Master',
    '傳說': 'Legend',
};

/**
 * Translate a ranking content name from Chinese to English
 * @param chineseName - The Chinese ranking name
 * @returns The English translation, or the original if not found
 */
export function translateRankingName(chineseName: string): string {
    if (!chineseName) return chineseName;

    // Direct lookup
    if (RANKING_TRANSLATIONS[chineseName]) {
        return RANKING_TRANSLATIONS[chineseName];
    }

    // Try partial match for composite names
    let result = chineseName;
    for (const [cn, en] of Object.entries(RANKING_TRANSLATIONS)) {
        if (result.includes(cn)) {
            result = result.replace(cn, en);
        }
    }

    return result;
}

/**
 * Translate a stat name from Chinese to English
 * @param chineseName - The Chinese stat name
 * @returns The English translation, or the original if not found
 */
export function translateStatName(chineseName: string): string {
    // Direct lookup
    if (STAT_TRANSLATIONS[chineseName]) {
        return STAT_TRANSLATIONS[chineseName];
    }

    // Try partial match for composite stat names
    for (const [cn, en] of Object.entries(STAT_TRANSLATIONS)) {
        if (chineseName.includes(cn)) {
            return chineseName.replace(cn, en);
        }
    }

    return chineseName; // Return original if no translation found
}

/**
 * Translate a stat description that may contain multiple Chinese terms
 * @param description - The description string
 * @returns The translated description
 */
export function translateStatDescription(description: string): string {
    let result = description;
    for (const [cn, en] of Object.entries(STAT_TRANSLATIONS)) {
        result = result.replace(new RegExp(cn, 'g'), en);
    }
    return result;
}
