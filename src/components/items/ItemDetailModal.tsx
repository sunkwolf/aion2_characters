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

// Cache type
interface StatsCache {
  [level: number]: {
    mainStats: ItemDetail['mainStats'];
    subStats: ItemDetail['subStats'];
  };
}

/**
 * Parse custom tags in item description
 * e.g.: <desc_point>300s</> converts to highlighted display
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
    // Add plain text before the tag
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add highlighted text
    parts.push(
      <span key={key++} className="item-detail-modal__desc-highlight">
        {match[1]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

const ItemDetailModal = ({ itemId, onClose }: ItemDetailModalProps) => {
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Level state (cumulative: enchant + exceed)
  const [totalLevel, setTotalLevel] = useState(0);

  // Stats cache: key is total level
  const [statsCache, setStatsCache] = useState<StatsCache>({});

  // Whether preloading
  const [preloading, setPreloading] = useState(false);

  // Calculate max level = enchant limit + exceed limit
  const maxLevel = item ? item.max_enchant_level + item.max_exceed_enchant_level : 0;

  // Calculate enchant and exceed levels from total
  const getEnchantAndExceed = useCallback((total: number, maxEnchant: number) => {
    if (total <= maxEnchant) {
      return { enchant: total, exceed: 0 };
    }
    return { enchant: maxEnchant, exceed: total - maxEnchant };
  }, []);

  // Stats for current level
  const currentStats = useMemo(() => {
    return statsCache[totalLevel] || { mainStats: item?.mainStats || [], subStats: item?.subStats || [] };
  }, [statsCache, totalLevel, item]);

  // Load item base info
  const loadBaseInfo = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchItemDetail(itemId, 0);
      setItem(data);
      // Cache level 0 stats
      setStatsCache({ 0: { mainStats: data.mainStats || [], subStats: data.subStats || [] } });
      setError(null);
    } catch (err) {
      console.error('Failed to load item details:', err);
      setError('Failed to load, please try again');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  // Preload all enchant level stats
  const preloadAllStats = useCallback(async (baseItem: ItemDetail) => {
    if (!baseItem.enchantable || baseItem.max_enchant_level <= 0) return;

    setPreloading(true);
    const maxEnchant = baseItem.max_enchant_level;
    const maxExceed = baseItem.max_exceed_enchant_level;
    const total = maxEnchant + maxExceed;
    const newCache: StatsCache = { ...statsCache };

    // Request data for each level (totalLevel passed directly to API)
    for (let level = 1; level <= total; level++) {
      // Skip if already cached
      if (newCache[level]) continue;

      try {
        // Pass totalLevel directly, backend uses this for official API's enchantLevel
        const data = await fetchItemDetail(itemId, level);
        newCache[level] = {
          mainStats: data.mainStats || [],
          subStats: data.subStats || [],
        };
      } catch (err) {
        console.error(`Failed to preload level ${level}:`, err);
      }
    }

    setStatsCache(newCache);
    setPreloading(false);
  }, [itemId, statsCache]);

  // Initial load
  useEffect(() => {
    loadBaseInfo();
  }, [loadBaseInfo]);

  // Preload all enchant levels after base info loaded
  useEffect(() => {
    if (item && !loading && item.enchantable && item.max_enchant_level > 0) {
      preloadAllStats(item);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, loading]);

  // Close modal
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // ESC key close
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
            <p>Loading...</p>
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
            <p>{error || 'Failed to load'}</p>
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const exceed = getEnchantAndExceed(totalLevel, item.max_enchant_level).exceed;
  const enchant = getEnchantAndExceed(totalLevel, item.max_enchant_level).enchant;
  const gradeColor = GRADE_COLORS[item.grade] || '#9d9d9d';

  // Get set info (prefer simplified Chinese)
  const setInfo = item.set_cn || item.set;

  return (
    <div className="item-detail-modal" onClick={handleOverlayClick}>
      <div
        className="item-detail-modal__content"
        style={{ '--grade-color': gradeColor } as React.CSSProperties}
      >
        {/* Close button */}
        <button className="item-detail-modal__close" onClick={onClose}>
          ×
        </button>

        {/* Left-right layout container */}
        <div className="item-detail-modal__layout">
          {/* Left: Header + Slider + Source */}
          <div className="item-detail-modal__left">
            {/* Header - reference equipment modal layout */}
            <div className="item-detail-modal__header">
              <div className="item-detail-modal__icon">
                <img src={item.image} alt={item.name_cn} />
              </div>
              <div className="item-detail-modal__title">
                <div className="item-detail-modal__name">
                  {item.name_cn}
                  {/* Enchant level */}
                  {enchant > 0 && (
                    <span className="item-detail-modal__enchant">+{enchant}</span>
                  )}
                  {/* Exceed level */}
                  {exceed > 0 && (
                    <ExceedLevel level={exceed} variant="compact" />
                  )}
                </div>
                <div className="item-detail-modal__grade-row">
                  <span className="item-detail-modal__grade">{item.grade_name_cn}</span>
                  {/* Source info */}
                  {item.sources_cn && item.sources_cn.length > 0 && (
                    <span className="item-detail-modal__source-tag">
                      Source: {item.sources_cn.join(', ')}
                    </span>
                  )}
                </div>
                {/* Basic info compact display */}
                <div className="item-detail-modal__meta">
                  {item.category_name_cn && <span className="meta-item">{item.category_name_cn}</span>}
                  {item.level > 0 && <span className="meta-item">Lv.{item.level}</span>}
                  {item.equip_level > 0 && <span className="meta-item">Equip Level {item.equip_level}</span>}
                  {item.race_name_cn && <span className="meta-item">{item.race_name_cn}</span>}
                  {item.classes_cn && item.classes_cn.length > 0 && (
                    <span className="meta-item">{item.classes_cn.join(' · ')}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Enchant slider */}
            {item.enchantable && maxLevel > 0 && (
              <div className="item-detail-modal__slider-section">
                <div className="item-detail-modal__slider-header">
                  <span className="item-detail-modal__slider-label">
                    Enchant Level
                    {preloading && <span className="item-detail-modal__preload-hint">(Preloading...)</span>}
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
                  {/* Exceed threshold line */}
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
                      Enchant Limit
                    </span>
                  )}
                  <span>+{maxLevel}</span>
                </div>
              </div>
            )}

            {/* Appearance */}
            {(item.raw_data_cn?.costumes || item.costumes_cn) && (
              <div className="item-detail-modal__section">
                <h3 className="item-detail-modal__section-title">Appearance</h3>
                <div className="item-detail-modal__costume">
                  {Array.isArray(item.raw_data_cn?.costumes)
                    ? (item.raw_data_cn.costumes as string[]).join(', ')
                    : item.costumes_cn}
                </div>
              </div>
            )}

            {/* Item description (non-equipment) */}
            {(item.raw_data_cn?.desc || item.desc_cn) && (
              <div className="item-detail-modal__section">
                <h3 className="item-detail-modal__section-title">Description</h3>
                <div className="item-detail-modal__desc">
                  {parseDescText(String(item.raw_data_cn?.desc || item.desc_cn || ''))}
                </div>
              </div>
            )}

            {/* Cooldown/Duration (non-equipment) */}
            {((item.cool_time != null && item.cool_time > 0) ||
              (item.duration_min != null && item.duration_min > 0) ||
              (item.duration_max != null && item.duration_max > 0)) && (
                <div className="item-detail-modal__time-info">
                  {item.cool_time != null && item.cool_time > 0 && (
                    <span className="item-detail-modal__time-item">
                      Cooldown: {item.cool_time}s
                    </span>
                  )}
                  {((item.duration_min != null && item.duration_min > 0) ||
                    (item.duration_max != null && item.duration_max > 0)) && (
                      <span className="item-detail-modal__time-item">
                        Duration: {item.duration_min === item.duration_max
                          ? `${item.duration_min}s`
                          : `${item.duration_min || 0} ~ ${item.duration_max || 0}s`}
                      </span>
                    )}
                </div>
              )}

            {/* Socket - Magic and God stones */}
            {(() => {
              const magicSlotCount = (item.raw_data_cn?.magicStoneSlotCount as number) || item.magic_stone_slot_count || 0;
              const godSlotCount = (item.raw_data_cn?.godStoneSlotCount as number) || item.god_stone_slot_count || 0;
              return (magicSlotCount > 0 || godSlotCount > 0) && (
                <div className="item-detail-modal__section">
                  <h3 className="item-detail-modal__section-title">Sockets</h3>
                  {magicSlotCount > 0 && (
                    <div className="item-detail-modal__slot-section">
                      <span className="item-detail-modal__slot-label">Magic Stones</span>
                      <div className="item-detail-modal__slots">
                        {Array.from({ length: magicSlotCount }).map((_, i) => (
                          <span key={i} className="item-detail-modal__slot item-detail-modal__slot--empty">◆</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {godSlotCount > 0 && (
                    <div className="item-detail-modal__slot-section">
                      <span className="item-detail-modal__slot-label">Godstones</span>
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

            {/* Footer info */}
            <div className="item-detail-modal__footer">
              {item.tradable && <span className="item-detail-modal__tag">Tradable</span>}
              {item.enchantable && <span className="item-detail-modal__tag">Enchantable</span>}
            </div>
          </div>

          {/* Right: Stats + Set */}
          <div className="item-detail-modal__right">
            {/* Bonus Abilities (main stats) */}
            {currentStats.mainStats && currentStats.mainStats.length > 0 && (
              <div className="item-detail-modal__section">
                <h3 className="item-detail-modal__section-title">Bonus Abilities</h3>
                <div className="item-detail-modal__stats">
                  {currentStats.mainStats.map((stat, idx) => {
                    // Inherent bonus: value has a number
                    const hasValue = stat.value && stat.value !== '0' && stat.value !== '0%';
                    // Exceed bonus: extra has a value and exceed is true
                    const hasExceedExtra = stat.extra && stat.extra !== '0' && stat.extra !== '0%' && stat.exceed;
                    // Enhancement bonus: extra has a value and exceed is false
                    const hasEnhancement = stat.extra && stat.extra !== '0' && stat.extra !== '0%' && !stat.exceed;

                    if (!hasValue && !hasExceedExtra) return null;

                    return (
                      <div key={idx}>
                        {/* Inherent bonus (with enhancement) */}
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
                        {/* Exceed bonus */}
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

            {/* Soul Binding (sub stats) */}
            {currentStats.subStats && currentStats.subStats.length > 0 && (
              <div className="item-detail-modal__section">
                <h3 className="item-detail-modal__section-title">Soul Binding</h3>
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

            {/* Set Effects */}
            {setInfo && (
              <div className="item-detail-modal__section">
                <h3 className="item-detail-modal__section-title">Set Effects</h3>
                <div className="item-detail-modal__set-name">
                  {setInfo.name} ({setInfo.equippedCount || 0} pcs)
                </div>
                {setInfo.bonuses && setInfo.bonuses.length > 0 ? (
                  setInfo.bonuses.map((bonus, index) => (
                    <div key={index} className="item-detail-modal__set-bonus">
                      <div className="item-detail-modal__set-bonus-header">{bonus.degree}-Piece</div>
                      <div className="item-detail-modal__set-bonus-effects">
                        {bonus.descriptions.map((desc, descIndex) => (
                          <div key={descIndex} className="item-detail-modal__set-bonus-effect">{desc}</div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="item-detail-modal__set-empty">None</div>
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
