import { useState, useEffect, useCallback } from 'react';
import type { SyncStatusResponse, Category } from '../../types/items';
import {
  fetchSyncStatus,
  startSync,
  stopSync,
  syncCategory,
  syncBaseData,
  syncSubCategory,
  fetchFilters,
} from '../../services/itemsService';
import './ItemsSyncManager.css';

const ItemsSyncManager = () => {
  const [status, setStatus] = useState<SyncStatusResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // 展开的父分类ID（用于显示子分类）
  const [expandedParent, setExpandedParent] = useState<string | null>(null);

  // 加载同步状态
  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchSyncStatus();
      setStatus(data);
    } catch (error) {
      console.error('获取同步状态失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载分类数据（带子分类）
  const loadCategories = useCallback(async () => {
    try {
      const filters = await fetchFilters();
      setCategories(filters.categories);
    } catch (error) {
      console.error('获取分类数据失败:', error);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadStatus();
    loadCategories();
  }, [loadStatus, loadCategories]);

  // 定时刷新（同步进行中时）
  useEffect(() => {
    if (!status?.isRunning) return;

    const interval = setInterval(loadStatus, 3000);
    return () => clearInterval(interval);
  }, [status?.isRunning, loadStatus]);

  // 显示消息
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // 启动同步（继续或新开始）
  const handleStartSync = async (force = false) => {
    setActionLoading(true);
    try {
      const result = await startSync(force);
      showMessage(result.success ? 'success' : 'error', result.message);
      await loadStatus();
    } catch (error) {
      showMessage('error', '启动同步失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 停止同步
  const handleStopSync = async () => {
    setActionLoading(true);
    try {
      const result = await stopSync();
      showMessage(result.success ? 'success' : 'error', result.message);
      await loadStatus();
    } catch (error) {
      showMessage('error', '停止同步失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 同步基础数据
  const handleSyncBase = async () => {
    setActionLoading(true);
    try {
      const result = await syncBaseData();
      showMessage(result.success ? 'success' : 'error', result.message);
      await loadStatus();
      await loadCategories(); // 刷新分类
    } catch (error) {
      showMessage('error', '同步基础数据失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 同步指定父分类
  const handleSyncCategory = async (categoryId: string) => {
    setActionLoading(true);
    try {
      const result = await syncCategory(categoryId);
      showMessage(result.success ? 'success' : 'error', result.message);
      await loadStatus();
    } catch (error) {
      showMessage('error', '同步分类失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 同步子分类
  const handleSyncSubCategory = async (subCategoryId: string, subCategoryName: string) => {
    setActionLoading(true);
    try {
      const result = await syncSubCategory(subCategoryId);
      showMessage(result.success ? 'success' : 'error', `${subCategoryName}: ${result.message}`);
      await loadStatus();
    } catch (error) {
      showMessage('error', `同步子分类 ${subCategoryName} 失败`);
    } finally {
      setActionLoading(false);
    }
  };

  // 切换父分类展开状态
  const toggleParent = (parentId: string) => {
    setExpandedParent(expandedParent === parentId ? null : parentId);
  };

  if (loading) {
    return (
      <div className="items-sync-manager">
        <div className="items-sync-manager__loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="items-sync-manager">
      <div className="items-sync-manager__header">
        <h2 className="items-sync-manager__title">物品数据同步</h2>
        <button
          className="items-sync-manager__refresh"
          onClick={() => { loadStatus(); loadCategories(); }}
          disabled={actionLoading}
        >
          刷新状态
        </button>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`items-sync-manager__message items-sync-manager__message--${message.type}`}>
          {message.text}
        </div>
      )}

      {/* 统计信息 */}
      <div className="items-sync-manager__stats">
        <div className="items-sync-manager__stat">
          <span className="items-sync-manager__stat-label">物品总数</span>
          <span className="items-sync-manager__stat-value">
            {status?.stats.itemCount.toLocaleString() || 0}
          </span>
        </div>
        <div className="items-sync-manager__stat">
          <span className="items-sync-manager__stat-label">属性记录</span>
          <span className="items-sync-manager__stat-value">
            {status?.stats.statsCount.toLocaleString() || 0}
          </span>
        </div>
        <div className="items-sync-manager__stat">
          <span className="items-sync-manager__stat-label">上次同步</span>
          <span className="items-sync-manager__stat-value">
            {status?.stats.lastSync?.completedAt
              ? new Date(status.stats.lastSync.completedAt).toLocaleString()
              : '从未同步'}
          </span>
        </div>
      </div>

      {/* 同步状态 */}
      {status?.isRunning && (
        <div className="items-sync-manager__progress">
          <div className="items-sync-manager__progress-header">
            <span className="items-sync-manager__progress-status">
              正在同步: {status.phase === 'list' ? '物品列表' : `分类详情 (${status.currentCategory})`}
            </span>
            <span className="items-sync-manager__progress-spinner" />
          </div>
          {status.progress && (
            <div className="items-sync-manager__progress-detail">
              {status.phase === 'list' ? (
                <span>
                  页码: {status.progress.currentPage} / {status.progress.totalPages}
                </span>
              ) : (
                <span>
                  物品: {status.progress.currentItemIndex} / {status.progress.totalItems}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="items-sync-manager__actions">
        {!status?.isRunning ? (
          <>
            {/* 有未完成的任务时显示继续按钮 */}
            {status?.progress && status.progress.status === 'running' && (
              <button
                className="items-sync-manager__btn items-sync-manager__btn--secondary"
                onClick={() => handleStartSync(false)}
                disabled={actionLoading}
              >
                继续同步
              </button>
            )}
            <button
              className="items-sync-manager__btn items-sync-manager__btn--primary"
              onClick={() => handleStartSync(true)}
              disabled={actionLoading}
            >
              {(status?.stats?.itemCount ?? 0) > 0 ? '重新完整同步' : '开始完整同步'}
            </button>
            <button
              className="items-sync-manager__btn"
              onClick={handleSyncBase}
              disabled={actionLoading}
            >
              仅同步基础数据
            </button>
          </>
        ) : (
          <button
            className="items-sync-manager__btn items-sync-manager__btn--danger"
            onClick={handleStopSync}
            disabled={actionLoading}
          >
            停止同步
          </button>
        )}
      </div>

      {/* 分类同步（带子分类） */}
      {!status?.isRunning && categories.length > 0 && (
        <div className="items-sync-manager__categories">
          <h3 className="items-sync-manager__section-title">按分类同步详情</h3>
          <p className="items-sync-manager__section-desc">
            点击父分类同步整个分类，或展开后点击子分类单独同步
          </p>
          <div className="items-sync-manager__category-tree">
            {categories.map(parent => (
              <div key={parent.id} className="items-sync-manager__category-group">
                <div className="items-sync-manager__category-parent">
                  <button
                    className="items-sync-manager__category-btn items-sync-manager__category-btn--parent"
                    onClick={() => handleSyncCategory(parent.id)}
                    disabled={actionLoading}
                  >
                    {parent.name_cn || parent.name}
                  </button>
                  {parent.children && parent.children.length > 0 && (
                    <button
                      className={`items-sync-manager__expand-btn ${expandedParent === parent.id ? 'items-sync-manager__expand-btn--expanded' : ''}`}
                      onClick={() => toggleParent(parent.id)}
                      title="展开/收起子分类"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  )}
                </div>
                {/* 子分类列表 */}
                {expandedParent === parent.id && parent.children && parent.children.length > 0 && (
                  <div className="items-sync-manager__subcategories">
                    {parent.children.map(child => (
                      <button
                        key={child.id}
                        className="items-sync-manager__category-btn items-sync-manager__category-btn--child"
                        onClick={() => handleSyncSubCategory(child.id, child.name_cn || child.name)}
                        disabled={actionLoading}
                      >
                        {child.name_cn || child.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 说明 */}
      <div className="items-sync-manager__info">
        <h3>同步说明</h3>
        <ul>
          <li><strong>完整同步</strong>：先同步物品列表（约80页），然后每4小时自动同步一个分类的详情</li>
          <li><strong>基础数据</strong>：同步品质、职业、分类等筛选选项</li>
          <li><strong>父分类同步</strong>：同步该分类下所有物品的详情（包含强化/突破属性）</li>
          <li><strong>子分类同步</strong>：仅同步该子分类下的物品详情</li>
          <li>同步过程支持断点续存，中断后可继续</li>
          <li>查看物品详情时，如果本地没有强化数据会自动从官方API获取</li>
        </ul>
      </div>
    </div>
  );
};

export default ItemsSyncManager;
