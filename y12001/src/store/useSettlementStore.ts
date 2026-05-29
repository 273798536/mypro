
import { create } from 'zustand';
import {
  Store,
  BalanceLayer,
  Transaction,
  StoreSettlement,
  AuditLog,
} from '../types';
import {
  mockStores,
  mockBalances,
  mockTransactions,
  mockSettlements,
  mockAuditLogs,
} from '../data/mockData';
import { calculateSettlement } from '../utils/calculator';

interface SettlementState {
  stores: Store[];
  balances: BalanceLayer[];
  transactions: Transaction[];
  settlements: StoreSettlement[];
  auditLogs: AuditLog[];
  selectedTransaction: Transaction | null;
  expandedRows: Set<string>;

  setSelectedTransaction: (tx: Transaction | null) => void;
  toggleRowExpand: (txId: string) => void;
  settleTransaction: (txId: string, operator: string) => void;
  reviewException: (txId: string, operator: string, note: string) => void;
  addAuditLog: (log: Omit<AuditLog, 'logId' | 'createdAt'>) => void;
}

export const useSettlementStore = create<SettlementState>((set, get) => ({
  stores: mockStores,
  balances: mockBalances,
  transactions: mockTransactions,
  settlements: mockSettlements,
  auditLogs: mockAuditLogs,
  selectedTransaction: null,
  expandedRows: new Set(),

  setSelectedTransaction: (tx) => set({ selectedTransaction: tx }),

  toggleRowExpand: (txId) =>
    set((state) => {
      const newExpanded = new Set(state.expandedRows);
      if (newExpanded.has(txId)) {
        newExpanded.delete(txId);
      } else {
        newExpanded.add(txId);
      }
      return { expandedRows: newExpanded };
    }),

  settleTransaction: (txId, operator) =>
    set((state) => {
      const tx = state.transactions.find((t) => t.txId === txId);
      if (!tx || tx.status === 'settled') return state;

      const newTransactions = state.transactions.map((t) =>
        t.txId === txId ? { ...t, status: 'settled' as const } : t
      );

      const newSettlements = state.settlements.map((s) =>
        s.txId === txId ? { ...s, status: 'completed' as const } : s
      );

      const newLog: AuditLog = {
        logId: `LOG${Date.now()}`,
        txId,
        operator,
        action: '执行清算',
        fieldName: 'status',
        beforeValue: tx.status,
        afterValue: 'settled',
        source: '人工操作',
        createdAt: new Date(),
      };

      return {
        transactions: newTransactions,
        settlements: newSettlements,
        auditLogs: [...state.auditLogs, newLog],
      };
    }),

  reviewException: (txId, operator, note) =>
    set((state) => {
      const tx = state.transactions.find((t) => t.txId === txId);
      if (!tx) return state;

      const newTransactions = state.transactions.map((t) =>
        t.txId === txId
          ? { ...t, exceptionNote: note, status: 'pending' as const }
          : t
      );

      const newLog: AuditLog = {
        logId: `LOG${Date.now()}`,
        txId,
        operator,
        action: '异常复核',
        fieldName: 'exceptionNote',
        beforeValue: tx.exceptionNote || '',
        afterValue: note,
        source: '人工复核',
        createdAt: new Date(),
      };

      return {
        transactions: newTransactions,
        auditLogs: [...state.auditLogs, newLog],
      };
    }),

  addAuditLog: (log) =>
    set((state) => ({
      auditLogs: [
        ...state.auditLogs,
        {
          ...log,
          logId: `LOG${Date.now()}`,
          createdAt: new Date(),
        },
      ],
    })),
}));
