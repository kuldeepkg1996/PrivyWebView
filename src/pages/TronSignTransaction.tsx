import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePrivy, useLoginWithPasskey, useSignupWithPasskey } from '@privy-io/react-auth';
import { useSignRawHash } from '@privy-io/react-auth/extended-chains';
import ConfirmModal from '../components/ConfirmModal';
import SuccessModal from '../components/SuccessModal';
import '../styles/SignTransaction.css';
import { TronWeb } from 'tronweb';

const tronWeb = new TronWeb({
  fullHost: 'https://api.shasta.trongrid.io'
});


function TronSignTransaction() {
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
  const toAddress = searchParams.get('toAddress') || searchParams.get('recipientAddress') || '';
  const amount = searchParams.get('amount') || '';
  const tokenSymbol = 'TRX'; // Only native TRX supported for now
  const fee = searchParams.get('fee') || '0';
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

  const handleSignTransaction = async () => {
    setLoading(true);
    setError('');
    setSignature('');

    try {
      const tronWallet = getTronWallet();

      if (!tronWallet || !tronWallet?.address) {
        throw new Error('No Tron wallet found');
      }

      if (!toAddress) {
        throw new Error('Recipient address is required');
      }

      if (!amount) {
        throw new Error('Amount is required');
      }

      // Create TRX transfer transaction
      // Convert TRX to Sun (1 TRX = 1,000,000 Sun)
      const amountInSun = parseFloat(amount) * 1000000;
      
      const tx: any = await tronWeb.transactionBuilder.sendTrx(
        toAddress,
        amountInSun,
        tronWallet.address
      );

      // Get transaction hash
      const txID = tx.txID;
      const txHashHex = '0x' + txID;

      // Sign the transaction hash using Tron wallet
      const signResult = await signRawHash({
        address: tronWallet.address,
        chainType: 'tron',
        hash: txHashHex as `0x${string}`,
      });

      // The signature from signRawHash is already in the correct format
      const sig = signResult.signature;
      
      // Remove '0x' prefix if present
      const cleanSig = sig.startsWith('0x') ? sig.slice(2) : sig;

      // Try both recovery IDs (1b and 1c)
      tx.signature = [cleanSig + '1b'];
      
      try {
        const result: any = await tronWeb.trx.sendRawTransaction(tx);

        if (result.result === true || result.txid) {
          const finalTxHash = result.txid || txID;
          setSignature(finalTxHash);
          setShowSuccessModal(true);
        } else {
          // Try with recovery ID 1c
          tx.signature = [cleanSig + '1c'];
          const result2: any = await tronWeb.trx.sendRawTransaction(tx);

          if (result2.result === true || result2.txid) {
            const finalTxHash = result2.txid || txID;
            setSignature(finalTxHash);
            setShowSuccessModal(true);
          } else {
            throw new Error(result2.message || 'Transaction broadcast failed');
          }
        }
      } catch (broadcastErr: any) {
        throw new Error('Failed to broadcast transaction: ' + (broadcastErr.message || 'Unknown error'));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign transaction';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const sendResultToNative = (
    sig: string,
    status: string,
    txHashValue?: string
  ) => {
    try {
      const url =
        `orbitxpay://tron/signTransaction` +
        `?signature=${encodeURIComponent(sig)}` +
        `&status=${encodeURIComponent(status)}` +
        (txHashValue ? `&transactionHash=${encodeURIComponent(txHashValue)}` : '') +
        `&amount=${encodeURIComponent(amount)}` +
        `&toAddress=${encodeURIComponent(toAddress)}`;

      window.location.href = url;
    } catch (e) {
      // Silent fail for deep link
    }

    // Fallback for React Native WebView
    try {
      if ((window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'TRON_SIGN_TRANSACTION_RESULT',
            signature: sig,
            status,
            transactionHash: txHashValue || '',
            amount,
            toAddress,
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
    sendResultToNative(signature, 'success', signature);
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
          <p className="login-subtitle">Please login to sign the transaction</p>

          <div className="tx-details">
            <div className="detail-row">
              <span className="detail-label">Network:</span>
              <span className="detail-value chain-badge">Tron</span>
            </div>
            {toAddress && (
              <div className="detail-row">
                <span className="detail-label">Recipient:</span>
                <span className="detail-value address-text">{toAddress}</span>
              </div>
            )}
            {amount && (
              <div className="detail-row">
                <span className="detail-label">Amount:</span>
                <span className="detail-value amount-text">
                  {amount} {tokenSymbol}
                </span>
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
            Cancel Transaction
          </button>
        </div>
      </div>
    );
  }

  const tronWallet = getTronWallet();
  const amountReceive = amount && fee
    ? (parseFloat(amount) - parseFloat(fee)).toFixed(6)
    : amount || '0';

  return (
    <div className="sign-tx-container">
      {authenticated && ready && tronWallet && (
        <ConfirmModal
          recipientAddress={toAddress}
          networkShort="Tron"
          amountReceive={amountReceive}
          displayFee={fee}
          displayTokenSymbol={tokenSymbol}
          loading={loading}
          switchingNetwork={false}
          amount={amount}
          onCancel={handleCancel}
          onConfirm={handleSignTransaction}
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

export default TronSignTransaction;
