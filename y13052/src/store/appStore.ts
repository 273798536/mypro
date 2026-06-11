import { create } from 'zustand';
import type { PreReviewCase, HistoryRecord, CaseListQuery, RejudgeRequest, SupplementRequest } from '../../shared/types.js';
import { api } from '@/lib/api.js';

interface AppState {
  cases: PreReviewCase[];
  currentCase: PreReviewCase | null;
  history: HistoryRecord[];
  caseQuery: CaseListQuery;
  loading: boolean;
  error: string | null;
  success: string | null;
  highlightPhotoId: string | null;
  highlightObjectId: string | null;

  setCaseQuery: (q: CaseListQuery) => void;
  setSuccess: (msg: string | null) => void;
  loadCases: () => Promise<void>;
  loadCase: (id: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  rejudgeCase: (id: string, req: RejudgeRequest) => Promise<HistoryRecord>;
  supplementCase: (id: string, req: SupplementRequest) => Promise<HistoryRecord>;
  setHighlight: (photoId?: string | null, objectId?: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  cases: [],
  currentCase: null,
  history: [],
  caseQuery: {},
  loading: false,
  error: null,
  success: null,
  highlightPhotoId: null,
  highlightObjectId: null,

  setCaseQuery: (q) => set({ caseQuery: { ...get().caseQuery, ...q } }),
  setSuccess: (msg) => set({ success: msg }),

  loadCases: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.listCases(get().caseQuery);
      set({ cases: data, loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加载失败';
      set({ error: msg, loading: false });
    }
  },

  loadCase: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await api.getCase(id);
      set({ currentCase: data, loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加载失败';
      set({ error: msg, loading: false });
    }
  },

  loadHistory: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.listHistory();
      set({ history: data, loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加载失败';
      set({ error: msg, loading: false });
    }
  },

  rejudgeCase: async (id, req) => {
    set({ loading: true, error: null, success: null });
    try {
      const result = await api.rejudgeCase(id, req);
      set({
        currentCase: result.updatedCase,
        loading: false,
        success: `改判成功：${result.linkedAttachmentIds.length > 0 ? `已关联 ${result.linkedAttachmentIds.length} 个晚到附件；` : ''}状态已同步写回后端`,
      });
      const cc = get().currentCase;
      if (cc) {
        const idx = get().cases.findIndex((c) => c.id === cc.id);
        if (idx >= 0) {
          const shallow: PreReviewCase = { ...cc, photos: [], timeline: [], attachments: [], collisionObjects: [] };
          const next = [...get().cases];
          next[idx] = shallow;
          set({ cases: next });
        }
      }
      return result.historyRecord;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '改判失败';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  supplementCase: async (id, req) => {
    set({ loading: true, error: null, success: null });
    try {
      const result = await api.supplementCase(id, req);
      set({
        currentCase: result.updatedCase,
        loading: false,
        success: `补录成功：新增照片 ${result.addedPhotos} 张 + 附件 ${result.addedAttachments} 个，已持久化到后端`,
      });
      const cc = get().currentCase;
      if (cc) {
        const idx = get().cases.findIndex((c) => c.id === cc.id);
        if (idx >= 0) {
          const shallow: PreReviewCase = { ...cc, photos: [], timeline: [], attachments: [], collisionObjects: [] };
          const next = [...get().cases];
          next[idx] = shallow;
          set({ cases: next });
        }
      }
      return result.historyRecord;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '补录失败';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  setHighlight: (photoId = null, objectId = null) => {
    set({ highlightPhotoId: photoId, highlightObjectId: objectId });
  },
}));
