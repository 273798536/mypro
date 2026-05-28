
import { create } from 'zustand';
import {
  PatientBill,
  InsuranceSettlement,
  RefundRecord,
  AdvanceLedger,
  Department,
  ExceptionRecord,
} from '../types';
import {
  patientBills as initialBills,
  settlements as initialSettlements,
  refunds as initialRefunds,
  ledgers as initialLedgers,
  departments as initialDepartments,
  exceptions as initialExceptions,
} from '../data/mockData';

interface AppStore {
  patientBills: PatientBill[];
  settlements: InsuranceSettlement[];
  refunds: RefundRecord[];
  ledgers: AdvanceLedger[];
  departments: Department[];
  exceptions: ExceptionRecord[];
  lastUpdate: string;

  markRefundReceived: (refundId: string, actualDate: string) => void;
  rollbackRefund: (refundId: string) => void;
  addInsuranceReject: (
    settlementId: string,
    rejectItem: { billItemId: string; reason: string; position: string; amount: number }
  ) => void;
  recalculateLedgers: () => void;
  refreshAll: () => void;
}

const STORAGE_KEY = 'hospital_insurance_advance_data';

const loadFromStorage = (): Partial<AppStore> | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load from storage:', e);
  }
  return null;
};

const saveToStorage = (state: AppStore) => {
  try {
    const dataToSave = {
      patientBills: state.patientBills,
      settlements: state.settlements,
      refunds: state.refunds,
      ledgers: state.ledgers,
      exceptions: state.exceptions,
      lastUpdate: state.lastUpdate,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (e) {
    console.error('Failed to save to storage:', e);
  }
};

const calculateLedgers = (
  bills: PatientBill[],
  settlements: InsuranceSettlement[],
  refunds: RefundRecord[],
  departments: Department[]
): AdvanceLedger[] => {
  return departments.map((dept) => {
    const deptBills = bills.filter((b) => b.departmentId === dept.deptId);
    const totalAdvance = deptBills.reduce((sum, b) => sum + b.insuranceAdvance, 0);

    const deptSettlements = settlements.filter((s) =>
      deptBills.some((b) => b.billId === s.billId)
    );
    const insuranceReceived = deptSettlements.reduce((sum, s) => sum + s.actualAmount, 0);

    const deptRefunds = refunds.filter(
      (r) => deptBills.some((b) => b.billId === r.billId) && r.status === 'received'
    );
    const refundReceived = deptRefunds.reduce((sum, r) => sum + r.amount, 0);

    const totalRecovered = insuranceReceived + refundReceived;
    const pendingAmount = totalAdvance - totalRecovered;

    return {
      ledgerId: `LEDG${dept.deptId}`,
      departmentId: dept.deptId,
      departmentName: dept.deptName,
      totalAdvance,
      totalRecovered,
      pendingAmount,
      exceptionCount: 0,
      updateTime: new Date().toLocaleString('zh-CN'),
    };
  });
};

const storedData = loadFromStorage();

export const useStore = create<AppStore>((set, get) => ({
  patientBills: storedData?.patientBills || initialBills,
  settlements: storedData?.settlements || initialSettlements,
  refunds: storedData?.refunds || initialRefunds,
  ledgers: storedData?.ledgers || initialLedgers,
  departments: initialDepartments,
  exceptions: storedData?.exceptions || initialExceptions,
  lastUpdate: storedData?.lastUpdate || new Date().toLocaleString('zh-CN'),

  markRefundReceived: (refundId: string, actualDate: string) => {
    set((state) => {
      const newRefunds = state.refunds.map((r) =>
        r.refundId === refundId
          ? { ...r, status: 'received' as const, actualDate, lateDays: 0 }
          : r
      );

      const newExceptions = state.exceptions.filter(
        (e) => !(e.type === 'refund_delay' && state.refunds.find((r) => r.refundId === refundId)?.billId === e.relatedBillId)
      );

      const newLedgers = calculateLedgers(
        state.patientBills,
        state.settlements,
        newRefunds,
        state.departments
      );

      const newState = {
        ...state,
        refunds: newRefunds,
        exceptions: newExceptions,
        ledgers: newLedgers,
        lastUpdate: new Date().toLocaleString('zh-CN'),
      };

      saveToStorage(newState);
      return newState;
    });
  },

  rollbackRefund: (refundId: string) => {
    set((state) => {
      const refund = state.refunds.find((r) => r.refundId === refundId);
      if (!refund) return state;

      const newRefunds = state.refunds.map((r) =>
        r.refundId === refundId
          ? { ...r, status: 'rollback' as const }
          : r
      );

      const newLedgers = calculateLedgers(
        state.patientBills,
        state.settlements,
        newRefunds,
        state.departments
      );

      const newState = {
        ...state,
        refunds: newRefunds,
        ledgers: newLedgers,
        lastUpdate: new Date().toLocaleString('zh-CN'),
      };

      saveToStorage(newState);
      return newState;
    });
  },

  addInsuranceReject: (
    settlementId: string,
    rejectItem: { billItemId: string; reason: string; position: string; amount: number }
  ) => {
    set((state) => {
      const settlement = state.settlements.find((s) => s.settlementId === settlementId);
      if (!settlement) return state;

      const newRejectItem = {
        rejectId: `REJ${Date.now()}`,
        settlementId,
        ...rejectItem,
      };

      const newSettlements = state.settlements.map((s) =>
        s.settlementId === settlementId
          ? {
              ...s,
              rejectItems: [...s.rejectItems, newRejectItem],
              actualAmount: s.expectedAmount - rejectItem.amount,
              status: 'partial' as const,
            }
          : s
      );

      const newException: ExceptionRecord = {
        exceptionId: `EXC${Date.now()}`,
        type: 'insurance_reject',
        relatedBillId: settlement.billId,
        relatedSettlementId: settlementId,
        relatedItemId: rejectItem.billItemId,
        description: `医保拒付：${rejectItem.reason}，金额${rejectItem.amount}元`,
        amount: rejectItem.amount,
        position: rejectItem.position,
      };

      const newPatientBills = state.patientBills.map((b) =>
        b.billId === settlement.billId
          ? {
              ...b,
              items: b.items.map((item) =>
                item.itemId === rejectItem.billItemId
                  ? { ...item, isRejected: true, remark: rejectItem.reason }
                  : item
              ),
              status: 'exception' as const,
            }
          : b
      );

      const newLedgers = calculateLedgers(
        newPatientBills,
        newSettlements,
        state.refunds,
        state.departments
      );

      const newState = {
        ...state,
        patientBills: newPatientBills,
        settlements: newSettlements,
        exceptions: [...state.exceptions, newException],
        ledgers: newLedgers,
        lastUpdate: new Date().toLocaleString('zh-CN'),
      };

      saveToStorage(newState);
      return newState;
    });
  },

  recalculateLedgers: () => {
    set((state) => {
      const newLedgers = calculateLedgers(
        state.patientBills,
        state.settlements,
        state.refunds,
        state.departments
      );

      const newState = {
        ...state,
        ledgers: newLedgers,
        lastUpdate: new Date().toLocaleString('zh-CN'),
      };

      saveToStorage(newState);
      return newState;
    });
  },

  refreshAll: () => {
    const newState = {
      patientBills: initialBills,
      settlements: initialSettlements,
      refunds: initialRefunds,
      ledgers: initialLedgers,
      departments: initialDepartments,
      exceptions: initialExceptions,
      lastUpdate: new Date().toLocaleString('zh-CN'),
    };
    localStorage.removeItem(STORAGE_KEY);
    set(newState);
  },
}));
