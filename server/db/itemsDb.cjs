/**
 * 物品数据库初始化模块
 * 使用 SQLite 存储物品数据，支持筛选、分页和详情查询
 */

const Database = require('better-sqlite3');
const path = require('path');

// 数据库文件路径
const DB_PATH = path.join(__dirname, '..', 'items.db');

let db = null;

/**
 * 初始化数据库连接和表结构
 */
function initDatabase() {
  if (db) return db;

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL'); // 提升写入性能

  // 创建品质表（sort_order用于排序，API返回顺序是从低到高）
  db.exec(`
    CREATE TABLE IF NOT EXISTS grades (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_cn TEXT,
      sort_order INTEGER DEFAULT 0
    )
  `);

  // 尝试添加sort_order列（已存在的表）
  try {
    db.exec('ALTER TABLE grades ADD COLUMN sort_order INTEGER DEFAULT 0');
  } catch (e) {
    // 列已存在，忽略
  }

  // 尝试添加新的物品字段
  const newItemColumns = [
    { name: 'race_name', type: 'TEXT' },
    { name: 'race_name_cn', type: 'TEXT' },
    { name: 'costumes', type: 'TEXT' },
    { name: 'costumes_cn', type: 'TEXT' },
    { name: 'magic_stone_slot_count', type: 'INTEGER DEFAULT 0' },
    { name: 'god_stone_slot_count', type: 'INTEGER DEFAULT 0' },
    { name: 'sub_stat_count', type: 'INTEGER DEFAULT 0' },
    { name: 'sub_skill_count_max', type: 'INTEGER DEFAULT 0' },
    { name: 'set_info', type: 'TEXT' },
    { name: 'set_info_cn', type: 'TEXT' },
    // 非装备类物品字段
    { name: 'desc_text', type: 'TEXT' },
    { name: 'desc_text_cn', type: 'TEXT' },
    { name: 'cool_time', type: 'INTEGER DEFAULT 0' },
    { name: 'duration_min', type: 'INTEGER DEFAULT 0' },
    { name: 'duration_max', type: 'INTEGER DEFAULT 0' },
    // 完整API响应 - 避免每次新增字段都要改代码
    { name: 'raw_data', type: 'TEXT' },
    { name: 'raw_data_cn', type: 'TEXT' }
  ];
  for (const col of newItemColumns) {
    try {
      db.exec(`ALTER TABLE items ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      // 列已存在，忽略
    }
  }

  // 创建职业表
  db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_cn TEXT
    )
  `);

  // 创建分类表（支持层级）
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_cn TEXT,
      parent_id TEXT,
      FOREIGN KEY (parent_id) REFERENCES categories(id)
    )
  `);

  // 创建物品主表（列表数据）
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      name_cn TEXT,
      image TEXT,
      grade TEXT,
      grade_name TEXT,
      grade_name_cn TEXT,
      category_id TEXT,
      category_name TEXT,
      category_name_cn TEXT,
      parent_category_id TEXT,
      level INTEGER DEFAULT 0,
      equip_level INTEGER DEFAULT 0,
      tradable INTEGER DEFAULT 0,
      enchantable INTEGER DEFAULT 0,
      max_enchant_level INTEGER DEFAULT 0,
      max_exceed_enchant_level INTEGER DEFAULT 0,
      type TEXT,
      classes TEXT,
      classes_cn TEXT,
      options TEXT,
      sources TEXT,
      sources_cn TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建物品属性表（不同强化/突破等级的属性）
  db.exec(`
    CREATE TABLE IF NOT EXISTS item_stats (
      item_id INTEGER NOT NULL,
      enchant_level INTEGER DEFAULT 0,
      exceed_level INTEGER DEFAULT 0,
      main_stats TEXT,
      sub_stats TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (item_id, enchant_level, exceed_level),
      FOREIGN KEY (item_id) REFERENCES items(id)
    )
  `);

  // 创建同步进度表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phase TEXT NOT NULL,
      category_id TEXT,
      current_page INTEGER DEFAULT 0,
      total_pages INTEGER DEFAULT 0,
      current_item_id INTEGER,
      current_item_index INTEGER DEFAULT 0,
      total_items INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      started_at DATETIME,
      completed_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建同步日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      message TEXT,
      item_id INTEGER,
      enchant_level INTEGER,
      exceed_level INTEGER,
      success INTEGER DEFAULT 1,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建索引以提升查询性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_items_grade ON items(grade);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
    CREATE INDEX IF NOT EXISTS idx_items_parent_category ON items(parent_category_id);
    CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
    CREATE INDEX IF NOT EXISTS idx_items_name_cn ON items(name_cn);
    CREATE INDEX IF NOT EXISTS idx_item_stats_item_id ON item_stats(item_id);
  `);

  console.log('[ItemsDB] 数据库初始化完成');
  return db;
}

