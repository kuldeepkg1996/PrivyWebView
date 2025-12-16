import type { User } from '@privy-io/react-auth';
import { sendWalletsToNative } from './nativeCommunication';

/**
 * Interface for wallet creation functions
 */
export interface WalletCreators {
  createEvmWallet: () => Promise<any>;
  createSolanaWallet: (options?: { createAdditional?: boolean }) => Promise<any>;
  createOtherWallet: (options: any) => Promise<any>;
}

/**
 * Interface for current wallet state
 * Using any[] for wallets to support both EVM and Solana wallet types
 */
export interface WalletState {
  evmWallets: any[];
  solanaWallets: any[];
  user: User | null;
}

/**
 * Result of wallet creation/verification
 */
export interface WalletResult {
  evmAddress: string;
  solanaAddress: string;
  tronAddress: string;
  evmWalletId: string;
  solanaWalletId: string;
  tronWalletId: string;
  success: boolean;
  error?: string;
}

/**
 * Ensures all wallets (EVM, Solana, Tron) exist for the authenticated user.
 * Creates missing wallets and returns all wallet addresses.
 * 
 * @param walletState - Current state of wallets and user
 * @param walletCreators - Functions to create wallets
 * @param sendToNative - Whether to send addresses to native app (default: true)
 * @returns Promise with wallet addresses and success status
 */
export async function ensureAllWallets(
  walletState: WalletState,
  walletCreators: WalletCreators,
  sendToNative: boolean = true
): Promise<WalletResult> {
  const { evmWallets, solanaWallets, user } = walletState;
  const { createEvmWallet, createSolanaWallet, createOtherWallet } = walletCreators;

  try {
    let evmWallet = evmWallets[0];
    let solWallet = solanaWallets[0];
    let tronWallet = user?.linkedAccounts?.filter(
      (acc: any) => acc.type === 'wallet' && acc.chainType === 'tron'
    )?.[0] || null;

    // Create EVM wallet if missing
    if (!evmWallet) {
      const createdEvm = await createEvmWallet();
      evmWallet = (createdEvm as any)?.wallet || createdEvm || evmWallets[0];
    }

    // Create Solana wallet if missing
    if (!solWallet) {
      const createdSol = await createSolanaWallet({ createAdditional: false });
      solWallet = (createdSol as any)?.wallet || createdSol || solanaWallets[0];
    }

    // Create Tron wallet if missing (optional - won't fail if creation fails)
    if (!tronWallet) {
      try {
        const createdTron = await createOtherWallet({ chainType: 'tron' });
        tronWallet = (createdTron as any)?.wallet || null;
      } catch (err) {
        // Tron wallet creation is optional - continue without it
      }
    }

  

    // Extract addresses and IDs
    const evmAddress = evmWallet?.address || '';
    const solanaAddress = solWallet?.address || '';
    const tronAddress = (tronWallet as any)?.address || '';
    
    // Extract wallet IDs (Privy wallets have walletId property)
    const evmWalletId = evmWallet?.walletId || evmWallet?.id || '';
    const solanaWalletId = solWallet?.walletId || solWallet?.id || '';
    const tronWalletId = (tronWallet as any)?.walletId || (tronWallet as any)?.id || '';

    // Validate at least one wallet exists
    if (!evmAddress && !solanaAddress && !tronAddress) {
      throw new Error('No wallet addresses found even after creation');
    }

    // Send to native app if requested
    if (sendToNative && (evmAddress || solanaAddress || tronAddress)) {
      sendWalletsToNative(evmAddress, solanaAddress, tronAddress, evmWalletId, solanaWalletId, tronWalletId);
    }

    return {
      evmAddress,
      solanaAddress,
      tronAddress,
      evmWalletId,
      solanaWalletId,
      tronWalletId,
      success: true,
    };
  } catch (err: any) {
    return {
      evmAddress: '',
      solanaAddress: '',
      tronAddress: '',
      evmWalletId: '',
      solanaWalletId: '',
      tronWalletId: '',
      success: false,
      error: err?.message || 'Failed to create wallets',
    };
  }
}

/**
 * Custom hook-like function to manage wallet creation state
 * Returns a function that can be called to ensure wallets exist
 */
export function createWalletEnsurer(
  walletState: WalletState,
  walletCreators: WalletCreators,
  options: {
    onStart?: () => void;
    onSuccess?: (result: WalletResult) => void;
    onError?: (error: string) => void;
    onComplete?: () => void;
    sendToNative?: boolean;
  } = {}
) {
  const {
    onStart,
    onSuccess,
    onError,
    onComplete,
    sendToNative = true,
  } = options;

  return async (): Promise<WalletResult> => {
    if (onStart) onStart();

    try {
      const result = await ensureAllWallets(
        walletState,
        walletCreators,
        sendToNative
      );

      if (result.success && onSuccess) {
        onSuccess(result);
      } else if (!result.success && onError && result.error) {
        onError(result.error);
      }

      return result;
    } finally {
      if (onComplete) onComplete();
    }
  };
}

/**
 * React hook for managing wallet creation across all chains
 * 
 * @example
 * ```tsx
 * const { ensureWallets, isCreating, error } = useWalletManager({
 *   evmWallets,
 *   solanaWallets,
 *   user,
 *   createEvmWallet,
 *   createSolanaWallet,
 *   createOtherWallet,
 * });
 * 
 * // In useEffect or handler
 * await ensureWallets();
 * ```
 */
export function useWalletEnsurer(
  walletState: WalletState,
  walletCreators: WalletCreators
) {
  return {
    /**
     * Ensures all wallets exist and sends addresses to native app
     */
    ensureWallets: async (sendToNative: boolean = true): Promise<WalletResult> => {
      return ensureAllWallets(walletState, walletCreators, sendToNative);
    },
  };
}
