import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePrivy, useLoginWithPasskey } from '@privy-io/react-auth';
import { useExportWallet as useSolanaExportWallet } from '@privy-io/react-auth/solana';
import ExportWalletModal from '../components/ExportWalletModal';
import '../styles/Profile.css';

function Profile() {
  const [searchParams] = useSearchParams();
  const { user, authenticated, ready, exportWallet: exportWalletEvm, logout } = usePrivy();
  const { exportWallet: exportSolanaWallet } = useSolanaExportWallet();

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

  // Return to app if no walletAddress param and user is authenticated
  useEffect(() => {
    if (!ready || !authenticated || !user) return;
    
    const walletAddressParam = searchParams.get('walletAddress');
    if (!walletAddressParam && hasCheckedWalletAddress) {
      // No walletAddress param, return to app
      returnToApp();
    }
  }, [ready, authenticated, user, searchParams, hasCheckedWalletAddress]);

  // Function to return to native app
  const returnToApp = () => {
    try {
      // Try deep link first
      window.location.href = 'orbitxpay://';
    } catch (e) {
      // Silent fail for deep link
    }

    try {
      // Fallback for React Native WebView
      if ((window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'PROFILE_CLOSED',
            status: 'closed',
          })
        );
      }
    } catch (e) {
      // Silent fail for WebView postMessage
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
      // Don't close modal automatically - let user close it
    } catch (err: any) {
      setError('Failed to export wallet: ' + (err?.message || 'Unknown error'));
      throw err; // Re-throw to let modal handle it
    }
  };

  const handleCloseExportModal = () => {
    setShowExportModal(false);
    setSelectedWalletForExport(null);
    setError('');
    // Return to app when modal is closed
    returnToApp();
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
          <div className="profile-section">
            <h2 className="section-title">Login Required</h2>
            <p style={{ marginBottom: '20px', color: '#888' }}>
              Please login with Passkey
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

  // If wallet address matches and modal should be shown, show only the modal
  // Otherwise show loading state
  const walletAddressParam = searchParams.get('walletAddress');
  const shouldShowModal = walletAddressParam && authenticated && user && showExportModal;

  return (
    <div className="profile-container">
      {/* Show only modal when wallet matches, no other content */}
      {shouldShowModal ? (
        <ExportWalletModal
          isOpen={showExportModal}
          onClose={handleCloseExportModal}
          wallet={selectedWalletForExport}
          onExport={handleExportWallet}
        />
      ) : (
        // Show loading while checking wallet address
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      )}
    </div>
  );
}

export default Profile;

