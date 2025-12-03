import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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

function App() {
  const [loading, setLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');
  const [initTimeout, setInitTimeout] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [hasCheckedSearchParams, setHasCheckedSearchParams] = useState(false);
  const [searchParams] = useSearchParams();

  const { authenticated, ready: privyReady, user, logout } = usePrivy();
  const { createWallet: createOtherWallet } = useOtherWallets();

  // EVM wallets
  const { wallets: evmWallets, ready: evmWalletsReady } = useEvmWallets();
  const { createWallet: createEvmWallet } = useCreateEvmWallet();

  // Solana wallets
  const { wallets: solanaWallets, ready: solanaWalletsReady } = useSolanaWallets();
  const { createWallet: createSolanaWallet } = useCreateSolanaWallet();

  const allWalletsReady = evmWalletsReady && solanaWalletsReady;


  const { signupWithPasskey } = useSignupWithPasskey({
    onComplete: () => {
      setSignupLoading(false);
    },
    onError: () => {
      setError('Failed to signup with passkey');
      setSignupLoading(false);
    },
  });

  const { loginWithPasskey } = useLoginWithPasskey({
    onComplete: () => {
      setLoginLoading(false);
    },
    onError: () => {
      setError('Failed to login with passkey');
      setLoginLoading(false);
    },
  });

  // Check search params only on first visit
  useEffect(() => {
    if (!privyReady) return;
    if (hasCheckedSearchParams) return;
    
    const hasPrivyWalletParam = searchParams.get('hasPrivyWallet');
    
    // Only check and logout if user doesn't have Privy wallet and is authenticated
    // But don't logout if wallets are being generated
    if (hasPrivyWalletParam === 'false' && authenticated && !loading && !hasRedirected) {
      logout();
    }
    
    setHasCheckedSearchParams(true);
  }, [privyReady, searchParams, authenticated, loading, hasRedirected, hasCheckedSearchParams, logout]);

  // ✅ Ensure EVM + Solana + Tron wallets exist, then send to native
  useEffect(() => {
    if (!authenticated) return;
    if (!allWalletsReady) return;
    if (hasRedirected) return;
    if (loading) return;

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

        if (!result.success) {
          throw new Error(result.error || 'Failed to create wallet(s)');
        }

        // Wallets generated successfully - redirect to app (no logout needed)
        setHasRedirected(true);
      } catch (err: any) {
        setError(err?.message || 'Failed to create wallet(s)');
      } finally {
        setLoading(false);
      }
    };

    ensureWalletsAndSend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authenticated,
    allWalletsReady,
    evmWallets,
    solanaWallets,
    createEvmWallet,
    createSolanaWallet,
    createOtherWallet,
    hasRedirected,
    user
  ]);

  /**
   * Loading timeout (10s)
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!allWalletsReady && !privyReady) {
        setInitTimeout(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [allWalletsReady, privyReady]);

  const handleSignup = async () => {
    setSignupLoading(true);
    setError('');
    try {
      await signupWithPasskey();
    } catch (err: any) {
      setError(err?.message || 'Signup failed');
      setSignupLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    setError('');
    try {
      await loginWithPasskey();
    } catch (err: any) {
      setError(err?.message || 'Login failed');
      setLoginLoading(false);
    }
  };

  // Show loading if system or wallets aren't ready
  if ((!allWalletsReady || !privyReady) && !initTimeout) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="spinner" />
          <p>Initializing wallet system...</p>
        </div>
      </div>
    );
  }

  if (initTimeout && (!allWalletsReady || !privyReady)) {
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

  // Not authenticated - show login/signup
  if (!authenticated) {
    return (
      <div className="app-container">
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="app-title">🔐 Create Your Self-Custodial Wallet</h1>
            <p className="app-subtitle">
              Secure Web3 Authentication with Passkeys and generate your EVM +
              Solana self-custodial wallets
            </p>
            {error && <div className="error-message">{error}</div>}
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
          <div className="error-message" style={{ marginTop: '20px' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

