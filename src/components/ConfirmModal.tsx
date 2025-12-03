import '../styles/SignTransaction.css';
import type { ConfirmModalProps } from '../types';

function ConfirmModal({
  recipientAddress,
  networkShort,
  amountReceive,
  displayFee,
  displayTokenSymbol,
  loading,
  switchingNetwork,
  amount,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <div className="confirm-modal-overlay">
      <div className="confirm-modal">
        <div className="confirm-modal-header">
          <div className="confirm-modal-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17L17 7M7 7h10v10"/>
            </svg>
          </div>
        </div>
        <h2 className="confirm-modal-title">Confirm Withdraw</h2>
        <p className="confirm-modal-description">
          You'll need review the withdrawal details before procced.
        </p>
        
        <div className="withdrawal-details">
          <div className="withdrawal-detail-row">
            <span className="withdrawal-detail-label">Address:</span>
            <span className="withdrawal-detail-value">{recipientAddress || '0xD99924FF03CCBbe7f78dB7d8B6df466C875ea376'}</span>
          </div>
          <div className="withdrawal-detail-row">
            <span className="withdrawal-detail-label">Network:</span>
            <span className="withdrawal-detail-value">{networkShort}</span>
          </div>
          <div className="withdrawal-detail-row">
            <span className="withdrawal-detail-label">Amount Receive:</span>
            <span className="withdrawal-detail-value">{amountReceive} {displayTokenSymbol || 'USDC'}</span>
          </div>
          <div className="withdrawal-detail-row">
            <span className="withdrawal-detail-label">Withdrawal Fee:</span>
            <span className="withdrawal-detail-value">{displayFee} {displayTokenSymbol || 'USDC'}</span>
          </div>
        </div>

        <div className="confirm-modal-buttons">
          <button
            className="confirm-btn cancel-btn"
            onClick={onCancel}
            disabled={loading || switchingNetwork}
          >
            Cancel
          </button>
          <button
            className="confirm-btn confirm-primary-btn"
            onClick={onConfirm}
            disabled={loading || switchingNetwork || !recipientAddress || !amount}
          >
            {switchingNetwork
              ? 'Switching Network...'
              : loading
              ? 'Signing...'
              : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;

