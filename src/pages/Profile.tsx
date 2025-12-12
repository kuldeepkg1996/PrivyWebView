import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePrivy, useLoginWithPasskey } from '@privy-io/react-auth';
import { useExportWallet as useSolanaExportWallet } from '@privy-io/react-auth/solana';
import { FiCopy, FiCheck } from 'react-icons/fi';
import arrowLeftIcon from '../assets/ArrowLeft.svg';
import TronWallet from './TronWallet';
import ExportWalletModal from '../components/ExportWalletModal';
import '../styles/Profile.css';

function Profile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, authenticated, ready, exportWallet: exportWalletEvm, logout } = usePrivy();
  const { exportWallet: exportSolanaWallet } = useSolanaExportWallet();

  const [copiedField, setCopiedField] = useState('');
  const [error, setError] = useState('');
  const [autoExportTriggered, setAutoExportTriggered] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedWalletForExport, setSelectedWalletForExport] = useState<any | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [hasCheckedWalletAddress, setHasCheckedWalletAddress] = useState(false);

  const { loginWithPasskey } = useLoginWithPasskey({
    onComplete: () => {
      setLoginLoading(false);
      // Reset the check flag and auto-export trigger so it can check wallet address after login
      setHasCheckedWalletAddress(false);
      setAutoExportTriggered(false);
    },
    onError: () => {
      setError('Failed to login with passkey');
      setLoginLoading(false);
    },
  });

  // Reset flags when authentication state changes
  useEffect(() => {
    if (!authenticated) {
      setHasCheckedWalletAddress(false);
      setAutoExportTriggered(false);
    }
  }, [authenticated]);

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(''), 2000);
    } catch (err) {
      // Silent fail for clipboard
    }
  };

  // Check if incoming walletAddress matches current wallet addresses, logout if not
  // Also open modal after login if wallet address matches
  useEffect(() => {
    if (!ready) return;

    const walletAddressParam = searchParams.get('walletAddress');
    
    // If no walletAddress param, proceed normally
    if (!walletAddressParam) {
      if (!hasCheckedWalletAddress) {
        setHasCheckedWalletAddress(true);
      }
      return;
    }

    // If not authenticated, wait for authentication
    if (!authenticated || !user) {
      return;
    }

    // Skip if already checked and modal already triggered
    if (hasCheckedWalletAddress && autoExportTriggered) {
      return;
    }

    // Check if the incoming walletAddress matches any of the user's wallet addresses
    const normalizedParam = walletAddressParam.toLowerCase();
    const allWalletAddresses = user.linkedAccounts
      ?.filter((account: any) => account.type === 'wallet' && account.address)
      .map((account: any) => account.address.toLowerCase()) || [];

    const walletMatches = allWalletAddresses.includes(normalizedParam);

    setHasCheckedWalletAddress(true);

    // If wallet address doesn't match, logout
    if (!walletMatches) {
      logout();
      return;
    }

    // If wallet matches, proceed with auto-export logic
    if (!autoExportTriggered) {
      const matchedWallet: any = user.linkedAccounts?.find(
        (account: any) => 
          account.type === 'wallet' && 
          account.address &&
          account.address.toLowerCase() === normalizedParam
      );

      setAutoExportTriggered(true);
      
      // Show modal with wallet
      setTimeout(() => {
        setSelectedWalletForExport(matchedWallet || null);
        setShowExportModal(true);
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, ready, user, searchParams, hasCheckedWalletAddress, autoExportTriggered, logout]);

  const handleExportWallet = async (address: string, chainType: string) => {
    try {
      setError('');
      if (chainType === 'ethereum') {
        await exportWalletEvm({ address: address });
      } else if (chainType === 'solana') {
        await exportSolanaWallet({ address: address });
      }
      // Privy's exportWallet functions handle the private key display through their own UI
      // Close the modal after triggering Privy's modal
      setShowExportModal(false);
    } catch (err: any) {
      setError('Failed to export wallet: ' + (err?.message || 'Unknown error'));
      throw err; // Re-throw to let modal handle it
    }
  };

  const handleCloseExportModal = () => {
    setShowExportModal(false);
    setSelectedWalletForExport(null);
    setError('');
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

  // Show Passkey login UI if not authenticated
  if (!authenticated || !user) {
    return (
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <button className="btn-back" onClick={() => navigate('/')}>
              <img src={arrowLeftIcon} width={20} height={20} />
              Back
            </button>
            <h1 className="profile-title">Wallet Profile</h1>
          </div>
          <div className="profile-section">
            <h2 className="section-title">Login Required</h2>
            <p style={{ marginBottom: '20px', color: '#888' }}>
              Please login with Passkey to view your wallet profile
            </p>
            {error && <div className="error-message">{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setLoginLoading(true);
                  loginWithPasskey();
                }} 
                disabled={loginLoading}
              >
                {loginLoading ? 'Logging in...' : 'Login with Passkey'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
                      onClick={() => {
                        setSelectedWalletForExport(account);
                        setShowExportModal(true);
                      }}
                    >
                      🔑 Export Private Key
                    </button>
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

      {/* Export Wallet Modal */}
      <ExportWalletModal
        isOpen={showExportModal}
        onClose={handleCloseExportModal}
        wallet={selectedWalletForExport}
        onExport={handleExportWallet}
      />
    </div>
  );
}

export default Profile;

