/**
 * 物品数据同步任务模块
 * 支持分批同步、断点续存、自动重试
 */

const itemsDb = require('../db/itemsDb.cjs');

// 同步配置
const CONFIG = {
  API_BASE: 'https://tw.ncsoft.com/aion2_tw/v2.0',
  DETAIL_API_BASE: 'https://tw.ncsoft.com/aion2/api/gameconst',  // 物品详情API
  REQUEST_DELAY: 300,        // 请求间隔（毫秒）
  RETRY_COUNT: 3,            // 重试次数
  RETRY_DELAY: 5000,         // 重试延迟（毫秒）
  PAGE_SIZE: 100,            // 每页物品数
  BATCH_INTERVAL: 1 * 60 * 60 * 1000,  // 批次间隔（1小时）
  LOCALE: 'zh-TW',           // 语言
  // 需要同步强化等级数据的分类（武器、防具、饰品）
  ENCHANT_CATEGORIES: ['Equip_Weapon', 'Equip_Armor', 'Equip_Accessory'],
  // 需要同步强化等级数据的最低品质（Unique以上）
  ENCHANT_MIN_GRADE_ORDER: 3,  // 0=Common, 1=Rare, 2=Legend, 3=Unique, 4=Epic
};

// 分类定义（用于分批同步，会在同步时从API更新）
let SYNC_CATEGORIES = [];

// 同步状态
let syncState = {
  isRunning: false,
  phase: null,          // 'list' | 'details'
  currentCategory: null,
  progress: null,
  nextBatchTimer: null,
};

// OpenCC 转换器（由主服务器注入）
let converter = null;

/**
 * 设置繁简转换器
 */
function setConverter(conv) {
  converter = conv;
}

/**
 * 繁体转简体
 */
function toSimplified(text) {
  if (!converter) return text;
  if (text === null || text === undefined) return text;
  // 确保是字符串类型
  if (typeof text !== 'string') {
    // 如果是数组，转换每个元素
    if (Array.isArray(text)) {
      return text.map(t => toSimplified(t));
    }
    // 如果是对象，返回原值（不转换）
    if (typeof text === 'object') {
      return text;
    }
    // 数字等其他类型转为字符串
    text = String(text);
  }
  try {
    return converter(text);
  } catch (e) {
    console.error('[toSimplified] 转换失败:', typeof text, text);
    return text;
  }
}

/**
 * 递归转换对象中所有字符串为简体中文
 */
function convertDetailToCn(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return toSimplified(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => convertDetailToCn(item));
  }
  if (typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = convertDetailToCn(obj[key]);
    }
    return result;
  }
  return obj;
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试的 fetch 请求
 */
async function fetchWithRetry(url, retries = CONFIG.RETRY_COUNT) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (response.status === 429) {
        // 被限流，等待更长时间
        console.log(`[Sync] 请求被限流，等待 ${CONFIG.RETRY_DELAY * 2}ms 后重试...`);
        await delay(CONFIG.RETRY_DELAY * 2);
        continue;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (i < retries - 1) {
        console.log(`[Sync] 请求失败，${CONFIG.RETRY_DELAY}ms 后重试 (${i + 1}/${retries}): ${error.message}`);
        await delay(CONFIG.RETRY_DELAY);
      } else {
        throw error;
      }
    }
  }
}

/**
 * 同步基础数据（品质、职业、分类）
 * 从官方API获取真实数据
 */
