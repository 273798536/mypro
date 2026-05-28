export type ImportDataType = 'vehicle' | 'contract' | 'residual';

export interface ImportLog {
  id: string;
  batchId: string;
  dataType: ImportDataType;
  fileName: string;
  recordCount: number;
  importOrder: number;
  importedAt: string;
  importedBy: string;
  status: 'success' | 'failed' | 'partial';
  errorMessage?: string;
}

export interface VehicleRecord {
  id: string;
  vin: string;
  plateNumber: string;
  brand: string;
  model: string;
  purchasePrice: number;
  storePrice: number;
  storePriceUpdatedAt: string;
  storeId: string;
  storeName: string;
  createdAt: string;
  updatedAt: string;
  importBatchId: string;
}

export interface LoanContract {
  id: string;
  contractNo: string;
  vin: string;
  customerName: string;
  loanAmount: number;
  loanTerm: number;
  interestRate: number;
  monthlyPayment: number;
  remainingPrincipal: number;
  remainingInterest: number;
  startDate: string;
  endDate: string;
  isVehicleReplaced: boolean;
  replacementReason?: string;
  subsidyAmount: number;
  subsidyType: 'national' | 'local' | 'dealer';
  subsidyClawbackRequired: boolean;
  clawbackAmount?: number;
  createdAt: string;
  updatedAt: string;
  importBatchId: string;
}

export interface ResidualTable {
  id: string;
  vin: string;
  residualValue: number;
  residualDate: string;
  expiryDate: string;
  valuationCompany: string;
  isExpired: boolean;
  createdAt: string;
  updatedAt: string;
  importBatchId: string;
}

export type PendingType = 'residual_expired' | 'contract_replaced' | 'subsidy_clawback';

export interface PendingItem {
  id: string;
  type: PendingType;
  relatedRecordId: string;
  relatedRecordType: 'vehicle' | 'contract' | 'residual';
  title: string;
  description: string;
  level: 'high' | 'medium' | 'low';
  remainingDays?: number;
  createdAt: string;
  confirmedAt?: string;
  confirmedBy?: string;
  note?: string;
  status: 'pending' | 'confirmed' | 'ignored';
}

export type ResultStatus = 'ready' | 'need_confirm' | 'cannot_calculate';

export interface CalculationResult {
  id: string;
  vin: string;
  vehicleId: string;
  contractId: string;
  residualId?: string;
  vehicle: VehicleRecord;
  contract: LoanContract;
  residual?: ResidualTable;
  storePrice: number;
  remainingBalance: number;
  residualValue: number;
  subsidyDeduction: number;
  subsidyClawback: number;
  finalPayable: number;
  finalReceivable: number;
  status: ResultStatus;
  statusReason: string;
  pendingItems: PendingItem[];
  calculatedAt: string;
  recalculatedCount: number;
  lastRecalculatedAt?: string;
  lastRecalculatedBy?: string;
}

export interface RecalculateRequest {
  recordId: string;
  reason: string;
  operator: string;
}

export interface SubsidyRollbackRequest {
  contractId: string;
  rollbackAmount: number;
  reason: string;
  operator: string;
}

export interface AuditHistory {
  id: string;
  recordId: string;
  recordType: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedAt: string;
  changeReason: string;
}

export interface ExportTask {
  id: string;
  taskName: string;
  exportType: 'excel' | 'pdf';
  recordIds: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  fileSize?: number;
  createdBy: string;
}

export interface GetResultsFilters {
  status?: ResultStatus;
  storeId?: string;
  brand?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
