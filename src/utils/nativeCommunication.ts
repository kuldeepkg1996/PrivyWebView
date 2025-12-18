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
  // Validate userId is present
  if (!userId || userId.trim() === '') {
    console.error('❌ CRITICAL ERROR: userId is empty or undefined!');
    console.error('userId value:', userId);
    console.error('userId type:', typeof userId);
    throw new Error('userId is required but was empty or undefined');
  }
  
  console.log('=== SENDING WALLET DATA TO NATIVE ===');
  console.log('Privy User ID:', userId);
  console.log('User ID length:', userId.length);
  console.log('User ID format valid:', userId.startsWith('did:privy:'));
  
  // Prepare all wallet data in a single object
  const walletData = {
    userId: userId, // Privy user ID from user.id
    evm: {
      evmWalletId: evmWalletId || '',
      evmWalletAddress: evmAddress || '',
      userId: userId // Include in each wallet object too
    },
    solana: {
      solanaWalletId: solanaWalletId || '',
      solanaWalletAddress: solanaAddress || '',
      userId: userId // Include in each wallet object too
    },
    tron: {
      tronWalletId: tronWalletId || '',
      tronWalletAddress: tronAddress || '',
      userId: userId // Include in each wallet object too
    },
    timestamp: Date.now() // Add timestamp for validation
  };

  console.log('Complete wallet data object:', JSON.stringify(walletData, null, 2));
  console.log('Wallet data includes userId:', {
    topLevel: walletData.userId === userId,
    evm: walletData.evm.userId === userId,
    solana: walletData.solana.userId === userId,
    tron: walletData.tron.userId === userId
  });

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

  // Method 3: PRIMARY METHOD - Use wallet objects with userId + base64 as bonus
  // Since InAppBrowser strips parameters, we MUST include userId in wallet objects
  // This is the most reliable method
  try {
    // CRITICAL: Always include userId in wallet objects (this is what React Native will extract)
    const evmWalletWithUserId = JSON.stringify({
      evmWalletId: evmWalletId || '',
      evmWalletAddress: evmAddress || '',
      userId: userId // MUST be included
    });
    const solanaWalletWithUserId = JSON.stringify({
      solanaWalletId: solanaWalletId || '',
      solanaWalletAddress: solanaAddress || '',
      userId: userId // MUST be included
    });
    const tronWalletWithUserId = JSON.stringify({
      tronWalletId: tronWalletId || '',
      tronWalletAddress: tronAddress || '',
      userId: userId // MUST be included
    });
    
    // Verify userId is in each wallet object JSON string
    const evmHasUserId = evmWalletWithUserId.includes(userId);
    const solanaHasUserId = solanaWalletWithUserId.includes(userId);
    const tronHasUserId = tronWalletWithUserId.includes(userId);
    
    console.log('✅ Wallet objects include userId:', {
      evm: evmHasUserId,
      solana: solanaHasUserId,
      tron: tronHasUserId
    });
    
    // Log actual JSON strings to verify
    console.log('EVM wallet JSON:', evmWalletWithUserId);
    console.log('Solana wallet JSON:', solanaWalletWithUserId);
    console.log('Tron wallet JSON:', tronWalletWithUserId);
    
    if (!evmHasUserId || !solanaHasUserId || !tronHasUserId) {
      console.error('❌ CRITICAL: userId missing from wallet objects!');
      console.error('userId value:', userId);
      throw new Error('Failed to include userId in wallet objects');
    }
    
    // Build primary URL with userId in wallet objects + as separate param + in path
    const params = new URLSearchParams();
    params.set('evm', evmWalletWithUserId);
    params.set('solana', solanaWalletWithUserId);
    params.set('tron', tronWalletWithUserId);
    params.set('userId', userId);
    params.set('uid', userId);
    
    // Verify params include userId
    const evmParam = params.get('evm') || '';
    console.log('✅ Verified evm param includes userId:', evmParam.includes(userId));
    console.log('✅ Verified userId param:', params.get('userId') === userId);
    
    // Also add base64 data as bonus (if InAppBrowser preserves it, great; if not, we have wallet objects)
    try {
      walletData.evm.userId = userId;
      walletData.solana.userId = userId;
      walletData.tron.userId = userId;
      const jsonData = JSON.stringify(walletData);
      const base64Data = btoa(unescape(encodeURIComponent(jsonData)));
      params.set('d', base64Data); // Add base64 as additional parameter
      console.log('✅ Added base64 data as additional parameter');
    } catch (base64Error) {
      console.warn('Could not add base64 data, but wallet objects have userId:', base64Error);
    }
    
    const primaryUrl = `orbitxpay://walletscreen/${encodeURIComponent(userId)}?${params.toString()}`;
    console.log('Primary URL includes userId in:', {
      path: primaryUrl.includes(`/${encodeURIComponent(userId)}`),
      queryParam: primaryUrl.includes('userId='),
      evmObject: primaryUrl.includes('"userId"'),
      base64: params.has('d')
    });
    console.log('Primary URL (first 300 chars):', primaryUrl.substring(0, 300));
    
    window.location.href = primaryUrl;
    console.log('✅ Sent wallet data via primary method (with userId in wallet objects)');
  } catch (e) {
    console.error('Error sending via primary method:', e);
    
    // Method 4: Fallback to original method with all parameters
    // CRITICAL: This fallback MUST include userId in wallet objects
    console.log('⚠️ Using fallback method - ensuring userId is in all wallet objects');
    try {
      const evmWallet = JSON.stringify({
        evmWalletId: evmWalletId || '',
        evmWalletAddress: evmAddress || '',
        userId: userId // CRITICAL: Must include userId
      });
      const solanaWallet = JSON.stringify({
        solanaWalletId: solanaWalletId || '',
        solanaWalletAddress: solanaAddress || '',
        userId: userId // CRITICAL: Must include userId
      });
      const tronWallet = JSON.stringify({
        tronWalletId: tronWalletId || '',
        tronWalletAddress: tronAddress || '',
        userId: userId // CRITICAL: Must include userId
      });

      console.log('Fallback wallet objects include userId:', {
        evm: evmWallet.includes(userId),
        solana: solanaWallet.includes(userId),
        tron: tronWallet.includes(userId)
      });

      const params = new URLSearchParams();
      params.set('evm', evmWallet);
      params.set('solana', solanaWallet);
      params.set('tron', tronWallet);
      params.set('userId', userId);
      params.set('uid', userId);

      const fallbackUrl = `orbitxpay://walletscreen/${encodeURIComponent(userId)}?${params.toString()}`;
      console.log('Fallback URL includes userId:', fallbackUrl.includes(userId));
      console.log('Fallback URL (first 200 chars):', fallbackUrl.substring(0, 200));
      
      window.location.href = fallbackUrl;
      console.log('✅ Sent wallet data via fallback deep link');
    } catch (fallbackError) {
      console.error('❌ Error sending via fallback deep link:', fallbackError);
      // Last resort: try simple URL with just userId
      try {
        window.location.href = `orbitxpay://walletscreen?userId=${encodeURIComponent(userId)}`;
        console.log('✅ Sent minimal URL with just userId');
      } catch (lastResortError) {
        console.error('❌ All redirect methods failed:', lastResortError);
      }
    }
  }
};