async function syncBaseData() {
  console.log('[Sync] 开始同步基础数据...');

  try {
    // 1. 从API获取职业数据
    console.log('[Sync] 正在获取职业数据...');
    const classesUrl = `${CONFIG.API_BASE}/game/character/class?locale=${CONFIG.LOCALE}`;
    const classesData = await fetchWithRetry(classesUrl);
    if (classesData && Array.isArray(classesData)) {
      const classes = classesData.map(c => ({
        id: c.id || c.code,
        name: c.name,
        name_cn: toSimplified(c.name)
      }));
      itemsDb.upsertClasses(classes);
      console.log(`[Sync] 职业数据同步完成: ${classes.length} 条`);
    }
    await delay(CONFIG.REQUEST_DELAY);

    // 2. 从API获取品质数据
    console.log('[Sync] 正在获取品质数据...');
    const gradesUrl = `${CONFIG.API_BASE}/game/item/grade?locale=${CONFIG.LOCALE}`;
    const gradesData = await fetchWithRetry(gradesUrl);
    if (gradesData && Array.isArray(gradesData)) {
      // API返回顺序是从低到高：Common(0) -> Rare(1) -> Legend(2) -> Unique(3) -> Epic(4)
      // sort_order 越高表示品质越高
      const grades = gradesData.map((g, index) => ({
        id: g.id || g.code,
        name: g.name,
        name_cn: toSimplified(g.name),
        sort_order: index  // 0=Common, 1=Rare, 2=Legend, 3=Unique, 4=Epic
      }));
      itemsDb.upsertGrades(grades);
      console.log(`[Sync] 品质数据同步完成: ${grades.length} 条`);
    }
    await delay(CONFIG.REQUEST_DELAY);

    // 3. 从API获取分类数据
    console.log('[Sync] 正在获取分类数据...');
    const categoriesUrl = `${CONFIG.API_BASE}/game/item/category?locale=${CONFIG.LOCALE}`;
    const categoriesData = await fetchWithRetry(categoriesUrl);
    if (categoriesData && Array.isArray(categoriesData)) {
      const categories = [];
      // 处理分类数据（API 返回的是 child 字段，不是 children）
      for (const cat of categoriesData) {
        categories.push({
          id: cat.id || cat.code,
          name: cat.name,
          name_cn: toSimplified(cat.name),
          parent_id: null
        });
        // 如果有子分类 (API 返回的字段是 child)
        const children = cat.child || cat.children;
        console.log(`[Sync] 分类 ${cat.name} 有 ${children ? children.length : 0} 个子分类`);
        if (children && Array.isArray(children)) {
          for (const child of children) {
            categories.push({
              id: child.id || child.code,
              name: child.name,
              name_cn: toSimplified(child.name),
              parent_id: cat.id || cat.code
            });
          }
        }
      }
      itemsDb.upsertCategories(categories);
      // 更新SYNC_CATEGORIES用于后续分批同步（包含父分类和子分类）
      SYNC_CATEGORIES = categoriesData.map(c => ({
        id: c.id || c.code,
        name: c.name,
        name_cn: toSimplified(c.name)
      }));
      console.log(`[Sync] 分类数据同步完成: ${categories.length} 条 (父分类: ${categoriesData.length}, 子分类: ${categories.length - categoriesData.length})`);
    }

    itemsDb.logSync('base', '基础数据同步完成');
    return true;
  } catch (error) {
    console.error('[Sync] 基础数据同步失败:', error);
    itemsDb.logSync('base', '基础数据同步失败', null, null, null, false, error.message);
    return false;
  }
}

/**
 * 同步物品列表（一次性同步所有页面）
 * 支持断点续存：从上次中断的页面继续
 */
