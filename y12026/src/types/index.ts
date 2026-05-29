export interface User {
  id: string;
  username: string;
  name: string;
  role: 'finance' | 'admin';
  phone?: string;
}

export interface PlateBinding {
  id: string;
  plateNumber: string;
  ownerId: string;
  ownerName: string;
  bindingDate: string;
  unbindingDate?: string;
  reason?: string;
}

export interface LicensePlate {
  id: string;
  plateNumber: string;
  ownerId: string;
  ownerName: string;
  building: string;
  roomNumber: string;
  phone: string;
  status: 'active' | 'inactive' | 'transferred';
  bindingHistory: PlateBinding[];
  createdAt: string;
  updatedAt: string;
  remarks?: string;
}

export interface MonthlyCard {
  id: string;
  plateId: string;
  plateNumber: string;
  cardType: 'standard' | 'vip' | 'employee';
  monthlyFee: number;
  effectiveDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'suspended';
  balance: number;
  tempParkingDeduction: number;
  createdAt: string;
  updatedAt: string;
}

export interface TempParkingRecord {
  id: string;
  plateNumber: string;
  entryTime: string;
  exitTime: string;
  duration: number;
  feeAmount: number;
  deductionAmount: number;
  paymentMethod: string;
  isDeducted: boolean;
  source: 'system' | 'manual';
  createdAt: string;
  remarks?: string;
}

export interface Discount {
  id: string;
  ownerId: string;
  type: 'percentage' | 'fixed' | 'freeMonths';
  value: number;
  name: string;
  effectiveDate: string;
  expiryDate: string;
  isActive: boolean;
  maxUsage: number;
  usedCount: number;
  createdAt: string;
  remarks?: string;
}

export interface RenewalRecord {
  id: string;
  plateId: string;
  plateNumber: string;
  cardId: string;
  renewalMonths: number;
  baseFee: number;
  tempParkingDeduction: number;
  discountAmount: number;
  totalAmount: number;
  appliedDiscountIds: string[];
  status: 'pending' | 'reviewed' | 'confirmed' | 'cancelled';
  reviewStatus: 'normal' | 'warning' | 'error';
  reviewer?: string;
  reviewedAt?: string;
  createdAt: string;
  remarks?: string;
  traceCode: string;
  ownerName: string;
  building: string;
  roomNumber: string;
}

export type BadRowErrorType = 'emptyRow' | 'missingColumn' | 'invalidFormat' | 'duplicate' | 'unknown';
export type SourceType = 'licensePlate' | 'tempParking' | 'discount' | 'refund';

export interface BadRow {
  id: string;
  importSessionId: string;
  sourceType: SourceType;
  rowNumber: number;
  rawData: string;
  errorType: BadRowErrorType;
  errorMessage: string;
  createdAt: string;
}

export interface ImportSession {
  id: string;
  sourceType: SourceType;
  fileName: string;
  totalRows: number;
  successRows: number;
  badRows: number;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
  createdBy: string;
}

export interface ExportRecord {
  id: string;
  exportType: 'renewal' | 'deduction' | 'discount' | 'full';
  format: 'xlsx' | 'csv' | 'pdf';
  recordCount: number;
  fileSize: number;
  createdAt: string;
  createdBy: string;
  traceCode: string;
}

export interface FeeCalculationResult {
  baseFee: number;
  tempParkingDeduction: number;
  discountAmount: number;
  totalAmount: number;
  appliedDiscounts: Discount[];
  tempParkingRecords: TempParkingRecord[];
  breakdown: {
    description: string;
    amount: number;
    type: 'base' | 'deduction' | 'discount';
  }[];
}

export interface FilterConditions {
  plateNumber?: string;
  ownerName?: string;
  building?: string;
  status?: RenewalRecord['status'][];
  reviewStatus?: RenewalRecord['reviewStatus'][];
  hasTempParkingDeduction?: boolean;
  hasDiscount?: boolean;
  discountExpired?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface TraceData {
  renewalRecord: RenewalRecord;
  monthlyCard: MonthlyCard;
  licensePlate: LicensePlate;
  tempParkingRecords: TempParkingRecord[];
  appliedDiscounts: Discount[];
  bindingHistory: PlateBinding[];
}

export type TabType = 'cardStatus' | 'feeBreakdown' | 'discountAudit';
