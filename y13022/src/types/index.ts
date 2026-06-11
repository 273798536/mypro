export type ReconciliationStatus = 'confirmed' | 'pending' | 'returned';

export const STATUS_LABEL: Record<ReconciliationStatus, string> = {
  confirmed: '已确认',
  pending: '待补件',
  returned: '退回',
};

export interface Reconciliation {
  id: string;
  contractCode: string;
  tradeDate: string;
  spotPrice: number;
  futuresPrice: number;
  basis: number;
  taxAmount: number | null;
  exchangeRate: number | null;
  rawMixedField: string;
  amount: number;
  bankSerial: string;
  status: ReconciliationStatus;
  isPaymentSplit: boolean;
  paymentGroupId: string | null;
  sourceBatch: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatusLog {
  id: string;
  reconciliationId: string;
  fromStatus: ReconciliationStatus | null;
  toStatus: ReconciliationStatus;
  reason: string;
  operator: string;
  createdAt: string;
}

export interface Note {
  id: string;
  reconciliationId: string;
  content: string;
  operator: string;
  createdAt: string;
}

export interface Screenshot {
  id: string;
  reconciliationId: string;
  imageData: string;
  description: string;
  filterSnapshot: Record<string, unknown>;
  operator: string;
  createdAt: string;
}

export interface FilterState {
  status: ReconciliationStatus[];
  dateFrom: string | null;
  dateTo: string | null;
  contractCode: string;
  isPaymentSplit: boolean | null;
}

export type TimelineItem =
  | {
      kind: 'status';
      id: string;
      createdAt: string;
      operator: string;
      fromStatus: ReconciliationStatus | null;
      toStatus: ReconciliationStatus;
      reason: string;
    }
  | {
      kind: 'note';
      id: string;
      createdAt: string;
      operator: string;
      content: string;
    }
  | {
      kind: 'screenshot';
      id: string;
      createdAt: string;
      operator: string;
      description: string;
      imageData: string;
      filterSnapshot: Record<string, unknown>;
    }
  | {
      kind: 'created';
      id: string;
      createdAt: string;
      operator: string;
      sourceBatch: string;
    };