async function syncItemsList(progressId, startFromPage = 1) {
  console.log('[Sync] 开始同步物品列表...');

  let page = startFromPage;
  let totalPages = 0;
  let totalSynced = 0;

  try {
    while (true) {
      const url = `${CONFIG.API_BASE}/dict/search/item?size=${CONFIG.PAGE_SIZE}&page=${page}&locale=${CONFIG.LOCALE}`;
      const data = await fetchWithRetry(url);

      if (!data.contents || data.contents.length === 0) {
        break;
      }

      // 更新总页数
      if (data.pagination) {
        totalPages = data.pagination.lastPage;
      }

      // 获取所有分类用于匹配
      const allCategories = itemsDb.getAllCategories();
      // 构建分类名称到ID的映射（包含父子关系）
      const categoryMap = {};
      for (const parent of allCategories) {
        categoryMap[parent.name] = { id: parent.id, parentId: null };
        categoryMap[parent.name_cn] = { id: parent.id, parentId: null };
        if (parent.children) {
          for (const child of parent.children) {
            categoryMap[child.name] = { id: child.id, parentId: parent.id };
            categoryMap[child.name_cn] = { id: child.id, parentId: parent.id };
          }
        }
      }

      // 第一页时打印调试信息
      if (page === 1) {
        console.log(`[Sync] 分类映射表共 ${Object.keys(categoryMap).length} 条`);
        // 打印前3个物品的分类匹配情况
        for (let i = 0; i < Math.min(3, data.contents.length); i++) {
          const item = data.contents[i];
          const info = categoryMap[item.categoryName];
          console.log(`[Sync] 物品 "${item.name}" 分类名="${item.categoryName}" -> 匹配结果: ${info ? `id=${info.id}, parentId=${info.parentId}` : '未匹配'}`);
        }
      }

      // 处理物品数据
      const items = data.contents.map(item => {
        // 根据分类名称查找分类ID和父分类ID
        const categoryInfo = categoryMap[item.categoryName] || { id: null, parentId: null };

        return {
          id: item.id,
          name: item.name,
          name_cn: toSimplified(item.name),
          image: item.image,
          grade: item.grade,
          grade_name: item.grade,
          grade_name_cn: toSimplified(item.grade),
          category_id: categoryInfo.id,
          category_name: item.categoryName,
          category_name_cn: toSimplified(item.categoryName),
          parent_category_id: categoryInfo.parentId,
          level: 0,
          equip_level: 0,
          tradable: item.tradable ? 1 : 0,
          enchantable: false,
          max_enchant_level: 0,
          max_exceed_enchant_level: 0,
          type: null,
          classes: JSON.stringify([]),
          classes_cn: JSON.stringify([]),
          options: JSON.stringify(item.options || []),
          sources: JSON.stringify([]),
          sources_cn: JSON.stringify([])
        };
      });

      itemsDb.upsertItems(items);
      totalSynced += items.length;

      // 更新进度
      itemsDb.updateSyncProgress(progressId, {
        current_page: page,
        total_pages: totalPages,
        total_items: data.pagination?.total || 0
      });

      console.log(`[Sync] 物品列表同步进度: ${page}/${totalPages} 页 (已同步 ${totalSynced} 件)`);

      if (page >= totalPages) {
        break;
      }

      page++;
      await delay(CONFIG.REQUEST_DELAY);
    }

    console.log(`[Sync] 物品列表同步完成！共 ${totalPages} 页，${totalSynced} 件物品`);
    itemsDb.logSync('list', `物品列表同步完成，共 ${totalPages} 页，${totalSynced} 件物品`);
    return true;
  } catch (error) {
    console.error('[Sync] 物品列表同步失败:', error);
    itemsDb.logSync('list', '物品列表同步失败', null, null, null, false, error.message);
    return false;
  }
}

/**
 * 同步物品详情（按分类分批）
 * 获取该分类下所有物品的详细信息（包含强化/突破属性）
 *
 * 规则：
 * - 所有物品都请求基础详情（enchantLevel=0）
 * - 强化等级数据只针对 武器/防具/饰品，且品质为Unique以上
 */
