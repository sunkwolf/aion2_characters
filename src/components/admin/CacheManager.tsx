// 缓存管理组件 - 用于查看和清除 Service Worker 图片缓存

import React, { useState, useEffect } from 'react';
import { checkServiceWorkerStatus, clearImageCache } from '../../utils/serviceWorker';
import './CacheManager.css';

const CacheManager: React.FC = () => {
  const [swStatus, setSwStatus] = useState({
    supported: false,
    registered: false,
    active: false
  });
  const [clearing, setClearing] = useState(false);
  const [lastClearTime, setLastClearTime] = useState<string | null>(null);

  // 检查 Service Worker 状态
  useEffect(() => {
    checkServiceWorkerStatus().then(setSwStatus);
  }, []);

  // 清除图片缓存
  const handleClearCache = async () => {
    if (clearing) return;

    if (!confirm('确定要清除所有图片缓存吗?\n\n清除后,远程图片将重新下载。')) {
      return;
    }

    setClearing(true);

    try {
      const success = await clearImageCache();

      if (success) {
        const now = new Date().toLocaleString('zh-CN');
        setLastClearTime(now);
        alert('✅ 图片缓存已清除!\n\n刷新页面后,图片将重新加载。');
      } else {
        alert('❌ 清除缓存失败,请检查 Service Worker 是否正常运行');
      }
    } catch (error) {
      console.error('清除缓存失败:', error);
      alert('❌ 清除缓存失败: ' + (error as Error).message);
    } finally {
      setClearing(false);
    }
  };

  // 状态指示器
  const renderStatusIndicator = (active: boolean) => (
    <span className={`cache-status-indicator ${active ? 'cache-status-indicator--active' : ''}`}>
      {active ? '✓ 正常' : '✗ 未激活'}
    </span>
  );

  return (
    <div className="cache-manager">
      <div className="cache-manager__header">
        <h2 className="cache-manager__title">缓存管理</h2>
        <p className="cache-manager__subtitle">
          管理浏览器图片缓存,提升加载速度
        </p>
      </div>

      <div className="cache-manager__content">
        {/* Service Worker 状态卡片 */}
        <div className="cache-card">
          <div className="cache-card__header">
            <h3 className="cache-card__title">Service Worker 状态</h3>
          </div>
          <div className="cache-card__body">
            <div className="cache-info-row">
              <span className="cache-info-label">浏览器支持:</span>
              {renderStatusIndicator(swStatus.supported)}
            </div>
            <div className="cache-info-row">
              <span className="cache-info-label">已注册:</span>
              {renderStatusIndicator(swStatus.registered)}
            </div>
            <div className="cache-info-row">
              <span className="cache-info-label">运行状态:</span>
              {renderStatusIndicator(swStatus.active)}
            </div>
          </div>
        </div>

        {/* 缓存策略说明卡片 */}
        <div className="cache-card">
          <div className="cache-card__header">
            <h3 className="cache-card__title">缓存策略</h3>
          </div>
          <div className="cache-card__body">
            <div className="cache-strategy-list">
              <div className="cache-strategy-item">
                <span className="cache-strategy-icon">🖼️</span>
                <div className="cache-strategy-content">
                  <h4 className="cache-strategy-title">图片资源缓存</h4>
                  <p className="cache-strategy-desc">
                    自动缓存来自 playnccdn.com 和 tw.ncsoft.com 的图片资源
                  </p>
                </div>
              </div>

              <div className="cache-strategy-item">
                <span className="cache-strategy-icon">⏱️</span>
                <div className="cache-strategy-content">
                  <h4 className="cache-strategy-title">缓存有效期</h4>
                  <p className="cache-strategy-desc">
                    图片缓存 24 小时,过期后自动重新获取
                  </p>
                </div>
              </div>

              <div className="cache-strategy-item">
                <span className="cache-strategy-icon">📦</span>
                <div className="cache-strategy-content">
                  <h4 className="cache-strategy-title">离线支持</h4>
                  <p className="cache-strategy-desc">
                    网络断开时,可使用已缓存的图片(即使过期)
                  </p>
                </div>
              </div>

              <div className="cache-strategy-item">
                <span className="cache-strategy-icon">🔄</span>
                <div className="cache-strategy-content">
                  <h4 className="cache-strategy-title">自动更新</h4>
                  <p className="cache-strategy-desc">
                    缓存过期后,访问图片时自动从网络重新加载并更新缓存
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 缓存操作卡片 */}
        <div className="cache-card">
          <div className="cache-card__header">
            <h3 className="cache-card__title">缓存操作</h3>
          </div>
          <div className="cache-card__body">
            {lastClearTime && (
              <div className="cache-info-row cache-info-row--highlight">
                <span className="cache-info-label">上次清除时间:</span>
                <span className="cache-info-value">{lastClearTime}</span>
              </div>
            )}

            <button
              className="cache-clear-btn"
              onClick={handleClearCache}
              disabled={clearing || !swStatus.active}
            >
              {clearing ? (
                <>
                  <span className="cache-clear-btn__spinner">⏳</span>
                  清除中...
                </>
              ) : (
                <>
                  <span className="cache-clear-btn__icon">🗑️</span>
                  清除所有图片缓存
                </>
              )}
            </button>

            {!swStatus.active && (
              <p className="cache-warning">
                ⚠️ Service Worker 未激活,无法清除缓存。请刷新页面后重试。
              </p>
            )}
          </div>
        </div>

        {/* 帮助提示卡片 */}
        <div className="cache-card cache-card--info">
          <div className="cache-card__header">
            <h3 className="cache-card__title">💡 使用提示</h3>
          </div>
          <div className="cache-card__body">
            <ul className="cache-help-list">
              <li>图片缓存仅存储在用户浏览器本地,不占用服务器空间</li>
              <li>首次访问图片会从网络加载,之后 24 小时内使用缓存</li>
              <li>如果图片更新了但页面显示旧图,可以手动清除缓存</li>
              <li>清除缓存后,刷新页面才会重新下载图片</li>
              <li>不同浏览器的缓存是独立的,互不影响</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CacheManager;
