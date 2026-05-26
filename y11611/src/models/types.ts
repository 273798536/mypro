export type Chain = 'ethereum' | 'bsc' | 'polygon' | 'arbitrum' | 'optimism' | 'solana' | 'base';

export type TokenSymbol = 'ETH' | 'BNB' | 'MATIC' | 'USDC' | 'USDT' | 'SOL' | 'ARB' | 'OP';

export type TransactionType = 
  | 'transfer' 
  | 'swap' 
  | 'bridge' 
  | 'gas' 
  | 'exchange_withdraw' 
  | 'exchange_deposit'
  | 'income'
  | 'expense'
  | 'internal_transfer';

export type TransactionSource = 'wallet' | 'exchange' | 'manual' | 'bridge';

export type WarningType = 
  | 'bridge_duplicate' 
  | 'price_missing' 
  | 'internal_transfer_missed'
  | 'gas_unclassified'
  | 'address_unknown';

export interface WalletAddress {
  id: string;
  address: string;
  chain: Chain;
  ownerId: string;
  label: string;
  isExchange: boolean;
  exchangeName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceSnapshot {
  id: string;
  symbol: TokenSymbol;
  timestamp: Date;
  priceUsd: number;
  source: string;
  confidence: number;
}

export interface Transaction {
  id: string;
  txHash: string;
  chain: Chain;
  fromAddress: string;
  toAddress: string;
  tokenSymbol: TokenSymbol;
  amount: number;
  timestamp: Date;
  type: TransactionType;
  source: TransactionSource;
  gasFee: number;
  gasToken: TokenSymbol;
  priceUsdAtTime?: number;
  priceSource?: string;
  isInternal: boolean;
  isBridge: boolean;
  bridgePairId?: string;
  warnings: WarningType[];
  ownerId?: string;
  relatedTxIds: string[];
  metadata: Record<string, any>;
}

export interface AuditLog {
  id: string;
  entityType: 'transaction' | 'address' | 'price' | 'tax_record';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'classify' | 'merge' | 'ignore';
  field?: string;
  oldValue?: any;
  newValue?: any;
  reason: string;
  operator: string;
  timestamp: Date;
}

export interface TaxRecord {
  id: string;
  transactionId: string;
  ownerId: string;
  taxYear: number;
  category: 'income' | 'capital_gain' | 'capital_loss' | 'expense' | 'gas_fee';
  amountUsd: number;
  costBasisUsd?: number;
  proceedsUsd?: number;
  gainLossUsd?: number;
  holdingPeriod?: 'short_term' | 'long_term';
  isFinalized: boolean;
  notes: string;
}

export interface Owner {
  id: string;
  name: string;
  email?: string;
  addresses: string[];
  createdAt: Date;
}

export interface ProcessResult {
  processed: number;
  warnings: Array<{
    txId: string;
    type: WarningType;
    message: string;
  }>;
  errors: Array<{
    txId?: string;
    message: string;
  }>;
  internalTransfersFound: number;
  bridgesFound: number;
  pricesFilled: number;
  pricesMissing: number;
}
