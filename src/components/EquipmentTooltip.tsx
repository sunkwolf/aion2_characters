// 装备悬浮提示组件 - 简化版,只显示点击提示

import React from 'react';
import { createPortal } from 'react-dom';
import './EquipmentTooltip.css';

interface EquipmentTooltipProps {
  position: { x: number; y: number };
  visible: boolean;
}

const EquipmentTooltip: React.FC<EquipmentTooltipProps> = ({
  position,
  visible,
}) => {
  if (!visible) return null;

  return createPortal(
    <div
      className="equipment-tooltip"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      🖱️ 点击查看装备详情
    </div>,
    document.body
  );
};

export default EquipmentTooltip;
