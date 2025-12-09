import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  usePrivy,
  useWallets as useEvmWallets,
  useLoginWithPasskey,
  useSignupWithPasskey,
  useSendTransaction,
  useCreateWallet as useCreateEvmWallet,
} from '@privy-io/react-auth';
import {
  useWallets as useSolanaWallets,
  useCreateWallet as useCreateSolanaWallet,
} from '@privy-io/react-auth/solana';
import { useCreateWallet as useCreateOtherWallet } from '@privy-io/react-auth/extended-chains';
import type { ConnectedWallet } from '@privy-io/react-auth';
import { createPublicClient, http } from 'viem';
import ConfirmModal from '../components/ConfirmModal';
import SuccessModal from '../components/SuccessModal';
import '../styles/SignTransaction.css';
import { sendTransactionResultToNative } from '../utils/nativeCommunication';
import { getChainName } from '../utils/chainUtils';
import { ensureAllWallets } from '../utils/walletManager';

interface TransactionParams {
  data: string;
  chainId: string;
  to: string;
  from: string;
  rpc?: string;
}

function EvmSignData() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authenticated, ready, user } = usePrivy();
  const { wallets: evmWallets } = useEvmWallets();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { sendTransaction } = useSendTransaction();
  const { createWallet: createEvmWallet } = useCreateEvmWallet();
  const { createWallet: createSolanaWallet } = useCreateSolanaWallet();
  const { createWallet: createOtherWallet } = useCreateOtherWallet();

  const [loading, setLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [walletsReady, setWalletsReady] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [txParams, setTxParams] = useState<TransactionParams | null>(null);
  const [validating, setValidating] = useState(true);

  const { loginWithPasskey } = useLoginWithPasskey({
    onComplete: () => {
      setShowLoginPrompt(false);
      setLoginLoading(false);
    },
    onError: (_) => {
      setError('Failed to login with passkey');
      setLoginLoading(false);
    },
  });

  const { signupWithPasskey } = useSignupWithPasskey({
    onComplete: () => {
      setShowLoginPrompt(false);
      setSignupLoading(false);
    },
    onError: (_) => {
      setError('Failed to sign up with passkey');
      setSignupLoading(false);
    },
  });

  // Parse query parameters
  useEffect(() => {
    const data = searchParams.get('data');
    const chainId = searchParams.get('chainId');
    const to = searchParams.get('to');
    const from = searchParams.get('from');
    const rpc = searchParams.get('rpc') || undefined;

    if (data && chainId && to && from) {
      setTxParams({ data, chainId, to, from, rpc });
      setValidating(false);
    } else {
      setError('Missing required parameters: data, chainId, to, or from');
      setValidating(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (ready && !authenticated) {
      setShowLoginPrompt(true);
    }
  }, [ready, authenticated]);

  // Wait for wallets to be ready after authentication and create if needed
  useEffect(() => {
    if (authenticated && ready) {
      const ensureWallets = async () => {
        const hasWallet = evmWallets.length > 0 || solanaWallets.length > 0;
        
        if (hasWallet) {
          setWalletsReady(true);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

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
            true
          );

          if (!result.success && result.error) {
            setError(result.error);
          }
        } catch (err) {
          // Wallet creation failed, but still set ready to show error state
        }

        setWalletsReady(true);
      };

      ensureWallets();
    } else {
      setWalletsReady(false);
    }
  }, [authenticated, ready, evmWallets.length, solanaWallets.length, createEvmWallet, createSolanaWallet, createOtherWallet, user]);

  // Validate user wallet matches 'from' address
  useEffect(() => {
    if (!authenticated || !user || !txParams || !walletsReady) return;

    const userWallets = evmWallets.map((w) => w.address.toLowerCase());
    const fromAddress = txParams.from.toLowerCase();

    if (!userWallets.includes(fromAddress)) {
      setError(`Your account doesn't own the wallet address: ${txParams.from}`);
    }
  }, [authenticated, user, txParams, evmWallets, walletsReady]);

  const handleSwitchNetwork = async (wallet: ConnectedWallet, targetChainId: number) => {
    try {
      setSwitchingNetwork(true);
      if ('switchChain' in wallet && typeof wallet.switchChain === 'function') {
        await (wallet as any).switchChain(targetChainId);
      } else if ('setActiveChain' in wallet && typeof wallet.setActiveChain === 'function') {
        await (wallet as any).setActiveChain(targetChainId);
      } else {
        throw new Error('Chain switching not supported by this wallet');
      }
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new Error(`Failed to switch to chain ${targetChainId}: ${errorMessage}`);
    } finally {
      setSwitchingNetwork(false);
    }
  };

  const handleSignAndSend = async () => {
    if (!txParams) {
      setError('Transaction parameters are missing');
      return;
    }

    setLoading(true);
    setError('');
    setTxHash('');
    setShowSuccessModal(false);
    setTxStatus('pending');

    try {
      const targetChainId = parseInt(txParams.chainId, 10);

      // Find the wallet that matches the 'from' address
      const selectedWallet = evmWallets.find(
        (w) => w.address.toLowerCase() === txParams.from.toLowerCase()
      );

      if (!selectedWallet) {
        throw new Error('Wallet not found for the specified from address');
      }

      // Switch to target chain if needed
      const currentChainId = selectedWallet.chainId;
      if (currentChainId && typeof currentChainId === 'number' && currentChainId !== targetChainId) {
        await handleSwitchNetwork(selectedWallet, targetChainId);
      }

      // Prepare transaction request
      const txRequest: any = {
        to: txParams.to as `0x${string}`,
        data: txParams.data as `0x${string}`,
        chainId: targetChainId,
      };

      // If custom RPC is provided, you can use it for gas estimation (optional)
      if (txParams.rpc) {
        try {
          const publicClient = createPublicClient({
            transport: http(txParams.rpc),
          });
          
          // Optional: Estimate gas using custom RPC
          const gasEstimate = await publicClient.estimateGas({
            account: selectedWallet.address as `0x${string}`,
            to: txParams.to as `0x${string}`,
            data: txParams.data as `0x${string}`,
          });
          
          txRequest.gas = gasEstimate;
        } catch (gasErr) {
          // If gas estimation fails, continue without it
          console.warn('Gas estimation failed, continuing without it:', gasErr);
        }
      }

      const result = await sendTransaction(txRequest, {
        address: selectedWallet.address,
      });

      const hash =
        typeof result === 'string'
          ? result
          : (result as { hash?: string; transactionHash?: string }).hash || 
            (result as { hash?: string; transactionHash?: string }).transactionHash || 
            '';
      
      setTxHash(hash);
      setTxStatus('success');
      setShowSuccessModal(true);
      
      sendTransactionResultToNative(hash, 'success', txParams.chainId, getChainName(txParams.chainId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMessage);
      setTxStatus('failed');
      
      sendTransactionResultToNative('', 'failed', txParams?.chainId || '', getChainName(txParams?.chainId || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    sendTransactionResultToNative('', 'cancelled');
    navigate('/');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleRetry = () => {
    setError('');
    setTxStatus('idle');
    setTxHash('');
    setShowSuccessModal(false);
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

  if (!ready || validating) {
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
          <p className="login-subtitle">
            Please login to continue with your transaction
          </p>

          <div className="tx-details">
            <div className="detail-row">
              <span className="detail-label">Network:</span>
              <span className="detail-value chain-badge">
                {txParams ? getChainName(txParams.chainId) : 'Unknown'}
              </span>
            </div>
            {txParams?.to && (
              <div className="detail-row">
                <span className="detail-label">To:</span>
                <span className="detail-value address-text">
                  {txParams.to}
                </span>
              </div>
            )}
            {txParams?.from && (
              <div className="detail-row">
                <span className="detail-label">From:</span>
                <span className="detail-value address-text">
                  {txParams.from}
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

          <button
            className="btn-cancel-link"
            onClick={handleCancel}
            disabled={loginLoading || signupLoading}
          >
            Cancel Transaction
          </button>
        </div>
      </div>
    );
  }

  // Show loading while wallets are initializing after login
  if (authenticated && ready && !walletsReady && !showLoginPrompt) {
    return (
      <div className="sign-tx-container centered">
        <div className="sign-tx-card">
          <div className="loading-container">
            <div className="spinner" />
            <h2 style={{ color: '#ffffff', marginTop: '20px' }}>Preparing Your Wallet</h2>
            <p style={{ color: '#999', marginTop: '10px' }}>
              Please wait while we load your wallet...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check if we have the required wallet
  const hasRequiredWallet = evmWallets.length > 0;
  const walletMatches = txParams && evmWallets.some(
    (w) => w.address.toLowerCase() === txParams.from.toLowerCase()
  );

  return (
    <div className="sign-tx-container">
      {/* Show error if wallet not found */}
      {authenticated && ready && walletsReady && (!hasRequiredWallet || !walletMatches) && !showLoginPrompt && txStatus === 'idle' && (
        <div className="sign-tx-container centered">
          <div className="sign-tx-card">
            <h1 className="sign-tx-title">⚠️ Wallet Not Found</h1>
            <p className="login-subtitle">
              {!hasRequiredWallet 
                ? 'No EVM wallet found for your account.'
                : `The wallet address ${txParams?.from} is not linked to your account.`}
            </p>

            <div className="tx-details" style={{ marginTop: '20px' }}>
              <div className="detail-row">
                <span className="detail-label">Network:</span>
                <span className="detail-value chain-badge">
                  {txParams ? getChainName(txParams.chainId) : 'Unknown'}
                </span>
              </div>
              {txParams?.to && (
                <div className="detail-row">
                  <span className="detail-label">To:</span>
                  <span className="detail-value address-text">
                    {txParams.to}
                  </span>
                </div>
              )}
              {txParams?.from && (
                <div className="detail-row">
                  <span className="detail-label">Required From:</span>
                  <span className="detail-value address-text">
                    {txParams.from}
                  </span>
                </div>
              )}
            </div>

            {error && <div className="error-message" style={{ marginTop: '20px' }}>{error}</div>}

            <div className="action-buttons" style={{ marginTop: '30px' }}>
              <button
                className="btn btn-secondary"
                onClick={handleCancel}
              >
                Cancel Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Transaction Modal */}
      {authenticated && ready && walletsReady && hasRequiredWallet && walletMatches && !showLoginPrompt && txStatus === 'idle' && txParams && (
        <ConfirmModal
          recipientAddress={txParams.to}
          networkShort={getChainName(txParams.chainId)}
          amountReceive="Contract Call"
          displayFee="Network Fee"
          displayTokenSymbol=""
          loading={loading}
          switchingNetwork={switchingNetwork}
          amount={txParams.data.slice(0, 20) + '...'}
          onCancel={handleCancel}
          onConfirm={handleSignAndSend}
        />
      )}

      {/* PENDING STATE */}
      {txStatus === 'pending' && txParams && (
        <div className="sign-tx-container centered">
          <div className="sign-tx-card">
            <div className="status-icon pending">⏳</div>
            <h1 className="sign-tx-title">Transaction Pending</h1>
            <p className="login-subtitle">
              Please wait while your transaction is being processed...
            </p>
            <div className="loading-container">
              <div className="spinner" />
            </div>
            <div className="tx-details" style={{ marginTop: '20px' }}>
              <div className="detail-row">
                <span className="detail-label">Network:</span>
                <span className="detail-value">{getChainName(txParams.chainId)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">To:</span>
                <span className="detail-value address-text">{txParams.to}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">From:</span>
                <span className="detail-value address-text">{txParams.from}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAILED STATE */}
      {txStatus === 'failed' && txParams && (
        <div className="sign-tx-container centered">
          <div className="sign-tx-card">
            <div className="status-icon failed">❌</div>
            <h1 className="sign-tx-title">Transaction Failed</h1>
            <p className="login-subtitle">
              Your transaction could not be completed
            </p>
            {error && (
              <div className="error-message" style={{ marginTop: '20px' }}>
                {error}
              </div>
            )}
            <div className="tx-details" style={{ marginTop: '20px' }}>
              <div className="detail-row">
                <span className="detail-label">Network:</span>
                <span className="detail-value">{getChainName(txParams.chainId)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">To:</span>
                <span className="detail-value address-text">{txParams.to}</span>
              </div>
            </div>
            <div className="action-buttons" style={{ marginTop: '30px' }}>
              <button
                className="btn btn-primary"
                onClick={handleRetry}
              >
                Try Again
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccessModal && txStatus === 'success' && (
        <SuccessModal
          txHash={txHash}
          onGoHome={handleGoHome}
        />
      )}
    </div>
  );
}

export default EvmSignData;
