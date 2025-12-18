import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  usePrivy,
  useWallets as useEvmWallets,
  useCreateWallet as useCreateEvmWallet,
  useSignupWithPasskey,
  useLoginWithPasskey,
} from '@privy-io/react-auth';

import {
  useWallets as useSolanaWallets,
  useCreateWallet as useCreateSolanaWallet,
} from '@privy-io/react-auth/solana';
import { useCreateWallet as useOtherWallets } from '@privy-io/react-auth/extended-chains';

import '../styles/App.css';
import { ensureAllWallets } from '../utils/walletManager';

const INIT_TIMEOUT_MS = 10000;

function CreateWallet() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');
  const [initTimeout, setInitTimeout] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [hasLoggedOut, setHasLoggedOut] = useState(false);

  const { authenticated, ready: privyReady, user, logout } = usePrivy();
  const { createWallet: createOtherWallet } = useOtherWallets();

  // EVM wallets
  const { wallets: evmWallets, ready: evmWalletsReady } = useEvmWallets();
  const { createWallet: createEvmWallet } = useCreateEvmWallet();

  // Solana wallets
  const { wallets: solanaWallets, ready: solanaWalletsReady } = useSolanaWallets();
  const { createWallet: createSolanaWallet } = useCreateSolanaWallet();

  const allWalletsReady = useMemo(
    () => evmWalletsReady && solanaWalletsReady,
    [evmWalletsReady, solanaWalletsReady]
  );

  const isSystemReady = useMemo(
    () => allWalletsReady && privyReady,
    [allWalletsReady, privyReady]
  );

  const { signupWithPasskey } = useSignupWithPasskey({
    onComplete: () => {
      setSignupLoading(false);
      setError('');
    },
    onError: () => {
      setError('Failed to signup with passkey');
      setSignupLoading(false);
    },
  });

  const { loginWithPasskey } = useLoginWithPasskey({
    onComplete: () => {
      setLoginLoading(false);
      setError('');
    },
    onError: () => {
      setError('Failed to login with passkey');
      setLoginLoading(false);
    },
  });

  console.log('user===>', user);

  // Always logout user on page load (no session checking)
  useEffect(() => {
    if (!privyReady || hasLoggedOut) return;

    const performLogout = async () => {
      try {
        await logout();
        setHasRedirected(false);
        setError('');
        setHasLoggedOut(true);
      } catch (err) {
        console.error('Logout error:', err);
        // Even if logout fails, mark as logged out to proceed
        setHasLoggedOut(true);
      }
    };

    performLogout();
  }, [privyReady, hasLoggedOut, logout]);

  // ✅ Ensure EVM + Solana + Tron wallets exist, then redirect to redirect page
  // Only run after user has logged in/signed up (after initial logout)
  useEffect(() => {
    if (!authenticated || !allWalletsReady || hasRedirected || loading || !hasLoggedOut) {
      return;
    }

    const ensureWalletsAndSend = async () => {
      setLoading(true);
      setError('');

      try {
        const result = await ensureAllWallets(
          {
            evmWallets,
            solanaWallets,
            user,
          },
          {
            createEvmWallet,
            createSolanaWallet,
            createOtherWallet,
          },
          true // Send to native app
        );
        console.log('result===>', result);

        if (!result.success) {
          throw new Error(result.error || 'Failed to create wallet(s)');
        }

        // Redirect to redirect page with redirect URL including wallet IDs in structured format
        const evmWallet = JSON.stringify({
          evmWalletId: result.evmWalletId || '',
          evmWalletAddress: result.evmAddress || ''
        });
        const solanaWallet = JSON.stringify({
          solanaWalletId: result.solanaWalletId || '',
          solanaWalletAddress: result.solanaAddress || ''
        });
        const tronWallet = JSON.stringify({
          tronWalletId: result.tronWalletId || '',
          tronWalletAddress: result.tronAddress || ''
        });
        
        // Get userId from user object - Privy user object has 'id' property
        if (!user) {
          console.error('User object is null/undefined when trying to redirect');
          throw new Error('User object not available');
        }
        
        const userId = user.id || '';
        console.log('User ID for redirect:', userId);
        console.log('Full User object:', JSON.stringify(user, null, 2));
        
        // Build redirect URL with userId as first parameter
        // Always include userId parameter, even if empty (will be empty string)
        const redirectUrl = `orbitxpay://walletscreen?userId=${encodeURIComponent(userId)}&evm=${encodeURIComponent(evmWallet)}&solana=${encodeURIComponent(solanaWallet)}&tron=${encodeURIComponent(tronWallet)}`;
        console.log('Final Redirect URL:', redirectUrl);
        
        // Verify userId is in the URL
        if (!redirectUrl.includes('userId=')) {
          console.error('ERROR: userId parameter is missing from redirect URL!');
        }
        
        setHasRedirected(true);
        navigate(`/redirect?url=${encodeURIComponent(redirectUrl)}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create wallet(s)';
        setError(errorMessage);
        setLoading(false);
      }
    };

    ensureWalletsAndSend();
  }, [
    authenticated,
    allWalletsReady,
    evmWallets,
    solanaWallets,
    createEvmWallet,
    createSolanaWallet,
    createOtherWallet,
    hasRedirected,
    user,
    loading,
    hasLoggedOut,
    navigate,
  ]);

  // Loading timeout handler
  useEffect(() => {
    if (isSystemReady) return;

    const timer = setTimeout(() => {
      if (!isSystemReady) {
        setInitTimeout(true);
      }
    }, INIT_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isSystemReady]);

  const handleSignup = useCallback(async () => {
    if (signupLoading || loginLoading) return;
    
    setSignupLoading(true);
    setError('');
    try {
      await signupWithPasskey();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Signup failed';
      setError(errorMessage);
      setSignupLoading(false);
    }
  }, [signupWithPasskey, signupLoading, loginLoading]);

  const handleLogin = useCallback(async () => {
    if (signupLoading || loginLoading) return;
    
    setLoginLoading(true);
    setError('');
    try {
      await loginWithPasskey();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      setLoginLoading(false);
    }
  }, [loginWithPasskey, signupLoading, loginLoading]);

  // Early returns for different states
  if (!isSystemReady && !initTimeout) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="spinner" />
          <p>Initializing wallet system...</p>
        </div>
      </div>
    );
  }

  if (initTimeout && !isSystemReady) {
    return (
      <div className="app-container">
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="app-title">⚠️ Initialization Error</h1>
            <p className="app-subtitle">
              The system is taking longer than expected to initialize.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasLoggedOut && privyReady) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="spinner" />
          <p>Logging out...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="app-container">
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="app-title">🔐 Create Your Self-Custodial Wallet</h1>
            <p className="app-subtitle">
              Secure Web3 Authentication with Passkeys and generate your EVM +
              Solana + Tron self-custodial wallets
            </p>
            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}
            <div className="auth-buttons">
              <button
                className="btn btn-primary"
                onClick={handleSignup}
                disabled={signupLoading || loginLoading}
              >
                {signupLoading ? 'Signing up...' : 'Sign Up with Passkey'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleLogin}
                disabled={signupLoading || loginLoading}
              >
                {loginLoading ? 'Logging in...' : 'Login with Passkey'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - at this point effect will ensure wallets and redirect
  return (
    <div className="app-container">
      <div className="loading-container">
        <div className="spinner" />
        <p>Preparing your wallets and redirecting...</p>
        {error && (
          <div className="error-message" style={{ marginTop: '20px' }} role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateWallet;

