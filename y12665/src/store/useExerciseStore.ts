import { create } from 'zustand';
import type {
  Exercise,
  ExerciseListQuery,
  PaginatedResult,
  Screenshot,
  ExerciseVersion,
  ExportJob,
  ImportResult,
} from '../../shared/types';
import { exerciseApi, versionApi, screenshotApi, exportApi, testApi } from '@/lib/api';

interface RepeatTestReport {
  firstImport: ImportResult;
  secondImport: ImportResult;
  duplicateDetectionWorks: boolean;
  message: string;
}

interface ExerciseState {
  paginatedList: PaginatedResult<Exercise> | null;
  listLoading: boolean;
  listError: string | null;
  currentExercise: Exercise | null;
  loading: boolean;
  error: string | null;
  versions: ExerciseVersion[];
  versionsLoading: boolean;
  exportJobs: ExportJob[];
  selectedIds: Set<string>;

  exercises: Exercise[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;

  fetchList: (query?: ExerciseListQuery) => Promise<void>;
  fetchExercises: (query?: ExerciseListQuery) => Promise<void>;
  fetchExercise: (id: string) => Promise<void>;
  fetchDetail: (id: string) => Promise<void>;
  updateExercise: (id: string, data: Partial<Exercise>, changeSummary?: string) => Promise<Exercise | null>;
  fetchVersions: (exerciseId: string) => Promise<void>;
  rollbackVersion: (exerciseId: string, versionId: string) => Promise<Exercise | null>;
  fetchExportJobs: () => Promise<void>;
  createExportJob: (format: string, filter: Record<string, unknown> | null) => Promise<ExportJob | null>;
  runRepeatImportTest: () => Promise<RepeatTestReport | null>;

  toggleSelected: (id: string) => void;
  clearSelected: () => void;
  toggleAllSelected: (items: Exercise[]) => void;
  updateScreenshotStatus: (
    exerciseId: string,
    screenshotId: string,
    status: Screenshot['reviewStatus'],
    note?: string,
  ) => Promise<void>;
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  paginatedList: null,
  listLoading: false,
  listError: null,
  currentExercise: null,
  loading: false,
  error: null,
  versions: [],
  versionsLoading: false,
  exportJobs: [],
  selectedIds: new Set<string>(),
  exercises: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,

  async fetchList(query) {
    set({ listLoading: true, listError: null });
    try {
      const data = await exerciseApi.list(query);
      set({
        paginatedList: data,
        exercises: data.items,
        total: data.total,
        page: data.page,
        pageSize: data.pageSize,
        totalPages: data.totalPages,
      });
    } catch (err) {
      set({ listError: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ listLoading: false });
    }
  },

  async fetchExercises(query) {
    return get().fetchList(query);
  },

  async fetchExercise(id) {
    set({ loading: true, error: null, currentExercise: null });
    try {
      const data = await exerciseApi.detail(id);
      set({ currentExercise: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  async fetchDetail(id) {
    return get().fetchExercise(id);
  },

  async updateExercise(id, data) {
    set({ loading: true, error: null });
    try {
      const updated = await exerciseApi.update(id, data);
      set({ currentExercise: updated });
      return updated;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '更新失败' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  async fetchVersions(exerciseId) {
    set({ versionsLoading: true });
    try {
      const data = await versionApi.list(exerciseId);
      set({ versions: data });
    } finally {
      set({ versionsLoading: false });
    }
  },

  async rollbackVersion(exerciseId, versionId) {
    set({ loading: true, error: null });
    try {
      const rolled = await versionApi.rollback(exerciseId, versionId);
      set({ currentExercise: rolled });
      return rolled;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '回滚失败' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  async fetchExportJobs() {
    set({ loading: true, error: null });
    try {
      const data = await exportApi.list();
      set({ exportJobs: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  async createExportJob(format, filter) {
    set({ loading: true, error: null });
    try {
      const job = await exportApi.create({ format, filter: filter ?? undefined });
      return job;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '创建导出任务失败' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  async runRepeatImportTest() {
    set({ loading: true, error: null });
    try {
      const report = await testApi.runRepeatImport();
      return report;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '测试失败' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  toggleSelected(id) {
    const next = new Set(get().selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ selectedIds: next });
  },

  clearSelected() {
    set({ selectedIds: new Set() });
  },

  toggleAllSelected(items) {
    const current = get().selectedIds;
    const allSelected = items.length > 0 && items.every((it) => current.has(it.id));
    if (allSelected) {
      set({ selectedIds: new Set() });
    } else {
      set({ selectedIds: new Set(items.map((it) => it.id)) });
    }
  },

  async updateScreenshotStatus(exerciseId, screenshotId, status, note) {
    const updated = await screenshotApi.mark(screenshotId, status, note);
    const detail = get().currentExercise;
    if (detail && detail.id === exerciseId) {
      set({
        currentExercise: {
          ...detail,
          screenshots: detail.screenshots.map((s) =>
            s.id === screenshotId ? updated : s,
          ),
        },
      });
    }
  },
}));
