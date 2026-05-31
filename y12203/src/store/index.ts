import { create } from 'zustand';
import {
  ClaimCase,
  Contract,
  ContractVersion,
  RecoveryStatement,
  AuditTrail,
  FilterState,
} from '../types';
import {
  mockClaims,
  mockContracts,
  mockContractVersions,
  mockRecoveries,
  mockAuditTrails,
} from '../data/mockData';
import { RecoveryCalculator, generateId } from '../utils/calculator';
import { deepDiff, generateDiffDescription } from '../utils/diff';

interface AppState {
  claims: ClaimCase[];
  contracts: Contract[];
  contractVersions: ContractVersion[];
  recoveries: RecoveryStatement[];
  auditTrails: AuditTrail[];
  filters: FilterState;
  isLoading: boolean;

  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;

  addClaim: (claim: Omit<ClaimCase, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateClaim: (id: string, updates: Partial<ClaimCase>) => void;

  addContract: (contract: Omit<Contract, 'id' | 'createdAt'>) => void;
  updateContract: (id: string, updates: Partial<Contract>, reason: string) => void;
  getContractVersions: (contractId: string) => ContractVersion[];

  calculateRecovery: (claimId: string, contractId: string) => void;
  recalculateRecovery: (recoveryId: string) => void;

  getFilteredRecoveries: () => RecoveryStatement[];
  getClaimById: (id: string) => ClaimCase | undefined;
  getContractById: (id: string) => Contract | undefined;

  addAuditTrail: (
    entityType: AuditTrail['entityType'],
    entityId: string,
    action: AuditTrail['action'],
    beforeValue: any,
    afterValue: any,
    remark: string
  ) => void;
}

const initialFilters: FilterState = {
  dateRange: { start: '', end: '' },
  riskType: '',
  reinsurer: '',
  status: '',
  hasDeductibleError: null,
};

export const useAppStore = create<AppState>((set, get) => ({
  claims: mockClaims,
  contracts: mockContracts,
  contractVersions: mockContractVersions,
  recoveries: mockRecoveries,
  auditTrails: mockAuditTrails,
  filters: initialFilters,
  isLoading: false,

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  resetFilters: () => set({ filters: initialFilters }),

  addClaim: (claim) => {
    const newClaim: ClaimCase = {
      ...claim,
      id: generateId('claim'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ claims: [...state.claims, newClaim] }));
    get().addAuditTrail('claim', newClaim.id, 'create', null, claim, '新建赔案单');
  },

  updateClaim: (id, updates) => {
    const claim = get().getClaimById(id);
    if (!claim) return;

    const beforeValue = { ...claim };
    set((state) => ({
      claims: state.claims.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      ),
    }));

    const diffs = deepDiff(beforeValue, updates);
    const remark = diffs.length > 0 ? generateDiffDescription(diffs) : '更新赔案单';
    get().addAuditTrail('claim', id, 'update', beforeValue, updates, remark);
  },

  addContract: (contract) => {
    const newContract: Contract = {
      ...contract,
      id: generateId('contract'),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ contracts: [...state.contracts, newContract] }));

