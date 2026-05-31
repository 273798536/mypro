export type ClaimStatus = 'pending' | 'confirmed' | 'closed';
export type LayerType = 'quota' | 'excess';
export type EntityType = 'claim' | 'contract' | 'recovery';
export type ActionType = 'create' | 'update' | 'delete' | 'recalculate';

export interface ClaimCase {
  id: string;
  caseNo: string;
  accidentDate: string;
  insured: string;
  riskType: string;
  totalLoss: number;
  status: ClaimStatus;
  remark: string;
  createdAt: string;
  updatedAt: string;
  hasMissingFields?: boolean;
  lateSupplement?: boolean;
}

export interface Contract {
  id: string;
  contractNo: string;
  version: string;
  reinsurer: string;
  effectiveDate: string;
  expiryDate: string;
  shareRate: number;
  deductible: number;
  layerType: LayerType;
  isActive: boolean;
  createdAt: string;
}

export interface ContractVersion {
  id: string;
  contractId: string;
  versionNo: string;
  beforeData: Partial<Contract>;
  afterData: Partial<Contract>;
  changeReason: string;
  createdAt: string;
}

export interface RecoveryStatement {
  id: string;
  claimId: string;
  contractId: string;
  contractVersion: string;
  totalLoss: number;
  deductibleApplied: number;
  recoverableAmount: number;
  actualRecovery: number;
  hasDeductibleError: boolean;
  errorMessage?: string;
  calculationBasis: string;
  calculatedAt: string;
  remark?: string;
}

export interface AuditTrail {
  id: string;
  entityType: EntityType;
  entityId: string;
  action: ActionType;
  beforeValue: any;
  afterValue: any;
  remark: string;
  createdAt: string;
}

export interface CalculationResult {
  recoverableAmount: number;
  deductibleApplied: number;
  hasError: boolean;
  errorMessage?: string;
  basis: string;
}

export interface FilterState {
  dateRange: {
    start: string;
    end: string;
  };
  riskType: string;
  reinsurer: string;
  status: string;
  hasDeductibleError: boolean | null;
}

export interface DiffItem {
  field: string;
  before: any;
  after: any;
  type: 'added' | 'removed' | 'modified';
}
