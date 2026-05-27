import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PaymentReceipt,
  Invoice,
  SellerAccount,
  FactoringContract,
  FeeConfig,
  SplitResult,
  OperationLog,
  SplitException,
  ImportedData,
} from '@/types';

interface SplitState {
  payments: PaymentReceipt[];
  invoices: Invoice[];
  sellers: SellerAccount[];
  contracts: FactoringContract[];
  fees: FeeConfig[];
  splits: SplitResult[];
  exceptions: SplitException[];
  operationLogs: OperationLog[];
  selectedPaymentId: string | null;

  setImportedData: (data: ImportedData) => void;
  setPayments: (payments: PaymentReceipt[]) => void;
  setInvoices: (invoices: Invoice[]) => void;
  setSellers: (sellers: SellerAccount[]) => void;
  setContracts: (contracts: FactoringContract[]) => void;
  setFees: (fees: FeeConfig[]) => void;
  setSplits: (splits: SplitResult[]) => void;
  setExceptions: (exceptions: SplitException[]) => void;
  setSelectedPaymentId: (id: string | null) => void;

  addOperationLog: (log: Omit<OperationLog, 'id' | 'operateTime'>) => void;
  updateSplit: (id: string, updates: Partial<SplitResult>) => void;
  updatePaymentStatus: (id: string, status: PaymentReceipt['status']) => void;
  markExceptionResolved: (id: string) => void;
  clearAllData: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useSplitStore = create<SplitState>()(
  persist(
    (set) => ({
      payments: [],
      invoices: [],
      sellers: [],
      contracts: [],
      fees: [],
      splits: [],
      exceptions: [],
      operationLogs: [],
      selectedPaymentId: null,

      setImportedData: (data) =>
        set({
          payments: data.payments,
          invoices: data.invoices,
          sellers: data.sellers,
          contracts: data.contracts,
          fees: data.fees,
        }),

      setPayments: (payments) => set({ payments }),
      setInvoices: (invoices) => set({ invoices }),
      setSellers: (sellers) => set({ sellers }),
      setContracts: (contracts) => set({ contracts }),
      setFees: (fees) => set({ fees }),
      setSplits: (splits) => set({ splits }),
      setExceptions: (exceptions) => set({ exceptions }),
      setSelectedPaymentId: (id) => set({ selectedPaymentId: id }),

      addOperationLog: (log) =>
        set((state) => ({
          operationLogs: [
            {
              ...log,
              id: generateId(),
              operateTime: new Date().toISOString(),
            },
            ...state.operationLogs,
          ],
        })),

      updateSplit: (id, updates) =>
        set((state) => ({
          splits: state.splits.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      updatePaymentStatus: (id, status) =>
        set((state) => ({
          payments: state.payments.map((p) =>
            p.id === id ? { ...p, status } : p
          ),
        })),

      markExceptionResolved: (id) =>
        set((state) => ({
          exceptions: state.exceptions.map((e) =>
            e.id === id ? { ...e, resolved: true } : e
          ),
        })),

      clearAllData: () =>
        set({
          payments: [],
          invoices: [],
          sellers: [],
          contracts: [],
          fees: [],
          splits: [],
          exceptions: [],
          operationLogs: [],
          selectedPaymentId: null,
        }),
    }),
    {
      name: 'split-storage',
      version: 1,
    }
  )
);
