
export interface Store {
  storeId: string;
  storeName: string;
  status: 'active' | 'closed';
  closedAt?: Date;
}

export interface BalanceLayer {
  cardId: string;
  cardNumber: string;
  memberName: string;
  principal: number;
  bonus: number;
  frozen: number;
  lastUpdatedSource: string;
  updatedAt: Date;
}

export type TransactionType = 'recharge' | 'consume' | 'refund';
export type TransactionStatus = 'pending' | 'settled' | 'exception';
export type ExceptionType = 'store_closed' | 'bonus_refund' | 'over_consume';

export interface Transaction {
  txId: string;
  cardId: string;
  cardNumber: string;
  memberName: string;
  rechargeStoreId: string;
  consumeStoreId: string;
  totalAmount: number;
  principalUsed: number;
  bonusUsed: number;
  type: TransactionType;
  status: TransactionStatus;
  exceptionType?: ExceptionType;
  exceptionNote?: string;
  source: string;
  createdAt: Date;
}

export type SettlementStatus = 'pending' | 'completed' | 'exception';

export interface StoreSettlement {
  settlementId: string;
  txId: string;
  fromStoreId: string;
  fromStoreName: string;
  toStoreId: string;
  toStoreName: string;
  principalAmount: number;
  bonusAmount: number;
  bonusCostRate: number;
  totalSettlement: number;
  status: SettlementStatus;
  traceSource: string;
  createdAt: Date;
}

export interface AuditLog {
  logId: string;
  txId?: string;
  operator: string;
  action: string;
  fieldName: string;
  beforeValue: string;
  afterValue: string;
  source: string;
  createdAt: Date;
}

export type TabType = 'workbench' | 'audit' | 'sample';
