import { create } from 'zustand';
import type {
  LevelSummary,
  LevelDetail,
  Judgment,
  TraceEntry,
  ApiResponse,
  Difficulty,
} from '../../shared/types';

interface SoundscapeState {
  levels: LevelSummary[];
  currentLevel: LevelDetail | null;
  judgments: Judgment[];
  traceReport: TraceEntry[];
  loading: boolean;
  error: string | null;
  currentReportIndex: number;

  fetchLevels: () => Promise<void>;
  fetchLevel: (id: string) => Promise<void>;
  fetchJudgments: (levelId: string) => Promise<void>;
  submitJudgment: (payload: {
    levelId: string;
    reportId: string;
    dbStackingCorrect: boolean;
    overlapNotMerged: boolean;
    nightThresholdOk: boolean;
  }) => Promise<Judgment | null>;
  patchEmotion: (judgmentId: string, emotionIds: string[]) => Promise<Judgment | null>;
  fetchTraceReport: (levelId: string) => Promise<void>;
  importPackage: (payload: {
    name: string;
    difficulty: Difficulty;
    nightThresholdDb?: number;
    sources?: any[];
    emotions?: any[];
    reports?: any[];
  }) => Promise<boolean>;
  setCurrentReportIndex: (index: number) => void;
  resetCurrent: () => void;
}

const baseUrl = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  const data: ApiResponse<T> = await response.json();
  if (!data.success || !data.data) {
    throw new Error(data.error || '请求失败');
  }
  return data.data;
}

export const useSoundscapeStore = create<SoundscapeState>((set, get) => ({
  levels: [],
  currentLevel: null,
  judgments: [],
  traceReport: [],
  loading: false,
  error: null,
  currentReportIndex: 0,

  fetchLevels: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${baseUrl}/levels`);
      const data = await handleResponse<LevelSummary[]>(response);
      set({ levels: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '获取关卡列表失败' });
    } finally {
      set({ loading: false });
    }
  },

  fetchLevel: async (id: string) => {
    set({ loading: true, error: null, currentReportIndex: 0 });
    try {
      const response = await fetch(`${baseUrl}/levels/${id}`);
      const data = await handleResponse<LevelDetail>(response);
      set({ currentLevel: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '获取关卡详情失败' });
    } finally {
      set({ loading: false });
    }
  },

  fetchJudgments: async (levelId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${baseUrl}/judgments/${levelId}`);
      const data = await handleResponse<Judgment[]>(response);
      set({ judgments: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '获取审判记录失败' });
    } finally {
      set({ loading: false });
    }
  },

  submitJudgment: async (payload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${baseUrl}/judgments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await handleResponse<Judgment>(response);
      set((state) => ({
        judgments: [...state.judgments, data],
      }));
      return data;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '提交审判失败' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  patchEmotion: async (judgmentId: string, emotionIds: string[]) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${baseUrl}/judgments/${judgmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emotionIds }),
      });
      const data = await handleResponse<Judgment>(response);
      set((state) => ({
        judgments: state.judgments.map((j) => (j.id === judgmentId ? data : j)),
      }));
      return data;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '更新情绪失败' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  fetchTraceReport: async (levelId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${baseUrl}/reports/${levelId}`);
      const data = await handleResponse<TraceEntry[]>(response);
      set({ traceReport: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '获取溯源报告失败' });
    } finally {
      set({ loading: false });
    }
  },

  importPackage: async (payload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${baseUrl}/levels/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await handleResponse<LevelDetail>(response);
      await get().fetchLevels();
      return true;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '导入关卡失败' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  setCurrentReportIndex: (index: number) => {
    set({ currentReportIndex: index });
  },

  resetCurrent: () => {
    set({
      currentLevel: null,
      judgments: [],
      traceReport: [],
      currentReportIndex: 0,
      error: null,
    });
  },
}));
