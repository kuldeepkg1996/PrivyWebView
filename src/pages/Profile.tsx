import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { useExportWallet as useSolanaExportWallet } from '@privy-io/react-auth/solana';
import { FiCopy, FiCheck } from 'react-icons/fi';
import arrowLeftIcon from '../assets/ArrowLeft.svg';
import TronWallet from './TronWallet';
import EmailLinkModal from '../components/EmailLinkModal';
import '../styles/Profile.css';

function Profile() {
  const navigate = useNavigate();
  const { user, authenticated, ready, logout, exportWallet: exportWalletEvm } = usePrivy();
  const { exportWallet: exportSolanaWallet } = useSolanaExportWallet();

  const [copiedField, setCopiedField] = useState('');
  const [error, setError] = useState('');
  const [exportingWallet, setExportingWallet] = useState<string | null>(null);
  const [exportedPrivateKey, setExportedPrivateKey] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(''), 2000);
    } catch (err) {
      // Silent fail for clipboard
    }
  };


  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      // Silent fail for logout
    }
  };

  const handleExportWallet = async (address: string, chainType: string) => {
    try {
      const walletKey = `${chainType}-${address}`;
      if (exportingWallet === walletKey && exportedPrivateKey) {
        // Hide private key
        setExportingWallet(null);
        setExportedPrivateKey('');
      } else {
        // Show private key
        setExportingWallet(walletKey);
        if (chainType === 'ethereum') {
          await exportWalletEvm({ address: address });
        } else if (chainType === 'solana') {
          await exportSolanaWallet({ address: address });
        }
        // Note: Privy's exportWallet functions handle the private key display through their own UI
      }
    } catch (err: any) {
      setError('Failed to export wallet: ' + (err?.message || 'Unknown error'));
      setExportingWallet(null);
      setExportedPrivateKey('');
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

  if (!ready) {
    return (
      <div className="profile-container">
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!authenticated || !user) {
    navigate('/');
    return null;
  }

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
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <button className="btn-back" onClick={() => navigate('/')}>
            <img src={arrowLeftIcon}  width={20} height={20} />
            Back
          </button>
          <h1 className="profile-title">Wallet Profile</h1>
        </div>

        {/* User Information */}
        <div className="profile-section">
          <h2 className="section-title">User Information</h2>
          
          <div className="info-row">
            <span className="info-label">User ID:</span>
            <div className="info-value-container">
              <span className="info-value">{user.id}</span>
              <CopyButton text={user.id} fieldName="userId" />
            </div>
          </div>

          {user.email && (
            <div className="info-row">
              <span className="info-label">Email:</span>
              <div className="info-value-container">
                <span className="info-value">{user.email.address}</span>
                <CopyButton text={user.email.address} fieldName="email" />
              </div>
            </div>
          )}

          {user.phone && (
            <div className="info-row">
              <span className="info-label">Phone:</span>
              <div className="info-value-container">
                <span className="info-value">{user.phone.number}</span>
                <CopyButton text={user.phone.number} fieldName="phone" />
              </div>
            </div>
          )}

          {user.wallet && (
            <div className="info-row">
              <span className="info-label">Linked Wallet:</span>
              <div className="info-value-container">
                <span className="info-value address-text">{user.wallet.address}</span>
                <CopyButton text={user.wallet.address} fieldName="linkedWallet" />
              </div>
            </div>
          )}

          <div className="info-row">
            <span className="info-label">Created At:</span>
            <span className="info-value">
              {new Date(user.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message" style={{ marginTop: '20px' }}>
            {error}
          </div>
        )}

        {/* EVM & Solana Wallets */}
        {user.linkedAccounts && user.linkedAccounts.length > 0 && (
          <div className="profile-section">
            <h2 className="section-title">
              EVM & Solana Wallets ({user.linkedAccounts.filter((acc: any) => acc.type === 'wallet' && acc.chainType !== 'tron').length})
            </h2>
            {user.linkedAccounts
              .filter((account: any) => account.type === 'wallet' && account.chainType !== 'tron')
              .map((account: any, index: number) => (
                <div key={account.address || index} className="wallet-item">
                  <div className="wallet-header-row">
                    <span className={`wallet-badge ${getChainBadgeClass(account.chainType)}`}>
                      {getChainDisplayName(account.chainType)} Wallet
                    </span>
                    {/* <span className="wallet-type-badge">{account.walletClientType || 'embedded'}</span> */}
                  </div>
                  
                  <div className="info-row">
                    <span className="info-label">Address:</span>
                    <div className="info-value-container">
                      <span className="info-value address-text">{account.address}</span>
                      <CopyButton text={account.address} fieldName={`wallet${index}`} />
                    </div>
                  </div>

                  <div className="info-row">
                    <span className="info-label">Chain Type:</span>
                    <span className="info-value">{getChainDisplayName(account.chainType)}</span>
                  </div>

                  {account.connectorType && (
                    <div className="info-row">
                      <span className="info-label">Connector:</span>
                      <span className="info-value">{account.connectorType}</span>
                    </div>
                  )}

                  {account.imported !== undefined && (
                    <div className="info-row">
                      <span className="info-label">Imported:</span>
                      <span className="info-value">{account.imported ? 'Yes' : 'No'}</span>
                    </div>
                  )}

                  {/* {account.walletIndex !== undefined && (
                    <div className="info-row">
                      <span className="info-label">Wallet Index:</span>
                      <span className="info-value">{account.walletIndex}</span>
                    </div>
                  )} */}

                  {account.publicKey && (
                    <div className="info-row">
                      <span className="info-label">Public Key:</span>
                      <div className="info-value-container">
                        <span className="info-value address-text">{account.publicKey}</span>
                        <CopyButton text={account.publicKey} fieldName={`pubKey${index}`} />
                      </div>
                    </div>
                  )}

                  {account.firstVerifiedAt && (
                    <div className="info-row">
                      <span className="info-label">Created:</span>
                      <span className="info-value">
                        {new Date(account.firstVerifiedAt).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Export Wallet Button */}
                  <div className="export-wallet-section">
                    <button
                      className={`btn-export-wallet ${getChainBadgeClass(account.chainType)}`}
                      onClick={() => handleExportWallet(account.address, account.chainType)}
                    >
                      {exportingWallet === `${account.chainType}-${account.address}` && exportedPrivateKey
                        ? '🔒 Hide Private Key'
                        : '🔑 Export Private Key'}
                    </button>

                    {exportingWallet === `${account.chainType}-${account.address}` && exportedPrivateKey && (
                      <div className="private-key-container">
                        <div className="warning-banner">
                          ⚠️ Never share your private key! Anyone with this key has full access to your wallet.
                        </div>
                        <div className="private-key-box">
                          <span className="private-key-text">{exportedPrivateKey}</span>
                          <CopyButton text={exportedPrivateKey} fieldName={`privateKey${index}`} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Tron Wallets - Separate Section */}
        {user.linkedAccounts && user.linkedAccounts.filter((acc: any) => acc.type === 'wallet' && acc.chainType === 'tron').length > 0 && (
          <div className="profile-section">
            <h2 className="section-title">
              Tron Wallets ({user.linkedAccounts.filter((acc: any) => acc.type === 'wallet' && acc.chainType === 'tron').length})
            </h2>
            {user.linkedAccounts
              .filter((account: any) => account.type === 'wallet' && account.chainType === 'tron')
              .map((account: any, index: number) => (
                <TronWallet
                  key={account.address || index}
                  wallet={account}
                  index={index}
                  onError={setError}
                />
              ))}
          </div>
        )}


 {/* Link Email Button */}
        {/* <div className="profile-section">
          <button 
            className="btn btn-create-wallet" 
            onClick={() => setShowEmailModal(true)} 
            style={{ background: '#EFB89E' }}
          >
            📧 Link Email
          </button>
        </div> */}
        {/* Logout Button */}
        {/* <div className="profile-section">
          <button className="btn btn-create-wallet" onClick={handleLogout} style={{ background: '#ff6b6b' }}>
            🚪 Logout
          </button>
        </div> */}
      </div>

      {/* Email Link Modal */}
      {/* <EmailLinkModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSuccess={() => {
          // Refresh the page to show updated email
          window.location.reload();
        }}
      /> */}
    </div>
  );
}

export default Profile;

