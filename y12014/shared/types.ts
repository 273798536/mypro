export type WarningType = 'quality_downgrade' | 'duplicate_receipt' | 'price_gap' | 'normal';
export type WarningLevel = 'high' | 'medium' | 'low';
export type WarningStatus = 'pending' | 'reviewing' | 'confirmed' | 'dismissed' | 'pending_info';
export type QualityGrade = 'A' | 'B' | 'C' | 'D';

export interface WarehouseReceipt {
  id: string;
  receiptNo: string;
  customerName: string;
  goodsName: string;
  quantity: number;
  unit: string;
  warehouse: string;
  storageDate: string;
  expiryDate: string;
  status: 'normal' | 'frozen' | 'released' | 'duplicate';
  originalValue: number;
}

export interface InspectionReport {
  id: string;
  receiptId: string;
  receiptNo: string;
  inspectionDate: string;
  inspector: string;
  qualityGrade: QualityGrade;
  qualityScore: number;
  moistureContent: number;
  impurityContent: number;
  unitWeight: number;
  remarks: string;
  isDowngraded: boolean;
  previousGrade?: QualityGrade;
}

export interface PledgeContract {
  id: string;
  receiptId: string;
  receiptNo: string;
  contractNo: string;
  customerName: string;
  pledgedQuantity: number;
  unit: string;
  agreedGrade: QualityGrade;
  pledgeRate: number;
  originalUnitPrice: number;
  currentUnitPrice: number;
  pledgedAmount: number;
  remainingPrincipal: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'closed' | 'overdue';
}

export interface ReviewRecord {
  id: string;
  warningId: string;
  reviewer: string;
  reviewTime: string;
  result: WarningStatus;
  opinion: string;
}

export interface Warning {
  id: string;
  type: WarningType;
  level: WarningLevel;
  status: WarningStatus;
  receiptId: string;
  receiptNo: string;
  customerName: string;
  goodsName: string;
  warningTime: string;
  description: string;
  riskAmount: number;
  receipt: WarehouseReceipt;
  inspections: InspectionReport[];
  contracts: PledgeContract[];
  reviews: ReviewRecord[];
}

export interface TraceNode {
  id: string;
  type: 'warning' | 'valuation' | 'limit' | 'status';
  title: string;
  description: string;
  time: string;
  data: Record<string, any>;
  previousValue?: any;
  currentValue?: any;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WarningFilter {
  type?: WarningType;
  level?: WarningLevel;
  status?: WarningStatus;
  receiptNo?: string;
  customerName?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}
