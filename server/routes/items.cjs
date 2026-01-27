/**
 * 物品 API 路由
 */

const express = require('express');
const itemsDb = require('../db/itemsDb.cjs');
const syncItems = require('../jobs/syncItems.cjs');

const router = express.Router();

/**
 * 获取物品列表（带筛选和分页）
 * GET /api/items/list
 * Query: page, size, grade, categoryId, classId, keyword
 */
router.get('/list', (req, res) => {
  try {
    const {
      page = 1,
      size = 30,
      grade,
      categoryId,
      classId,
      keyword
    } = req.query;

    const result = itemsDb.queryItems({
      page: parseInt(page, 10),
      size: parseInt(size, 10),
      grade,
      categoryId,
      classId,
      keyword
    });

    res.json(result);
  } catch (error) {
    console.error('[Items API] 查询物品列表失败:', error);
    res.status(500).json({ error: '查询失败', message: error.message });
  }
});

/**
 * 获取物品详情
 * GET /api/items/detail/:id
 * Query: level (总强化等级 = 强化 + 突破)
 *
 * 本地数据库存储的是总等级，官方API也是用总等级
 */
router.get('/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // level 是总等级（强化+突破），直接传给官方API的 enchantLevel
    const totalLevel = parseInt(req.query.level || '0', 10);
    const itemId = parseInt(id, 10);

    // 获取物品基本信息
    let item = itemsDb.getItemById(itemId);

    // 如果本地没有物品数据，尝试从API获取
    if (!item) {
      console.log(`[Items API] 本地没有物品 ${itemId}，尝试从API获取...`);
      const apiData = await syncItems.fetchItemFromApi(itemId, 0);
      if (!apiData) {
        return res.status(404).json({ error: '物品不存在' });
      }
      // 重新获取保存后的数据
      item = itemsDb.getItemById(itemId);
      if (!item) {
        return res.status(404).json({ error: '物品不存在' });
      }
    }

    // 获取指定等级的属性（数据库存储 enchant_level=totalLevel, exceed_level=0）
    let stats = itemsDb.getItemStats(itemId, totalLevel, 0);

    // 如果本地没有这个等级的数据，实时从API获取
    if (!stats && totalLevel > 0) {
      console.log(`[Items API] 本地没有物品 ${itemId} 等级+${totalLevel} 的数据，从API获取...`);
      const apiData = await syncItems.fetchItemFromApi(itemId, totalLevel);
      if (apiData) {
        stats = itemsDb.getItemStats(itemId, totalLevel, 0);
      }
    }

    // 获取所有已存储的强化等级
    const allStats = itemsDb.getItemAllStats(itemId);

    // 计算当前等级对应的强化/突破等级（用于前端显示）
    const maxEnchant = item.max_enchant_level || 0;
    const currentEnchant = Math.min(totalLevel, maxEnchant);
    const currentExceed = Math.max(0, totalLevel - maxEnchant);

    // 解析JSON字段
    const parseJson = (str) => {
      if (!str) return null;
      try {
        return JSON.parse(str);
      } catch {
        return null;
      }
    };

    res.json({
      ...item,
      // 解析JSON数组字段
      classes: parseJson(item.classes) || [],
      classes_cn: parseJson(item.classes_cn) || [],
      sources: parseJson(item.sources) || [],
      sources_cn: parseJson(item.sources_cn) || [],
      // 解析套装信息
      set: parseJson(item.set_info),
      set_cn: parseJson(item.set_info_cn),
      // 非装备类字段
      desc: item.desc_text,
      desc_cn: item.desc_text_cn,
      cool_time: item.cool_time,
      duration_min: item.duration_min,
      duration_max: item.duration_max,
      // 完整API响应 - 前端可直接使用任意字段
      raw_data: parseJson(item.raw_data),
      raw_data_cn: parseJson(item.raw_data_cn),
      // 强化/突破等级
      currentLevel: totalLevel,
      currentEnchantLevel: currentEnchant,
      currentExceedLevel: currentExceed,
      mainStats: stats?.main_stats || [],
      subStats: stats?.sub_stats || [],
      availableStats: allStats
    });
  } catch (error) {
    console.error('[Items API] 获取物品详情失败:', error);
    res.status(500).json({ error: '查询失败', message: error.message });
  }
});

/**
 * 获取筛选选项
 * GET /api/items/filters
 */
router.get('/filters', (req, res) => {
  try {
    const grades = itemsDb.getAllGrades();
    const classes = itemsDb.getAllClasses();
    const categories = itemsDb.getAllCategories();

    res.json({
      grades,
      classes,
      categories
    });
  } catch (error) {
    console.error('[Items API] 获取筛选选项失败:', error);
    res.status(500).json({ error: '查询失败', message: error.message });
  }
});

/**
 * 获取同步状态
 * GET /api/items/sync/status
 */
router.get('/sync/status', (req, res) => {
  try {
    const status = syncItems.getSyncStatus();
    res.json(status);
  } catch (error) {
    console.error('[Items API] 获取同步状态失败:', error);
    res.status(500).json({ error: '查询失败', message: error.message });
  }
});

/**
 * 启动同步任务（继续或重新开始）
 * POST /api/items/sync/start
 * Query: force - 是否强制重新开始（不继续之前的任务）
 */
router.post('/sync/start', async (req, res) => {
  try {
    const { force } = req.query;
    const result = await syncItems.startSync(force === 'true');
    res.json(result);
  } catch (error) {
    console.error('[Items API] 启动同步失败:', error);
    res.status(500).json({ error: '启动失败', message: error.message });
  }
});

/**
 * 停止同步任务
 * POST /api/items/sync/stop
 */
router.post('/sync/stop', (req, res) => {
  try {
    const result = syncItems.stopSync();
    res.json(result);
  } catch (error) {
    console.error('[Items API] 停止同步失败:', error);
    res.status(500).json({ error: '停止失败', message: error.message });
  }
});

/**
 * 立即同步指定分类
 * POST /api/items/sync/category/:categoryId
 */
router.post('/sync/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const result = await syncItems.syncCategoryNow(categoryId);
    res.json(result);
  } catch (error) {
    console.error('[Items API] 同步分类失败:', error);
    res.status(500).json({ error: '同步失败', message: error.message });
  }
});

/**
 * 同步基础数据（品质、职业、分类）
 * POST /api/items/sync/base
 */
router.post('/sync/base', async (req, res) => {
  try {
    const success = await syncItems.syncBaseData();
    res.json({ success, message: success ? '基础数据同步成功' : '基础数据同步失败' });
  } catch (error) {
    console.error('[Items API] 同步基础数据失败:', error);
    res.status(500).json({ error: '同步失败', message: error.message });
  }
});

/**
 * 同步子分类（第二层分类）的物品详情
 * POST /api/items/sync/subcategory/:subCategoryId
 */
router.post('/sync/subcategory/:subCategoryId', async (req, res) => {
  try {
    const { subCategoryId } = req.params;
    const result = await syncItems.syncSubCategory(subCategoryId);
    res.json(result);
  } catch (error) {
    console.error('[Items API] 同步子分类失败:', error);
    res.status(500).json({ error: '同步失败', message: error.message });
  }
});

module.exports = router;
