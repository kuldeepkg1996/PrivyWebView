// PrivyWallet.tsx
import React, { useEffect } from 'react';
import {View,StyleSheet,SafeAreaView,ActivityIndicator,Linking} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { cryptoBaseUrl } from '../../utils/utils';

function PrivyWallet() {
  const navigation: any = useNavigation();

  const getQueryParam = (url: string, key: string): string | null => {
    try {
      // Improved regex that handles:
      // 1. Parameter at start (?key=value)
      // 2. Parameter in middle (&key=value)
      // 3. Parameter at end (&key=value or ?key=value with no trailing &)
      // 4. URL-encoded values
      const regex = new RegExp(`[?&]${key}=([^&]*)`);
      const match = url.match(regex);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
      return null;
    } catch (e) {
      console.log('getQueryParam error:', e);
      return null;
    }
  };

  const parseUrlParams = (url: string): { [key: string]: string } => {
    const params: { [key: string]: string } = {};
    try {
      // Extract query string part
      const queryString = url.split('?')[1];
      if (!queryString) return params;

      // Split by & and parse each parameter
      const pairs = queryString.split('&');
      pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key) {
          params[key] = value ? decodeURIComponent(value) : '';
        }
      });
    } catch (e) {
      console.log('parseUrlParams error:', e);
    }
    return params;
  };

  const decodeBase64Data = (base64String: string): any => {
    try {
      const decoded = decodeURIComponent(escape(atob(base64String)));
      return JSON.parse(decoded);
    } catch (e) {
      console.error('Error decoding base64 data:', e);
      return null;
    }
  };

  const startPrivyFlow = async () => {
    try {
      // Build URL with hasPrivyWallet as query parameter
      const webUrl = `${cryptoBaseUrl}/createWallet`;
      console.log('webUrl in startPrivyFlow', webUrl);
      // redirectUrl pattern - InAppBrowser will match any URL starting with this
      const redirectUrl = 'orbitxpay://walletscreen'; // must match native deep link pattern

      if (await InAppBrowser.isAvailable()) {
        console.log('Opening InAppBrowser with openAuth...');

        const result = await InAppBrowser.openAuth(webUrl, redirectUrl, {
          // iOS
          dismissButtonStyle: 'cancel',
          preferredBarTintColor: '#000000',
          preferredControlTintColor: '#ffffff',
          readerMode: false,
          animated: true,
          modalPresentationStyle: 'fullScreen',
          modalTransitionStyle: 'coverVertical',
          enableBarCollapsing: false,

          // Android
          showTitle: false, // Hide title/URL bar
          toolbarColor: '#000000',
          secondaryToolbarColor: '#000000',
          navigationBarColor: '#000000',
          enableUrlBarHiding: true, // Hide URL bar on scroll
          enableDefaultShare: true,
          // IMPORTANT: let openAuth handle redirect; we don't need forceCloseOnRedirection here
          forceCloseOnRedirection: false,
        });

        console.log('InAppBrowser openAuth result:', JSON.stringify(result, null, 2));
        console.log('InAppBrowser result type:', result.type);
        console.log('InAppBrowser result URL:', result.url);

        // When web redirects to orbitxpay://walletscreen?evm={...}&solana={...}&tron={...}&userId={...}
        // OR when running locally: http://localhost:5173/redirect?url=orbitxpay%3A%2F%2Fwalletscreen...&userId=...
        if (result.type === 'success' && result.url) {
          let url = result.url as string;
          console.log('=== URL PROCESSING START ===');
          console.log('Raw URL from InAppBrowser:', url);
          console.log('URL length:', url.length);
          console.log('URL includes userId:', url.includes('userId'));
          console.log('URL includes userId=:', url.includes('userId='));

          // Check if this is a redirect page (local development)
          // Format: http://localhost:5173/redirect?url=orbitxpay%3A%2F%2Fwalletscreen%3FuserId%3D...%26evm%3D...
          if (url.includes('/redirect?url=') || url.includes('/redirect&url=') || url.includes('/redirect?url=')) {
            console.log('Detected redirect page URL');
            // Extract the encoded deep link URL from the redirect page
            const encodedDeepLink = getQueryParam(url, 'url');
            console.log('Encoded deep link from redirect page:', encodedDeepLink);
            
            if (encodedDeepLink) {
              // Decode the deep link URL
              url = decodeURIComponent(encodedDeepLink);
              console.log('Decoded deep link URL:', url);
              console.log('Decoded URL includes userId:', url.includes('userId'));
            } else {
              console.error('ERROR: Could not extract encoded deep link from redirect page URL');
            }
          }

          // Parse all URL parameters for debugging
          const allParams = parseUrlParams(url);
          console.log('All URL parameters:', JSON.stringify(allParams, null, 2));
          console.log('Parameter keys:', Object.keys(allParams));

          // METHOD 0: Try base64-encoded 'data' parameter first (NEW - most reliable for InAppBrowser)
          let walletData: any = null;
          let privyUserId: string | null = null;
          let evmWallet: any = null;
          let solanaWallet: any = null;
          let tronWallet: any = null;

          if (allParams.data) {
            console.log('🎯 Found base64 data parameter - decoding...');
            walletData = decodeBase64Data(allParams.data);
            if (walletData) {
              console.log('✅ Successfully decoded base64 wallet data:', walletData);
              privyUserId = walletData.userId || null;
              evmWallet = walletData.evm || null;
              solanaWallet = walletData.solana || null;
              tronWallet = walletData.tron || null;
              console.log('✅ Extracted userId from base64 data:', privyUserId);
              console.log('✅ Extracted wallets from base64 data');
            } else {
              console.error('❌ Failed to decode base64 data');
            }
          }

          // Extract privyUserId from the URL (try multiple methods if base64 data not available)
          // Method 1: Try query parameter 'userId'
          if (!privyUserId) {
            privyUserId = getQueryParam(url, 'userId');
            console.log('Method 1 - userId from query param:', privyUserId);
          }
          
          // Method 2: Try shorter parameter 'uid'
          if (!privyUserId) {
            privyUserId = getQueryParam(url, 'uid');
            console.log('Method 2 - uid from query param:', privyUserId);
          }
          
          // Method 3: Try parsed params object
          if (!privyUserId && allParams.userId) {
            privyUserId = allParams.userId;
            console.log('Method 3 - userId from parsed params:', privyUserId);
          }
          
          // Method 4: Try parsed params 'uid'
          if (!privyUserId && allParams.uid) {
            privyUserId = allParams.uid;
            console.log('Method 4 - uid from parsed params:', privyUserId);
          }
          
          // Method 5: Extract from URL path (orbitxpay://walletscreen/{userId}?...)
          if (!privyUserId) {
            try {
              const pathMatch = url.match(/orbitxpay:\/\/walletscreen\/([^/?]+)/);
              if (pathMatch && pathMatch[1]) {
                privyUserId = decodeURIComponent(pathMatch[1]);
                console.log('Method 5 - userId from URL path:', privyUserId);
              }
            } catch (pathError) {
              console.log('Error extracting userId from path:', pathError);
            }
          }
          
          // FALLBACK: If userId is not in query params (InAppBrowser limitation),
          // extract it from wallet JSON objects where we encoded it
          if (!privyUserId) {
            console.log('userId not found in query params, trying to extract from wallet objects...');
            console.log('Available params:', Object.keys(allParams));
            
            // Helper function to safely parse JSON from URL-encoded string
            const parseWalletObject = (encodedJson: string, walletType: string): any => {
              try {
                // The JSON is already URL-decoded by parseUrlParams, but might need another decode
                let decoded = encodedJson;
                try {
                  decoded = decodeURIComponent(encodedJson);
                } catch (e) {
                  // Already decoded, use as-is
                  decoded = encodedJson;
                }
                console.log(`${walletType} wallet string (first 100 chars):`, decoded.substring(0, 100));
                const parsed = JSON.parse(decoded);
                console.log(`${walletType} wallet parsed successfully:`, Object.keys(parsed));
                return parsed;
              } catch (parseError) {
                console.error(`Error parsing ${walletType} wallet object:`, parseError);
                console.error(`Raw ${walletType} string:`, encodedJson);
                return null;
              }
            };
            
            try {
              // Try to extract from evm wallet object
              if (allParams.evm) {
                console.log('Attempting to parse evm wallet...');
                const evmWallet = parseWalletObject(allParams.evm, 'evm');
                if (evmWallet && evmWallet.userId) {
                  privyUserId = evmWallet.userId;
                  console.log('✅ Extracted userId from evm wallet object:', privyUserId);
                } else {
                  console.log('evm wallet parsed but no userId found. Keys:', evmWallet ? Object.keys(evmWallet) : 'null');
                }
              } else {
                console.log('evm parameter not found in URL');
              }
              
              // If still not found, try solana wallet object
              if (!privyUserId && allParams.solana) {
                console.log('Attempting to parse solana wallet...');
                const solanaWallet = parseWalletObject(allParams.solana, 'solana');
                if (solanaWallet && solanaWallet.userId) {
                  privyUserId = solanaWallet.userId;
                  console.log('✅ Extracted userId from solana wallet object:', privyUserId);
                } else {
                  console.log('solana wallet parsed but no userId found. Keys:', solanaWallet ? Object.keys(solanaWallet) : 'null');
                }
              } else if (!allParams.solana) {
                console.log('solana parameter not found in URL');
              }
              
              // If still not found, try tron wallet object
              if (!privyUserId && allParams.tron) {
                console.log('Attempting to parse tron wallet...');
                const tronWallet = parseWalletObject(allParams.tron, 'tron');
                if (tronWallet && tronWallet.userId) {
                  privyUserId = tronWallet.userId;
                  console.log('✅ Extracted userId from tron wallet object:', privyUserId);
                } else {
                  console.log('tron wallet parsed but no userId found. Keys:', tronWallet ? Object.keys(tronWallet) : 'null');
                }
              } else if (!allParams.tron) {
                console.log('tron parameter not found in URL');
              }
            } catch (parseError) {
              console.error('Error parsing wallet objects to extract userId:', parseError);
            }
          }
          
          console.log('=== EXTRACTION SUMMARY ===');
          console.log('Final extracted privyUserId:', privyUserId);
          console.log('URL received:', url);
          console.log('All available parameters:', Object.keys(allParams));
          console.log('=== URL PROCESSING END ===');

          // If we have walletData from base64, use it; otherwise extract from URL params
          if (!walletData) {
            // Extract wallet objects from URL params if base64 data not available
            try {
              if (allParams.evm) {
                evmWallet = JSON.parse(decodeURIComponent(allParams.evm));
              }
              if (allParams.solana) {
                solanaWallet = JSON.parse(decodeURIComponent(allParams.solana));
              }
              if (allParams.tron) {
                tronWallet = JSON.parse(decodeURIComponent(allParams.tron));
              }
            } catch (e) {
              console.error('Error parsing wallet objects from URL params:', e);
            }
          }

          if (!privyUserId) {
            console.error('❌ ERROR: userId not found using ANY method!');
            console.error('Full URL was:', url);
            console.error('All parameters:', JSON.stringify(allParams, null, 2));
            console.error('Tried methods: base64 data, query param userId, query param uid, parsed params, URL path, wallet objects');
            console.error('This should not happen - userId is encoded in multiple places');
          } else {
            console.log('✅ SUCCESS: Successfully extracted userId:', privyUserId);
            console.log('✅ userId length:', privyUserId.length);
          }

          // Pass the complete data to Wallet screen
          // If we have walletData from base64, use it; otherwise use extracted values
          navigation.navigate('walletscreen', {
            url: url,
            userId: privyUserId || null,
            // Include wallet data if available from base64
            ...(walletData ? {
              walletData: walletData,
              evm: walletData.evm,
              solana: walletData.solana,
              tron: walletData.tron,
            } : {
              // Fallback to individual wallet objects
              evm: evmWallet,
              solana: solanaWallet,
              tron: tronWallet,
            }),
          });
          return;
        }

        // User cancelled / closed browser before redirect
        console.log('InAppBrowser closed without success:', result);
        navigation.navigate('walletscreen'); // no params fallback
      } else {
        // Fallback: open in external browser + try deep link via Linking
        console.log('InAppBrowser not available, using Linking.openURL');
        await Linking.openURL(webUrl);
        // You could also keep a Linking listener here if you want.
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error opening InAppBrowser with openAuth:', error);
      navigation.goBack();
    }
  };

  useEffect(() => {
    // Start the flow as soon as this screen mounts
    startPrivyFlow();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PrivyWallet;

