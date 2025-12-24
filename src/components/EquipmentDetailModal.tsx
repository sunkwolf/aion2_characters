// 装备详情模态框 - 点击装备后显示完整信息

import React from 'react';
import { createPortal } from 'react-dom';
import type { EquipmentDetail } from '../types/admin';
import { gradeColors } from '../data/memberTypes';
import ExceedLevel from './ExceedLevel';
import './EquipmentDetailModal.css';

interface EquipmentDetailModalProps {
  equipmentDetail: EquipmentDetail | null;
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
}

const EquipmentDetailModal: React.FC<EquipmentDetailModalProps> = ({
  equipmentDetail,
  visible,
  loading = false,
  onClose,
}) => {
  if (!visible) return null;

  // 如果正在加载,显示加载动画
  if (loading) {
    return createPortal(
      <div className="equipment-modal-overlay" onClick={onClose}>
        <div className="equipment-modal-content equipment-modal-content--loading" onClick={(e) => e.stopPropagation()}>
          <div className="equipment-modal__loading">
            <div className="equipment-modal__spinner"></div>
            <p>载入装备详情中...</p>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (!equipmentDetail) return null;

  const gradeColor = gradeColors[equipmentDetail.grade] || '#9d9d9d';

  return createPortal(
    <div className="equipment-modal-overlay" onClick={onClose}>
      <div className="equipment-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* 装备头部 */}
        <div className="equipment-modal__header" style={{ borderColor: gradeColor }}>
          <div className="equipment-modal__header-left">
            <div className="equipment-modal__icon">
              <img src={equipmentDetail.icon} alt={equipmentDetail.name} />
            </div>
            <div className="equipment-modal__title">
              <div className="equipment-modal__name" style={{ color: gradeColor }}>
                {equipmentDetail.name}
                {/* 显示最大强化等级 +15 */}
                {equipmentDetail.enchantLevel > 0 && (
                  <span className="equipment-modal__enchant">
                    +{Math.min(equipmentDetail.enchantLevel, equipmentDetail.maxEnchantLevel || 15)}
                  </span>
                )}
                {/* 突破等级紧凑显示在标题行 */}
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
                {/* 来源信息 */}
                {equipmentDetail.sources && equipmentDetail.sources.length > 0 && (
                  <span className="equipment-modal__source">
                    来源: {equipmentDetail.sources.join(', ')}
                  </span>
                )}
              </div>

              {/* 基础信息紧凑显示 */}
              <div className="equipment-modal__meta">
                {equipmentDetail.categoryName && <span className="meta-item">{equipmentDetail.categoryName}</span>}
                {equipmentDetail.level && <span className="meta-item">Lv.{equipmentDetail.level}</span>}
                {equipmentDetail.equipLevel && <span className="meta-item">装备等级 {equipmentDetail.equipLevel}</span>}
                {equipmentDetail.raceName && <span className="meta-item">{equipmentDetail.raceName}</span>}
                {equipmentDetail.classNames && equipmentDetail.classNames.length > 0 && (
                  <span className="meta-item">{equipmentDetail.classNames.join(' · ')}</span>
                )}
              </div>
            </div>
          </div>
          <div className="equipment-modal__header-right">
            <button className="equipment-modal__close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        {/* 装备信息主体 - 使用两栏布局 */}
        <div className="equipment-modal__body">
          {/* 左栏 - 附加能力和灵魂刻印 */}
          <div className="equipment-modal__column">

            {/* 附加能力 */}
            {equipmentDetail.mainStats && equipmentDetail.mainStats.length > 0 && (
              <div className="equipment-modal__section">
                <div className="section-title">附加能力</div>
                {equipmentDetail.mainStats.map((stat, index) => {
                  // 固有附加能力: value 有数值
                  const hasValue = stat.value && stat.value !== '0' && stat.value !== '0%';
                  // 突破附加能力: extra 有数值且 exceed 为 true
                  const hasExtra = stat.extra && stat.extra !== '0' && stat.extra !== '0%' && stat.exceed;
                  // 强化加成: extra 有数值且 exceed 为 false
                  const hasEnhancement = stat.extra && stat.extra !== '0' && stat.extra !== '0%' && !stat.exceed;

                  if (!hasValue && !hasExtra) return null;

                  return (
                    <div key={index}>
                      {/* 固有附加能力(带强化加成) */}
                      {hasValue && (
                        <div className="stat-row stat-row--main">
                          <span className="stat-name">{stat.name}</span>
                          <span className="stat-value">
                            {stat.minValue && <span className="stat-range">{stat.minValue} ~ </span>}
                            <span className="stat-base">{stat.value}</span>
                            {hasEnhancement && <span className="stat-enhancement"> (+{stat.extra})</span>}
                          </span>
                        </div>
                      )}
                      {/* 突破附加能力 */}
                      {hasExtra && (
                        <div className="stat-row stat-row--exceed">
                          <span className="stat-name">{stat.name}</span>
                          <span className="stat-value">{stat.extra}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 灵魂刻印 (副属性 + 副技能) */}
            {((equipmentDetail.subStats && equipmentDetail.subStats.length > 0) ||
              (equipmentDetail.subSkills && equipmentDetail.subSkills.length > 0)) && (
              <div className="equipment-modal__section">
                <div className="section-title-row">
                  <div className="section-title">灵魂刻印</div>
                  {/* 灵魂刻印进度 */}
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

                {/* 副属性 */}
                {equipmentDetail.subStats && equipmentDetail.subStats.length > 0 && (
                  <>
                    {equipmentDetail.subStats.map((stat, index) => (
                      <div key={index} className="stat-row stat-row--sub">
                        <span className="stat-name">{stat.name}</span>
                        <span className="stat-value">{stat.value}</span>
                      </div>
                    ))}
                  </>
                )}

                {/* 副技能 */}
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
          </div>

          {/* 右栏 - 魔法石、神石、套装效果 */}
          <div className="equipment-modal__column">
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
                    <div className="set-bonus__header">{bonus.degree}件套</div>
                    <div className="set-bonus__effects">
                      {bonus.descriptions.map((desc, descIndex) => (
                        <div key={descIndex} className="set-bonus__effect">{desc}</div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="set-bonus-empty">無</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EquipmentDetailModal;
