import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  usePrivy,
  useWallets as useEvmWallets,
  useLoginWithPasskey,
  useSignupWithPasskey,
  useSignMessage,
  useCreateWallet as useCreateEvmWallet,
} from '@privy-io/react-auth';
import {
  useWallets as useSolanaWallets,
  useCreateWallet as useCreateSolanaWallet,
} from '@privy-io/react-auth/solana';
import { useCreateWallet as useCreateOtherWallet } from '@privy-io/react-auth/extended-chains';
import '../styles/SignTransaction.css';
import { sendSignMessageResultToNative } from '../utils/nativeCommunication';
import { getChainName } from '../utils/chainUtils';
import { ensureAllWallets } from '../utils/walletManager';

function EvmSignMessage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authenticated, ready, user } = usePrivy();
  const { wallets: evmWallets } = useEvmWallets();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { signMessage } = useSignMessage();
  const { createWallet: createEvmWallet } = useCreateEvmWallet();
  const { createWallet: createSolanaWallet } = useCreateSolanaWallet();
  const { createWallet: createOtherWallet } = useCreateOtherWallet();

  const [loading, setLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [signature, setSignature] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [creatingWallets, setCreatingWallets] = useState(false);

  const message = searchParams.get('message') || '';
  const chainId = searchParams.get('chainId') || '1';

  const { loginWithPasskey } = useLoginWithPasskey({
    onComplete: () => {
      setShowLoginPrompt(false);
      setLoginLoading(false);
    },
    onError: () => {
      setError('Failed to login with passkey');
      setLoginLoading(false);
    },
  });

  const { signupWithPasskey } = useSignupWithPasskey({
    onComplete: () => {
      setShowLoginPrompt(false);
      setSignupLoading(false);
    },
    onError: () => {
      setError('Failed to sign up with passkey');
      setSignupLoading(false);
    },
  });

  useEffect(() => {
    if (ready && !authenticated) {
      setShowLoginPrompt(true);
    }
  }, [ready, authenticated]);

  // Check and create wallets after authentication
  useEffect(() => {
    const ensureWallets = async () => {
      if (!authenticated || !ready || !user) return;
      if (creatingWallets) return;

      setCreatingWallets(true);
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

        if (!result.success && result.error) {
          setError(result.error);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to create wallets');
      } finally {
        setCreatingWallets(false);
      }
    };

    ensureWallets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, ready, user, evmWallets, solanaWallets]);

  const handleSignMessage = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setSignature('');

    try {
      const wallet = evmWallets[0];
      if (!wallet) throw new Error('No EVM wallet found');
      if (!message) throw new Error('Message is required');

      const result = await signMessage(
        { message },
        { uiOptions: { showWalletUIs: true } }
      );

      const sig = result.signature;
      setSignature(sig);
      setSuccess('Message signed successfully!');
      sendSignMessageResultToNative(sig, 'success', message, chainId, 'EVM');
    } catch (err: any) {
      setError(err?.message || 'Failed to sign message');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    sendSignMessageResultToNative('', 'cancelled', message, chainId, 'EVM');
    navigate('/');
  };

  if (!ready || creatingWallets) {
    return (
      <div className="sign-tx-container">
        <div className="loading-container">
          <div className="spinner" />
          <p>{creatingWallets ? 'Creating wallets...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (showLoginPrompt && !authenticated) {
    return (
      <div className="sign-tx-container">
        <div className="sign-tx-card">
          <h1 className="sign-tx-title">🔐 Login Required</h1>
          <p className="login-subtitle">Please login to sign the message</p>
          <div className="tx-details">
            <div className="detail-row">
              <span className="detail-label">Chain:</span>
              <span className="detail-value chain-badge">{getChainName(chainId)}</span>
            </div>
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="action-buttons">
            <button 
              className="btn btn-primary" 
              onClick={() => {
                setLoginLoading(true);
                loginWithPasskey();
              }} 
              disabled={loginLoading || signupLoading}
            >
              {loginLoading ? 'Logging in...' : 'Login with Passkey'}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                setSignupLoading(true);
                signupWithPasskey();
              }} 
              disabled={loginLoading || signupLoading}
            >
              {signupLoading ? 'Signing up...' : 'Sign Up with Passkey'}
            </button>
          </div>
          <button className="btn-cancel-link" onClick={handleCancel} disabled={loginLoading || signupLoading}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sign-tx-container">
      <div className="sign-tx-card">
        <h1 className="sign-tx-title">✍️ Sign Message</h1>
        <div className="tx-details">
          <div className="detail-row">
            <span className="detail-label">Chain:</span>
            <span className="detail-value chain-badge">{getChainName(chainId)}</span>
          </div>
          {evmWallets[0] && (
            <div className="detail-row">
              <span className="detail-label">Wallet:</span>
              <span className="detail-value address-text">{evmWallets[0].address}</span>
            </div>
          )}
          {message && (
            <div className="detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
              <span className="detail-label" style={{ marginBottom: '8px' }}>Message:</span>
              <div className="message-box" style={{ color: '#ffffff' }}>{message}</div>
            </div>
          )}
        </div>
        {error && <div className="error-message">{error}</div>}
        {success && (
          <div className="success-message">
            {success}
            {signature && (
              <div className="tx-hash">
                <span className="tx-hash-label">Signature:</span>
                <span className="tx-hash-value">{signature}</span>
              </div>
            )}
          </div>
        )}
        <div className="action-buttons">
          <button className="btn btn-primary" onClick={handleSignMessage} disabled={loading || !message}>
            {loading ? 'Signing...' : 'Sign Message'}
          </button>
          <button className="btn btn-secondary" onClick={handleCancel} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default EvmSignMessage;

