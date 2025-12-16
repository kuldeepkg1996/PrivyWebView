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
import { encodeFunctionData, erc20Abi, parseEther, Address } from 'viem';
import type { ConnectedWallet } from '@privy-io/react-auth';
import ConfirmModal from '../components/ConfirmModal';
import SuccessModal from '../components/SuccessModal';
import '../styles/SignTransaction.css';
import { sendTransactionResultToNative } from '../utils/nativeCommunication';
import { getChainName } from '../utils/chainUtils';
import { ensureAllWallets } from '../utils/walletManager';

function SignTransaction() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authenticated, ready, user, logout } = usePrivy();
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
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [walletsReady, setWalletsReady] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [hasCheckedWalletAddress, setHasCheckedWalletAddress] = useState(false);
  const [walletAddressValid, setWalletAddressValid] = useState(false);

  // query params
  const network = searchParams.get('network') || 'ethereum';
  const tokenSymbol = searchParams.get('tokenSymbol') || '';
  const tokenAddress = searchParams.get('tokenAddress') || '';
  const tokenDecimals = searchParams.get('tokenDecimals') || '18';
  const amount = searchParams.get('amount') || '';
  const fee = searchParams.get('fee') || '';
  const recipientAddress = searchParams.get('recipientAddress') || '';
  const chainId = searchParams.get('chainId') || '1';
  const walletAddress = searchParams.get('walletAddress') || '';

  const { loginWithPasskey } = useLoginWithPasskey({
    onComplete: () => {
      setLoginLoading(false);
      // Reset wallet address check after login
      setHasCheckedWalletAddress(false);
      setWalletAddressValid(false);
      // Don't set walletsReady here - let the useEffect handle it
    },
    onError: (_) => {
      setError('Failed to login with passkey');
      setLoginLoading(false);
    },
  });

  const { signupWithPasskey } = useSignupWithPasskey({
    onComplete: () => {
      setSignupLoading(false);
      // Reset wallet address check after signup
      setHasCheckedWalletAddress(false);
      setWalletAddressValid(false);
      // Don't set walletsReady here - let the useEffect handle it
    },
    onError: (_) => {
      setError('Failed to sign up with passkey');
      setSignupLoading(false);
    },
  });

  // Reset flags when authentication state changes
  useEffect(() => {
    if (!authenticated) {
      setHasCheckedWalletAddress(false);
      setWalletAddressValid(false);
    }
  }, [authenticated]);

  // Check if walletAddress from URL exists in user's account
  useEffect(() => {
    if (!ready) return;

    // If no walletAddress param, proceed normally (no check needed)
    if (!walletAddress) {
      if (!hasCheckedWalletAddress) {
        setHasCheckedWalletAddress(true);
        setWalletAddressValid(true); // No wallet address to check, so valid
      }
      return;
    }

    // If not authenticated, wait for authentication
    if (!authenticated || !user) {
      return;
    }

    // Skip if already checked
    if (hasCheckedWalletAddress) {
      return;
    }

    // Check if the incoming walletAddress matches any of the user's wallet addresses
    const normalizedParam = walletAddress.toLowerCase();
    const allWalletAddresses = user.linkedAccounts
      ?.filter((account: any) => account.type === 'wallet' && account.address)
      .map((account: any) => account.address.toLowerCase()) || [];

    const walletMatches = allWalletAddresses.includes(normalizedParam);

    setHasCheckedWalletAddress(true);

    // If wallet address doesn't match, logout to show login prompt
    if (!walletMatches) {
      setWalletAddressValid(false);
      logout();
      return;
    }

    // Wallet matches, proceed with transaction
    setWalletAddressValid(true);
  }, [ready, authenticated, user, walletAddress, hasCheckedWalletAddress, logout]);


  // Wait for wallets to be ready after authentication and create if needed
  useEffect(() => {
    if (authenticated && ready) {
      const ensureWallets = async () => {
        const hasWallet = evmWallets.length > 0 || solanaWallets.length > 0;
        
        if (hasWallet) {
          setWalletsReady(true);
          return;
        }

        // Wait a bit for wallets to load
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Create missing wallets using centralized utility
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
        } catch (err) {
          // Wallet creation failed, but still set ready to show error state
        }

        setWalletsReady(true);
      };

      ensureWallets();
    } else {
      setWalletsReady(false);
    }
  }, [authenticated, ready, evmWallets.length, solanaWallets.length, network, createEvmWallet, createSolanaWallet, createOtherWallet, user]);

  const handleSwitchNetwork = async (wallet: ConnectedWallet, targetChainId: number) => {
    try {
      setSwitchingNetwork(true);
      // Use setActiveChain if switchChain doesn't exist
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
    setLoading(true);
    setError('');
    setTxHash('');
    setShowSuccessModal(false);
    setTxStatus('pending');

    try {
      if (network.toLowerCase().includes('solana')) {
        await handleSolanaTransaction();
      } else {
        await handleEvmTransaction();
      }
      // Success is set in individual handlers
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMessage);
      setTxStatus('failed');
      
      // Send failed status to native
      sendTransactionResultToNative('', 'failed', chainId, getChainName(chainId));
    } finally {
      setLoading(false);
    }
  };

  const handleEvmTransaction = async () => {
    const selectedWallet = evmWallets[0];
    if (!selectedWallet) {
      throw new Error('No EVM wallet found');
    }

    if (!recipientAddress) throw new Error('Recipient address is required');
    if (!amount) throw new Error('Amount is required');

    const targetChainId = parseInt(chainId, 10);
    if (chainId && targetChainId) {
      const currentChainId = selectedWallet.chainId;
      if (currentChainId && typeof currentChainId === 'number' && currentChainId !== targetChainId) {
        await handleSwitchNetwork(selectedWallet, targetChainId);
      }
    }

    type TxRequest = {
      to?: Address;
      data?: `0x${string}`;
      value?: bigint;
      chainId: number;
      gasPrice?: bigint;
    };

    let txRequest: TxRequest;

    // ERC-20 transfer
    if (tokenAddress && tokenAddress !== '') {
      const decimals = parseInt(tokenDecimals, 10);
      const amountInSmallestUnit = BigInt(
        Math.floor(parseFloat(amount) * Math.pow(10, decimals)),
      );

      const encodedData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [recipientAddress as Address, amountInSmallestUnit],
      });

      txRequest = {
        to: tokenAddress as Address,
        data: encodedData,
        chainId: targetChainId,
      };
    } else {
      // Native transfer
      const valueInWei = parseEther(amount);

      txRequest = {
        to: recipientAddress as Address,
        value: valueInWei,
        chainId: targetChainId,
      };
    }

    // optional gas
    if (fee && fee !== '') {
      const gasPrice = BigInt(Math.floor(parseFloat(fee) * 1e9)); // Gwei -> wei
      txRequest.gasPrice = gasPrice;
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
    
    // Send success status to native
    sendTransactionResultToNative(hash, 'success', chainId, getChainName(chainId));
  };

  const handleSolanaTransaction = async () => {
    const wallet = solanaWallets[0];
    if (!wallet) {
      throw new Error('No Solana wallet found');
    }
    if (!recipientAddress) throw new Error('Recipient address is required');

    // TODO: implement actual Solana tx
    throw new Error('Solana transaction signing coming soon - needs @solana/web3.js integration');
  };

  const handleCancel = () => {
    sendTransactionResultToNative('', 'cancelled');
    navigate('/');
  };

  const handleGoHome = () => {
    // Called from success modal button
    // Status already sent when transaction succeeded
    navigate('/');
  };

  const handleRetry = () => {
    // Reset states and allow user to try again
    setError('');
    setTxStatus('idle');
    setTxHash('');
    setShowSuccessModal(false);
  };

  const isTokenTransfer = tokenAddress && tokenAddress !== '';
  const displayTokenSymbol = tokenSymbol || 'Tokens';

  const networkDisplay = getChainName(chainId);
  const networkShort = networkDisplay.includes('Ethereum') ? 'ETH (ERC 20)' : networkDisplay;

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

  // Show login prompt if not authenticated OR if wallet address doesn't match
  const shouldShowLoginPrompt = !authenticated || (walletAddress && hasCheckedWalletAddress && !walletAddressValid);

  if (shouldShowLoginPrompt) {
    return (
      <div className="sign-tx-container centered">
        <div className="sign-tx-card">
          <h1 className="sign-tx-title">🔐 Login Required</h1>
          <p className="login-subtitle">
            {walletAddress && hasCheckedWalletAddress && !walletAddressValid
              ? 'The wallet address in the URL does not belong to your account. Please login with the correct account.'
              : 'Please login to continue with your transaction'}
          </p>

          <div className="tx-details">
            <div className="detail-row">
              <span className="detail-label">Network:</span>
              <span className="detail-value chain-badge">
                {getChainName(chainId)}
              </span>
            </div>
            {recipientAddress && (
              <div className="detail-row">
                <span className="detail-label">Recipient:</span>
                <span className="detail-value address-text">
                  {recipientAddress}
                </span>
              </div>
            )}
            {amount && (
              <div className="detail-row">
                <span className="detail-label">Amount:</span>
                <span className="detail-value amount-text">
                  {amount} {isTokenTransfer ? displayTokenSymbol : 'ETH'}
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

  // Calculate amount to receive (amount - fee)
  const amountReceive = amount && fee 
    ? (parseFloat(amount) - parseFloat(fee)).toFixed(2)
    : amount || '0.00';
  const displayFee = fee || '0.00';

  // Show loading while wallets are initializing after login
  // Also show loading while checking wallet address
  if (authenticated && ready && (!walletsReady || (walletAddress && !hasCheckedWalletAddress)) && !shouldShowLoginPrompt) {
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

  // Check if we have the required wallet before showing confirm modal
  // Also ensure wallet address is valid if it was provided
  const hasRequiredWallet = network.toLowerCase().includes('solana') 
    ? solanaWallets.length > 0 
    : evmWallets.length > 0;
  
  const canProceedWithTransaction = hasRequiredWallet && (!walletAddress || walletAddressValid);

  return (
    <div className="sign-tx-container">
      {/* Show login/signup if authenticated but wallet not found OR wallet address doesn't match */}
      {authenticated && ready && walletsReady && (!hasRequiredWallet || (walletAddress && !walletAddressValid)) && !shouldShowLoginPrompt && txStatus === 'idle' && (
        <div className="sign-tx-container centered">
          <div className="sign-tx-card">
            <h1 className="sign-tx-title">⚠️ Wallet Not Found</h1>
            <p className="login-subtitle">
              No {network.toLowerCase().includes('solana') ? 'Solana' : 'EVM'} wallet found for your account.
              Please log out and create a new account or try logging in again.
            </p>

            <div className="tx-details" style={{ marginTop: '20px' }}>
              <div className="detail-row">
                <span className="detail-label">Network:</span>
                <span className="detail-value chain-badge">
                  {getChainName(chainId)}
                </span>
              </div>
              {recipientAddress && (
                <div className="detail-row">
                  <span className="detail-label">Recipient:</span>
                  <span className="detail-value address-text">
                    {recipientAddress}
                  </span>
                </div>
              )}
              {amount && (
                <div className="detail-row">
                  <span className="detail-label">Amount:</span>
                  <span className="detail-value amount-text">
                    {amount} {isTokenTransfer ? displayTokenSymbol : 'ETH'}
                  </span>
                </div>
              )}
            </div>

            {error && <div className="error-message" style={{ marginTop: '20px' }}>{error}</div>}

            <div className="action-buttons" style={{ marginTop: '30px' }}>
              <button
                className="btn btn-primary"
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Try Login Again'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleSignup}
                disabled={loading}
              >
                {loading ? 'Signing up...' : 'Create New Account'}
              </button>
            </div>

            <button
              className="btn-cancel-link"
              onClick={handleCancel}
              disabled={loading}
              style={{ marginTop: '20px' }}
            >
              Cancel Transaction
            </button>
          </div>
        </div>
      )}

      {/* Confirm Withdraw Modal - Only show when authenticated, ready, wallets loaded AND wallet exists AND wallet address is valid */}
      {authenticated && ready && walletsReady && canProceedWithTransaction && !shouldShowLoginPrompt && txStatus === 'idle' && (
        <ConfirmModal
          recipientAddress={recipientAddress}
          networkShort={networkShort}
          amountReceive={amountReceive}
          displayFee={displayFee}
          displayTokenSymbol={displayTokenSymbol}
          loading={loading}
          switchingNetwork={switchingNetwork}
          amount={amount}
          onCancel={handleCancel}
          onConfirm={handleSignAndSend}
        />
      )}

      {/* PENDING STATE */}
      {txStatus === 'pending' && (
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
                <span className="detail-value">{getChainName(chainId)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Amount:</span>
                <span className="detail-value">{amount} {displayTokenSymbol || 'ETH'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">To:</span>
                <span className="detail-value address-text">{recipientAddress}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAILED STATE */}
      {txStatus === 'failed' && (
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
                <span className="detail-value">{getChainName(chainId)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Amount:</span>
                <span className="detail-value">{amount} {displayTokenSymbol || 'ETH'}</span>
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

      {/* SUCCESS MODAL - Bottom Sheet Style */}
      {showSuccessModal && txStatus === 'success' && (
        <SuccessModal
          txHash={txHash}
          onGoHome={handleGoHome}
        />
      )}
    </div>
  );
}

export default SignTransaction;

