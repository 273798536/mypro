import { create } from 'zustand';
import type { 
  Task, 
  RawDataPackage, 
  CalculationResult, 
  Report, 
  CorrectionLog 
} from '@/types';
import { taskApi, packageApi, calculationApi, correctionApi, reportApi, sampleApi } from '@/services/api';

interface AppState {
  tasks: Task[];
  currentTask: Task | null;
  currentPackages: RawDataPackage[];
  currentCalculation: CalculationResult | null;
  currentReport: Report | null;
  currentCorrections: CorrectionLog[];
  loading: boolean;
  error: string | null;
  
  fetchTasks: (includeDuplicates?: boolean) => Promise<void>;
  fetchTask: (taskId: string) => Promise<void>;
  createTask: (name: string, description?: string) => Promise<Task | null>;
  deleteTask: (taskId: string) => Promise<void>;
  cloneTask: (taskId: string) => Promise<void>;
  
  fetchPackages: (taskId: string) => Promise<void>;
  importPackage: (taskId: string, type: string, content: any, source: string, importedBy: string) => Promise<void>;
  importMixedPackage: (taskId: string, mixedData: any, source: string, importedBy: string) => Promise<void>;
  
  fetchCalculation: (taskId: string) => Promise<void>;
  runCalculation: (taskId: string) => Promise<void>;
  
  fetchCorrections: (taskId: string) => Promise<void>;
  addCorrection: (taskId: string, parameter: string, oldValue: any, newValue: any, reason: string, correctedBy: string) => Promise<void>;
  
  fetchReport: (taskId: string) => Promise<void>;
  
  importDirtySample: () => Promise<Task | null>;
  
  setCurrentTask: (task: Task | null) => void;
  clearCurrentTask: () => void;
  clearError: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  tasks: [],
  currentTask: null,
  currentPackages: [],
  currentCalculation: null,
  currentReport: null,
  currentCorrections: [],
  loading: false,
  error: null,

  fetchTasks: async (includeDuplicates = false) => {
    set({ loading: true, error: null });
    try {
      const response = await taskApi.getAll(includeDuplicates);
      if (response.success) {
        set({ tasks: response.data || [] });
      } else {
        set({ error: response.message || 'Failed to fetch tasks' });
      }
    } catch (e: any) {
      set({ error: e.message || 'Network error' });
    } finally {
      set({ loading: false });
    }
  },

