
import { create } from 'zustand';
import type { QueueTask, TaskStatus, SourceType, DashboardStats, RetryCategory, OperationHistory, OriginalEvidence, CreateTaskRequest } from '../../shared/types';
import { api } from '../api/client';

interface TaskStore {
  tasks: QueueTask[];
  task: QueueTask | null;
  history: OperationHistory[];
  evidence: OriginalEvidence[];
  stats: DashboardStats | null;
  retryCategories: RetryCategory[];
  deadLetters: QueueTask[];
  loading: boolean;
  error: string | null;

  fetchTasks: (filters?: { status?: TaskStatus; sourceType?: SourceType }) => Promise<void>;
  fetchTask: (id: string) => Promise<void>;
  fetchHistory: (id: string) => Promise<void>;
  fetchEvidence: (id: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchRetryCategories: () => Promise<void>;
  fetchDeadLetters: () => Promise<void>;

  createTask: (data: CreateTaskRequest) => Promise<void>;
  retryTask: (id: string) => Promise<void>;
  manualOverride: (id: string, standardData: Record<string, unknown>, remark?: string) => Promise<void>;
  compensate: (id: string, remark?: string) => Promise<void>;
  closeTask: (id: string, remark?: string) => Promise<void>;
  markPermanentFailed: (id: string, remark?: string) => Promise<void>;
  reviveDeadLetter: (id: string) => Promise<void>;

  importJson: (sourceType: SourceType, rows: Array<Record<string, unknown>>, fileName?: string) => Promise<void>;
  resumeProcessing: () => Promise<number>;
  clearError: () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  task: null,
  history: [],
  evidence: [],
  stats: null,
  retryCategories: [],
  deadLetters: [],
  loading: false,
  error: null,

  async fetchTasks(filters) {
    set({ loading: true, error: null });
    try {
      const tasks = await api.tasks.list(filters);
      set({ tasks, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch tasks', loading: false });
    }
  },

  async fetchTask(id) {
    set({ loading: true, error: null });
    try {
      const task = await api.tasks.get(id);
      set({ task, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch task', loading: false });
    }
  },

  async fetchHistory(id) {
    try {
      const history = await api.tasks.getHistory(id);
      set({ history });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch history' });
    }
  },

  async fetchEvidence(id) {
    try {
      const evidence = await api.tasks.getEvidence(id);
      set({ evidence });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch evidence' });
    }
  },

  async fetchStats() {
    try {
      const stats = await api.dashboard.getStats();
      set({ stats });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch stats' });
    }
  },

  async fetchRetryCategories() {
    try {
      const categories = await api.dashboard.getRetryCategories();
      set({ retryCategories: categories });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch categories' });
    }
  },

  async fetchDeadLetters() {
    set({ loading: true, error: null });
    try {
      const deadLetters = await api.deadLetter.list();
      set({ deadLetters, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch dead letters', loading: false });
    }
  },

  async createTask(data) {
    set({ loading: true, error: null });
    try {
      await api.tasks.create(data);
      await get().fetchTasks();
      set({ loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create task', loading: false });
      throw error;
    }
  },

  async retryTask(id) {
    set({ loading: true, error: null });
    try {
      await api.tasks.retry(id);
      await get().fetchTask(id);
      await get().fetchTasks();
      set({ loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to retry task', loading: false });
      throw error;
    }
  },

  async manualOverride(id, standardData, remark) {
    set({ loading: true, error: null });
    try {
      await api.tasks.manualOverride(id, standardData, remark);
      await get().fetchTask(id);
      await get().fetchTasks();
      set({ loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to override', loading: false });
      throw error;
    }
  },

  async compensate(id, remark) {
    set({ loading: true, error: null });
    try {
      await api.tasks.compensate(id, remark);
      await get().fetchTask(id);
      await get().fetchTasks();
      set({ loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to compensate', loading: false });
      throw error;
    }
  },

  async closeTask(id, remark) {
    set({ loading: true, error: null });
    try {
      await api.tasks.close(id, remark);
      await get().fetchTask(id);
      await get().fetchTasks();
      set({ loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to close task', loading: false });
      throw error;
    }
  },

  async markPermanentFailed(id, remark) {
    set({ loading: true, error: null });
    try {
      await api.tasks.markPermanentFailed(id, remark);
      await get().fetchTask(id);
      await get().fetchTasks();
      set({ loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to mark as failed', loading: false });
      throw error;
    }
  },

  async reviveDeadLetter(id) {
    set({ loading: true, error: null });
    try {
      await api.deadLetter.revive(id);
      await get().fetchDeadLetters();
      set({ loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to revive dead letter', loading: false });
      throw error;
    }
  },

  async importJson(sourceType, rows, fileName) {
    set({ loading: true, error: null });
    try {
      await api.import.json(sourceType, rows, fileName);
      await get().fetchTasks();
      set({ loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to import', loading: false });
      throw error;
    }
  },

  async resumeProcessing() {
    try {
      const result = await api.admin.resume();
      await get().fetchTasks();
      return result.resumed;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to resume' });
      throw error;
    }
  },

  clearError() {
    set({ error: null });
  },
}));
