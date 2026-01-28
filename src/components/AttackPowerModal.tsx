import type { AttackPowerResult } from '../utils/attackPowerCalculator';
import './AttackPowerModal.css';

interface AttackPowerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attackPowerData: AttackPowerResult | null;
}

const AttackPowerModal = ({ isOpen, onClose, attackPowerData }: AttackPowerModalProps) => {
  if (!isOpen || !attackPowerData) return null;

  const { breakdown, totalFlat, totalPercent, finalPower } = attackPowerData;

  return (
    <div className="attack-power-modal-overlay" onClick={onClose}>
      <div className="attack-power-modal" onClick={(e) => e.stopPropagation()}>
        <div className="attack-power-modal__header">
          <h3>Attack Power Breakdown</h3>
          <button className="attack-power-modal__close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Margin note */}
        <div className="attack-power-modal__notice">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm.5 12h-1v-1h1v1zm0-2h-1V4h1v6z" />
          </svg>
          <span>Not included: Pet bonuses, costumes, wings, passive skills. Results are approximate.</span>
        </div>

        <div className="attack-power-modal__body">
          {/* Left-right layout container */}
          <div className="attack-power-grid">
            {/* Left: Flat values */}
            <div className="attack-power-column">
              <h4 className="attack-power-column__title">Flat Attack Power</h4>

              <div className="attack-power-item">
                <span className="attack-power-item__label">Equipment/Accessories</span>
                <span className="attack-power-item__value">{breakdown.equipmentFlat}</span>
              </div>

              <div className="attack-power-item">
                <span className="attack-power-item__label">
                  Daevanion Effects
                  <span className="attack-power-item__sublabel">(includes extra attack, PVE attack)</span>
                </span>
                <span className="attack-power-item__value">{breakdown.daevanionFlat}</span>
              </div>

              <div className="attack-power-divider"></div>

              <div className="attack-power-item attack-power-item--total">
                <span className="attack-power-item__label">Flat Total</span>
                <span className="attack-power-item__value">{totalFlat}</span>
              </div>
            </div>

            {/* Right: Percentage */}
            <div className="attack-power-column">
              <h4 className="attack-power-column__title">Percentage Bonus</h4>

              <div className="attack-power-item">
                <span className="attack-power-item__label">Equipment/Accessories</span>
                <span className="attack-power-item__value">+{breakdown.equipmentPercent.toFixed(1)}%</span>
              </div>

              <div className="attack-power-item">
                <span className="attack-power-item__label">Destruction</span>
                <span className="attack-power-item__value">+{breakdown.destruction.toFixed(1)}%</span>
              </div>

              <div className="attack-power-item">
                <span className="attack-power-item__label">Strength</span>
                <span className="attack-power-item__value">+{breakdown.strength.toFixed(1)}%</span>
              </div>

              <div className="attack-power-divider"></div>

              <div className="attack-power-item attack-power-item--total">
                <span className="attack-power-item__label">Percent Total</span>
                <span className="attack-power-item__value">+{totalPercent.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Final result */}
          <div className="attack-power-result">
            <div className="attack-power-result__row">
              <span className="attack-power-result__label">Final Attack Power</span>
              <span className="attack-power-result__value">{finalPower}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttackPowerModal;
