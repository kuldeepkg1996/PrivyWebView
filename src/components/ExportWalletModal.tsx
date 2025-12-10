import { useState } from 'react';
import { FiX, FiCopy, FiCheck } from 'react-icons/fi';
import '../styles/ExportWalletModal.css';

interface ExportWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: any | null;
  onExport: (address: string, chainType: string) => Promise<void>;
}

function ExportWalletModal({ isOpen, onClose, wallet, onExport }: ExportWalletModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Silent fail
    }
  };

  const handleExport = async () => {
    if (!wallet) return;
    
    try {
      await onExport(wallet.address, wallet.chainType);
      // Modal will be closed by parent after Privy's modal is triggered
    } catch (err) {
      // Error handled by parent
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getChainBadgeClass = (chainType: string) => {
    switch(chainType) {
      case 'solana': return 'solana';
      case 'tron': return 'tron';
      case 'ethereum': return 'ethereum';
      default: return '';
    }
  };

  const getChainDisplayName = (chainType: string) => {
    switch(chainType) {
      case 'ethereum': return 'Ethereum';
      case 'solana': return 'Solana';
      case 'tron': return 'Tron';
      default: return chainType.charAt(0).toUpperCase() + chainType.slice(1);
    }
  };

  return (
    <div className="export-modal-overlay" onClick={handleOverlayClick}>
      <div className="export-modal-card">
        <button 
          className="export-modal-close" 
          onClick={onClose}
          aria-label="Close"
        >
          <FiX />
        </button>

        {!wallet ? (
          // Wallet Not Found State
          <div className="export-modal-content">
            <div className="export-modal-icon error">
              <span>❌</span>
            </div>
            <h2 className="export-modal-title">Wallet Not Found</h2>
            <p className="export-modal-description">
              The requested wallet address was not found in your account.
            </p>
            <div className="export-modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          // Wallet Found State
          <div className="export-modal-content">
            <div className="export-modal-icon success">
              <span>🔑</span>
            </div>
            <h2 className="export-modal-title">Export Wallet</h2>
            <p className="export-modal-description">
              Export your private key for this wallet. Keep it safe and never share it with anyone.
            </p>

            <div className="export-wallet-details">
              <div className="export-detail-row">
                <span className="export-detail-label">Chain:</span>
                <span className={`wallet-badge ${getChainBadgeClass(wallet.chainType)}`}>
                  {getChainDisplayName(wallet.chainType)}
                </span>
              </div>

              <div className="export-detail-row">
                <span className="export-detail-label">Address:</span>
                <div className="export-address-container">
                  <span className="export-address-text">{wallet.address}</span>
                  <button 
                    className="btn-copy-small"
                    onClick={() => handleCopy(wallet.address)}
                    title="Copy address"
                  >
                    {copied ? <FiCheck /> : <FiCopy />}
                  </button>
                </div>
              </div>

              {wallet.walletClientType && (
                <div className="export-detail-row">
                  <span className="export-detail-label">Type:</span>
                  <span className="export-detail-value">{wallet.walletClientType}</span>
                </div>
              )}

              {wallet.firstVerifiedAt && (
                <div className="export-detail-row">
                  <span className="export-detail-label">Created:</span>
                  <span className="export-detail-value">
                    {new Date(wallet.firstVerifiedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <div className="export-warning">
              <span className="warning-icon">⚠️</span>
              <span className="warning-text">
                Never share your private key! Anyone with access to it can control your wallet and steal your funds.
              </span>
            </div>

            <div className="export-modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                className={`btn btn-primary ${getChainBadgeClass(wallet.chainType)}`}
                onClick={handleExport}
              >
                <span>🔑</span>
                <span>Export Private Key</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExportWalletModal;
