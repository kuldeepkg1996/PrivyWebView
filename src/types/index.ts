// Global type definitions

export interface ReactNativeWebView {
  postMessage: (message: string) => void;
}

declare global {
  interface Window {
    ReactNativeWebView?: ReactNativeWebView;
  }
}

export interface TxRequest {
  to?: string;
  data?: `0x${string}`;
  value?: bigint;
  chainId: number;
  gasPrice?: bigint;
}

export interface ConfirmModalProps {
  recipientAddress: string;
  networkShort: string;
  amountReceive: string;
  displayFee: string;
  displayTokenSymbol: string;
  loading: boolean;
  switchingNetwork: boolean;
  amount: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export interface SuccessModalProps {
  txHash: string;
  onGoHome: () => void;
}

