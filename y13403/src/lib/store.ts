import { create } from 'zustand';
import type {
  TopoRecord,
  RecordVersion,
  ComputationStep,
  HandoverSummary,
  RecordStatus,
} from '@shared/types';
import { api } from '@/lib/api';

type RightPanelMode = 'computation' | 'exception' | null;

interface AppState {
  records: TopoRecord[];
  summary: HandoverSummary | null;
  selectedId: string | null;
  selectedRecord: TopoRecord | null;
  versions: RecordVersion[];
  steps: ComputationStep[];
  rightPanelMode: RightPanelMode;
  statusFilter: RecordStatus | 'all';
  keyword: string;
  loading: boolean;
  toasts: { id: string; type: 'success' | 'error' | 'info'; text: string }[];

  setStatusFilter: (s: RecordStatus | 'all') => void;
  setKeyword: (k: string) => void;
  setSelectedId: (id: string | null) => void;
  setRightPanelMode: (m: RightPanelMode) => void;
  pushToast: (type: 'success' | 'error' | 'info', text: string) => void;
  dismissToast: (id: string) => void;

  loadRecords: () => Promise<void>;
  loadSummary: () => Promise<void>;
  loadDetail: (id: string) => Promise<void>;
  doConfirm: (id: string) => Promise<void>;
  doRevoke: (id: string) => Promise<void>;
  doUpdate: (id: string, input: Parameters<typeof api.updateRecord>[1]) => Promise<void>;
  doImport: (items: Parameters<typeof api.importRecords>[0]) => Promise<void>;
  doExport: () => Promise<void>;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const useApp = create<AppState>((set, get) => ({
  records: [],
  summary: null,
  selectedId: null,
  selectedRecord: null,
  versions: [],
  steps: [],
  rightPanelMode: null,
  statusFilter: 'all',
  keyword: '',
  loading: false,
  toasts: [],

  setStatusFilter: (s) => set({ statusFilter: s }),
  setKeyword: (k) => set({ keyword: k }),
  setSelectedId: (id) => set({ selectedId: id }),
  setRightPanelMode: (m) => set({ rightPanelMode: m }),

  pushToast: (type, text) => {
    const id = uid();
    set((s) => ({ toasts: [...s.toasts, { id, type, text }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  loadRecords: async () => {
    const { statusFilter, keyword } = get();
    try {
      set({ loading: true });
      const res = await api.listRecords({
        status: statusFilter === 'all' ? undefined : statusFilter,
        keyword: keyword || undefined,
      });
      set({ records: res.items });
    } catch (e: any) {
      get().pushToast('error', e.message || '加载记录失败');
    } finally {
      set({ loading: false });
    }
  },

  loadSummary: async () => {
    try {
      const s = await api.summary();
      set({ summary: s });
    } catch (e: any) {
      get().pushToast('error', e.message || '加载摘要失败');
    }
  },

  loadDetail: async (id) => {
    try {
      const [rec, ver, stp] = await Promise.all([
        api.getRecord(id),
        api.getVersions(id),
        api.getComputation(id),
      ]);
      set({
        selectedRecord: rec,
        versions: ver.items,
        steps: stp.steps,
      });
    } catch (e: any) {
      get().pushToast('error', e.message || '加载详情失败');
    }
  },

  doConfirm: async (id) => {
    try {
      await api.confirm(id);
      get().pushToast('success', '已标记为已处理');
      await Promise.all([get().loadRecords(), get().loadSummary()]);
      if (get().selectedId === id) await get().loadDetail(id);
    } catch (e: any) {
      get().pushToast('error', e.message || '确认失败');
    }
  },

  doRevoke: async (id) => {
    try {
      await api.revoke(id);
      get().pushToast('success', '已撤回，状态已回滚');
      await Promise.all([get().loadRecords(), get().loadSummary()]);
      if (get().selectedId === id) await get().loadDetail(id);
    } catch (e: any) {
      get().pushToast('error', e.message || '撤回失败');
    }
  },

  doUpdate: async (id, input) => {
    try {
      await api.updateRecord(id, input);
      get().pushToast('success', '已保存并生成新版本');
      await Promise.all([get().loadRecords(), get().loadSummary()]);
      if (get().selectedId === id) await get().loadDetail(id);
    } catch (e: any) {
      get().pushToast('error', e.message || '保存失败');
    }
  },

  doImport: async (items) => {
    try {
      const res = await api.importRecords(items);
      get().pushToast('success', `已导入 ${res.count} 条记录`);
      localStorage.removeItem('idempotency:/api/records/import');
      await Promise.all([get().loadRecords(), get().loadSummary()]);
    } catch (e: any) {
      localStorage.removeItem('idempotency:/api/records/import');
      get().pushToast('error', e.message || '导入失败');
    }
  },

  doExport: async () => {
    try {
      const { statusFilter, keyword } = get();
      await api.exportCsv({
        status: statusFilter === 'all' ? undefined : statusFilter,
        keyword: keyword || undefined,
      });
      get().pushToast('success', 'CSV 已导出');
    } catch (e: any) {
      get().pushToast('error', e.message || '导出失败');
    }
  },
}));
