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
      const regex = new RegExp(`[?&]${key}=([^&]+)`);
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

  const startPrivyFlow = async () => {
    try {
      // Build URL with hasPrivyWallet as query parameter
      const webUrl = `${cryptoBaseUrl}/createWallet`;
      console.log('webUrl in startPrivyFlow', webUrl);
      const redirectUrl = 'orbitxpay://walletscreen'; // must match native deep link

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

        console.log('InAppBrowser openAuth result:', result);

        // When web redirects to orbitxpay://walletscreen?userId={...}&evm={...}&solana={...}&tron={...}
        // OR when running locally: http://localhost:5173/redirect?url=orbitxpay%3A%2F%2Fwalletscreen...&userId=...
        if (result.type === 'success' && result.url) {
          let url = result.url as string;
          console.log('Redirect URL from openAuth:', url);

          // Check if this is a redirect page (local development)
          // Format: http://localhost:5173/redirect?url=orbitxpay%3A%2F%2Fwalletscreen%3FuserId%3D...%26evm%3D...
          if (url.includes('/redirect?url=') || url.includes('/redirect&url=')) {
            // Extract the encoded deep link URL from the redirect page
            const encodedDeepLink = getQueryParam(url, 'url');
            if (encodedDeepLink) {
              // Decode the deep link URL
              url = decodeURIComponent(encodedDeepLink);
              console.log('Decoded deep link URL:', url);
            }

            // Extract privyUserId from the decoded deep link URL (userId is inside the deep link, not the redirect page URL)
            const privyUserId = getQueryParam(url, 'userId');
            console.log('Extracted privyUserId from decoded deep link URL:', privyUserId);

            // Pass the decoded deep link URL and privyUserId to Wallet screen
            navigation.navigate('walletscreen', {
              url: url,
              userId: privyUserId,
            });
            return;
          }

          // Direct deep link (production)
          // Extract privyUserId from deep link URL if present
          const privyUserId = getQueryParam(url, 'userId');
          console.log('Extracted privyUserId from deep link URL:', privyUserId);

          // Pass the full URL and privyUserId to Wallet screen so it can parse JSON-encoded parameters
          navigation.navigate('walletscreen', {
            url: url,
            userId: privyUserId,
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
