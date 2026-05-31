export interface ShipmentRecord {
  id: string;
  model: string;
  batchNo: string;
  shipmentDate: string;
  quantity: number;
  unitPrice: number;
  serialNumber: string;
  warrantyMonths: number;
}

export interface MaintenanceOrder {
  id: string;
  serialNumber: string;
  batchNo: string;
  faultType: string;
  claimDate: string;
  claimAmount: number;
  claimStatus: 'pending' | 'approved' | 'rejected' | 'duplicate';
  repairOrderNo: string;
  isDuplicate?: boolean;
  duplicateGroupId?: string;
  batchMismatch?: boolean;
  confidenceScore?: number;
  detectionBasis?: string;
}

export interface ReserveRule {
  id: string;
  version: string;
  model: string;
  effectiveDate: string;
  expiryDate: string;
  reserveRate: number;
  rollbackMonths: number;
  createdBy: string;
  changeReason: string;
  isActive: boolean;
  exceptionClauses?: string[];
}

export interface CalculationStep {
  stepNo: number;
  description: string;
  formula: string;
  result: number;
  evidence?: string;
}

export interface DataSnapshot {
  shipmentCount: number;
  claimCount: number;
  timestamp: string;
  dataHash: string;
  ruleVersion: string;
}

export interface ReserveCalculation {
  id: string;
  model: string;
  batchNo: string;
  calcDate: string;
  ruleVersion: string;
  beginningReserve: number;
  currentAccrual: number;
  currentWriteBack: number;
  endingReserve: number;
  calculationSteps: CalculationStep[];
  dataSnapshot: DataSnapshot;
  shipmentAmount: number;
  claimAmount: number;
  duplicateClaimAmount: number;
}

export interface AuditTrail {
  id: string;
  claimId: string;
  auditResult: 'confirmed' | 'rejected' | 'pending';
  auditor: string;
  auditTime: string;
  auditComment: string;
  evidence: string;
}

export interface DuplicateClaimGroup {
  id: string;
  serialNumber: string;
  faultType: string;
  claims: MaintenanceOrder[];
  detectedDate: string;
  status: 'pending' | 'resolved';
  confidenceScore: number;
  detectionBasis: string;
}

export interface BatchMismatch {
  id: string;
  serialNumber: string;
  shipmentBatch: string;
  claimBatch: string;
  shipmentRecord: ShipmentRecord;
  maintenanceOrder: MaintenanceOrder;
  status: 'pending' | 'resolved';
  withinWarranty: boolean;
}

export interface CalculationVersion {
  id: string;
  calculationId: string;
  versionNo: number;
  createdAt: string;
  operator: string;
  dataHash: string;
  ruleSnapshot: ReserveRule;
  calculationSnapshot: ReserveCalculation;
}

export interface RollingReport {
  id: string;
  reportDate: string;
  period: string;
  calculations: ReserveCalculation[];
  duplicateClaims: DuplicateClaimGroup[];
  batchMismatches: BatchMismatch[];
  auditTrails: AuditTrail[];
  dataSnapshot: DataSnapshot;
  generatedBy: string;
  version: string;
}

export interface DashboardMetrics {
  totalReserve: number;
  totalAccrual: number;
  totalWriteBack: number;
  duplicateClaimAmount: number;
  batchMismatchCount: number;
  pendingAuditCount: number;
  activeRuleCount: number;
  expiredRuleCount: number;
  reserveTrend: { date: string; amount: number; model: string }[];
  claimDistribution: { month: string; normal: number; duplicate: number; mismatch: number }[];
  batchDistribution: { batch: string; reserve: number; percentage: number }[];
}
