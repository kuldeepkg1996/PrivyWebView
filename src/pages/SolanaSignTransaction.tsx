import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  usePrivy,
  useLoginWithPasskey,
  useSignupWithPasskey,
} from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { PublicKey, Transaction, Connection, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import '../styles/SignTransaction.css';
import { sendTransactionResultToNative } from '../utils/nativeCommunication';
import { getSolanaNetworkConfig } from '../utils/chainUtils';

function SolanaSignTransaction() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [txSignature, setTxSignature] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Extract parameters from URL query
  const chainId = searchParams.get('chainId') || 'devnet';
  const amount = searchParams.get('amount') || '';
  const recipientAddress = searchParams.get('recipientAddress') || '';

  const networkConfig = getSolanaNetworkConfig(chainId);
  const rpcUrl = networkConfig.rpcUrl;
  const networkName = networkConfig.name;
  const explorerCluster = networkConfig.explorer;

  const { loginWithPasskey } = useLoginWithPasskey({
    onComplete: () => {
      setShowLoginPrompt(false);
    },
    onError: (error) => {
      setError('Failed to login with passkey');
      setLoading(false);
    },
  });

  const { signupWithPasskey } = useSignupWithPasskey({
    onComplete: () => {
      setShowLoginPrompt(false);
    },
    onError: (error) => {
      setError('Failed to sign up with passkey');
      setLoading(false);
    },
  });

  useEffect(() => {
    if (ready && !authenticated) {
      setShowLoginPrompt(true);
    }
  }, [ready, authenticated]);

  const handleSignAndSend = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setTxSignature('');

    try {
      await handleSolanaTransaction();
    } catch (err: any) {
      setError(err?.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSolanaTransaction = async () => {
    const wallet = wallets[0];
    if (!wallet) {
      throw new Error('No Solana wallet found');
    }

    if (!recipientAddress) {
      throw new Error('Recipient address is required');
    }

    if (!amount) {
      throw new Error('Amount is required');
    }

    // Create connection to Solana network
    const connection = new Connection("solana rpc according to your network ->Mainnet/Devnet", 'confirmed');

    // Convert SOL to lamports
    const amountInLamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);

    // Create public keys
    const fromPubkey = new PublicKey(wallet.address);
    const toPubkey = new PublicKey(recipientAddress);

    // Get latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

    // Create transaction
    const transaction = new Transaction({
      feePayer: fromPubkey,
      blockhash: blockhash,
      lastValidBlockHeight: lastValidBlockHeight,
    });

    // Add transfer instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: fromPubkey,
        toPubkey: toPubkey,
        lamports: amountInLamports,
      })
    );
    
    // Serialize transaction
    const serializedTransaction = new Uint8Array(
      transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })
    );

    // Sign and send using Privy wallet
    const result = await wallet.signAndSendTransaction({
      chain: `solana:devnet`, // replace the actuall request you have to send either solana mainnet and devnet
      transaction: serializedTransaction,
    });

    const signature = typeof result === 'string' ? result : (result as any).signature || result;
    const transactionHash = signature; // Transaction hash is the signature in Solana
    
    setTxSignature(transactionHash);
    setSuccess('Transaction sent successfully!');
    sendTransactionResultToNative(transactionHash, 'success', chainId, networkName);
  };

  const handleCancel = () => {
    sendTransactionResultToNative('', 'cancelled', chainId, networkName);
    navigate('/');
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithPasskey();
    } catch (err: any) {
      setError(err?.message || 'Login failed');
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    setError('');
    try {
      await signupWithPasskey();
    } catch (err: any) {
      setError(err?.message || 'Signup failed');
      setLoading(false);
    }
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

  // Show login prompt if not authenticated
  if (showLoginPrompt && !authenticated) {
    return (
      <div className="sign-tx-container">
        <div className="sign-tx-card">
          <h1 className="sign-tx-title">🔐 Login Required</h1>
          <p className="login-subtitle">Please login to continue with your Solana transaction</p>

          <div className="tx-details">
            <div className="detail-row">
              <span className="detail-label">Network:</span>
              <span className="detail-value chain-badge solana">{networkName}</span>
            </div>
            {recipientAddress && (
              <div className="detail-row">
                <span className="detail-label">Recipient:</span>
                <span className="detail-value address-text">{recipientAddress}</span>
              </div>
            )}
            {amount && (
              <div className="detail-row">
                <span className="detail-label">Amount:</span>
                <span className="detail-value amount-text">{amount} SOL</span>
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="action-buttons">
            <button className="btn btn-primary" onClick={handleLogin} disabled={loading}>
              {loading ? 'Logging in...' : 'Login with Passkey'}
            </button>
            <button className="btn btn-secondary" onClick={handleSignup} disabled={loading}>
              {loading ? 'Signing up...' : 'Sign Up with Passkey'}
            </button>
          </div>

          <button className="btn-cancel-link" onClick={handleCancel} disabled={loading}>
            Cancel Transaction
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sign-tx-container">
      <div className="sign-tx-card">
        <h1 className="sign-tx-title">🔐 Sign Solana Transaction</h1>

        <div className="tx-details">
          <div className="detail-row">
            <span className="detail-label">Network:</span>
            <span className="detail-value chain-badge solana">{networkName}</span>
          </div>

          {recipientAddress && (
            <div className="detail-row">
              <span className="detail-label">Recipient:</span>
              <span className="detail-value address-text">{recipientAddress}</span>
            </div>
          )}

          {amount && (
            <div className="detail-row">
              <span className="detail-label">Amount:</span>
              <span className="detail-value amount-text">{amount} SOL</span>
            </div>
          )}

          {wallets[0] && (
            <div className="detail-row">
              <span className="detail-label">From:</span>
              <span className="detail-value address-text">{wallets[0].address}</span>
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && (
          <div className="success-message">
            {success}
            {txSignature && (
              <div className="tx-hash">
                <span className="tx-hash-label">Transaction Signature:</span>
                <span className="tx-hash-value">{txSignature}</span>
                <a
                  href={`https://explorer.solana.com/tx/${txSignature}?cluster=${explorerCluster}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  View on Solana Explorer →
                </a>
              </div>
            )}
          </div>
        )}

        <div className="action-buttons">
          <button
            className="btn btn-primary"
            onClick={handleSignAndSend}
            disabled={loading || !recipientAddress || !amount}
          >
            {loading ? 'Signing...' : 'Sign & Send'}
          </button>
          <button className="btn btn-secondary" onClick={handleCancel} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default SolanaSignTransaction;

