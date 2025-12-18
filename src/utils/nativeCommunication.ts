/**
 * Utility functions for communicating with React Native WebView
 */

export const sendWalletsToNative = (
  evmAddress: string, 
  solanaAddress: string, 
  tronAddress?: string,
  evmWalletId?: string,
  solanaWalletId?: string,
  tronWalletId?: string
): void => {
  try {
    // Create structured wallet objects
    const evmWallet = JSON.stringify({
      evmWalletId: evmWalletId || '',
      evmWalletAddress: evmAddress || ''
    });
    const solanaWallet = JSON.stringify({
      solanaWalletId: solanaWalletId || '',
      solanaWalletAddress: solanaAddress || ''
    });
    const tronWallet = JSON.stringify({
      tronWalletId: tronWalletId || '',
      tronWalletAddress: tronAddress || ''
    });

    const url =
      `orbitxpay://walletscreen` +
      `?evm=${encodeURIComponent(evmWallet)}` +
      `&solana=${encodeURIComponent(solanaWallet)}` +
      `&tron=${encodeURIComponent(tronWallet)}`;

    window.location.href = url;
  } catch (e) {
    // Silent fail for deep link
  }

  try {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'WALLET_ADDRESS',
          address: evmAddress,
          evm: {
            evmWalletId: evmWalletId || '',
            evmWalletAddress: evmAddress || ''
          },
          solana: {
            solanaWalletId: solanaWalletId || '',
            solanaWalletAddress: solanaAddress || ''
          },
          tron: {
            tronWalletId: tronWalletId || '',
            tronWalletAddress: tronAddress || ''
          },
        }),
      );
    }
  } catch (e) {
    // Silent fail for WebView postMessage
  }
};

export const sendTransactionResultToNative = (
  transactionHash: string,
  status: string,
  chainId?: string,
  networkName?: string
): void => {
  try {
    const url =
      `orbitxpay://transaction` +
      `?transactionHash=${encodeURIComponent(transactionHash)}` +
      `&status=${encodeURIComponent(status)}` +
      (chainId ? `&chainId=${encodeURIComponent(chainId)}` : '') +
      (networkName ? `&network=${encodeURIComponent(networkName)}` : '');

    window.location.href = url;
  } catch (e) {
    // Silent fail for deep link
  }

  try {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'SOLANA_TRANSACTION_RESULT',
          transactionHash,
          status,
          chainId: chainId || '',
          network: networkName || '',
        })
      );
    }
  } catch (e) {
    // Silent fail for WebView postMessage
  }
};

export const sendSignMessageResultToNative = (
  signature: string,
  status: string,
  message?: string,
  chainId?: string,
  messageType: 'EVM' | 'SOLANA' = 'EVM'
): void => {
  try {
    window.location.href = `orbitxpay://signMessage?signature=${encodeURIComponent(signature)}&status=${status}`;
  } catch (e) {
    // Silent fail for deep link
  }

  try {
    if (window.ReactNativeWebView) {
      const type = messageType === 'EVM' ? 'EVM_SIGN_MESSAGE_RESULT' : 'SOLANA_SIGN_MESSAGE_RESULT';
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ 
          type, 
          signature, 
          status, 
          message: message || '', 
          chainId: chainId || '' 
        })
      );
    }
  } catch (e) {
    // Silent fail for WebView postMessage
  }
};