/**
 * 获取数据库实例
 */
function getDb() {
  if (!db) {
    initDatabase();
  }
  return db;
}

/**
 * 关闭数据库连接
 */
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('[ItemsDB] 数据库连接已关闭');
  }
}

// ==================== 品质相关操作 ====================

/**
 * 批量插入或更新品质数据
 */
function upsertGrades(grades) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO grades (id, name, name_cn, sort_order)
    VALUES (@id, @name, @name_cn, @sort_order)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item);
    }
  });

  insertMany(grades);
}

/**
 * 获取所有品质（按sort_order从高到低排序）
 */
function getAllGrades() {
  const db = getDb();
  return db.prepare('SELECT * FROM grades ORDER BY sort_order DESC').all();
}

// ==================== 职业相关操作 ====================

/**
 * 批量插入或更新职业数据
 */
function upsertClasses(classes) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO classes (id, name, name_cn)
    VALUES (@id, @name, @name_cn)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item);
    }
  });

  insertMany(classes);
}

/**
 * 获取所有职业
 */
function getAllClasses() {
  const db = getDb();
  return db.prepare('SELECT * FROM classes').all();
}

// ==================== 分类相关操作 ====================

/**
 * 批量插入或更新分类数据
 */
function upsertCategories(categories) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO categories (id, name, name_cn, parent_id)
    VALUES (@id, @name, @name_cn, @parent_id)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item);
    }
  });

  insertMany(categories);
}

/**
 * 获取所有分类（带层级）
 */
function getAllCategories() {
  const db = getDb();
  const all = db.prepare('SELECT * FROM categories').all();

  // 构建层级结构
  const parents = all.filter(c => !c.parent_id);
  return parents.map(parent => ({
    ...parent,
    children: all.filter(c => c.parent_id === parent.id)
  }));
}

// ==================== 物品相关操作 ====================

/**
 * 批量插入或更新物品数据
 */
