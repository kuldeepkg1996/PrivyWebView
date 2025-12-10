import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PrivyProvider } from '@privy-io/react-auth'
import './styles/index.css'
import App from './pages/App'
import SignTransaction from './pages/SignTransaction'
import SolanaSignTransaction from './pages/SolanaSignTransaction'
import EvmSignMessage from './pages/EvmSignMessage'
import SolanaSignMessage from './pages/SolanaSignMessage'
import TronSignMessage from './pages/TronSignMessage'
import TronSignTransaction from './pages/TronSignTransaction'
import EvmSignData from './pages/EvmSignData'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'
import { supportedChains } from './constants/chains'
import { Buffer } from 'buffer';

(window as any).Buffer = Buffer;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Check for required environment variable
const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;
if (!privyAppId) {
  console.error(
    '❌ VITE_PRIVY_APP_ID is not set!\n' +
    'Please create a .env file in the root directory with:\n' +
    'VITE_PRIVY_APP_ID=your_privy_app_id_here\n\n' +
    'Get your Privy App ID from: https://dashboard.privy.io/'
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <PrivyProvider
      appId={privyAppId || ''}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#6366f1',
        },
        loginMethods: ['passkey', 'email'],
        supportedChains: supportedChains,

        // ✅ Enable embedded wallets for BOTH Ethereum and Solana
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets', // or 'all-users'
          },
          solana: {
            createOnLogin: 'users-without-wallets', // make sure Solana wallet exists for each user
          },
          
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/signTransaction" element={<SignTransaction />} />
          <Route path="/evm/signMessage" element={<EvmSignMessage />} />
          <Route path="/solana/signTransaction" element={<SolanaSignTransaction />} />
          <Route path="/solana/signMessage" element={<SolanaSignMessage />} />
          <Route path="/tron/signMessage" element={<TronSignMessage />} />
          <Route path="/tron/signTransaction" element={<TronSignTransaction />} />
          <Route path="/evm/signdata" element={<EvmSignData />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </PrivyProvider>
  </StrictMode>
);
