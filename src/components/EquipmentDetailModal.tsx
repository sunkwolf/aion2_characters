// Equipment detail modal - Floating style without overlay, auto-closes on mouse out

import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EquipmentDetail } from '../types/admin';
import { gradeColors } from '../data/memberTypes';
import { translateStatName } from '../data/statTranslations';
import ExceedLevel from './ExceedLevel';
import './EquipmentDetailModal.css';

interface EquipRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

interface EquipmentDetailModalProps {
  equipmentDetail: EquipmentDetail | null;
  visible: boolean;
  loading?: boolean;
  position?: { x: number; y: number; equipRect?: EquipRect };
}

const EquipmentDetailModal: React.FC<EquipmentDetailModalProps> = ({
  equipmentDetail,
  visible,
  loading = false,
  position,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState<{ left: number; top: number } | null>(null);

  // Smart position calculation - choose best display direction based on equipment position
  useEffect(() => {
    if (!visible || !position) {
      setAdjustedPosition(null);
      return;
    }

    // Use requestAnimationFrame to ensure calculation after DOM rendering
    let rafId: number;
    const calculatePosition = () => {
      rafId = requestAnimationFrame(() => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const modalWidth = modalRef.current?.offsetWidth || 380;
        const modalHeight = modalRef.current?.offsetHeight || 400;
        const gap = 8; // Gap between modal and equipment

        let left: number;
        let top: number;

        // If equipment element bounds exist, use smart positioning
        if (position.equipRect) {
          const rect = position.equipRect;

          // Calculate available space in all four directions
          const spaceRight = viewportWidth - rect.right - gap;
          const spaceLeft = rect.left - gap;
          const spaceBottom = viewportHeight - rect.bottom - gap;
          const spaceTop = rect.top - gap;

          // Determine which screen region the equipment is in, prefer direction away from screen edge
          const isOnRightHalf = rect.left > viewportWidth / 2;
          const isOnBottomHalf = rect.top > viewportHeight / 2;

          // Choose best direction based on equipment position
          if (isOnRightHalf) {
            // Equipment on right half, prefer left side
            if (spaceLeft >= modalWidth) {
              left = rect.left - modalWidth - gap;
              top = rect.top;
            } else if (spaceRight >= modalWidth) {
              left = rect.right + gap;
              top = rect.top;
            } else if (isOnBottomHalf && spaceTop >= modalHeight) {
              left = rect.left;
              top = rect.top - modalHeight - gap;
            } else if (spaceBottom >= modalHeight) {
              left = rect.left;
              top = rect.bottom + gap;
            } else {
              // 都不够，选择空间最大的方向
              const maxSpace = Math.max(spaceRight, spaceLeft, spaceBottom, spaceTop);
              if (maxSpace === spaceLeft) {
                left = rect.left - modalWidth - gap;
                top = rect.top;
              } else if (maxSpace === spaceRight) {
                left = rect.right + gap;
                top = rect.top;
              } else if (maxSpace === spaceTop) {
                left = rect.left;
                top = rect.top - modalHeight - gap;
              } else {
                left = rect.left;
                top = rect.bottom + gap;
              }
            }
          } else {
            // Equipment on left half, prefer right side
            if (spaceRight >= modalWidth) {
              left = rect.right + gap;
              top = rect.top;
            } else if (spaceLeft >= modalWidth) {
              left = rect.left - modalWidth - gap;
              top = rect.top;
            } else if (isOnBottomHalf && spaceTop >= modalHeight) {
              left = rect.left;
              top = rect.top - modalHeight - gap;
            } else if (spaceBottom >= modalHeight) {
              left = rect.left;
              top = rect.bottom + gap;
            } else {
              // 都不够，选择空间最大的方向
              const maxSpace = Math.max(spaceRight, spaceLeft, spaceBottom, spaceTop);
              if (maxSpace === spaceRight) {
                left = rect.right + gap;
                top = rect.top;
              } else if (maxSpace === spaceLeft) {
                left = rect.left - modalWidth - gap;
                top = rect.top;
              } else if (maxSpace === spaceBottom) {
                left = rect.left;
                top = rect.bottom + gap;
              } else {
                left = rect.left;
                top = rect.top - modalHeight - gap;
              }
            }
          }

          // Ensure modal doesn't exceed screen boundaries
          if (left + modalWidth > viewportWidth - gap) {
            left = viewportWidth - modalWidth - gap;
          }
          if (left < gap) {
            left = gap;
          }
          if (top + modalHeight > viewportHeight - gap) {
            top = viewportHeight - modalHeight - gap;
          }
          if (top < gap) {
            top = gap;
          }
        } else {
          // No equipment bounds info, use original logic
          left = position.x;
          top = position.y;

          // Not enough space on right, show on left of equipment
          if (left + modalWidth > viewportWidth - gap) {
            left = Math.max(gap, position.x - modalWidth - 60);
          }

          // Ensure left side doesn't exceed
          if (left < gap) {
            left = gap;
          }

          // Not enough space at bottom, adjust upward
          if (top + modalHeight > viewportHeight - gap) {
            top = viewportHeight - modalHeight - gap;
          }

          // Ensure top side doesn't exceed
          if (top < gap) {
            top = gap;
          }
        }

        setAdjustedPosition({ left, top });
      });
    };

    calculatePosition();

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [visible, position]);

  if (!visible) return null;

  const getPositionStyle = (): React.CSSProperties => {
    if (adjustedPosition) {
      return {
        left: `${adjustedPosition.left}px`,
        top: `${adjustedPosition.top}px`,
      };
    }
    if (!position) {
      return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
    }
    // Initial position (before adjustment)
    return {
      left: `${position.x}px`,
      top: `${position.y}px`,
      visibility: 'hidden', // Hide before adjustment to avoid flicker
    };
  };

  // If loading, show loading animation
  if (loading) {
    return createPortal(
      <div
        ref={modalRef}
        className="equipment-modal-content equipment-modal-content--loading"
        style={getPositionStyle()}
      >
        <div className="equipment-modal__loading">
          <div className="equipment-modal__spinner"></div>
          <p>Loading equipment details...</p>
        </div>
      </div>,
      document.body
    );
  }

  if (!equipmentDetail) return null;

  const gradeColor = gradeColors[equipmentDetail.grade] || '#9d9d9d';

  return createPortal(
    <div
      ref={modalRef}
      className="equipment-modal-content"
      style={getPositionStyle()}
    >
      {/* Equipment header */}
      <div className="equipment-modal__header" style={{ borderColor: gradeColor }}>
        <div className="equipment-modal__header-left">
          <div className="equipment-modal__icon">
            <img src={equipmentDetail.icon} alt={equipmentDetail.name} />
          </div>
          <div className="equipment-modal__title">
            <div className="equipment-modal__name" style={{ color: gradeColor }}>
              {equipmentDetail.name}
              {/* Display max enchant level +15 */}
              {equipmentDetail.enchantLevel > 0 && (
                <span className="equipment-modal__enchant">
                  +{Math.min(equipmentDetail.enchantLevel, equipmentDetail.maxEnchantLevel || 15)}
                </span>
              )}
              {/* Exceed level compact display in title row */}
              {equipmentDetail.maxExceedEnchantLevel && equipmentDetail.maxExceedEnchantLevel > 0 &&
                equipmentDetail.enchantLevel > (equipmentDetail.maxEnchantLevel || 15) && (
                  <ExceedLevel
                    level={equipmentDetail.enchantLevel - (equipmentDetail.maxEnchantLevel || 15)}
                    variant="compact"
                  />
                )}
            </div>
            <div className="equipment-modal__grade-row">
              <span className="equipment-modal__grade">{equipmentDetail.gradeName || equipmentDetail.grade}</span>
              {/* Source info */}
              {equipmentDetail.sources && equipmentDetail.sources.length > 0 && (
                <span className="equipment-modal__source">
                  Source: {equipmentDetail.sources.join(', ')}
                </span>
              )}
            </div>

            {/* Basic info compact display */}
            <div className="equipment-modal__meta">
              {equipmentDetail.categoryName && <span className="meta-item">{equipmentDetail.categoryName}</span>}
              {equipmentDetail.level && <span className="meta-item">Lv.{equipmentDetail.level}</span>}
              {equipmentDetail.equipLevel && <span className="meta-item">Equip Level {equipmentDetail.equipLevel}</span>}
              {equipmentDetail.raceName && <span className="meta-item">{equipmentDetail.raceName}</span>}
              {equipmentDetail.classNames && equipmentDetail.classNames.length > 0 && (
                <span className="meta-item">{equipmentDetail.classNames.join(' · ')}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Equipment info body - single column compact layout */}
      <div className="equipment-modal__body">
        {/* Bonus Abilities */}
        {equipmentDetail.mainStats && equipmentDetail.mainStats.length > 0 && (
          <div className="equipment-modal__section">
            <div className="section-title">Bonus Abilities</div>
            {equipmentDetail.mainStats.map((stat, index) => {
              // Inherent bonus: value has a number
              const hasValue = stat.value && stat.value !== '0' && stat.value !== '0%';
              // Exceed bonus: extra has a value and exceed is true
              const hasExtra = stat.extra && stat.extra !== '0' && stat.extra !== '0%' && stat.exceed;
              // Enhancement bonus: extra has a value and exceed is false
              const hasEnhancement = stat.extra && stat.extra !== '0' && stat.extra !== '0%' && !stat.exceed;

              if (!hasValue && !hasExtra) return null;

              return (
                <div key={index}>
                  {/* Inherent bonus (with enhancement) */}
                  {hasValue && (
                    <div className="stat-row stat-row--main">
                      <span className="stat-name">{translateStatName(stat.name)}</span>
                      <span className="stat-value">
                        {stat.minValue && <span className="stat-range">{stat.minValue} ~ </span>}
                        <span className="stat-base">{stat.value}</span>
                        {hasEnhancement && <span className="stat-enhancement"> (+{stat.extra})</span>}
                      </span>
                    </div>
                  )}
                  {/* Exceed bonus */}
                  {hasExtra && (
                    <div className="stat-row stat-row--exceed">
                      <span className="stat-name">{translateStatName(stat.name)}</span>
                      <span className="stat-value">{stat.extra}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Soul Binding (sub stats + sub skills) */}
        {((equipmentDetail.subStats && equipmentDetail.subStats.length > 0) ||
          (equipmentDetail.subSkills && equipmentDetail.subSkills.length > 0)) && (
            <div className="equipment-modal__section">
              <div className="section-title-row">
                <div className="section-title">Soul Binding</div>
                {/* Soul binding progress */}
                {equipmentDetail.soulBindRate && (
                  <div className="soul-bind-progress">
                    <div className="soul-bind-progress__bar">
                      <div
                        className="soul-bind-progress__fill"
                        style={{ width: `${equipmentDetail.soulBindRate}%` }}
                      ></div>
                    </div>
                    <span className="soul-bind-progress__text">{equipmentDetail.soulBindRate}%</span>
                  </div>
                )}
              </div>

              {/* Sub stats */}
              {equipmentDetail.subStats && equipmentDetail.subStats.length > 0 && (
                <>
                  {equipmentDetail.subStats.map((stat, index) => (
                    <div key={index} className="stat-row stat-row--sub">
                      <span className="stat-name">{translateStatName(stat.name)}</span>
                      <span className="stat-value">{stat.value}</span>
                    </div>
                  ))}
                </>
              )}

              {/* Sub skills */}
              {equipmentDetail.subSkills && equipmentDetail.subSkills.length > 0 && (
                <>
                  {equipmentDetail.subSkills.map((skill, index) => (
                    <div key={index} className="skill-row">
                      {skill.icon && <img src={skill.icon} alt={skill.name} className="skill-icon" />}
                      <span className="skill-name skill-name--sub">{skill.name}</span>
                      {skill.level && <span className="skill-level">Lv.{skill.level}</span>}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

        {/* 魔石 */}
        {equipmentDetail.magicStoneStat && equipmentDetail.magicStoneStat.length > 0 && (
          <div className="equipment-modal__section">
            <div className="section-title">魔石</div>
            {equipmentDetail.magicStoneStat.map((stone, index) => (
              <div key={index} className="stone-row" style={{ color: stone.grade ? gradeColors[stone.grade] : '#9d9d9d' }}>
                <span className="stone-name">{stone.name}</span>
                <span className="stone-value">{stone.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* 神石 */}
        {equipmentDetail.godStoneStat && equipmentDetail.godStoneStat.length > 0 && (
          <div className="equipment-modal__section">
            <div className="section-title-row">
              <div className="section-title">神石</div>
              <div className="godstone-icons">
                {equipmentDetail.godStoneStat.map((stone, index) => (
                  stone.icon && <img key={index} src={stone.icon} alt={stone.name} className="godstone-icon-small" />
                ))}
              </div>
            </div>
            {equipmentDetail.godStoneStat.map((stone, index) => (
              <div key={index} className="godstone-row" style={{ color: gradeColors[stone.grade || ''] || '#9d9d9d' }}>
                <div className="godstone-info">
                  <div className="godstone-name">{stone.name}</div>
                  {stone.desc && <div className="godstone-desc">{stone.desc}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 套装效果 */}
        <div className="equipment-modal__section">
          <div className="section-title">套装效果</div>
          {equipmentDetail.set?.name && (
            <div className="set-name">
              {equipmentDetail.set.name} ({equipmentDetail.set.equippedCount}件)
            </div>
          )}
          {((equipmentDetail.set?.bonuses && equipmentDetail.set.bonuses.length > 0) ||
            (equipmentDetail.bonuses && equipmentDetail.bonuses.length > 0)) ? (
            (equipmentDetail.set?.bonuses || equipmentDetail.bonuses || []).map((bonus, index) => (
              <div key={index} className="set-bonus">
                <div className="set-bonus__header">{bonus.degree}-Piece</div>
                <div className="set-bonus__effects">
                  {bonus.descriptions.map((desc, descIndex) => (
                    <div key={descIndex} className="set-bonus__effect">{desc}</div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="set-bonus-empty">None</div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EquipmentDetailModal;
