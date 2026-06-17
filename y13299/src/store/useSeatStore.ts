import { create } from 'zustand';
import type {
  SeatRecord,
  ExceptionItem,
  StatsData,
  HistoryEntry,
  FilterState,
  RecordStatus,
  AttachmentUploadRequest,
} from '../shared/types';

interface SeatState {
  records: SeatRecord[];
  currentRecord: SeatRecord | null;
  exceptions: ExceptionItem[];
  stats: StatsData;
  history: HistoryEntry[];
  loading: boolean;
  filters: FilterState;
  lastImportLog: string[];
}

interface SeatActions {
  fetchRecords: () => Promise<void>;
  fetchRecordById: (id: string) => Promise<void>;
  fetchExceptions: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchHistory: (recordId: string) => Promise<void>;
  updateJudgment: (recordId: string, status: RecordStatus, reason: string, markAsException?: boolean) => Promise<boolean>;
  addAttachment: (recordId: string, body: AttachmentUploadRequest) => Promise<boolean>;
  importBatch: () => Promise<boolean>;
  importLateAttachment: () => Promise<boolean>;
  setFilters: (filters: Partial<FilterState>) => void;
}

const initialStats: StatsData = {
  pending: 0,
  approved: 0,
  exception: 0,
  needEvidence: 0,
  suspectedDuplicate: 0,
  total: 0,
};

export const useSeatStore = create<SeatState & SeatActions>((set, get) => ({
  records: [],
  currentRecord: null,
  exceptions: [],
  stats: initialStats,
  history: [],
  loading: false,
  filters: { status: 'all', street: '', keyword: '' },
  lastImportLog: [],

  fetchRecords: async () => {
    set({ loading: true });
    try {
      const { status, street, keyword } = get().filters;
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (street) params.append('street', street);
      if (keyword) params.append('keyword', keyword);
      const res = await fetch(`/api/records?${params.toString()}`);
      const json = await res.json();
      set({ records: (json?.data as SeatRecord[]) || [], loading: false });
    } catch (error) {
      console.error(error);
      set({ loading: false });
    }
  },

  fetchRecordById: async (id: string) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/records/${id}`);
      const json = await res.json();
      set({ currentRecord: (json?.data as SeatRecord) || null, loading: false });
    } catch (error) {
      console.error(error);
      set({ loading: false });
    }
  },

  fetchExceptions: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/exceptions');
      const json = await res.json();
      set({ exceptions: (json?.data as ExceptionItem[]) || [], loading: false });
    } catch (error) {
      console.error(error);
      set({ loading: false });
    }
  },

  fetchStats: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/stats');
      const json = await res.json();
      set({ stats: (json?.data as StatsData) || initialStats, loading: false });
    } catch (error) {
      console.error(error);
      set({ loading: false });
    }
  },

  fetchHistory: async (recordId: string) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/records/${recordId}/history`);
      const json = await res.json();
      set({ history: (json?.data as HistoryEntry[]) || [], loading: false });
    } catch (error) {
      console.error(error);
      set({ loading: false });
    }
  },

  updateJudgment: async (recordId: string, status: RecordStatus, reason: string, markAsException?: boolean) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/records/${recordId}/judgment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reason,
          markAsException,
          operator: '周姐',
        }),
      });
      const ok = res.ok;
      if (ok) {
        await get().fetchRecords();
        await get().fetchRecordById(recordId);
        await get().fetchStats();
      }
      set({ loading: false });
      return ok;
    } catch (error) {
      console.error(error);
      set({ loading: false });
      return false;
    }
  },

  addAttachment: async (recordId: string, body: AttachmentUploadRequest) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/records/${recordId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const ok = res.ok;
      if (ok) {
        await get().fetchRecordById(recordId);
      }
      set({ loading: false });
      return ok;
    } catch (error) {
      console.error(error);
      set({ loading: false });
      return false;
    }
  },

  importBatch: async () => {
    set({ loading: true });
    try {
      const demoRecords = [
        {
          code: `GY-DEMO-${Date.now()}-01`,
          locationName: '新建路小游园',
          street: '新建路街道',
          status: 'pending',
          materialCompleteness: 65,
          points: [
            { lng: 121.475, lat: 31.235, source: '勘测院', batchId: 'demo-batch-001' },
          ],
          attachments: [
            { name: '现场勘察记录.pdf', type: 'application/pdf', batchId: 'demo-batch-001' },
          ],
          operator: '周姐',
        },
        {
          code: `GY-DEMO-${Date.now()}-02`,
          locationName: '锦绣路休憩角',
          street: '锦绣路街道',
          status: 'pending',
          materialCompleteness: 45,
          points: [
            { lng: 121.482, lat: 31.228, source: '社区报送', batchId: 'demo-batch-001' },
          ],
          attachments: [],
          operator: '周姐',
        },
      ];
      const res = await fetch('/api/import/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: demoRecords }),
      });
      const json = await res.json();
      if (res.ok) {
        await get().fetchRecords();
        await get().fetchStats();
        await get().fetchExceptions();
      }
      const imported = json?.data?.imported ?? 0;
      const total = json?.data?.total ?? 0;
      set({
        lastImportLog: [
          `[${new Date().toLocaleTimeString('zh-CN')}] 第一批材料导入完成`,
          `成功导入 ${imported}/${total} 条记录`,
          `新增 GIS 点位 ${imported} 个`,
          `已自动触发异常检测`,
        ],
        loading: false,
      });
      return res.ok;
    } catch (error) {
      console.error(error);
      set({ loading: false });
      return false;
    }
  },

  importLateAttachment: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/import/demo-late-attachment', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        await get().fetchRecords();
        await get().fetchStats();
        await get().fetchExceptions();
      }
      const msg = json?.data?.message ?? '';
      set({
        lastImportLog: [
          `[${new Date().toLocaleTimeString('zh-CN')}] 第二批晚到附件导入完成`,
          msg || '晚到附件已补录',
          `已自动触发异常检测，请查看异常队列`,
        ],
        loading: false,
      });
      return res.ok;
    } catch (error) {
      console.error(error);
      set({ loading: false });
      return false;
    }
  },

  setFilters: (filters: Partial<FilterState>) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },
}));
