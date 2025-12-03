/**
 * Utility functions for communicating with React Native WebView
 */

export const sendWalletsToNative = (
  evmAddress: string, 
  solanaAddress: string, 
  tronAddress?: string
): void => {
  try {
    const url =
      `orbitxpay://walletscreen` +
      `?evmAddress=${encodeURIComponent(evmAddress || '')}` +
      `&solanaAddress=${encodeURIComponent(solanaAddress || '')}` +
      `&tronAddress=${encodeURIComponent(tronAddress || '')}`;

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
          evmAddress,
          solanaAddress,
          tronAddress: tronAddress || '',
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