function upsertItems(items) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO items (
      id, name, name_cn, image, grade, grade_name, grade_name_cn,
      category_id, category_name, category_name_cn, parent_category_id,
      level, equip_level, tradable, enchantable,
      max_enchant_level, max_exceed_enchant_level, type,
      classes, classes_cn, options, sources, sources_cn,
      race_name, race_name_cn, costumes, costumes_cn,
      magic_stone_slot_count, god_stone_slot_count, sub_stat_count, sub_skill_count_max,
      set_info, set_info_cn,
      desc_text, desc_text_cn, cool_time, duration_min, duration_max,
      raw_data, raw_data_cn,
      updated_at
    ) VALUES (
      @id, @name, @name_cn, @image, @grade, @grade_name, @grade_name_cn,
      @category_id, @category_name, @category_name_cn, @parent_category_id,
      @level, @equip_level, @tradable, @enchantable,
      @max_enchant_level, @max_exceed_enchant_level, @type,
      @classes, @classes_cn, @options, @sources, @sources_cn,
      @race_name, @race_name_cn, @costumes, @costumes_cn,
      @magic_stone_slot_count, @god_stone_slot_count, @sub_stat_count, @sub_skill_count_max,
      @set_info, @set_info_cn,
      @desc_text, @desc_text_cn, @cool_time, @duration_min, @duration_max,
      @raw_data, @raw_data_cn,
      @updated_at
    )
  `);

  const insertMany = db.transaction((itemList) => {
    for (const item of itemList) {
      stmt.run({
        ...item,
        tradable: item.tradable ? 1 : 0,
        enchantable: item.enchantable ? 1 : 0,
        race_name: item.race_name || null,
        race_name_cn: item.race_name_cn || null,
        costumes: item.costumes || null,
        costumes_cn: item.costumes_cn || null,
        magic_stone_slot_count: item.magic_stone_slot_count || 0,
        god_stone_slot_count: item.god_stone_slot_count || 0,
        sub_stat_count: item.sub_stat_count || 0,
        sub_skill_count_max: item.sub_skill_count_max || 0,
        set_info: item.set_info || null,
        set_info_cn: item.set_info_cn || null,
        desc_text: item.desc_text || null,
        desc_text_cn: item.desc_text_cn || null,
        cool_time: item.cool_time || 0,
        duration_min: item.duration_min || 0,
        duration_max: item.duration_max || 0,
        raw_data: item.raw_data || null,
        raw_data_cn: item.raw_data_cn || null,
        updated_at: new Date().toISOString()
      });
    }
  });

  insertMany(items);
}

/**
 * 查询物品列表（带筛选和分页）
 */
function queryItems({ page = 1, size = 30, grade, categoryId, classId, keyword } = {}) {
  const db = getDb();
  const conditions = [];
  const params = {};

  if (grade) {
    conditions.push('i.grade = @grade');
    params.grade = grade;
  }

  if (categoryId) {
    // 支持父分类和子分类筛选
    conditions.push('(i.category_id = @categoryId OR i.parent_category_id = @categoryId)');
    params.categoryId = categoryId;
  }

  if (classId) {
    // 职业筛选：classes 字段是 JSON 数组字符串
    conditions.push("(i.classes LIKE @classLike OR i.classes_cn LIKE @classLike)");
    params.classLike = `%"${classId}"%`;
  }

  if (keyword) {
    conditions.push('(i.name LIKE @keyword OR i.name_cn LIKE @keyword)');
    params.keyword = `%${keyword}%`;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 获取总数（使用子查询避免JOIN）
  const countSql = `SELECT COUNT(*) as total FROM items i ${whereClause}`;
  const { total } = db.prepare(countSql).get(params);

  // 获取分页数据
  const offset = (page - 1) * size;
  // 排序：按品质优先级（grades表的sort_order，高品质在前），再按ID降序
  const dataSql = `
    SELECT i.id, i.name, i.name_cn, i.image, i.grade, i.grade_name, i.grade_name_cn,
           i.category_id, i.category_name, i.category_name_cn, i.parent_category_id,
           i.tradable, i.enchantable, i.max_enchant_level, i.max_exceed_enchant_level,
           i.classes, i.classes_cn, i.options
    FROM items i
    LEFT JOIN grades g ON i.grade = g.id
    ${whereClause}
    ORDER BY COALESCE(g.sort_order, 0) DESC, i.id DESC
    LIMIT @size OFFSET @offset
  `;
  const items = db.prepare(dataSql).all({ ...params, size, offset });

  return {
    contents: items.map(item => ({
      ...item,
      tradable: !!item.tradable,
      enchantable: !!item.enchantable,
      classes: item.classes ? JSON.parse(item.classes) : [],
      classes_cn: item.classes_cn ? JSON.parse(item.classes_cn) : [],
      options: item.options ? JSON.parse(item.options) : []
    })),
    pagination: {
      page,
      size,
      total,
      lastPage: Math.ceil(total / size)
    }
  };
}

/**
 * 获取物品基本信息
 */
function getItemById(id) {
  const db = getDb();
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  if (!item) return null;

  return {
    ...item,
    tradable: !!item.tradable,
    enchantable: !!item.enchantable,
    classes: item.classes ? JSON.parse(item.classes) : [],
    classes_cn: item.classes_cn ? JSON.parse(item.classes_cn) : [],
    options: item.options ? JSON.parse(item.options) : [],
    sources: item.sources ? JSON.parse(item.sources) : [],
    sources_cn: item.sources_cn ? JSON.parse(item.sources_cn) : []
  };
}

// ==================== 物品属性相关操作 ====================

/**
 * 插入或更新物品属性
 */
function upsertItemStats(itemId, enchantLevel, exceedLevel, mainStats, subStats) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO item_stats (item_id, enchant_level, exceed_level, main_stats, sub_stats, updated_at)
    VALUES (@item_id, @enchant_level, @exceed_level, @main_stats, @sub_stats, @updated_at)
  `);

  stmt.run({
    item_id: itemId,
    enchant_level: enchantLevel,
    exceed_level: exceedLevel,
    main_stats: JSON.stringify(mainStats),
    sub_stats: JSON.stringify(subStats),
    updated_at: new Date().toISOString()
  });
}

