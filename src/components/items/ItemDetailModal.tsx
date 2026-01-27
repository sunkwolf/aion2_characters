import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ItemDetail } from '../../types/items';
import { GRADE_COLORS } from '../../types/items';
import { fetchItemDetail } from '../../services/itemsService';
import ExceedLevel from '../ExceedLevel';
import './ItemDetailModal.css';

interface ItemDetailModalProps {
  itemId: number;
  onClose: () => void;
}

// 缓存类型
interface StatsCache {
  [level: number]: {
    mainStats: ItemDetail['mainStats'];
    subStats: ItemDetail['subStats'];
  };
}

/**
 * 解析物品描述中的自定义标签
 * 如: <desc_point>300秒</> 转换为高亮显示
 */
function parseDescText(text: string): React.ReactNode[] {
  if (!text) return [];

  const parts: React.ReactNode[] = [];
  // 匹配 <desc_point>内容</> 或 <desc_point>内容</desc_point>
  const regex = /<desc_point>(.*?)<\/?(?:desc_point)?>/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // 添加标签前的普通文本
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // 添加高亮文本
    parts.push(
      <span key={key++} className="item-detail-modal__desc-highlight">
        {match[1]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  // 添加剩余文本
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

const ItemDetailModal = ({ itemId, onClose }: ItemDetailModalProps) => {
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 等级状态（累加：强化 + 突破）
  const [totalLevel, setTotalLevel] = useState(0);

  // 属性缓存：key是总等级
  const [statsCache, setStatsCache] = useState<StatsCache>({});

  // 是否正在预加载
  const [preloading, setPreloading] = useState(false);

  // 计算最大等级 = 强化上限 + 突破上限
  const maxLevel = item ? item.max_enchant_level + item.max_exceed_enchant_level : 0;

  // 从总等级计算强化和突破等级
  const getEnchantAndExceed = useCallback((total: number, maxEnchant: number) => {
    if (total <= maxEnchant) {
      return { enchant: total, exceed: 0 };
    }
    return { enchant: maxEnchant, exceed: total - maxEnchant };
  }, []);

  // 当前等级对应的属性
  const currentStats = useMemo(() => {
    return statsCache[totalLevel] || { mainStats: item?.mainStats || [], subStats: item?.subStats || [] };
  }, [statsCache, totalLevel, item]);

  // 加载物品基础信息
  const loadBaseInfo = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchItemDetail(itemId, 0);
      setItem(data);
      // 缓存等级0的属性
      setStatsCache({ 0: { mainStats: data.mainStats || [], subStats: data.subStats || [] } });
      setError(null);
    } catch (err) {
      console.error('加载物品详情失败:', err);
      setError('加载失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  // 预加载所有强化等级的属性
  const preloadAllStats = useCallback(async (baseItem: ItemDetail) => {
    if (!baseItem.enchantable || baseItem.max_enchant_level <= 0) return;

    setPreloading(true);
    const maxEnchant = baseItem.max_enchant_level;
    const maxExceed = baseItem.max_exceed_enchant_level;
    const total = maxEnchant + maxExceed;
    const newCache: StatsCache = { ...statsCache };

    // 逐个请求每个等级的数据（totalLevel 直接传给API）
    for (let level = 1; level <= total; level++) {
      // 如果已缓存，跳过
      if (newCache[level]) continue;

      try {
        // 直接传 totalLevel，后端会用这个值请求官方API的 enchantLevel
        const data = await fetchItemDetail(itemId, level);
        newCache[level] = {
          mainStats: data.mainStats || [],
          subStats: data.subStats || [],
        };
      } catch (err) {
        console.error(`预加载等级 ${level} 失败:`, err);
      }
    }

    setStatsCache(newCache);
    setPreloading(false);
  }, [itemId, statsCache]);

  // 初始加载
  useEffect(() => {
    loadBaseInfo();
  }, [loadBaseInfo]);

  // 基础信息加载完成后预加载所有强化等级
  useEffect(() => {
    if (item && !loading && item.enchantable && item.max_enchant_level > 0) {
      preloadAllStats(item);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, loading]);

  // 关闭弹窗
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (loading && !item) {
    return (
      <div className="item-detail-modal" onClick={handleOverlayClick}>
        <div className="item-detail-modal__content">
          <div className="item-detail-modal__loading">
            <div className="item-detail-modal__spinner" />
            <p>加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="item-detail-modal" onClick={handleOverlayClick}>
        <div className="item-detail-modal__content">
          <div className="item-detail-modal__error">
            <p>{error || '加载失败'}</p>
            <button onClick={onClose}>关闭</button>
          </div>
        </div>
      </div>
    );
  }

  const exceed = getEnchantAndExceed(totalLevel, item.max_enchant_level).exceed;
  const enchant = getEnchantAndExceed(totalLevel, item.max_enchant_level).enchant;
  const gradeColor = GRADE_COLORS[item.grade] || '#9d9d9d';

  // 获取套装信息（优先使用简体）
  const setInfo = item.set_cn || item.set;

  return (
    <div className="item-detail-modal" onClick={handleOverlayClick}>
      <div
        className="item-detail-modal__content"
        style={{ '--grade-color': gradeColor } as React.CSSProperties}
      >
        {/* 关闭按钮 */}
        <button className="item-detail-modal__close" onClick={onClose}>
          ×
        </button>

        {/* 左右布局容器 */}
        <div className="item-detail-modal__layout">
          {/* 左侧：头部 + 滑块 + 来源 */}
          <div className="item-detail-modal__left">
            {/* 头部 - 参考装备弹窗布局 */}
            <div className="item-detail-modal__header">
              <div className="item-detail-modal__icon">
                <img src={item.image} alt={item.name_cn} />
              </div>
              <div className="item-detail-modal__title">
                <div className="item-detail-modal__name">
                  {item.name_cn}
                  {/* 强化等级 */}
                  {enchant > 0 && (
                    <span className="item-detail-modal__enchant">+{enchant}</span>
                  )}
                  {/* 突破等级 */}
                  {exceed > 0 && (
                    <ExceedLevel level={exceed} variant="compact" />
                  )}
                </div>
                <div className="item-detail-modal__grade-row">
                  <span className="item-detail-modal__grade">{item.grade_name_cn}</span>
                  {/* 来源信息 */}
                  {item.sources_cn && item.sources_cn.length > 0 && (
                    <span className="item-detail-modal__source-tag">
                      来源: {item.sources_cn.join(', ')}
                    </span>
                  )}
                </div>
                {/* 基础信息紧凑显示 */}
                <div className="item-detail-modal__meta">
                  {item.category_name_cn && <span className="meta-item">{item.category_name_cn}</span>}
                  {item.level > 0 && <span className="meta-item">Lv.{item.level}</span>}
                  {item.equip_level > 0 && <span className="meta-item">装备等级 {item.equip_level}</span>}
                  {item.race_name_cn && <span className="meta-item">{item.race_name_cn}</span>}
                  {item.classes_cn && item.classes_cn.length > 0 && (
                    <span className="meta-item">{item.classes_cn.join(' · ')}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 强化滑块 */}
            {item.enchantable && maxLevel > 0 && (
              <div className="item-detail-modal__slider-section">
                <div className="item-detail-modal__slider-header">
                  <span className="item-detail-modal__slider-label">
                    强化等级
                    {preloading && <span className="item-detail-modal__preload-hint">(预加载中...)</span>}
                  </span>
                  <span className="item-detail-modal__slider-value">
                    +{totalLevel}
                    {exceed > 0 && (
                      <span className="item-detail-modal__exceed-badge">
                        <ExceedLevel level={exceed} variant="compact" />
                      </span>
                    )}
                  </span>
                </div>
                <div className="item-detail-modal__slider-wrapper">
                  <input
                    type="range"
                    min="0"
                    max={maxLevel}
                    value={totalLevel}
                    onChange={e => setTotalLevel(Number(e.target.value))}
                    className="item-detail-modal__slider"
                    style={{
                      '--progress': `${(totalLevel / maxLevel) * 100}%`,
                    } as React.CSSProperties}
                  />
                  {/* 突破分界线 */}
                  {item.max_exceed_enchant_level > 0 && (
                    <div
                      className="item-detail-modal__exceed-marker"
                      style={{
                        left: `${(item.max_enchant_level / maxLevel) * 100}%`,
                      }}
                    />
                  )}
                </div>
                <div className="item-detail-modal__slider-labels">
                  <span>0</span>
                  {item.max_exceed_enchant_level > 0 && (
                    <span
                      className="item-detail-modal__slider-exceed-label"
                      style={{
                        left: `${(item.max_enchant_level / maxLevel) * 100}%`,
                      }}
                    >
                      强化上限
                    </span>
                  )}
                  <span>+{maxLevel}</span>
                </div>
              </div>
            )}

            {/* 外观 */}
            {(item.raw_data_cn?.costumes || item.costumes_cn) && (
              <div className="item-detail-modal__section">
                <h3 className="item-detail-modal__section-title">外观</h3>
                <div className="item-detail-modal__costume">
                  {Array.isArray(item.raw_data_cn?.costumes)
                    ? (item.raw_data_cn.costumes as string[]).join(', ')
                    : item.costumes_cn}
                </div>
              </div>
            )}

            {/* 物品说明 (非装备类) */}
            {(item.raw_data_cn?.desc || item.desc_cn) && (
              <div className="item-detail-modal__section">
                <h3 className="item-detail-modal__section-title">说明</h3>
                <div className="item-detail-modal__desc">
                  {parseDescText(String(item.raw_data_cn?.desc || item.desc_cn || ''))}
                </div>
              </div>
            )}

            {/* 冷却/持续时间 (非装备类) */}
            {((item.cool_time != null && item.cool_time > 0) ||
              (item.duration_min != null && item.duration_min > 0) ||
              (item.duration_max != null && item.duration_max > 0)) && (
              <div className="item-detail-modal__time-info">
                {item.cool_time != null && item.cool_time > 0 && (
                  <span className="item-detail-modal__time-item">
                    冷却时间: {item.cool_time}秒
                  </span>
                )}
                {((item.duration_min != null && item.duration_min > 0) ||
                  (item.duration_max != null && item.duration_max > 0)) && (
                  <span className="item-detail-modal__time-item">
                    持续时间: {item.duration_min === item.duration_max
                      ? `${item.duration_min}秒`
                      : `${item.duration_min || 0} ~ ${item.duration_max || 0}秒`}
                  </span>
                )}
              </div>
            )}

            {/* 刻印 - 魔石和神石 */}
            {(() => {
              const magicSlotCount = (item.raw_data_cn?.magicStoneSlotCount as number) || item.magic_stone_slot_count || 0;
              const godSlotCount = (item.raw_data_cn?.godStoneSlotCount as number) || item.god_stone_slot_count || 0;
              return (magicSlotCount > 0 || godSlotCount > 0) && (
                <div className="item-detail-modal__section">
                  <h3 className="item-detail-modal__section-title">刻印</h3>
                  {magicSlotCount > 0 && (
                    <div className="item-detail-modal__slot-section">
                      <span className="item-detail-modal__slot-label">魔石</span>
                      <div className="item-detail-modal__slots">
                        {Array.from({ length: magicSlotCount }).map((_, i) => (
                          <span key={i} className="item-detail-modal__slot item-detail-modal__slot--empty">◆</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {godSlotCount > 0 && (
                    <div className="item-detail-modal__slot-section">
                      <span className="item-detail-modal__slot-label">神石</span>
                      <div className="item-detail-modal__slots">
                        {Array.from({ length: godSlotCount }).map((_, i) => (
                          <span key={i} className="item-detail-modal__slot item-detail-modal__slot--god">●</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 底部信息 */}
            <div className="item-detail-modal__footer">
              {item.tradable && <span className="item-detail-modal__tag">可交易</span>}
              {item.enchantable && <span className="item-detail-modal__tag">可强化</span>}
            </div>
          </div>

          {/* 右侧：属性 + 套装 */}
          <div className="item-detail-modal__right">
            {/* 附加能力（主属性） */}
            {currentStats.mainStats && currentStats.mainStats.length > 0 && (
              <div className="item-detail-modal__section">
                <h3 className="item-detail-modal__section-title">附加能力</h3>
                <div className="item-detail-modal__stats">
                  {currentStats.mainStats.map((stat, idx) => {
                    // 固有附加能力: value 有数值
                    const hasValue = stat.value && stat.value !== '0' && stat.value !== '0%';
                    // 突破附加能力: extra 有数值且 exceed 为 true
                    const hasExceedExtra = stat.extra && stat.extra !== '0' && stat.extra !== '0%' && stat.exceed;
                    // 强化加成: extra 有数值且 exceed 为 false
                    const hasEnhancement = stat.extra && stat.extra !== '0' && stat.extra !== '0%' && !stat.exceed;

                    if (!hasValue && !hasExceedExtra) return null;

                    return (
                      <div key={idx}>
                        {/* 固有附加能力(带强化加成) */}
                        {hasValue && (
                          <div className="item-detail-modal__stat item-detail-modal__stat--main">
                            <span className="item-detail-modal__stat-name">{stat.name}</span>
                            <span className="item-detail-modal__stat-value">
                              {stat.minValue && <span className="stat-range">{stat.minValue} ~ </span>}
                              <span className="stat-base">{stat.value}</span>
                              {hasEnhancement && <span className="stat-enhancement"> (+{stat.extra})</span>}
                            </span>
                          </div>
                        )}
                        {/* 突破附加能力 */}
                        {hasExceedExtra && (
                          <div className="item-detail-modal__stat item-detail-modal__stat--exceed">
                            <span className="item-detail-modal__stat-name">{stat.name}</span>
                            <span className="item-detail-modal__stat-value">{stat.extra}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 灵魂刻印（副属性） */}
            {currentStats.subStats && currentStats.subStats.length > 0 && (
              <div className="item-detail-modal__section">
                <h3 className="item-detail-modal__section-title">灵魂刻印</h3>
                <div className="item-detail-modal__stats item-detail-modal__stats--sub">
                  {currentStats.subStats.map((stat, idx) => (
                    <div key={idx} className="item-detail-modal__stat item-detail-modal__stat--sub">
                      <span className="item-detail-modal__stat-name">{stat.name}</span>
                      <span className="item-detail-modal__stat-value">
                        {stat.minValue ? `${stat.minValue} ~ ${stat.value}` : stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 套装效果 */}
            {setInfo && (
              <div className="item-detail-modal__section">
                <h3 className="item-detail-modal__section-title">套装效果</h3>
                <div className="item-detail-modal__set-name">
                  {setInfo.name} ({setInfo.equippedCount || 0}件)
                </div>
                {setInfo.bonuses && setInfo.bonuses.length > 0 ? (
                  setInfo.bonuses.map((bonus, index) => (
                    <div key={index} className="item-detail-modal__set-bonus">
                      <div className="item-detail-modal__set-bonus-header">{bonus.degree}件套</div>
                      <div className="item-detail-modal__set-bonus-effects">
                        {bonus.descriptions.map((desc, descIndex) => (
                          <div key={descIndex} className="item-detail-modal__set-bonus-effect">{desc}</div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="item-detail-modal__set-empty">无</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailModal;
