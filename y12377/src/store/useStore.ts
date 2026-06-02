import { create } from 'zustand';
import type {
  RentalContract,
  RepairWorkOrder,
  ReconciliationStatement,
  DiscrepancyAlert,
  RepairSummaryItem,
  InstrumentChangeRecord
} from '../../shared/types';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface StoreState {
  contracts: RentalContract[];
  workOrders: RepairWorkOrder[];
  statements: ReconciliationStatement[];
  alerts: DiscrepancyAlert[];
  repairSummary: RepairSummaryItem[];
  loading: boolean;
  toasts: Toast[];
  filters: {
    status?: string;
    contractNo?: string;
    period?: string;
    hasDispute?: boolean;
  };
  summaryStats: {
    totalContracts: number;
    activeContracts: number;
    totalWorkOrders: number;
    disputedWorkOrders: number;
    totalAlerts: number;
    errorAlerts: number;
    warningAlerts: number;
  };

  setLoading: (loading: boolean) => void;
  showToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
  setFilters: (filters: Partial<StoreState['filters']>) => void;

  fetchContracts: () => Promise<void>;
  createContract: (data: any) => Promise<boolean>;
  updateContractStatus: (id: string, status: string) => Promise<boolean>;
  changeInstrument: (id: string, data: any) => Promise<boolean>;

  fetchWorkOrders: () => Promise<void>;
  createWorkOrder: (data: any) => Promise<boolean>;
  updateDispute: (id: string, data: any) => Promise<boolean>;
  confirmWorkOrder: (id: string, confirmedBy: string) => Promise<boolean>;

  fetchStatements: () => Promise<void>;
  createStatement: (data: any) => Promise<boolean>;

  fetchReconciliation: () => Promise<void>;
  fetchRepairSummary: () => Promise<void>;
  resolveAlert: (id: string) => Promise<boolean>;

  fetchExportData: () => Promise<any>;
}

const API_BASE = '/api';

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || '请求失败');
  }
  return data;
}

