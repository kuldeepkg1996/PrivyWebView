/**
 * Utility functions for chain/network name mapping
 */

export const getChainName = (id: string): string => {
  const chains: Record<string, string> = {
    '1': 'Ethereum Mainnet',
    '56': 'BSC',
    '137': 'Polygon',
    '42161': 'Arbitrum',
    '10': 'Optimism',
    '8453': 'Base',
    '1301': 'Unichain Sepolia',
    '84532': 'Base Sepolia',
  };
  return chains[id] || `Chain ${id}`;
};

export const getSolanaNetworkName = (chainId: string): string => {
  const networks: Record<string, string> = {
    devnet: 'Solana Devnet',
    testnet: 'Solana Testnet',
    mainnet: 'Solana Mainnet',
    'mainnet-beta': 'Solana Mainnet Beta',
  };
  return networks[chainId.toLowerCase()] || chainId;
};

export const getSolanaNetworkConfig = (chainId: string) => {
  const configs: Record<string, { name: string; rpcUrl: string; explorer: string }> = {
    'mainnet-beta': {
      name: 'Solana Mainnet',
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      explorer: 'mainnet-beta',
    },
    mainnet: {
      name: 'Solana Mainnet',
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      explorer: 'mainnet-beta',
    },
    devnet: {
      name: 'Solana Devnet',
      rpcUrl: 'https://api.devnet.solana.com',
      explorer: 'devnet',
    },
    testnet: {
      name: 'Solana Testnet',
      rpcUrl: 'https://api.testnet.solana.com',
      explorer: 'testnet',
    },
  };
  return configs[chainId.toLowerCase()] || configs.devnet;
};

