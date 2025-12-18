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

/**
 * Send complete wallet data including userId to React Native app
 * Uses multiple methods for maximum compatibility:
 * 1. Base64-encoded single parameter (best for InAppBrowser)
 * 2. postMessage (for WebView)
 * 3. Deep link with all parameters (fallback)
 */
export const sendCompleteWalletDataToNative = (
  evmAddress: string,
  solanaAddress: string,
  tronAddress: string,
  evmWalletId: string,
  solanaWalletId: string,
  tronWalletId: string,
  userId: string
): void => {
  // Prepare all wallet data in a single object
  const walletData = {
    userId: userId,
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
    timestamp: Date.now() // Add timestamp for validation
  };

  console.log('Sending complete wallet data:', walletData);

  // Method 1: Try postMessage first (for WebView - most reliable)
  try {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'WALLET_DATA_COMPLETE',
          ...walletData
        })
      );
      console.log('✅ Sent wallet data via postMessage');
    }
  } catch (e) {
    console.error('Error sending via postMessage:', e);
  }

  // Method 2: Store in sessionStorage as backup (React Native can inject JS to read this)
  try {
    sessionStorage.setItem('privy_wallet_data', JSON.stringify(walletData));
    sessionStorage.setItem('privy_wallet_data_timestamp', Date.now().toString());
    console.log('✅ Stored wallet data in sessionStorage');
  } catch (e) {
    console.warn('Could not store in sessionStorage:', e);
  }

  // Method 3: Base64-encoded single parameter (best for InAppBrowser)
  // Use short parameter name 'd' to avoid stripping
  try {
    const jsonData = JSON.stringify(walletData);
    // Use proper base64 encoding
    const base64Data = btoa(unescape(encodeURIComponent(jsonData)));
    
    // Try multiple URL formats to maximize compatibility
    const urlFormats = [
      `orbitxpay://walletscreen?d=${base64Data}`, // Shortest parameter name
      `orbitxpay://walletscreen?data=${base64Data}`, // Full parameter name
      `orbitxpay://walletscreen/${encodeURIComponent(userId)}?d=${base64Data}`, // With userId in path
    ];
    
    console.log('Base64 encoded data length:', base64Data.length);
    console.log('Base64 data preview:', base64Data.substring(0, 50) + '...');
    console.log('Trying URL formats:', urlFormats.map((url, i) => `Format ${i + 1}: ${url.substring(0, 100)}...`));
    
    // Try the shortest format first (most likely to work)
    const deepLinkUrl = urlFormats[0];
    console.log('Using URL format:', deepLinkUrl.substring(0, 150));
    console.log('Full URL length:', deepLinkUrl.length);
    
    window.location.href = deepLinkUrl;
    console.log('✅ Sent wallet data via base64 deep link');
  } catch (e) {
    console.error('Error sending via base64 deep link:', e);
    
    // Method 4: Fallback to original method with all parameters
    try {
      const evmWallet = JSON.stringify({
        evmWalletId: evmWalletId || '',
        evmWalletAddress: evmAddress || '',
        userId: userId
      });
      const solanaWallet = JSON.stringify({
        solanaWalletId: solanaWalletId || '',
        solanaWalletAddress: solanaAddress || '',
        userId: userId
      });
      const tronWallet = JSON.stringify({
        tronWalletId: tronWalletId || '',
        tronWalletAddress: tronAddress || '',
        userId: userId
      });

      const params = new URLSearchParams();
      params.set('evm', evmWallet);
      params.set('solana', solanaWallet);
      params.set('tron', tronWallet);
      params.set('userId', userId);
      params.set('uid', userId);

      const fallbackUrl = `orbitxpay://walletscreen/${encodeURIComponent(userId)}?${params.toString()}`;
      window.location.href = fallbackUrl;
      console.log('✅ Sent wallet data via fallback deep link');
    } catch (fallbackError) {
      console.error('Error sending via fallback deep link:', fallbackError);
    }
  }
};

