export interface MemberContract {
  id: string;
  memberName: string;
  memberPhone: string;
  contractDate: string;
  totalAmount: number;
  storeId: string;
  storeName: string;
  source: 'contract' | 'transfer';
  createdAt: string;
}

export interface SalesAssignment {
  id: string;
  contractId: string;
  salesId: string;
  salesName: string;
  storeId: string;
  effectiveDate: string;
  version: number;
  isActive: boolean;
  changeReason?: string;
  createdBy: string;
  createdAt: string;
}

export interface TransferRecord {
  id: string;
  contractId: string;
  fromStoreId: string;
  fromStoreName: string;
  toStoreId: string;
  toStoreName: string;
  transferDate: string;
  transferFee: number;
  createdBy: string;
  createdAt: string;
}

export interface RefundRecord {
  id: string;
  contractId: string;
  refundAmount: number;
  refundDate: string;
  refundMonth: string;
  reason: string;
  isRolledBack: boolean;
  createdBy: string;
  createdAt: string;
}

export interface PTPackage {
  id: string;
  contractId: string;
  packageName: string;
  totalSessions: number;
  usedSessions: number;
  totalAmount: number;
  assignedSales: string[];
  splitRatio: Record<string, number>;
  isSplit: boolean;
  createdBy: string;
  createdAt: string;
}

export type WarningType = 'sales_change' | 'cross_month_refund' | 'pt_split' | 'transfer' | 'invalid_data';

export interface Warning {
  type: WarningType;
  message: string;
  severity: 'low' | 'medium' | 'high';
  details: Record<string, any>;
}

export type RebateStatus = 'normal' | 'warning' | 'disputed' | 'confirmed';

export interface RebateCalculation {
  id: string;
  contractId: string;
  salesId: string;
  salesName: string;
  storeId: string;
  storeName: string;
  baseAmount: number;
  rebateRate: number;
  rebateAmount: number;
  adjustmentAmount: number;
  finalAmount: number;
  status: RebateStatus;
  warnings: Warning[];
  calculationVersion: number;
  lastCalculatedAt: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

export type AuditAction = 'create' | 'update' | 'delete' | 'recalculate' | 'confirm' | 'rollback';

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  beforeValue: any;
  afterValue: any;
  operatedBy: string;
  operatedAt: string;
  remark?: string;
}

export interface Filters {
  storeId?: string;
  startDate?: string;
  endDate?: string;
  salesId?: string;
  status?: RebateStatus;
}

export interface Store {
  id: string;
  name: string;
}

export interface SalesPerson {
  id: string;
  name: string;
  storeId: string;
}
