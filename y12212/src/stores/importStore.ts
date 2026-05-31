import { create } from 'zustand';
import type { ImportTask } from '../../shared/types';
import { apiGet, apiUpload } from '@/utils/api';

interface ImportState {
  tasks: ImportTask[];
  currentTask: ImportTask | null;
  uploading: boolean;
  loading: boolean;
  fetchTasks: () => Promise<void>;
  uploadFile: (file: File, type: string) => Promise<void>;
  fetchTaskById: (id: string) => Promise<ImportTask | null>;
}

export const useImportStore = create<ImportState>((set) => ({
  tasks: [],
  currentTask: null,
  uploading: false,
  loading: false,
  fetchTasks: async () => {
    set({ loading: true });
    try {
      const data = await apiGet<ImportTask[]>('/import/tasks');
      set({ tasks: data });
    } finally {
      set({ loading: false });
    }
  },
  uploadFile: async (file: File, type: string) => {
    set({ uploading: true });
    try {
      await apiUpload('/import/upload', file, type);
    } finally {
      set({ uploading: false });
    }
  },
  fetchTaskById: async (id: string) => {
    set({ loading: true });
    try {
      const data = await apiGet<ImportTask>(`/import/${id}`);
      set({ currentTask: data });
      return data;
    } finally {
      set({ loading: false });
    }
  },
}));