/**
 * 获取物品特定强化/突破等级的属性
 */
function getItemStats(itemId, enchantLevel = 0, exceedLevel = 0) {
  const db = getDb();
  const stats = db.prepare(`
    SELECT * FROM item_stats
    WHERE item_id = ? AND enchant_level = ? AND exceed_level = ?
  `).get(itemId, enchantLevel, exceedLevel);

  if (!stats) return null;

  return {
    ...stats,
    main_stats: stats.main_stats ? JSON.parse(stats.main_stats) : [],
    sub_stats: stats.sub_stats ? JSON.parse(stats.sub_stats) : []
  };
}

/**
 * 获取物品所有已存储的强化等级
 */
function getItemAllStats(itemId) {
  const db = getDb();
  const stats = db.prepare(`
    SELECT enchant_level, exceed_level FROM item_stats
    WHERE item_id = ?
    ORDER BY enchant_level, exceed_level
  `).all(itemId);

  return stats;
}

// ==================== 同步进度相关操作 ====================

/**
 * 获取当前同步进度
 */
function getSyncProgress() {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM sync_progress
    ORDER BY id DESC
    LIMIT 1
  `).get();
}

/**
 * 创建新的同步任务
 */
function createSyncProgress(phase, categoryId = null) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO sync_progress (phase, category_id, status, started_at, updated_at)
    VALUES (@phase, @category_id, 'running', @started_at, @updated_at)
  `);

  const now = new Date().toISOString();
  const result = stmt.run({
    phase,
    category_id: categoryId,
    started_at: now,
    updated_at: now
  });

  return result.lastInsertRowid;
}

/**
 * 更新同步进度
 */
function updateSyncProgress(id, updates) {
  const db = getDb();
  const fields = Object.keys(updates).map(key => `${key} = @${key}`).join(', ');
  const stmt = db.prepare(`
    UPDATE sync_progress
    SET ${fields}, updated_at = @updated_at
    WHERE id = @id
  `);

  stmt.run({
    ...updates,
    id,
    updated_at: new Date().toISOString()
  });
}

/**
 * 完成同步任务
 */
function completeSyncProgress(id, success = true, errorMessage = null) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE sync_progress
    SET status = @status, error_message = @error_message, completed_at = @completed_at, updated_at = @updated_at
    WHERE id = @id
  `);

  const now = new Date().toISOString();
  stmt.run({
    id,
    status: success ? 'completed' : 'failed',
    error_message: errorMessage,
    completed_at: now,
    updated_at: now
  });
}

/**
 * 记录同步日志
 */
function logSync(type, message, itemId = null, enchantLevel = null, exceedLevel = null, success = true, errorMessage = null) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO sync_logs (type, message, item_id, enchant_level, exceed_level, success, error_message)
    VALUES (@type, @message, @item_id, @enchant_level, @exceed_level, @success, @error_message)
  `);

  stmt.run({
    type,
    message,
    item_id: itemId,
    enchant_level: enchantLevel,
    exceed_level: exceedLevel,
    success: success ? 1 : 0,
    error_message: errorMessage
  });
}

/**
 * 获取同步统计信息
 */
function getSyncStats() {
  const db = getDb();

  const itemCount = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
  const statsCount = db.prepare('SELECT COUNT(*) as count FROM item_stats').get().count;
  const lastSync = db.prepare(`
    SELECT * FROM sync_progress
    WHERE status = 'completed'
    ORDER BY completed_at DESC
    LIMIT 1
  `).get();

  return {
    itemCount,
    statsCount,
    lastSync: lastSync ? {
      phase: lastSync.phase,
      completedAt: lastSync.completed_at
    } : null
  };
}

module.exports = {
  initDatabase,
  getDb,
  closeDatabase,
  // 品质
  upsertGrades,
  getAllGrades,
  // 职业
  upsertClasses,
  getAllClasses,
  // 分类
  upsertCategories,
  getAllCategories,
  // 物品
  upsertItems,
  queryItems,
  getItemById,
  // 物品属性
  upsertItemStats,
  getItemStats,
  getItemAllStats,
  // 同步进度
  getSyncProgress,
  createSyncProgress,
  updateSyncProgress,
  completeSyncProgress,
  logSync,
  getSyncStats
};
