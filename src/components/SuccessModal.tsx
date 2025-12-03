import { useState } from 'react';
import '../styles/SignTransaction.css';
import type { SuccessModalProps } from '../types';

function SuccessModal({ txHash, onGoHome }: SuccessModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Silent fail for clipboard
    }
  };

  return (
    <div className="success-modal-overlay">
      <div className="success-modal">
        <div className="success-modal-header">
          <div className="success-modal-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <h2 className="success-modal-title">Withdrawal Completed</h2>
        <p className="success-modal-description">
          Your transaction has been completed successfully.
        </p>

        {txHash && (
          <div className="withdrawal-details">
            <div className="withdrawal-detail-row">
              <span className="withdrawal-detail-label">Transaction Hash</span>
              <div className="withdrawal-detail-value-container">
                <span className="withdrawal-detail-value">{txHash}</span>
                <button 
                  className="copy-icon-button" 
                  onClick={handleCopy}
                  title={copied ? 'Copied!' : 'Copy to clipboard'}
                >
                  {copied ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="confirm-modal-buttons">
          <button className="confirm-btn confirm-primary-btn" onClick={onGoHome}>
            Go to App
          </button>
        </div>
      </div>
    </div>
  );
}

export default SuccessModal;

