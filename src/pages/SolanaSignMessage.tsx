import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  usePrivy,
  useLoginWithPasskey,
  useSignupWithPasskey,
} from '@privy-io/react-auth';
import { useWallets, useSignMessage } from '@privy-io/react-auth/solana';
import bs58 from 'bs58';
import '../styles/SignTransaction.css';
import { sendSignMessageResultToNative } from '../utils/nativeCommunication';
import { getSolanaNetworkName } from '../utils/chainUtils';

function SolanaSignMessage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [signature, setSignature] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const message = searchParams.get('message') || '';
  const chainId = searchParams.get('chainId') || 'devnet';

  const { loginWithPasskey } = useLoginWithPasskey({
    onComplete: () => setShowLoginPrompt(false),
    onError: () => {
      setError('Failed to login with passkey');
      setLoading(false);
    },
  });

  const { signupWithPasskey } = useSignupWithPasskey({
    onComplete: () => setShowLoginPrompt(false),
    onError: () => {
      setError('Failed to sign up with passkey');
      setLoading(false);
    },
  });

  useEffect(() => {
    if (ready && !authenticated) setShowLoginPrompt(true);
  }, [ready, authenticated]);

  const handleSignMessage = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setSignature('');

    try {
      const selectedWallet = wallets[0];
      if (!selectedWallet) throw new Error('No Solana wallet found');
      if (!message) throw new Error('Message is required');

      // Encode message to Uint8Array
      const encodedMessage = new TextEncoder().encode(message);

      // Sign message using Privy's useSignMessage hook
      const result = await signMessage({
        message: encodedMessage,
        wallet: selectedWallet,
        options: {
          uiOptions: {
            title: 'Sign this message',
          },
        },
      });

      // Convert signature to base58 string
      const signatureBase58 = bs58.encode(result.signature);

      setSignature(signatureBase58);
      setSuccess('Message signed successfully!');
      sendSignMessageResultToNative(signatureBase58, 'success', message, chainId, 'SOLANA');
    } catch (err: any) {
      setError(err?.message || 'Failed to sign message');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    sendSignMessageResultToNative('', 'cancelled', message, chainId, 'SOLANA');
    navigate('/');
  };

  if (!ready) {
    return (
      <div className="sign-tx-container">
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading...</p>
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
              <span className="detail-label">Network:</span>
              <span className="detail-value chain-badge solana">{getSolanaNetworkName(chainId)}</span>
            </div>
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="action-buttons">
            <button className="btn btn-primary" onClick={() => loginWithPasskey()} disabled={loading}>
              {loading ? 'Logging in...' : 'Login with Passkey'}
            </button>
            <button className="btn btn-secondary" onClick={() => signupWithPasskey()} disabled={loading}>
              {loading ? 'Signing up...' : 'Sign Up with Passkey'}
            </button>
          </div>
          <button className="btn-cancel-link" onClick={handleCancel} disabled={loading}>
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
            <span className="detail-label">Network:</span>
            <span className="detail-value chain-badge solana">{getSolanaNetworkName(chainId)}</span>
          </div>
          {wallets[0] && (
            <div className="detail-row">
              <span className="detail-label">Wallet:</span>
              <span className="detail-value address-text">{wallets[0].address}</span>
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

export default SolanaSignMessage;

