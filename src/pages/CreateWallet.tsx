import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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

function CreateWallet() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');
  const [initTimeout, setInitTimeout] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [hasCheckedSearchParams, setHasCheckedSearchParams] = useState(false);
  const [hasLoggedOut, setHasLoggedOut] = useState(false);
  const [isFreshLogin, setIsFreshLogin] = useState(true); // Default true - allow wallet creation for new logins
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

  const hasPrivyWalletParam = searchParams.get('hasPrivyWallet');

  // Logout immediately when user comes to this page if authenticated
  useEffect(() => {
    if (!privyReady) return;
    if (hasCheckedSearchParams) return;
    
    // Logout if authenticated (always logout on this page)
    if (authenticated) {
      const performLogout = async () => {
        try {
          await logout();
          setHasLoggedOut(true);
          setHasRedirected(false); // Reset redirect flag
          setIsFreshLogin(false); // Reset fresh login flag - will be set to true after new login
        } catch (err) {
          console.error('Logout error:', err);
          // Even if logout fails, mark as logged out to proceed
          setHasLoggedOut(true);
          setIsFreshLogin(false);
        }
      };
      performLogout();
    }
    
    setHasCheckedSearchParams(true);
  }, [privyReady, authenticated, hasCheckedSearchParams, logout]);

  // Track when user logs in after logout (fresh login)
  // Also allow wallet creation if user was never authenticated (fresh login = true by default)
  useEffect(() => {
    if (!privyReady) return;
    // If we've logged out and now user is authenticated, this is a fresh login
    if (hasLoggedOut && authenticated && !isFreshLogin) {
      setIsFreshLogin(true);
    }
    // If user was never authenticated (no logout happened), keep isFreshLogin as true
  }, [privyReady, hasLoggedOut, authenticated, isFreshLogin]);

  // ✅ Ensure EVM + Solana + Tron wallets exist, then send to native
  // Only run after user has logged in/signed up (after initial logout)
  useEffect(() => {
    if (!authenticated) return;
    if (!allWalletsReady) return;
    if (hasRedirected) return;
    if (loading) return;
    if (hasPrivyWalletParam === 'false') return; // Don't create wallets if hasPrivyWallet is false
    // Only create wallets if we've completed the initial check (logout if needed)
    if (!hasCheckedSearchParams) return;
    // Only create wallets after a fresh login (after logout)
    if (!isFreshLogin) return;

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

        // Wallets generated successfully - redirect to app
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
    user,
    hasPrivyWalletParam,
    hasLoggedOut,
    hasCheckedSearchParams,
    isFreshLogin
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

  // Show logout in progress if we're logging out
  if (hasLoggedOut && authenticated && privyReady) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="spinner" />
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

  // If hasPrivyWallet is false and we've logged out, show message
  if (hasPrivyWalletParam === 'false' && !authenticated) {
    return (
      <div className="app-container">
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="app-title">⚠️ No OrbitXPay Wallet</h1>
            <p className="app-subtitle">
              You don't have a OrbitXPay wallet. Please sign up or login to create one.
            </p>
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
            <div style={{ marginTop: '20px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/')}
              >
                Back to Home
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

export default CreateWallet;

