import { create } from 'zustand';
import type { Bill, BillStatus } from '../../shared/types';
import { apiGet, apiPost, apiPut } from '@/utils/api';

interface BillFilters {
  status?: BillStatus;
  billing_month?: string;
  user_type?: string;
  search?: string;
}

interface Pagination {
  page: number;
  page_size: number;
  total: number;
}

interface BillState {
  bills: Bill[];
  currentBill: Bill | null;
  filters: BillFilters;
  pagination: Pagination;
  loading: boolean;
  fetchBills: (filters?: BillFilters) => Promise<void>;
  fetchBillById: (id: string) => Promise<void>;
  updateStatus: (id: string, status: BillStatus, comments?: string) => Promise<void>;
  reviewBill: (id: string, action: 'approve' | 'reject', comments?: string) => Promise<void>;
  recalculateBill: (id: string) => Promise<void>;
  generateBills: (billingMonth: string) => Promise<void>;
}

export const useBillStore = create<BillState>((set, get) => ({
  bills: [],
  currentBill: null,
  filters: {},
  pagination: { page: 1, page_size: 20, total: 0 },
  loading: false,
  fetchBills: async (filters?: BillFilters) => {
    set({ loading: true, filters: filters || get().filters });
    const query = new URLSearchParams();
    const f = filters || get().filters;
    if (f.status) query.set('status', f.status);
    if (f.billing_month) query.set('billing_month', f.billing_month);
    if (f.user_type) query.set('user_type', f.user_type);
    if (f.search) query.set('search', f.search);
    const { page, page_size } = get().pagination;
    query.set('page', String(page));
    query.set('page_size', String(page_size));
    try {
      const data = await apiGet<{ items: Bill[]; total: number; page: number; pageSize: number; totalPages: number }>(`/bills?${query.toString()}`);
      set({ 
        bills: data.items, 
        pagination: { 
          page: data.page, 
          page_size: data.pageSize, 
          total: data.total 
        } 
      });
    } finally {
      set({ loading: false });
    }
  },
  fetchBillById: async (id: string) => {
    set({ loading: true });
    try {
      const data = await apiGet<Bill>(`/bills/${id}`);
      set({ currentBill: data });
    } finally {
      set({ loading: false });
    }
  },
  updateStatus: async (id: string, status: BillStatus, comments?: string) => {
    await apiPut(`/bills/${id}/status`, { status, comments });
    await get().fetchBills();
  },
  reviewBill: async (id: string, action: 'approve' | 'reject', comments?: string) => {
    await apiPost(`/bills/${id}/review`, { action, comments });
    await get().fetchBills();
  },
  recalculateBill: async (id: string) => {
    await apiPost(`/bills/${id}/recalculate`, {});
    await get().fetchBillById(id);
  },
  generateBills: async (billingMonth: string) => {
    await apiPost('/bills/generate', { billing_month: billingMonth });
  },
}));
