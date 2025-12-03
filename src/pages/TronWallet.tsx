import { useState } from 'react';
import { useExportWallet,useSignRawHash } from '@privy-io/react-auth/extended-chains';
import { FiCopy, FiCheck } from 'react-icons/fi';
import '../styles/Profile.css';

interface TronWalletProps {
  wallet: any;
  index: number;
  onError: (error: string) => void;
}

function TronWallet({ wallet, index, onError }: TronWalletProps) {
  const { exportWallet } = useExportWallet();
  const [copiedField, setCopiedField] = useState('');
  const [exportingWallet, setExportingWallet] = useState(false);
  const [exportedPrivateKey, setExportedPrivateKey] = useState('');

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(''), 2000);
    } catch (err) {
      // Silent fail for clipboard
    }
  };

  const handleExportWallet = async () => {
    try {
      if (exportingWallet && exportedPrivateKey) {
        // Hide private key
        setExportingWallet(false);
        setExportedPrivateKey('');
      } else {
        // Show private key
        setExportingWallet(true);
        await exportWallet({ address: wallet.address });
        // Note: Privy's exportWallet handles the private key display through their own UI
      }
    } catch (err: any) {
      onError('Failed to export Tron wallet: ' + (err?.message || 'Unknown error'));
      setExportingWallet(false);
      setExportedPrivateKey('');
    }
  };

  const CopyButton = ({ text, fieldName }: { text: string; fieldName: string }) => (
    <button
      className="btn-copy-icon"
      onClick={() => handleCopy(text, fieldName)}
      title="Copy to clipboard"
    >
      {copiedField === fieldName ? <FiCheck /> : <FiCopy />}
    </button>
  );

  return (
    <div className="wallet-item">
      <div className="wallet-header-row">
        <span className="wallet-badge tron">Tron Wallet</span>
        <span className="wallet-type-badge">{wallet.walletClientType || 'embedded'}</span>
      </div>

      <div className="info-row">
        <span className="info-label">Address:</span>
        <div className="info-value-container">
          <span className="info-value address-text">{wallet.address}</span>
          <CopyButton text={wallet.address} fieldName={`tronWallet${index}`} />
        </div>
      </div>

      <div className="info-row">
        <span className="info-label">Chain Type:</span>
        <span className="info-value">Tron</span>
      </div>

      {/* {wallet.connectorType && (
        <div className="info-row">
          <span className="info-label">Connector:</span>
          <span className="info-value">{wallet.connectorType}</span>
        </div>
      )} */}

      {wallet.imported !== undefined && (
        <div className="info-row">
          <span className="info-label">Imported:</span>
          <span className="info-value">{wallet.imported ? 'Yes' : 'No'}</span>
        </div>
      )}

      {/* {wallet.walletIndex !== undefined && (
        <div className="info-row">
          <span className="info-label">Wallet Index:</span>
          <span className="info-value">{wallet.walletIndex}</span>
        </div>
      )} */}

      {wallet.publicKey && (
        <div className="info-row">
          <span className="info-label">Public Key:</span>
          <div className="info-value-container">
            <span className="info-value address-text">{wallet.publicKey}</span>
            <CopyButton text={wallet.publicKey} fieldName={`tronPubKey${index}`} />
          </div>
        </div>
      )}

      {wallet.firstVerifiedAt && (
        <div className="info-row">
          <span className="info-label">Created:</span>
          <span className="info-value">
            {new Date(wallet.firstVerifiedAt).toLocaleString()}
          </span>
        </div>
      )}

      {/* Export Tron Wallet Button */}
      {/* <div className="export-wallet-section">
        <button
          className="btn-export-wallet tron"
          onClick={handleExportWallet}
        >
          {exportingWallet && exportedPrivateKey
            ? '🔒 Hide Private Key'
            : '🔑 Export Private Key'}
        </button>

        {exportingWallet && exportedPrivateKey && (
          <div className="private-key-container">
            <div className="warning-banner">
              ⚠️ Never share your private key! Anyone with this key has full access to your wallet.
            </div>
            <div className="private-key-box">
              <span className="private-key-text">{exportedPrivateKey}</span>
              <CopyButton text={exportedPrivateKey} fieldName={`tronPrivateKey${index}`} />
            </div>
          </div>
        )}
      </div> */}
    </div>
  );
}

export default TronWallet;