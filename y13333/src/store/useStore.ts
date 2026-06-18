import { create } from 'zustand';
import type { Sample, PlaybackResult, PlaybackStatus, ReviewMetrics } from '@shared/types';
import { api } from '../utils/api';

interface AppState {
  samples: Sample[];
  playbackResults: PlaybackResult[];
  reviewMetrics: ReviewMetrics | null;
  loading: boolean;
  error: string | null;
  
  fetchSamples: (includeWithdrawn?: boolean) => Promise<void>;
  fetchPlaybackResults: (status?: PlaybackStatus) => Promise<void>;
  fetchReviewMetrics: () => Promise<void>;
  runPlayback: () => Promise<void>;
  updatePlaybackStatus: (id: string, status: PlaybackStatus, operator: string, remark?: string) => Promise<void>;
  
  getNeedEvidenceCount: () => number;
  getApprovedCount: () => number;
  getPendingCount: () => number;
  getWithdrawnCount: () => number;
}

export const useStore = create<AppState>((set, get) => ({
  samples: [],
  playbackResults: [],
  reviewMetrics: null,
  loading: false,
  error: null,
  
  fetchSamples: async (includeWithdrawn = true) => {
    set({ loading: true, error: null });
    try {
      const response = await api.samples.getAll(includeWithdrawn);
      if (response.success) {
        set({ samples: response.data });
      } else {
        set({ error: response.message || '获取样本失败' });
      }
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },
  
  fetchPlaybackResults: async (status) => {
    set({ loading: true, error: null });
    try {
      const response = await api.playback.getAll(status);
      if (response.success) {
        set({ playbackResults: response.data });
      } else {
        set({ error: response.message || '获取回放结果失败' });
      }
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },
  
  fetchReviewMetrics: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.review.getMetrics();
      if (response.success) {
        set({ reviewMetrics: response.data });
      } else {
        set({ error: response.message || '获取评审指标失败' });
      }
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },
  
  runPlayback: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.playback.run();
      if (response.success) {
        set({ playbackResults: response.data });
      } else {
        set({ error: response.message || '执行回放失败' });
      }
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },
  
  updatePlaybackStatus: async (id, status, operator, remark) => {
    set({ loading: true, error: null });
    try {
      const response = await api.playback.updateStatus(id, status, operator, remark);
      if (response.success && response.data) {
        set(state => ({
          playbackResults: state.playbackResults.map(
            p => p.id === id ? response.data! : p
          ),
        }));
      } else {
        set({ error: response.message || '更新状态失败' });
      }
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },
  
  getNeedEvidenceCount: () => 
    get().playbackResults.filter(p => p.status === 'need_evidence').length,
  
  getApprovedCount: () =>
    get().playbackResults.filter(p => p.status === 'approved').length,
  
  getPendingCount: () =>
    get().playbackResults.filter(p => p.status === 'pending').length,
  
  getWithdrawnCount: () =>
    get().samples.filter(s => s.isWithdrawn).length,
}));