async function syncItemsDetails(progressId, categoryId) {
  console.log(`[Sync] 开始同步物品详情 (分类: ${categoryId})...`);

  // 获取品质排序信息，用于判断是否需要同步强化等级
  const allGrades = itemsDb.getAllGrades();
  const gradeOrderMap = {};
  for (const g of allGrades) {
    gradeOrderMap[g.id] = g.sort_order || 0;
  }

  // 判断是否是需要同步强化数据的分类
  const needEnchantSync = CONFIG.ENCHANT_CATEGORIES.includes(categoryId);

  try {
    // 获取该分类下的所有物品（包含子分类）
    const result = itemsDb.queryItems({ categoryId, size: 10000 });
    const items = result.contents;

    if (items.length === 0) {
      console.log(`[Sync] 分类 ${categoryId} 没有物品需要同步`);
      return true;
    }

    console.log(`[Sync] 分类 ${categoryId} 共有 ${items.length} 件物品需要同步详情`);

    let syncedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        // 使用正确的详情API：/aion2/api/gameconst/item?id=xxx&enchantLevel=0&lang=zh
        const detailUrl = `${CONFIG.DETAIL_API_BASE}/item?id=${item.id}&enchantLevel=0&lang=zh`;
        const detail = await fetchWithRetry(detailUrl);

        if (detail) {
          // 更新物品基本信息
          const updatedItem = {
            id: item.id,
            name: detail.name || item.name,
            name_cn: toSimplified(detail.name || item.name),
            image: detail.icon || item.image,  // API返回的是icon字段
            grade: detail.grade || item.grade,
            grade_name: detail.gradeName || item.grade_name,
            grade_name_cn: toSimplified(detail.gradeName || item.grade_name),
            category_id: item.category_id,
            category_name: detail.categoryName || item.category_name,
            category_name_cn: toSimplified(detail.categoryName || item.category_name),
            parent_category_id: item.parent_category_id,
            level: detail.level || 0,
            equip_level: detail.equipLevel || 0,
            tradable: detail.tradable ? 1 : 0,
            enchantable: detail.enchantable ? 1 : 0,
            max_enchant_level: detail.maxEnchantLevel || 0,
            max_exceed_enchant_level: detail.maxExceedEnchantLevel || 0,
            type: detail.type || null,
            classes: JSON.stringify(detail.classNames || []),
            classes_cn: JSON.stringify((detail.classNames || []).map(c => toSimplified(c))),
            options: JSON.stringify([]),  // 详情API没有options字段
            sources: JSON.stringify(detail.sources || []),
            sources_cn: JSON.stringify((detail.sources || []).map(s => toSimplified(s)))
          };

          itemsDb.upsertItems([updatedItem]);

          // 保存基础属性（强化等级0）
          if (detail.mainStats || detail.subStats) {
            itemsDb.upsertItemStats(
              item.id,
              0,
              0,
              detail.mainStats || [],
              detail.subStats || []
            );
          }

          // 判断是否需要同步强化等级数据
          const gradeOrder = gradeOrderMap[detail.grade] || 0;
          const shouldSyncEnchant = needEnchantSync &&
                                    gradeOrder >= CONFIG.ENCHANT_MIN_GRADE_ORDER &&
                                    detail.enchantable &&
                                    detail.maxEnchantLevel > 0;

          if (shouldSyncEnchant) {
            // 同步各个强化等级的属性（包含突破等级）
            // totalMaxLevel = 强化上限 + 突破上限
            const totalMaxLevel = detail.maxEnchantLevel + (detail.maxExceedEnchantLevel || 0);
            for (let enchantLv = 1; enchantLv <= totalMaxLevel; enchantLv++) {
              try {
                const enchantUrl = `${CONFIG.DETAIL_API_BASE}/item?id=${item.id}&enchantLevel=${enchantLv}&lang=zh`;
                const enchantDetail = await fetchWithRetry(enchantUrl);

                if (enchantDetail && (enchantDetail.mainStats || enchantDetail.subStats)) {
                  itemsDb.upsertItemStats(
                    item.id,
                    enchantLv,
                    0,
                    enchantDetail.mainStats || [],
                    enchantDetail.subStats || []
                  );
                }

                await delay(CONFIG.REQUEST_DELAY);
              } catch (enchantError) {
                console.error(`[Sync] 物品 ${item.id} 强化等级 ${enchantLv} 同步失败:`, enchantError.message);
              }
            }
          }

          syncedCount++;
        }

        // 更新进度
        itemsDb.updateSyncProgress(progressId, {
          current_item_index: i + 1,
          total_items: items.length
        });

        if ((i + 1) % 50 === 0) {
          console.log(`[Sync] 详情同步进度: ${i + 1}/${items.length} (成功: ${syncedCount}, 失败: ${errorCount})`);
        }

        await delay(CONFIG.REQUEST_DELAY);
      } catch (error) {
        errorCount++;
        console.error(`[Sync] 物品 ${item.id} 详情同步失败:`, error.message);
        itemsDb.logSync('detail', `物品 ${item.id} 详情同步失败`, item.id, null, null, false, error.message);
      }
    }

    console.log(`[Sync] 分类 ${categoryId} 详情同步完成！成功: ${syncedCount}, 失败: ${errorCount}`);
    itemsDb.logSync('detail', `分类 ${categoryId} 详情同步完成，成功: ${syncedCount}, 失败: ${errorCount}`);
    return true;
  } catch (error) {
    console.error(`[Sync] 分类 ${categoryId} 详情同步失败:`, error);
    itemsDb.logSync('detail', `分类 ${categoryId} 详情同步失败`, null, null, null, false, error.message);
    return false;
  }
}

