import { create } from 'zustand';
import type {
  StoreState,
  StoreActions,
  Contract,
  InstallmentBill,
  TreatmentRecord,
  Gift,
  RefundRequest,
  Settlement,
  DuplicateStrategy,
  ImportResult,
  FeePayer,
  ApprovalLog,
  VersionSnapshot,
  VersionChange,
  ImportFileInfo,
} from '../types';
import { calculateRefund } from '../utils/calculationEngine';
import {
  mockContracts,
  mockInstallmentBills,
  mockTreatmentRecords,
  mockGifts,
  mockRefundRequests,
  generateId,
  generateSettlementNo,
} from '../data/mockData';

type Store = StoreState & StoreActions;

export const useStore = create<Store>((set, get) => ({
  contracts: mockContracts,
  installmentBills: mockInstallmentBills,
  treatmentRecords: mockTreatmentRecords,
  gifts: mockGifts,
  refundRequests: mockRefundRequests,
  settlements: [],
  importFiles: [],
  selectedContractId: null,
  currentCalculation: null,
  anomalies: [],

  importData: <T extends { id: string }>(
    source: string,
    data: T[],
    strategy: DuplicateStrategy
  ): ImportResult<T> => {
    const state = get();
    let targetKey: keyof StoreState = 'contracts';
    
    switch (source) {
      case 'contract': targetKey = 'contracts'; break;
      case 'installment': targetKey = 'installmentBills'; break;
      case 'treatment': targetKey = 'treatmentRecords'; break;
      case 'gift': targetKey = 'gifts'; break;
      default: break;
    }

    const existingData = (state[targetKey] as unknown as T[]) || [];
    const existingIds = new Set(existingData.map((item) => item.id));
    const errors: string[] = [];
    const duplicates: T[] = [];
    const newData: T[] = [];

    data.forEach((item) => {
      if (existingIds.has(item.id)) {
        duplicates.push(item);
      } else {
        newData.push(item);
      }
    });

    let resultData: T[];

    switch (strategy) {
      case 'ignore':
        resultData = [...existingData, ...newData];
        break;
      case 'overwrite':
        resultData = [
          ...existingData.filter((item) => !duplicates.some((d) => d.id === item.id)),
          ...newData,
          ...duplicates,
        ];
        break;
      case 'append':
        resultData = [...existingData, ...data];
        break;
      default:
        resultData = existingData;
    }

    set({ [targetKey]: resultData } as Partial<StoreState>);

    return {
      success: true,
      data: resultData,
      errors,
      duplicates,
      strategy,
    };
  },

  selectContract: (contractId: string | null) => {
    set({ selectedContractId: contractId });
    if (contractId) {
      const state = get();
      const contract = state.contracts.find((c) => c.id === contractId);
      if (contract) {
        const installment = state.installmentBills.find((b) => b.contractId === contractId);
        const treatments = state.treatmentRecords.filter((t) => t.contractId === contractId);
        const gifts = state.gifts.filter((g) => g.contractId === contractId);
        const calculation = calculateRefund(contract, installment, treatments, gifts);
        set({ currentCalculation: calculation, anomalies: calculation.anomalies });
      }
    }
  },

  calculateRefund: (contractId: string) => {
    const state = get();
    const contract = state.contracts.find((c) => c.id === contractId);
    if (!contract) {
      return get().currentCalculation!;
    }
    const installment = state.installmentBills.find((b) => b.contractId === contractId);
    const treatments = state.treatmentRecords.filter((t) => t.contractId === contractId);
    const gifts = state.gifts.filter((g) => g.contractId === contractId);
    const calculation = calculateRefund(contract, installment, treatments, gifts);
    set({ currentCalculation: calculation, anomalies: calculation.anomalies });
    return calculation;
  },

  toggleTreatmentVerification: (treatmentId: string) => {
    const state = get();
    const treatments = state.treatmentRecords.map((t) => {
      if (t.id === treatmentId) {
        return {
          ...t,
          isVerified: !t.isVerified,
          verifiedBy: !t.isVerified ? '当前用户' : undefined,
          verifiedTime: !t.isVerified ? Date.now() : undefined,
        };
      }
      return t;
    });
    set({ treatmentRecords: treatments });

    if (state.selectedContractId) {
      const contract = state.contracts.find((c) => c.id === state.selectedContractId);
      if (contract) {
        const contractTreatments = treatments.filter((t) => t.contractId === state.selectedContractId);
        const installment = state.installmentBills.find((b) => b.contractId === state.selectedContractId);
        const gifts = state.gifts.filter((g) => g.contractId === state.selectedContractId);
        const calculation = calculateRefund(contract, installment, contractTreatments, gifts);
        set({ currentCalculation: calculation, anomalies: calculation.anomalies });
      }
    }
  },

  toggleGiftReturn: (giftId: string) => {
    const state = get();
    const gifts = state.gifts.map((g) => {
      if (g.id === giftId) {
        return {
          ...g,
          isReturned: !g.isReturned,
          returnedQuantity: !g.isReturned ? g.quantity : undefined,
          returnDate: !g.isReturned ? new Date().toISOString().split('T')[0] : undefined,
        };
      }
      return g;
    });
    set({ gifts });

    if (state.selectedContractId) {
      const contract = state.contracts.find((c) => c.id === state.selectedContractId);
      if (contract) {
        const treatments = state.treatmentRecords.filter((t) => t.contractId === state.selectedContractId);
        const installment = state.installmentBills.find((b) => b.contractId === state.selectedContractId);
        const contractGifts = gifts.filter((g) => g.contractId === state.selectedContractId);
        const calculation = calculateRefund(contract, installment, treatments, contractGifts);
        set({ currentCalculation: calculation, anomalies: calculation.anomalies });
      }
    }
  },

  updateFeePayer: (contractId: string, feePayer: FeePayer, ratio?: number) => {
    const state = get();
    const bills = state.installmentBills.map((b) => {
      if (b.contractId === contractId) {
        return { ...b, feePayer, feePayerRatio: ratio };
      }
      return b;
    });
    set({ installmentBills: bills });

    if (state.selectedContractId === contractId) {
      const contract = state.contracts.find((c) => c.id === contractId);
      if (contract) {
        const treatments = state.treatmentRecords.filter((t) => t.contractId === contractId);
        const gifts = state.gifts.filter((g) => g.contractId === contractId);
        const bill = bills.find((b) => b.contractId === contractId);
        const calculation = calculateRefund(contract, bill, treatments, gifts);
        set({ currentCalculation: calculation, anomalies: calculation.anomalies });
      }
    }
  },

  createRefundRequest: (contractId: string) => {
    const state = get();
    const contract = state.contracts.find((c) => c.id === contractId);
    const calculation = state.currentCalculation || get().calculateRefund(contractId);
    const now = Date.now();

    const request: RefundRequest = {
      id: generateId(),
      contractId,
      contract,
      status: 'draft',
      calculation,
      currentVersion: 'v1.0',
      versionHistory: [
        {
          version: 'v1.0',
          timestamp: now,
          operator: '当前用户',
          calculation,
          remark: '初始版本',
          changes: [],
        },
      ],
      approvalLogs: [],
      createdAt: now,
      updatedAt: now,
      createdBy: '当前用户',
    };

    set({ refundRequests: [...state.refundRequests, request] });
    return request;
  },

  submitForApproval: (requestId: string, remark?: string) => {
    const state = get();
    const requests = state.refundRequests.map((r) => {
      if (r.id === requestId) {
        const log: ApprovalLog = {
          id: generateId(),
          refundRequestId: requestId,
          version: r.currentVersion,
          operator: '当前用户',
          operateTime: Date.now(),
          action: 'submit',
          remark: remark || '提交审批',
        };
        return {
          ...r,
          status: 'pending_approval' as const,
          approvalLogs: [...r.approvalLogs, log],
          updatedAt: Date.now(),
        };
      }
      return r;
    });
    set({ refundRequests: requests });
  },

  approveRefund: (requestId: string, remark?: string) => {
    const state = get();
    const requests = state.refundRequests.map((r) => {
      if (r.id === requestId) {
        const log: ApprovalLog = {
          id: generateId(),
          refundRequestId: requestId,
          version: r.currentVersion,
          operator: '审批人',
          operateTime: Date.now(),
          action: 'approve',
          remark: remark || '审批通过',
        };
        return {
          ...r,
          status: 'approved' as const,
          approvalLogs: [...r.approvalLogs, log],
          updatedAt: Date.now(),
        };
      }
      return r;
    });
    set({ refundRequests: requests });
  },

  rejectRefund: (requestId: string, remark: string) => {
    const state = get();
    const requests = state.refundRequests.map((r) => {
      if (r.id === requestId) {
        const log: ApprovalLog = {
          id: generateId(),
          refundRequestId: requestId,
          version: r.currentVersion,
          operator: '审批人',
          operateTime: Date.now(),
          action: 'reject',
          remark,
        };
        return {
          ...r,
          status: 'rejected' as const,
          approvalLogs: [...r.approvalLogs, log],
          updatedAt: Date.now(),
        };
      }
      return r;
    });
    set({ refundRequests: requests });
  },

  completeRefund: (requestId: string) => {
    const state = get();
    const request = state.refundRequests.find((r) => r.id === requestId);
    if (!request) return {} as Settlement;

    const settlement: Settlement = {
      id: generateId(),
      refundRequestId: requestId,
      settlementNo: generateSettlementNo(),
      finalRefund: request.calculation.actualRefund,
      settlementDate: new Date().toISOString().split('T')[0],
      createdBy: '当前用户',
      createdAt: Date.now(),
    };

    const requests = state.refundRequests.map((r) => {
      if (r.id === requestId) {
        const log: ApprovalLog = {
          id: generateId(),
          refundRequestId: requestId,
          version: r.currentVersion,
          operator: '当前用户',
          operateTime: Date.now(),
          action: 'complete',
          remark: '退款完成',
        };
        return {
          ...r,
          status: 'completed' as const,
          approvalLogs: [...r.approvalLogs, log],
          updatedAt: Date.now(),
        };
      }
      return r;
    });

    set({ refundRequests: requests, settlements: [...state.settlements, settlement] });
    return settlement;
  },

  resolveAnomaly: (anomalyId: string, note: string) => {
    const state = get();
    const anomalies = state.anomalies.map((a) => {
      if (a.id === anomalyId) {
        return {
          ...a,
          isResolved: true,
          resolvedTime: Date.now(),
          resolvedBy: '当前用户',
          resolutionNote: note,
        };
      }
      return a;
    });
    set({ anomalies });
  },

  exportRefundDocument: () => {},

  clearAllData: () => {
    set({
      contracts: [],
      installmentBills: [],
      treatmentRecords: [],
      gifts: [],
      refundRequests: [],
      settlements: [],
      importFiles: [],
      selectedContractId: null,
      currentCalculation: null,
      anomalies: [],
    });
  },
}));
