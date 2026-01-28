// Equipment hover tooltip component - Simplified version (deprecated, keeping empty component for compatibility)

import React from 'react';

interface EquipmentTooltipProps {
  position: { x: number; y: number };
  visible: boolean;
}

// No longer displays any tooltip text, directly returns null
const EquipmentTooltip: React.FC<EquipmentTooltipProps> = () => {
  return null;
};

export default EquipmentTooltip;