  fetchTask: async (taskId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await taskApi.get(taskId);
      if (response.success) {
        set({ currentTask: response.data || null });
      } else {
        set({ error: response.message || 'Failed to fetch task' });
      }
    } catch (e: any) {
      set({ error: e.message || 'Network error' });
    } finally {
      set({ loading: false });
    }
  },

  createTask: async (name: string, description?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await taskApi.create({ name, description });
      if (response.success && response.data) {
        set((state) => ({ tasks: [response.data!, ...state.tasks] }));
        return response.data;
      } else {
        set({ error: response.message || 'Failed to create task' });
        return null;
      }
    } catch (e: any) {
      set({ error: e.message || 'Network error' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  deleteTask: async (taskId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await taskApi.delete(taskId);
      if (response.success) {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
          currentTask: state.currentTask?.id === taskId ? null : state.currentTask,
        }));
      } else {
        set({ error: response.message || 'Failed to delete task' });
      }
    } catch (e: any) {
      set({ error: e.message || 'Network error' });
    } finally {
      set({ loading: false });
    }
  },

  cloneTask: async (taskId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await taskApi.clone(taskId);
      if (response.success && response.data) {
        set((state) => ({ tasks: [response.data!, ...state.tasks] }));
      } else {
        set({ error: response.message || 'Failed to clone task' });
      }
    } catch (e: any) {
      set({ error: e.message || 'Network error' });
    } finally {
      set({ loading: false });
    }
  },

  fetchPackages: async (taskId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await packageApi.getForTask(taskId);
      if (response.success) {
        set({ currentPackages: response.data || [] });
      } else {
        set({ error: response.message || 'Failed to fetch packages' });
      }
    } catch (e: any) {
      set({ error: e.message || 'Network error' });
    } finally {
      set({ loading: false });
    }
  },

  importPackage: async (taskId: string, type: string, content: any, source: string, importedBy: string) => {
    set({ loading: true, error: null });
    try {
      const response = await packageApi.import(taskId, { type, content, source, importedBy });
      if (response.success) {
        await get().fetchPackages(taskId);
      } else {
        set({ error: response.message || 'Failed to import package' });
      }
    } catch (e: any) {
      set({ error: e.message || 'Network error' });
    } finally {
      set({ loading: false });
    }
  },

  importMixedPackage: async (taskId: string, mixedData: any, source: string, importedBy: string) => {
    set({ loading: true, error: null });
    try {
      const response = await packageApi.importMixed(taskId, { mixedData, source, importedBy });
      if (response.success) {
        await get().fetchPackages(taskId);
      } else {
        set({ error: response.message || 'Failed to import mixed package' });
      }
    } catch (e: any) {
      set({ error: e.message || 'Network error' });
    } finally {
      set({ loading: false });
    }
  },

  fetchCalculation: async (taskId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await calculationApi.get(taskId);
      if (response.success) {
        set({ currentCalculation: response.data || null });
      } else {
        set({ error: response.message || 'Failed to fetch calculation' });
      }
    } catch (e: any) {
      set({ error: e.message || 'Network error' });
    } finally {
      set({ loading: false });
    }
  },

  runCalculation: async (taskId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await calculationApi.run(taskId);
      if (response.success) {
        set({ currentCalculation: response.data || null });
        await get().fetchTask(taskId);
      } else {
        set({ error: response.message || 'Failed to run calculation' });
      }
    } catch (e: any) {
      set({ error: e.message || 'Network error' });
    } finally {
      set({ loading: false });
    }
  },

  fetchCorrections: async (taskId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await correctionApi.getForTask(taskId);
      if (response.success) {
        set({ currentCorrections: response.data || [] });
      } else {
        set({ error: response.message || 'Failed to fetch corrections' });
      }
    } catch (e: any) {
      set({ error: e.message || 'Network error' });
    } finally {
      set({ loading: false });
    }
  },

  addCorrection: async (taskId: string, parameter: string, oldValue: any, newValue: any, reason: string, correctedBy: string) => {
    set({ loading: true, error: null });
    try {
      const response = await correctionApi.add(taskId, { parameter, oldValue, newValue, reason, correctedBy });
      if (response.success) {
        await get().fetchCorrections(taskId);
      } else {
        set({ error: response.message || 'Failed to add correction' });
      }
    } catch (e: any) {
      set({ error: e.message || 'Network error' });
    } finally {
      set({ loading: false });
    }
  },

  fetchReport: async (taskId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await reportApi.get(taskId);
      if (response.success) {
        set({ currentReport: response.data || null });
      } else {
        set({ error: response.message || 'Failed to fetch report' });
      }
    } catch (e: any) {
      set({ error: e.message || 'Network error' });
    } finally {
      set({ loading: false });
    }
  },

  importDirtySample: async () => {
    set({ loading: true, error: null });
    try {
      const response = await sampleApi.importDirtySample();
      if (response.success && response.data) {
        set((state) => ({ tasks: [response.data!, ...state.tasks] }));
        return response.data;
      } else {
        set({ error: response.message || 'Failed to import dirty sample' });
        return null;
      }
    } catch (e: any) {
      set({ error: e.message || 'Network error' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  setCurrentTask: (task: Task | null) => set({ currentTask: task }),
  clearCurrentTask: () => set({ currentTask: null, currentPackages: [], currentCalculation: null, currentReport: null, currentCorrections: [] }),
  clearError: () => set({ error: null }),
}));
