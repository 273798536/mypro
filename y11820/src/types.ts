export interface WalletAddress {
  id: number;
  address: string;
  chain: string;
  label: string;
  group_id: string | null;
  created_at: string;
}

export interface ChainTransfer {
  id: number;
  tx_hash: string;
  chain: string;
  from_address: string;
  to_address: string;
  token_symbol: string;
  amount: string;
  block_timestamp: string;
  is_internal: number;
  created_at: string;
}

export interface ExchangeBill {
  id: number;
  exchange_name: string;
  asset_symbol: string;
  amount: string;
  bill_type: string;
  bill_date: string;
  reference_id: string | null;
  created_at: string;
}

export interface PriceSnapshot {
  id: number;
  token_symbol: string;
  price_usd: string;
  snapshot_date: string;
  source: string;
  created_at: string;
}

export interface GasFee {
  id: number;
  chain: string;
  tx_hash: string;
  gas_used: string;
  gas_price_gwei: string;
  fee_native: string;
  fee_usd: string | null;
  block_timestamp: string;
  created_at: string;
}

export interface MonthlyReport {
  id: number;
  report_month: string;
  total_assets_usd: string;
  total_gas_usd: string;
  total_income_usd: string;
  anomaly_flags: string;
  branch_type: string | null;
  summary: string;
  wallet_snapshot_hash: string | null;
  created_at: string;
}

export interface AnomalyRecord {
  id: number;
  report_id: number;
  anomaly_type: string;
  description: string;
  related_ids: string;
  severity: string;
  resolved: number;
  created_at: string;
}

export interface WalletConclusionChange {
  id: number;
  wallet_id: number;
  field_changed: string;
  old_value: string;
  new_value: string;
  reason: string;
  trigger_source: string;
  created_at: string;
}

export type AnomalyType = 'internal_transfer_miscount' | 'price_gap' | 'cross_chain_duplicate';