/**
 * 获取下一个待同步的分类
 */
function getNextCategory(currentCategoryId) {
  if (!currentCategoryId) {
    return SYNC_CATEGORIES[0];
  }
  const currentIndex = SYNC_CATEGORIES.findIndex(c => c.id === currentCategoryId);
  if (currentIndex < 0 || currentIndex >= SYNC_CATEGORIES.length - 1) {
    return null; // 所有分类都已完成
  }
  return SYNC_CATEGORIES[currentIndex + 1];
}

/**
 * 启动同步任务
 * @param {boolean} forceRestart - 是否强制重新开始（忽略断点续存）
 */
async function startSync(forceRestart = false) {
  if (syncState.isRunning) {
    return { success: false, message: '同步任务正在进行中' };
  }

  syncState.isRunning = true;
  syncState.phase = 'list';

  try {
    // 检查是否有未完成的同步任务
    const existingProgress = itemsDb.getSyncProgress();
    if (!forceRestart && existingProgress && existingProgress.status === 'running') {
      console.log('[Sync] 检测到未完成的同步任务，继续执行...');
      // 从断点继续
      const startPage = (existingProgress.current_page || 0) + 1;
      console.log(`[Sync] 从第 ${startPage} 页继续同步...`);

      const listSuccess = await syncItemsList(existingProgress.id, startPage);
      if (!listSuccess) {
        itemsDb.completeSyncProgress(existingProgress.id, false, '物品列表同步失败');
        syncState.isRunning = false;
        return { success: false, message: '物品列表同步失败' };
      }

      itemsDb.completeSyncProgress(existingProgress.id, true);
      syncState.isRunning = false;
      return { success: true, message: '同步任务继续执行完成' };
    }

    // 如果是强制重新开始，标记之前的任务为失败
    if (forceRestart && existingProgress && existingProgress.status === 'running') {
      itemsDb.completeSyncProgress(existingProgress.id, false, '被新任务覆盖');
    }

    // 先同步基础数据（职业、品质、分类）
    const baseSuccess = await syncBaseData();
    if (!baseSuccess) {
      syncState.isRunning = false;
      return { success: false, message: '基础数据同步失败' };
    }

    // 创建新的同步进度
    const progressId = itemsDb.createSyncProgress('list');

    // 同步所有物品列表（从第1页开始）
    const listSuccess = await syncItemsList(progressId, 1);
    if (!listSuccess) {
      itemsDb.completeSyncProgress(progressId, false, '物品列表同步失败');
      syncState.isRunning = false;
      return { success: false, message: '物品列表同步失败' };
    }

    itemsDb.completeSyncProgress(progressId, true);
    console.log('[Sync] 完整同步完成！');

    syncState.isRunning = false;
    return { success: true, message: '物品列表同步完成' };
  } catch (error) {
    syncState.isRunning = false;
    console.error('[Sync] 同步任务失败:', error);
    return { success: false, message: error.message };
  }
}

/**
 * 继续同步任务（断点续存）- 内部使用
 */
