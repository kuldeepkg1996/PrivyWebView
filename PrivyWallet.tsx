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

          // Extract privyUserId from the URL (try both methods)
          let privyUserId = getQueryParam(url, 'userId');
          if (!privyUserId && allParams.userId) {
            privyUserId = allParams.userId;
            console.log('Extracted userId from parsed params:', privyUserId);
          }
          
          // FALLBACK: If userId is not in query params (InAppBrowser limitation),
          // extract it from wallet JSON objects where we encoded it
          if (!privyUserId) {
            console.log('userId not found in query params, trying to extract from wallet objects...');
            try {
              // Try to extract from evm wallet object
              if (allParams.evm) {
                const evmWallet = JSON.parse(allParams.evm);
                if (evmWallet.userId) {
                  privyUserId = evmWallet.userId;
                  console.log('Extracted userId from evm wallet object:', privyUserId);
                }
              }
              
              // If still not found, try solana wallet object
              if (!privyUserId && allParams.solana) {
                const solanaWallet = JSON.parse(allParams.solana);
                if (solanaWallet.userId) {
                  privyUserId = solanaWallet.userId;
                  console.log('Extracted userId from solana wallet object:', privyUserId);
                }
              }
              
              // If still not found, try tron wallet object
              if (!privyUserId && allParams.tron) {
                const tronWallet = JSON.parse(allParams.tron);
                if (tronWallet.userId) {
                  privyUserId = tronWallet.userId;
                  console.log('Extracted userId from tron wallet object:', privyUserId);
                }
              }
            } catch (parseError) {
              console.error('Error parsing wallet objects to extract userId:', parseError);
            }
          }
          
          console.log('Final extracted privyUserId:', privyUserId);
          console.log('=== URL PROCESSING END ===');

          if (!privyUserId) {
            console.error('ERROR: userId not found in URL or wallet objects!');
            console.error('Full URL was:', url);
            console.error('All parameters:', allParams);
            console.error('This should not happen - userId is encoded in wallet objects');
          } else {
            console.log('✅ Successfully extracted userId:', privyUserId);
          }

          // Pass the full URL and privyUserId to Wallet screen so it can parse JSON-encoded parameters
          navigation.navigate('walletscreen', {
            url: url,
            userId: privyUserId || null,
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

