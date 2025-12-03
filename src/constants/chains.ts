/**
 * Chain configurations
 */
import { mainnet, base, optimism, polygon, arbitrum, bsc, baseSepolia } from 'viem/chains';

export const unichain = {
  id: 1301,
  name: 'Unichain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.unichain.org'] },
    public: { http: ['https://sepolia.unichain.org'] },
  },
  blockExplorers: {
    default: { name: 'Uniscan', url: 'https://sepolia.uniscan.xyz' },
  },
};

export const supportedChains = [
  mainnet,
  base,
  optimism,
  polygon,
  arbitrum,
  bsc,
  unichain,
  baseSepolia,
];

