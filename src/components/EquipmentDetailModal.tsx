// 装备详情模态框 - 点击装备后显示完整信息

import React from 'react';
import { createPortal } from 'react-dom';
import type { EquipmentDetail } from '../types/admin';
import { gradeColors } from '../data/memberTypes';
import './EquipmentDetailModal.css';

interface EquipmentDetailModalProps {
  equipmentDetail: EquipmentDetail | null;
  visible: boolean;
  onClose: () => void;
}

const EquipmentDetailModal: React.FC<EquipmentDetailModalProps> = ({
  equipmentDetail,
  visible,
  onClose,
}) => {
  if (!visible || !equipmentDetail) return null;

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
                {equipmentDetail.enchantLevel > 0 && (
                  <span className="equipment-modal__enchant">
                    +{equipmentDetail.enchantLevel}
                  </span>
                )}
              </div>
              <div className="equipment-modal__grade">{equipmentDetail.gradeName || equipmentDetail.grade}</div>
            </div>
          </div>
          <button className="equipment-modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* 装备信息主体 - 使用两栏布局 */}
        <div className="equipment-modal__body">
          {/* 左栏 - 基础信息 */}
          <div className="equipment-modal__column">
            {/* 基础信息 */}
            <div className="equipment-modal__info">
              {equipmentDetail.categoryName && (
                <div className="info-row">
                  <span className="info-label">类型</span>
                  <span className="info-value">{equipmentDetail.categoryName}</span>
                </div>
              )}
              {equipmentDetail.level && (
                <div className="info-row">
                  <span className="info-label">等级</span>
                  <span className="info-value">{equipmentDetail.level}</span>
                </div>
              )}
              {equipmentDetail.equipLevel && (
                <div className="info-row">
                  <span className="info-label">装备等级</span>
                  <span className="info-value">{equipmentDetail.equipLevel}</span>
                </div>
              )}
              {equipmentDetail.raceName && (
                <div className="info-row">
                  <span className="info-label">阵营</span>
                  <span className="info-value">{equipmentDetail.raceName}</span>
                </div>
              )}
              {equipmentDetail.classNames && equipmentDetail.classNames.length > 0 && (
                <div className="info-row info-row--full">
                  <span className="info-label">职业</span>
                  <span className="info-value">{equipmentDetail.classNames.join(', ')}</span>
                </div>
              )}
            </div>

            {/* 主属性 */}
            {equipmentDetail.mainStats && equipmentDetail.mainStats.length > 0 && (
              <div className="equipment-modal__section">
                <div className="section-title">主属性</div>
                {equipmentDetail.mainStats.map((stat, index) => (
                  <div key={index} className="stat-row stat-row--main">
                    <span className="stat-name">{stat.name}</span>
                    <span className="stat-value">{stat.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 副属性 */}
            {equipmentDetail.subStats && equipmentDetail.subStats.length > 0 && (
              <div className="equipment-modal__section">
                <div className="section-title">副属性</div>
                {equipmentDetail.subStats.map((stat, index) => (
                  <div key={index} className="stat-row stat-row--sub">
                    <span className="stat-name">{stat.name}</span>
                    <span className="stat-value">{stat.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 右栏 - 魔法石、神石、技能 */}
          <div className="equipment-modal__column">
            {/* 魔法石 */}
            {equipmentDetail.magicStoneStat && equipmentDetail.magicStoneStat.length > 0 && (
              <div className="equipment-modal__section">
                <div className="section-title">魔法石</div>
                {equipmentDetail.magicStoneStat.map((stone, index) => (
                  <div key={index} className="stone-row" style={{ color: gradeColors[stone.grade] || '#9d9d9d' }}>
                    <span className="stone-name">{stone.name}</span>
                    <span className="stone-value">{stone.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 神石 */}
            {equipmentDetail.godStoneStat && equipmentDetail.godStoneStat.length > 0 && (
              <div className="equipment-modal__section">
                <div className="section-title">神石</div>
                {equipmentDetail.godStoneStat.map((stone, index) => (
                  <div key={index} className="godstone-row" style={{ color: gradeColors[stone.grade] || '#9d9d9d' }}>
                    <div className="godstone-name">{stone.name}</div>
                    {stone.desc && <div className="godstone-desc">{stone.desc}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* 副技能 */}
            {equipmentDetail.subSkills && equipmentDetail.subSkills.length > 0 && (
              <div className="equipment-modal__section">
                <div className="section-title">副技能</div>
                {equipmentDetail.subSkills.map((skill, index) => (
                  <div key={index} className="skill-row">
                    {skill.icon && <img src={skill.icon} alt={skill.name} className="skill-icon" />}
                    <span className="skill-name">{skill.name}</span>
                    {skill.level && <span className="skill-level">Lv.{skill.level}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* 来源 */}
            {equipmentDetail.sources && equipmentDetail.sources.length > 0 && (
              <div className="equipment-modal__footer">
                <span className="footer-label">来源:</span>
                <span className="footer-value">{equipmentDetail.sources.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EquipmentDetailModal;
