import { create } from 'zustand';
import { getExceptions, handleException } from '../api/exception';
import type { ExceptionRecord, PaginatedResponse } from '../../shared/types';

interface ExceptionState {
  exceptions: ExceptionRecord[];
  pendingCount: number;
  loading: boolean;
  fetchExceptions: (params?: any) => Promise<void>;
  updateException: (id: string, data: { status: string; handleNote: string }) => Promise<void>;
  refreshCount: () => Promise<void>;
}

export const useExceptionStore = create<ExceptionState>((set) => ({
  exceptions: [],
  pendingCount: 0,
  loading: false,
  fetchExceptions: async (params) => {
    set({ loading: true });
    try {
      const response: PaginatedResponse<ExceptionRecord> = await getExceptions(params);
      set({ exceptions: response.items });
    } finally {
      set({ loading: false });
    }
  },
  updateException: async (id, data) => {
    const updated = await handleException(id, data);
    set((state) => ({
      exceptions: state.exceptions.map((e) => (e.id === id ? updated : e)),
    }));
  },
  refreshCount: async () => {
    try {
      const response: PaginatedResponse<ExceptionRecord> = await getExceptions({
        status: 'pending',
        pageSize: 1,
      });
      set({ pendingCount: response.total });
    } catch {
      set({ pendingCount: 0 });
    }
  },
}));
