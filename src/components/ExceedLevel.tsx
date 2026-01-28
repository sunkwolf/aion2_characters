// Exceed level display component

import React from 'react';
import './ExceedLevel.css';

interface ExceedLevelProps {
  level: number;
  variant?: 'compact' | 'full';  // compact: single diamond+number, full: 5 diamond progress
}

const ExceedLevel: React.FC<ExceedLevelProps> = ({ level, variant = 'compact' }) => {
  const maxLevel = 5;

  if (variant === 'compact') {
    // Single diamond with number inside
    if (level === 0) return null;

    return (
      <div className="exceed-compact">
        <svg className="exceed-compact__icon" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L22 12L12 22L2 12L12 2Z"
            className="exceed-compact__diamond"
            fill="currentColor"
          />
        </svg>
        <span className="exceed-compact__number">{level}</span>
      </div>
    );
  }

  // Full version: 5 diamond progress bar
  return (
    <div className="exceed-full">
      {Array.from({ length: maxLevel }, (_, index) => (
        <svg
          key={index}
          className={`exceed-full__diamond ${index < level ? 'exceed-full__diamond--active' : ''}`}
          viewBox="0 0 24 24"
        >
          <path
            d="M12 2L22 12L12 22L2 12L12 2Z"
            className="exceed-full__diamond-fill"
          />
        </svg>
      ))}
    </div>
  );
};

export default ExceedLevel;