async function resumeSync(progress) {
  // 这个函数现在不再单独使用，逻辑已整合到 startSync 中
  console.log(`[Sync] 继续同步任务: phase=${progress.phase}, page=${progress.current_page}`);

  const startPage = (progress.current_page || 0) + 1;

  try {
    if (progress.phase === 'list') {
      const listSuccess = await syncItemsList(progress.id, startPage);
      if (!listSuccess) {
        itemsDb.completeSyncProgress(progress.id, false, '物品列表同步失败');
        syncState.isRunning = false;
        return { success: false, message: '物品列表同步失败' };
      }
      itemsDb.completeSyncProgress(progress.id, true);
    }

    syncState.isRunning = false;
    return { success: true, message: '同步任务继续执行完成' };
  } catch (error) {
    syncState.isRunning = false;
    console.error('[Sync] 继续同步任务失败:', error);
    return { success: false, message: error.message };
  }
}

/**
 * 计划下一批次同步
 */
function scheduleNextBatch(categoryId) {
  if (syncState.nextBatchTimer) {
    clearTimeout(syncState.nextBatchTimer);
  }

  syncState.currentCategory = categoryId;
  const category = SYNC_CATEGORIES.find(c => c.id === categoryId);
  console.log(`[Sync] 将在 4 小时后开始同步分类: ${category?.name || categoryId}`);

  syncState.nextBatchTimer = setTimeout(async () => {
    await startDetailsBatch(categoryId);
  }, CONFIG.BATCH_INTERVAL);
}

/**
 * 立即开始同步指定分类的详情
 */
async function startDetailsBatch(categoryId) {
  if (syncState.isRunning) {
    console.log('[Sync] 同步任务正在进行中，跳过本次批次');
    return;
  }

  syncState.isRunning = true;
  syncState.phase = 'details';
  syncState.currentCategory = categoryId;

  const progressId = itemsDb.createSyncProgress('details', categoryId);

  try {
    const success = await syncItemsDetails(progressId, categoryId);

    if (success) {
      itemsDb.completeSyncProgress(progressId, true);

      // 检查是否还有下一个分类
      const nextCategory = getNextCategory(categoryId);
      if (nextCategory) {
        scheduleNextBatch(nextCategory.id);
      } else {
        console.log('[Sync] 所有分类详情同步完成！');
      }
    } else {
      itemsDb.completeSyncProgress(progressId, false, '详情同步失败');
    }
  } catch (error) {
    console.error('[Sync] 详情批次同步失败:', error);
    itemsDb.completeSyncProgress(progressId, false, error.message);
  }

  syncState.isRunning = false;
}

/**
 * 手动触发指定分类的详情同步
 */
async function syncCategoryNow(categoryId) {
  if (syncState.isRunning) {
    return { success: false, message: '同步任务正在进行中' };
  }

  // 取消定时任务
  if (syncState.nextBatchTimer) {
    clearTimeout(syncState.nextBatchTimer);
    syncState.nextBatchTimer = null;
  }

  await startDetailsBatch(categoryId);
  return { success: true, message: `分类 ${categoryId} 详情同步已启动` };
}

/**
 * 停止同步任务
 */
function stopSync() {
  if (syncState.nextBatchTimer) {
    clearTimeout(syncState.nextBatchTimer);
    syncState.nextBatchTimer = null;
  }

  // 注意：无法中断正在进行的请求，只能阻止下一批次
  const wasRunning = syncState.isRunning;
  syncState.isRunning = false;

  return {
    success: true,
    message: wasRunning ? '同步任务将在当前请求完成后停止' : '没有正在运行的同步任务'
  };
}

/**
 * 获取同步状态
 */
