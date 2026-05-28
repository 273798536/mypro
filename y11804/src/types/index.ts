export interface BondPosition {
  bondCode: string;
  bondName: string;
  faceValue: number;
  positionAmount: number;
  account: string;
  importDate: string;
  importOrder: number;
}

export interface CouponPlan {
  planId: string;
  bondCode: string;
  bondName: string;
  paymentDate: string;
  couponRate: number;
  expectedAmount: number;
  daysAccrued: number;
  isHolidayAdjusted: boolean;
  originalPaymentDate?: string;
  importDate: string;
  status: 'pending' | 'verified' | 'exception';
}

export interface CustodyReceipt {
  receiptId: string;
  planId?: string;
  bondCode?: string;
  actualDate: string;
  actualAmount: number;
  bankReference: string;
  bankName: string;
  importDate: string;
  importOrder: number;
}

export type VerificationStatus = 'full' | 'partial' | 'none' | 'adjusted' | 'position_changed' | 'pending';

export interface VerificationResult {
  resultId: string;
  planId: string;
  status: VerificationStatus;
  statusLabel: string;
  expectedAmount: number;
  actualAmount: number;
  diffAmount: number;
  diffRate: number;
  reason: string;
  reasonDetail: string;
  isReviewed: boolean;
  reviewer?: string;
  reviewDate?: string;
  reviewNote?: string;
}

export interface DashboardStats {
  totalPlans: number;
  totalAmount: number;
  receivedCount: number;
  receivedAmount: number;
  pendingCount: number;
  pendingAmount: number;
  exceptionCount: number;
  exceptionAmount: number;
  arrivalRate: number;
}

export type ImportType = 'position' | 'coupon' | 'receipt';

export interface ImportRecord {
  id: string;
  type: ImportType;
  fileName: string;
  importDate: string;
  recordCount: number;
  importOrder: number;
}

export interface TimelineEvent {
  planId: string;
  bondCode: string;
  bondName: string;
  paymentDate: string;
  expectedAmount: number;
  status: VerificationStatus;
  statusLabel: string;
  hasReceipt: boolean;
}

export const STATUS_COLORS: Record<VerificationStatus, string> = {
  full: 'bg-emerald-500',
  partial: 'bg-amber-500',
  none: 'bg-red-500',
  adjusted: 'bg-orange-500',
  position_changed: 'bg-purple-500',
  pending: 'bg-gray-400',
};

export const STATUS_LABELS: Record<VerificationStatus, string> = {
  full: '全额到账',
  partial: '部分到账',
  none: '未到账',
  adjusted: '付息日顺延',
  position_changed: '持仓变更',
  pending: '待核验',
};

export const STATUS_BG_COLORS: Record<VerificationStatus, string> = {
  full: 'bg-emerald-50 border-emerald-200',
  partial: 'bg-amber-50 border-amber-200',
  none: 'bg-red-50 border-red-200',
  adjusted: 'bg-orange-50 border-orange-200',
  position_changed: 'bg-purple-50 border-purple-200',
  pending: 'bg-gray-50 border-gray-200',
};

export const STATUS_TEXT_COLORS: Record<VerificationStatus, string> = {
  full: 'text-emerald-700',
  partial: 'text-amber-700',
  none: 'text-red-700',
  adjusted: 'text-orange-700',
  position_changed: 'text-purple-700',
  pending: 'text-gray-700',
};
