import { create } from 'zustand';
import type { Exception } from '@/types';
import { mockExceptions } from '@/data/exceptions';

interface ExceptionStore {
  exceptions: Exception[];
  updateExceptionStatus: (id: string, status: Exception['status']) => void;
  getOpenExceptions: () => Exception[];
  getExceptionsForSnapshot: (snapshotId: string) => Exception[];
}

export const useExceptionStore = create<ExceptionStore>((set, get) => ({
  exceptions: mockExceptions,

  updateExceptionStatus: (id: string, status: Exception['status']) => {
    set(state => ({
      exceptions: state.exceptions.map(ex =>
        ex.id === id ? { ...ex, status } : ex
      )
    }));
  },

  getOpenExceptions: () => {
    return get().exceptions.filter(ex => ex.status !== 'resolved');
  },

  getExceptionsForSnapshot: (snapshotId: string) => {
    return get().exceptions.filter(ex => {
      if (snapshotId === 'snap-001' && ex.id === 'ex-001') return true;
      if (snapshotId === 'snap-003' && ex.id === 'ex-002') return true;
      return false;
    });
  }
}));