    const newVersion: ContractVersion = {
      id: generateId('cv'),
      contractId: newContract.id,
      versionNo: 'V1',
      beforeData: {},
      afterData: contract,
      changeReason: '初始版本创建',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ contractVersions: [...state.contractVersions, newVersion] }));

    get().addAuditTrail('contract', newContract.id, 'create', null, contract, '新建分保合同');
  },

  updateContract: (id, updates, reason) => {
    const contract = get().getContractById(id);
    if (!contract) return;

    const beforeValue = { ...contract };
    const currentVersionNum = parseInt(contract.version.replace('V', ''));
    const newVersion = `V${currentVersionNum + 1}`;

    set((state) => ({
      contracts: state.contracts.map((c) =>
        c.id === id ? { ...c, ...updates, version: newVersion } : c
      ),
    }));

    const newContractVersion: ContractVersion = {
      id: generateId('cv'),
      contractId: id,
      versionNo: newVersion,
      beforeData: beforeValue,
      afterData: updates,
      changeReason: reason,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ contractVersions: [...state.contractVersions, newContractVersion] }));

    const diffs = deepDiff(beforeValue, updates);
    const remark = diffs.length > 0 ? `${reason}：${generateDiffDescription(diffs)}` : reason;
    get().addAuditTrail('contract', id, 'update', beforeValue, updates, remark);
  },

  getContractVersions: (contractId) => {
    return get().contractVersions.filter((v) => v.contractId === contractId);
  },

  calculateRecovery: (claimId, contractId) => {
    const claim = get().getClaimById(claimId);
    const contract = get().getContractById(contractId);
    if (!claim || !contract) return;

    const result = RecoveryCalculator.calculate(claim, contract);
    const allVersions = get().getContractVersions(contractId);
    const versionHistory = allVersions.map((v) => ({
      version: v.versionNo,
      deductible: (v.afterData.deductible as number) || 0,
    }));
    const errorCheck = RecoveryCalculator.detectDeductibleError(
      claim,
      contract,
      result.deductibleApplied,
      versionHistory
    );

    const newRecovery: RecoveryStatement = {
      id: generateId('rec'),
      claimId,
      contractId,
      contractVersion: contract.version,
      totalLoss: claim.totalLoss,
      deductibleApplied: result.deductibleApplied,
      recoverableAmount: result.recoverableAmount,
      actualRecovery: result.recoverableAmount,
      hasDeductibleError: errorCheck.hasError,
      errorMessage: errorCheck.message,
      calculationBasis: result.basis,
      calculatedAt: new Date().toISOString(),
    };

    set((state) => ({ recoveries: [...state.recoveries, newRecovery] }));

    const remark = errorCheck.hasError
      ? `摊回计算完成，检测到免赔错用：${errorCheck.message}`
      : '摊回计算完成';
    get().addAuditTrail('recovery', newRecovery.id, 'create', null, newRecovery, remark);
  },

  recalculateRecovery: (recoveryId) => {
    const recovery = get().recoveries.find((r) => r.id === recoveryId);
    if (!recovery) return;

    const claim = get().getClaimById(recovery.claimId);
    const contract = get().getContractById(recovery.contractId);
    if (!claim || !contract) return;

    const beforeValue = { ...recovery };
    const result = RecoveryCalculator.calculate(claim, contract);

    set((state) => ({
      recoveries: state.recoveries.map((r) =>
        r.id === recoveryId
          ? {
              ...r,
              contractVersion: contract.version,
              deductibleApplied: result.deductibleApplied,
              recoverableAmount: result.recoverableAmount,
              actualRecovery: result.recoverableAmount,
              hasDeductibleError: false,
              errorMessage: undefined,
              calculationBasis: result.basis,
              calculatedAt: new Date().toISOString(),
              remark: '重新计算修正版本',
            }
          : r
      ),
    }));

    get().addAuditTrail(
      'recovery',
      recoveryId,
      'recalculate',
      beforeValue,
      { recoverableAmount: result.recoverableAmount },
      '重新计算，使用最新合同版本'
    );
  },

  getFilteredRecoveries: () => {
    const { recoveries, filters, claims, contracts } = get();
    return recoveries.filter((r) => {
      const claim = claims.find((c) => c.id === r.claimId);
      const contract = contracts.find((c) => c.id === r.contractId);

      if (filters.riskType && claim?.riskType !== filters.riskType) return false;
      if (filters.reinsurer && contract?.reinsurer !== filters.reinsurer) return false;
      if (filters.status && claim?.status !== filters.status) return false;
      if (filters.hasDeductibleError !== null && r.hasDeductibleError !== filters.hasDeductibleError)
        return false;

      return true;
    });
  },

  getClaimById: (id) => get().claims.find((c) => c.id === id),
  getContractById: (id) => get().contracts.find((c) => c.id === id),

  addAuditTrail: (entityType, entityId, action, beforeValue, afterValue, remark) => {
    const trail: AuditTrail = {
      id: generateId('audit'),
      entityType,
      entityId,
      action,
      beforeValue,
      afterValue,
      remark,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ auditTrails: [...state.auditTrails, trail] }));
  },
}));
