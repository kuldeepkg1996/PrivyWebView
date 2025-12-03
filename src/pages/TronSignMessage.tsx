import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePrivy, useLoginWithPasskey, useSignupWithPasskey } from '@privy-io/react-auth';
import { useSignRawHash } from '@privy-io/react-auth/extended-chains';
import ConfirmModal from '../components/ConfirmModal';
import SuccessModal from '../components/SuccessModal';
import '../styles/SignTransaction.css';
import { hashMessage } from 'tronweb/utils';

function TronSignMessage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authenticated, ready, user } = usePrivy();
  const { signRawHash } = useSignRawHash();

  const [loading, setLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');
  const [signature, setSignature] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Query params
  const message = searchParams.get('message') || '';
  const walletAddress = searchParams.get('walletAddress') || '';

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

  const getTronWallet = (): any => {
    if (!user?.linkedAccounts) return null;
    
    const tronWallets = user.linkedAccounts.filter(
      (acc: any) => acc.type === 'wallet' && acc.chainType === 'tron'
    );

    if (walletAddress) {
      return tronWallets.find((w: any) => w.address === walletAddress);
    }
    
    return tronWallets[0];
  };

  const handleSignMessage = async () => {
    setLoading(true);
    setError('');
    setSignature('');

    try {
      const tronWallet = getTronWallet();
      
      if (!tronWallet) {
        throw new Error('No Tron wallet found');
      }

      if (!message) {
        throw new Error('Message is required');
      }

      // Convert message to hash (SHA-256)
      const hashHex = hashMessage(message);

      // Sign the hash using Tron wallet
      const result = await signRawHash({
        address: tronWallet.address,
        chainType: 'tron',
        hash: hashHex as `0x${string}`,
      });

      setSignature(result.signature);
      setShowSuccessModal(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign message';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const sendResultToNative = (sig: string, status: string) => {
    try {
      const url =
        `orbitxpay://tron/signMessage` +
        `?signature=${encodeURIComponent(sig)}` +
        `&status=${encodeURIComponent(status)}` +
        `&message=${encodeURIComponent(message)}`;

      window.location.href = url;
    } catch (e) {
      // Silent fail for deep link
    }

    // Fallback for React Native WebView
    try {
      if ((window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'TRON_SIGN_MESSAGE_RESULT',
            signature: sig,
            status,
            message,
          })
        );
      }
    } catch (e) {
      // Silent fail for WebView postMessage
    }
  };

  const handleCancel = () => {
    sendResultToNative('', 'cancelled');
    navigate('/');
  };

  const handleGoHome = () => {
    sendResultToNative(signature, 'success');
    navigate('/');
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    setError('');
    try {
      await loginWithPasskey();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      setLoginLoading(false);
    }
  };

  const handleSignup = async () => {
    setSignupLoading(true);
    setError('');
    try {
      await signupWithPasskey();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Signup failed';
      setError(errorMessage);
      setSignupLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="sign-tx-container centered">
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (showLoginPrompt && !authenticated) {
    return (
      <div className="sign-tx-container centered">
        <div className="sign-tx-card">
          <h1 className="sign-tx-title">🔐 Login Required</h1>
          <p className="login-subtitle">Please login to sign the message</p>

          <div className="tx-details">
            <div className="detail-row">
              <span className="detail-label">Network:</span>
              <span className="detail-value chain-badge">Tron</span>
            </div>
            {message && (
              <div className="detail-row">
                <span className="detail-label">Message:</span>
                <span className="detail-value">{message}</span>
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={handleLogin}
              disabled={loginLoading || signupLoading}
            >
              {loginLoading ? 'Logging in...' : 'Login with Passkey'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleSignup}
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

  const tronWallet = getTronWallet();

  return (
    <div className="sign-tx-container">
      {authenticated && ready && tronWallet && (
        <ConfirmModal
          recipientAddress={tronWallet.address}
          networkShort="Tron"
          amountReceive={message}
          displayFee="0"
          displayTokenSymbol="Message"
          loading={loading}
          switchingNetwork={false}
          amount={message}
          onCancel={handleCancel}
          onConfirm={handleSignMessage}
        />
      )}

      {showSuccessModal && (
        <SuccessModal
          txHash={signature}
          onGoHome={handleGoHome}
        />
      )}

      {error && !showLoginPrompt && (
        <div className="error-message" style={{ margin: '20px' }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default TronSignMessage;
