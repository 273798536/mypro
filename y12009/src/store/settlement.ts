import { create } from 'zustand';
import type { SettlementDetail, TrailItem, CommissionRule, AuditLog } from '../types';
import {
  fetchSettlements,
  fetchSettlementDetail,
  confirmSettlement,
  cancelSettlement,
  fetchSettlementTrail,
  addDeduction,
  amendSettlement,
  fetchCommissionRules,
  calculateCommission,
  fetchAuditLogs,
} from '../utils/api';

interface SettlementFilters {
  status: string;
  seller: string;
  dateFrom: string;
  dateTo: string;
}

interface SettlementState {
  settlements: any[];
  currentDetail: SettlementDetail | null;
  trail: TrailItem[];
  commissionRules: CommissionRule[];
  auditLogs: AuditLog[];
  loading: boolean;
  error: string | null;
  filters: SettlementFilters;

  loadSettlements: () => Promise<void>;
  loadSettlementDetail: (id: string) => Promise<void>;
  loadTrail: (id: string) => Promise<void>;
  setFilters: (filters: Partial<SettlementFilters>) => void;
  confirmSettlementAction: (id: string, operator?: string) => Promise<void>;
  cancelSettlementAction: (id: string, reason: string, operator?: string) => Promise<void>;
  addDeductionAction: (id: string, data: { type: string; amount: number; description: string; sourceRef: string }, operator?: string) => Promise<void>;
  amendSettlementAction: (id: string, data: { field: string; newValue: string; reason: string }, operator?: string) => Promise<void>;
  loadCommissionRules: () => Promise<void>;
  calculateCommissionAction: (salePrice: number) => Promise<{ rate: number; amount: number; fixedFee: number }>;
  loadAuditLogs: (filters?: Record<string, string>) => Promise<void>;
}

export const useSettlementStore = create<SettlementState>((set, get) => ({
  settlements: [],
  currentDetail: null,
  trail: [],
  commissionRules: [],
  auditLogs: [],
  loading: false,
  error: null,
  filters: {
    status: '',
    seller: '',
    dateFrom: '',
    dateTo: '',
  },

  loadSettlements: async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const params: Record<string, string> = {};
      if (filters.status) params.status = filters.status;
      if (filters.seller) params.seller = filters.seller;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      const data = await fetchSettlements(params);
      set({ settlements: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  loadSettlementDetail: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await fetchSettlementDetail(id);
      set({ currentDetail: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  loadTrail: async (id) => {
    try {
      const data = await fetchSettlementTrail(id);
      set({ trail: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  setFilters: (partial) => {
    const { filters, loadSettlements } = get();
    set({ filters: { ...filters, ...partial } });
    loadSettlements();
  },

  confirmSettlementAction: async (id, operator) => {
    set({ loading: true, error: null });
    try {
      await confirmSettlement(id, operator);
      await get().loadSettlementDetail(id);
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  cancelSettlementAction: async (id, reason, operator) => {
    set({ loading: true, error: null });
    try {
      await cancelSettlement(id, reason, operator);
      await get().loadSettlementDetail(id);
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  addDeductionAction: async (id, data, operator) => {
    set({ loading: true, error: null });
    try {
      await addDeduction(id, data, operator);
      await get().loadSettlementDetail(id);
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  amendSettlementAction: async (id, data, operator) => {
    set({ loading: true, error: null });
    try {
      await amendSettlement(id, data, operator);
      await get().loadSettlementDetail(id);
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  loadCommissionRules: async () => {
    try {
      const data = await fetchCommissionRules();
      set({ commissionRules: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  calculateCommissionAction: async (salePrice) => {
    return calculateCommission(salePrice);
  },

  loadAuditLogs: async (filters) => {
    try {
      const data = await fetchAuditLogs(filters);
      set({ auditLogs: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },
}));
