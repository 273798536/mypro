export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'frozen' | 'processed' | 'failed';

export type BatchStatus = 'active' | 'completed' | 'suspended' | 'reconciled';

export type HistoryAction = 
  | 'create' 
  | 'status_update' 
  | 'amount_correction' 
  | 'note_add' 
  | 'duplicate_mark' 
  | 'cross_batch_freeze' 
  | 'overdraft_warning'
  | 'unfreeze'
  | 'export';

export interface RefundOrder {
  id: string;
  merchantOriginalName: string;
  amount: number;
  status: RefundStatus;
  batchId: string;
  reservePoolId: string;
  sourceSystem: string;
  originalOrderNo: string;
  customerName: string;
  customerPhone: string;
  refundReason: string;
  applyTime: string;
  reviewTime?: string;
  reviewer?: string;
  duplicateRefundId?: string;
  isDuplicate: boolean;
  isOverdraft: boolean;
  isCrossBatch: boolean;
  duplicateExplanation?: string;
  crossBatchFreezeNote?: string;
  overdraftNote?: string;
  originalFields: Record<string, any>;
}

export interface ReservePool {
  id: string;
  originalName: string;
  merchantName: string;
  merchantId: string;
  totalBalance: number;
  frozenAmount: number;
  availableBalance: number;
  overdraftThreshold: number;
  currency: string;
  lastUpdated: string;
}

export interface Batch {
  id: string;
  originalName: string;
  status: BatchStatus;
  merchantId: string;
  activityName: string;
  startTime: string;
  endTime: string;
  totalRefundAmount: number;
  totalFrozenAmount: number;
}

export interface CustomerNote {
  id: string;
  refundOrderId: string;
  operatorOriginalName: string;
  content: string;
  createTime: string;
  isSystemGenerated: boolean;
  originalSource: string;
}

export interface HistoryRecord {
  id: string;
  refundOrderId: string;
  operatorOriginalName: string;
  action: HistoryAction;
  oldValues: Record<string, any>;
  newValues: Record<string, any>;
  reason: string;
  timestamp: string;
  ip: string;
}

export interface AppState {
  refundOrders: RefundOrder[];
  reservePools: ReservePool[];
  batches: Batch[];
  customerNotes: CustomerNote[];
  historyRecords: HistoryRecord[];
  currentUser: {
    id: string;
    originalName: string;
    role: 'operation' | 'customer_service' | 'settlement';
  };
}

export interface AnomalyInfo {
  type: 'overdraft' | 'duplicate' | 'cross_batch';
  severity: 'warning' | 'danger';
  message: string;
  prompt: string;
}