export const useStore = create<StoreState>((set, get) => ({
  contracts: [],
  workOrders: [],
  statements: [],
  alerts: [],
  repairSummary: [],
  loading: false,
  toasts: [],
  filters: {},
  summaryStats: {
    totalContracts: 0,
    activeContracts: 0,
    totalWorkOrders: 0,
    disputedWorkOrders: 0,
    totalAlerts: 0,
    errorAlerts: 0,
    warningAlerts: 0
  },

  setLoading: (loading) => set({ loading }),

  showToast: (type, message) => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),

  fetchContracts: async () => {
    set({ loading: true });
    try {
      const { filters } = get();
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.contractNo) params.append('contractNo', filters.contractNo);
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiRequest<{ data: RentalContract[] }>(`/contracts${query}`);
      set({ contracts: data.data, loading: false });
    } catch (error) {
      get().showToast('error', error instanceof Error ? error.message : '获取合同列表失败');
      set({ loading: false });
    }
  },

  createContract: async (data) => {
    set({ loading: true });
    try {
      const res = await apiRequest<{ data: RentalContract; message: string }>('/contracts', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      get().showToast('success', res.message);
      await get().fetchContracts();
      return true;
    } catch (error) {
      get().showToast('error', error instanceof Error ? error.message : '创建合同失败');
      set({ loading: false });
      return false;
    }
  },

  updateContractStatus: async (id, status) => {
    set({ loading: true });
    try {
      const res = await apiRequest<{ data: RentalContract; message: string }>(`/contracts/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      get().showToast('success', res.message);
      await get().fetchContracts();
      return true;
    } catch (error) {
      get().showToast('error', error instanceof Error ? error.message : '状态变更失败');
      set({ loading: false });
      return false;
    }
  },

  changeInstrument: async (id, data) => {
    set({ loading: true });
    try {
      const res = await apiRequest<{ data: InstrumentChangeRecord; message: string }>(`/contracts/${id}/change-instrument`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      get().showToast('success', res.message);
      await get().fetchContracts();
      return true;
    } catch (error) {
      get().showToast('error', error instanceof Error ? error.message : '换号记录失败');
      set({ loading: false });
      return false;
    }
  },

  fetchWorkOrders: async () => {
    set({ loading: true });
    try {
      const { filters } = get();
      const params = new URLSearchParams();
      if (filters.hasDispute !== undefined) params.append('hasDispute', String(filters.hasDispute));
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiRequest<{ data: RepairWorkOrder[] }>(`/work-orders${query}`);
      set({ workOrders: data.data, loading: false });
    } catch (error) {
      get().showToast('error', error instanceof Error ? error.message : '获取工单列表失败');
      set({ loading: false });
    }
  },

  createWorkOrder: async (data) => {
    set({ loading: true });
    try {
      const res = await apiRequest<{ data: RepairWorkOrder; message: string }>('/work-orders', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      get().showToast('success', res.message);
      await get().fetchWorkOrders();
      return true;
    } catch (error) {
      get().showToast('error', error instanceof Error ? error.message : '创建工单失败');
      set({ loading: false });
      return false;
    }
  },

  updateDispute: async (id, data) => {
    set({ loading: true });
    try {
      const res = await apiRequest<{ data: RepairWorkOrder; message: string }>(`/work-orders/${id}/dispute`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      get().showToast('success', res.message);
      await get().fetchWorkOrders();
      return true;
    } catch (error) {
      get().showToast('error', error instanceof Error ? error.message : '更新争议失败');
      set({ loading: false });
      return false;
    }
  },

  confirmWorkOrder: async (id, confirmedBy) => {
    set({ loading: true });
    try {
      const res = await apiRequest<{ data: RepairWorkOrder; message: string }>(`/work-orders/${id}/confirm`, {
        method: 'PATCH',
        body: JSON.stringify({ confirmedBy })
      });
      get().showToast('success', res.message);
      await get().fetchWorkOrders();
      return true;
    } catch (error) {
      get().showToast('error', error instanceof Error ? error.message : '确认工单失败');
      set({ loading: false });
      return false;
    }
  },

  fetchStatements: async () => {
    set({ loading: true });
    try {
      const { filters } = get();
      const params = new URLSearchParams();
      if (filters.period) params.append('period', filters.period);
      if (filters.contractNo) params.append('contractNo', filters.contractNo);
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiRequest<{ data: ReconciliationStatement[] }>(`/statements${query}`);
      set({ statements: data.data, loading: false });
    } catch (error) {
      get().showToast('error', error instanceof Error ? error.message : '获取对账表失败');
      set({ loading: false });
    }
  },

  createStatement: async (data) => {
    set({ loading: true });
    try {
      const res = await apiRequest<{ data: any; message: string }>('/statements', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      get().showToast('success', res.message);
      await get().fetchStatements();
      return true;
    } catch (error) {
      get().showToast('error', error instanceof Error ? error.message : '创建对账记录失败');
      set({ loading: false });
      return false;
    }
  },

  fetchReconciliation: async () => {
    set({ loading: true });
    try {
      const data = await apiRequest<{ data: { alerts: DiscrepancyAlert[]; summary: any } }>('/reconciliation');
      set({
        alerts: data.data.alerts,
        summaryStats: {
          totalContracts: data.data.summary.totalContracts,
          activeContracts: data.data.summary.activeContracts,
          totalWorkOrders: data.data.summary.totalWorkOrders,
          disputedWorkOrders: data.data.summary.disputedWorkOrders,
          totalAlerts: data.data.summary.totalAlerts,
          errorAlerts: data.data.summary.errorAlerts,
          warningAlerts: data.data.summary.warningAlerts
        },
        loading: false
      });
    } catch (error) {
      get().showToast('error', error instanceof Error ? error.message : '对账比对失败');
      set({ loading: false });
    }
  },

  fetchRepairSummary: async () => {
    set({ loading: true });
    try {
      const { filters } = get();
      const params = new URLSearchParams();
      if (filters.period) params.append('period', filters.period);
      if (filters.contractNo) params.append('contractNo', filters.contractNo);
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiRequest<{ data: RepairSummaryItem[] }>(`/reconciliation/repair-summary${query}`);
      set({ repairSummary: data.data, loading: false });
    } catch (error) {
      get().showToast('error', error instanceof Error ? error.message : '获取维修归集失败');
      set({ loading: false });
    }
  },

  resolveAlert: async (id) => {
    set({ loading: true });
    try {
      const res = await apiRequest<{ data: DiscrepancyAlert; message: string }>(`/reconciliation/alerts/${id}/resolve`, {
        method: 'PATCH'
      });
      get().showToast('success', res.message);
      await get().fetchReconciliation();
      return true;
    } catch (error) {
      get().showToast('error', error instanceof Error ? error.message : '操作失败');
      set({ loading: false });
      return false;
    }
  },

  fetchExportData: async () => {
    try {
      const data = await apiRequest<{ data: any }>('/reconciliation/export');
      return data.data;
    } catch (error) {
      get().showToast('error', error instanceof Error ? error.message : '导出失败');
      return null;
    }
  }
}));