function getSyncStatus() {
  const progress = itemsDb.getSyncProgress();
  const stats = itemsDb.getSyncStats();

  // 如果内存中的分类为空，从数据库加载（服务器重启后）
  let categories = SYNC_CATEGORIES;
  if (!categories || categories.length === 0) {
    const dbCategories = itemsDb.getAllCategories();
    // getAllCategories 返回的是带 children 的层级结构，只取顶级分类
    categories = dbCategories.map(c => ({
      id: c.id,
      name: c.name,
      name_cn: c.name_cn
    }));
    // 同时更新内存中的分类
    SYNC_CATEGORIES = categories;
  }

  return {
    isRunning: syncState.isRunning,
    phase: syncState.phase,
    currentCategory: syncState.currentCategory,
    hasScheduledBatch: !!syncState.nextBatchTimer,
    progress: progress ? {
      phase: progress.phase,
      categoryId: progress.category_id,
      currentPage: progress.current_page,
      totalPages: progress.total_pages,
      currentItemIndex: progress.current_item_index,
      totalItems: progress.total_items,
      status: progress.status,
      startedAt: progress.started_at,
      completedAt: progress.completed_at
    } : null,
    stats: {
      itemCount: stats.itemCount,
      statsCount: stats.statsCount,
      lastSync: stats.lastSync
    },
    categories: categories
  };
}

/**
 * 从官方API获取单个物品详情并保存到数据库
 * 直接保存API返回的所有字段
 * @param {number} itemId - 物品ID
 * @param {number} enchantLevel - 强化等级
 * @returns {object|null} - API返回的数据，失败返回null
 */
async function fetchItemFromApi(itemId, enchantLevel = 0) {
  try {
    const detailUrl = `${CONFIG.DETAIL_API_BASE}/item?id=${itemId}&enchantLevel=${enchantLevel}&lang=zh`;
    console.log(`[Sync] 从API获取物品详情: ${detailUrl}`);

    const detail = await fetchWithRetry(detailUrl);

    if (!detail) {
      console.log(`[Sync] API返回空数据: 物品 ${itemId}`);
      return null;
    }

    // 保存物品基本信息（直接使用API返回的数据）
    const item = itemsDb.getItemById(itemId);

    // 处理套装信息
    const setInfo = detail.set ? JSON.stringify(detail.set) : null;
    const setInfoCn = detail.set ? JSON.stringify({
      ...detail.set,
      name: toSimplified(detail.set.name || ''),
      items: (detail.set.items || []).map(i => ({
        ...i,
        name: toSimplified(i.name || '')
      })),
      bonuses: (detail.set.bonuses || []).map(b => ({
        ...b,
        descriptions: (b.descriptions || []).map(d => toSimplified(d))
      }))
    }) : null;

    itemsDb.upsertItems([{
      id: itemId,
      name: detail.name || '',
      name_cn: toSimplified(detail.name || ''),
      image: detail.icon || '',
      grade: detail.grade || '',
      grade_name: detail.gradeName || '',
      grade_name_cn: toSimplified(detail.gradeName || ''),
      category_id: item?.category_id || null,
      category_name: detail.categoryName || '',
      category_name_cn: toSimplified(detail.categoryName || ''),
      parent_category_id: item?.parent_category_id || null,
      level: detail.level || 0,
      equip_level: detail.equipLevel || 0,
      tradable: detail.tradable ? 1 : 0,
      enchantable: detail.enchantable ? 1 : 0,
      max_enchant_level: detail.maxEnchantLevel || 0,
      max_exceed_enchant_level: detail.maxExceedEnchantLevel || 0,
      type: detail.type || null,
      // classNames 是职业数组，直接保存
      classes: JSON.stringify(detail.classNames || []),
      classes_cn: JSON.stringify((detail.classNames || []).map(c => toSimplified(c))),
      options: JSON.stringify([]),
      sources: JSON.stringify(detail.sources || []),
      sources_cn: JSON.stringify((detail.sources || []).map(s => toSimplified(s))),
      // 新增字段 - 确保是字符串类型
      race_name: typeof detail.raceName === 'string' ? detail.raceName : (Array.isArray(detail.raceName) ? detail.raceName.join(', ') : null),
      race_name_cn: typeof detail.raceName === 'string' ? toSimplified(detail.raceName) : (Array.isArray(detail.raceName) ? detail.raceName.map(r => toSimplified(r)).join(', ') : null),
      costumes: typeof detail.costumes === 'string' ? detail.costumes : (Array.isArray(detail.costumes) ? detail.costumes.join(', ') : null),
      costumes_cn: typeof detail.costumes === 'string' ? toSimplified(detail.costumes) : (Array.isArray(detail.costumes) ? detail.costumes.map(c => toSimplified(c)).join(', ') : null),
      magic_stone_slot_count: detail.magicStoneSlotCount || 0,
      god_stone_slot_count: detail.godStoneSlotCount || 0,
      sub_stat_count: detail.subStatCount || 0,
      sub_skill_count_max: detail.subSkillCountMax || 0,
      set_info: setInfo,
      set_info_cn: setInfoCn,
      // 非装备类物品字段 - 确保是字符串类型
      desc_text: typeof detail.desc === 'string' ? detail.desc : (Array.isArray(detail.desc) ? detail.desc.join('\n') : null),
      desc_text_cn: typeof detail.desc === 'string' ? toSimplified(detail.desc) : (Array.isArray(detail.desc) ? detail.desc.map(d => toSimplified(d)).join('\n') : null),
      cool_time: detail.coolTime || 0,
      duration_min: detail.durationMin || 0,
      duration_max: detail.durationMax || 0,
      // 完整API响应 - 方便前端直接使用任意字段
      raw_data: JSON.stringify(detail),
      raw_data_cn: JSON.stringify(convertDetailToCn(detail))
    }]);

    // 保存属性数据（主属性、副属性）
    if (detail.mainStats || detail.subStats) {
      itemsDb.upsertItemStats(
        itemId,
        enchantLevel,
        0,
        detail.mainStats || [],
        detail.subStats || []
      );
    }

    console.log(`[Sync] 物品 ${itemId} 强化+${enchantLevel} 数据已保存`);
    return detail;
  } catch (error) {
    console.error(`[Sync] 获取物品 ${itemId} 强化+${enchantLevel} 失败:`, error.message);
    return null;
  }
}

