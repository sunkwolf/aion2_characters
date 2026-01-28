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
  // Expanded parent category ID (for showing subcategories)
  const [expandedParent, setExpandedParent] = useState<string | null>(null);

  // Load sync status
  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchSyncStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to get sync status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load category data (with subcategories)
  const loadCategories = useCallback(async () => {
    try {
      const filters = await fetchFilters();
      setCategories(filters.categories);
    } catch (error) {
      console.error('Failed to get category data:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadStatus();
    loadCategories();
  }, [loadStatus, loadCategories]);

  // Refresh periodically (when sync is running)
  useEffect(() => {
    if (!status?.isRunning) return;

    const interval = setInterval(loadStatus, 3000);
    return () => clearInterval(interval);
  }, [status?.isRunning, loadStatus]);

  // Show message
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Start sync (continue or new start)
  const handleStartSync = async (force = false) => {
    setActionLoading(true);
    try {
      const result = await startSync(force);
      showMessage(result.success ? 'success' : 'error', result.message);
      await loadStatus();
    } catch (error) {
      showMessage('error', 'Failed to start sync');
    } finally {
      setActionLoading(false);
    }
  };

  // Stop sync
  const handleStopSync = async () => {
    setActionLoading(true);
    try {
      const result = await stopSync();
      showMessage(result.success ? 'success' : 'error', result.message);
      await loadStatus();
    } catch (error) {
      showMessage('error', 'Failed to stop sync');
    } finally {
      setActionLoading(false);
    }
  };

  // Sync base data
  const handleSyncBase = async () => {
    setActionLoading(true);
    try {
      const result = await syncBaseData();
      showMessage(result.success ? 'success' : 'error', result.message);
      await loadStatus();
      await loadCategories(); // Refresh categories
    } catch (error) {
      showMessage('error', 'Failed to sync base data');
    } finally {
      setActionLoading(false);
    }
  };

  // Sync specific parent category
  const handleSyncCategory = async (categoryId: string) => {
    setActionLoading(true);
    try {
      const result = await syncCategory(categoryId);
      showMessage(result.success ? 'success' : 'error', result.message);
      await loadStatus();
    } catch (error) {
      showMessage('error', 'Failed to sync category');
    } finally {
      setActionLoading(false);
    }
  };

  // Sync subcategory
  const handleSyncSubCategory = async (subCategoryId: string, subCategoryName: string) => {
    setActionLoading(true);
    try {
      const result = await syncSubCategory(subCategoryId);
      showMessage(result.success ? 'success' : 'error', `${subCategoryName}: ${result.message}`);
      await loadStatus();
    } catch (error) {
      showMessage('error', `Failed to sync subcategory ${subCategoryName}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle parent category expansion
  const toggleParent = (parentId: string) => {
    setExpandedParent(expandedParent === parentId ? null : parentId);
  };

  if (loading) {
    return (
      <div className="items-sync-manager">
        <div className="items-sync-manager__loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="items-sync-manager">
      <div className="items-sync-manager__header">
        <h2 className="items-sync-manager__title">Item Data Sync</h2>
        <button
          className="items-sync-manager__refresh"
          onClick={() => { loadStatus(); loadCategories(); }}
          disabled={actionLoading}
        >
          Refresh Status
        </button>
      </div>

      {/* Message notification */}
      {message && (
        <div className={`items-sync-manager__message items-sync-manager__message--${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Statistics */}
      <div className="items-sync-manager__stats">
        <div className="items-sync-manager__stat">
          <span className="items-sync-manager__stat-label">Total Items</span>
          <span className="items-sync-manager__stat-value">
            {status?.stats.itemCount.toLocaleString() || 0}
          </span>
        </div>
        <div className="items-sync-manager__stat">
          <span className="items-sync-manager__stat-label">Stat Records</span>
          <span className="items-sync-manager__stat-value">
            {status?.stats.statsCount.toLocaleString() || 0}
          </span>
        </div>
        <div className="items-sync-manager__stat">
          <span className="items-sync-manager__stat-label">Last Sync</span>
          <span className="items-sync-manager__stat-value">
            {status?.stats.lastSync?.completedAt
              ? new Date(status.stats.lastSync.completedAt).toLocaleString()
              : 'Never synced'}
          </span>
        </div>
      </div>

      {/* Sync status */}
      {status?.isRunning && (
        <div className="items-sync-manager__progress">
          <div className="items-sync-manager__progress-header">
            <span className="items-sync-manager__progress-status">
              Syncing: {status.phase === 'list' ? 'Item List' : `Category Details (${status.currentCategory})`}
            </span>
            <span className="items-sync-manager__progress-spinner" />
          </div>
          {status.progress && (
            <div className="items-sync-manager__progress-detail">
              {status.phase === 'list' ? (
                <span>
                  Page: {status.progress.currentPage} / {status.progress.totalPages}
                </span>
              ) : (
                <span>
                  Items: {status.progress.currentItemIndex} / {status.progress.totalItems}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="items-sync-manager__actions">
        {!status?.isRunning ? (
          <>
            {/* Show continue button when there's an incomplete task */}
            {status?.progress && status.progress.status === 'running' && (
              <button
                className="items-sync-manager__btn items-sync-manager__btn--secondary"
                onClick={() => handleStartSync(false)}
                disabled={actionLoading}
              >
                Continue Sync
              </button>
            )}
            <button
              className="items-sync-manager__btn items-sync-manager__btn--primary"
              onClick={() => handleStartSync(true)}
              disabled={actionLoading}
            >
              {(status?.stats?.itemCount ?? 0) > 0 ? 'Restart Full Sync' : 'Start Full Sync'}
            </button>
            <button
              className="items-sync-manager__btn"
              onClick={handleSyncBase}
              disabled={actionLoading}
            >
              Sync Base Data Only
            </button>
          </>
        ) : (
          <button
            className="items-sync-manager__btn items-sync-manager__btn--danger"
            onClick={handleStopSync}
            disabled={actionLoading}
          >
            Stop Sync
          </button>
        )}
      </div>

      {/* Category sync (with subcategories) */}
      {!status?.isRunning && categories.length > 0 && (
        <div className="items-sync-manager__categories">
          <h3 className="items-sync-manager__section-title">Sync by Category</h3>
          <p className="items-sync-manager__section-desc">
            Click parent category to sync entire category, or expand to sync individual subcategories
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
                      title="Expand/Collapse subcategories"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  )}
                </div>
                {/* Subcategory list */}
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

      {/* Info */}
      <div className="items-sync-manager__info">
        <h3>Sync Guide</h3>
        <ul>
          <li><strong>Full Sync</strong>: First syncs item list (~80 pages), then auto-syncs one category's details every 4 hours</li>
          <li><strong>Base Data</strong>: Syncs quality, class, category and other filter options</li>
          <li><strong>Parent Category Sync</strong>: Syncs all item details in that category (including enchant/exceed stats)</li>
          <li><strong>Subcategory Sync</strong>: Only syncs item details in that subcategory</li>
          <li>Sync process supports resume from interruption</li>
          <li>When viewing item details, if local enchant data is missing it will auto-fetch from official API</li>
        </ul>
      </div>
    </div>
  );
};

export default ItemsSyncManager;
