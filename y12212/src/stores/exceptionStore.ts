import { create } from 'zustand';
import type { BillException, ExceptionType } from '../../shared/types';
import { apiGet, apiPut } from '@/utils/api';

interface ExceptionFilters {
  type?: ExceptionType;
  severity?: string;
  resolved?: number;
}

interface ExceptionState {
  exceptions: BillException[];
  filters: ExceptionFilters;
  loading: boolean;
  fetchExceptions: (filters?: ExceptionFilters) => Promise<void>;
  resolveException: (id: string, resolution: string) => Promise<void>;
}

export const useExceptionStore = create<ExceptionState>((set, get) => ({
  exceptions: [],
  filters: {},
  loading: false,
  fetchExceptions: async (filters?: ExceptionFilters) => {
    set({ loading: true, filters: filters || get().filters });
    const query = new URLSearchParams();
    const f = filters || get().filters;
    if (f.type) query.set('type', f.type);
    if (f.severity) query.set('severity', f.severity);
    if (f.resolved !== undefined) query.set('resolved', String(f.resolved));
    try {
      const data = await apiGet<BillException[]>(`/exceptions?${query.toString()}`);
      set({ exceptions: data });
    } finally {
      set({ loading: false });
    }
  },
  resolveException: async (id: string, resolution: string) => {
    await apiPut(`/exceptions/${id}/resolve`, { resolution });
    await get().fetchExceptions();
  },
}));