/**
 * 同步子分类下的物品详情
 * @param {string} subCategoryId - 子分类ID
 */
async function syncSubCategory(subCategoryId) {
  if (syncState.isRunning) {
    return { success: false, message: '同步任务正在进行中' };
  }

  syncState.isRunning = true;

  try {
    console.log(`[Sync] 开始同步子分类: ${subCategoryId}`);

    // 获取该子分类下的所有物品
    const result = itemsDb.queryItems({ categoryId: subCategoryId, size: 10000 });
    const items = result.contents;

    if (items.length === 0) {
      syncState.isRunning = false;
      return { success: true, message: `子分类 ${subCategoryId} 没有物品` };
    }

    console.log(`[Sync] 子分类 ${subCategoryId} 共有 ${items.length} 件物品`);

    let syncedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        await fetchItemFromApi(item.id, 0);
        syncedCount++;

        if ((i + 1) % 20 === 0) {
          console.log(`[Sync] 子分类同步进度: ${i + 1}/${items.length}`);
        }

        await delay(CONFIG.REQUEST_DELAY);
      } catch (error) {
        errorCount++;
        console.error(`[Sync] 物品 ${item.id} 同步失败:`, error.message);
      }
    }

    syncState.isRunning = false;
    console.log(`[Sync] 子分类 ${subCategoryId} 同步完成！成功: ${syncedCount}, 失败: ${errorCount}`);
    return {
      success: true,
      message: `子分类同步完成，成功: ${syncedCount}, 失败: ${errorCount}`
    };
  } catch (error) {
    syncState.isRunning = false;
    console.error(`[Sync] 子分类 ${subCategoryId} 同步失败:`, error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  setConverter,
  startSync,
  resumeSync,
  stopSync,
  syncCategoryNow,
  getSyncStatus,
  syncBaseData,
  getSyncCategories: () => SYNC_CATEGORIES,
  fetchItemFromApi,
  syncSubCategory
};
