import { create } from 'zustand';
import type { Batch, BatchStatus, ReviseConclusionReq, Material } from '@shared/types';

interface UploadResult {
  ok: boolean;
  added: number;
  skipped: number;
  message: string;
}

interface BatchState {
  batches: Batch[];
  current: Batch | null;
  loading: boolean;
  filterStatus: BatchStatus | 'all';
  exportProgress: number | null;
  fetchBatches: () => Promise<void>;
  fetchBatch: (id: string) => Promise<void>;
  setFilter: (s: BatchStatus | 'all') => void;
  startBatch: (id: string) => Promise<void>;
  rerunBatch: (id: string) => Promise<void>;
  reviseConclusion: (id: string, payload: ReviseConclusionReq) => Promise<void>;
  uploadMaterials: (id: string, materials: Material[]) => Promise<UploadResult>;
  exportCSV: (id: string) => Promise<{ ok: boolean; message: string }>;
  resetExportProgress: () => void;
}

export const useBatchStore = create<BatchState>((set, get) => ({
  batches: [],
  current: null,
  loading: false,
  filterStatus: 'all',
  exportProgress: null,

  fetchBatches: async () => {
    set({ loading: true });
    const res = await fetch('/api/batches');
    const data = await res.json();
    set({ batches: data, loading: false });
  },

  fetchBatch: async (id: string) => {
    set({ loading: true });
    const res = await fetch(`/api/batches/${id}`);
    const data = await res.json();
    set({ current: data, loading: false });
  },

  setFilter: (s) => set({ filterStatus: s }),

  startBatch: async (id: string) => {
    await fetch(`/api/batches/${id}/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    setTimeout(() => get().fetchBatches(), 1400);
  },

  rerunBatch: async (id: string) => {
    await fetch(`/api/batches/${id}/rerun`, { method: 'POST' });
    setTimeout(() => {
      get().fetchBatches();
      if (get().current?.id === id) get().fetchBatch(id);
    }, 1400);
  },

  reviseConclusion: async (id: string, payload: ReviseConclusionReq) => {
    await fetch(`/api/batches/${id}/conclusion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await get().fetchBatches();
    if (get().current?.id === id) await get().fetchBatch(id);
  },

  uploadMaterials: async (id: string, materials: Material[]) => {
    const beforeCount = get().current?.materialCount ?? 0;
    const res = await fetch(`/api/batches/${id}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materials }),
    });
    const data = (await res.json()) as Batch;
    const skipped = materials.length - Math.max(0, data.materialCount - beforeCount);
    const added = materials.length - skipped;
    await get().fetchBatches();
    if (get().current?.id === id) await get().fetchBatch(id);
    const fresh = get().current;
    const actualAdded = Math.max(0, (fresh?.materialCount ?? 0) - beforeCount);
    const actualSkipped = materials.length - actualAdded;
    return {
      ok: res.ok,
      added: actualAdded,
      skipped: actualSkipped,
      message: actualSkipped > 0
        ? `补录成功：新增 ${actualAdded} 份，重复材料已跳过 ${actualSkipped} 份`
        : `补录成功：新增 ${actualAdded} 份材料`,
    };
  },

  exportCSV: async (id: string) => {
    set({ exportProgress: 10 });
    await new Promise((r) => setTimeout(r, 350));
    set({ exportProgress: 45 });
    const res = await fetch(`/api/batches/${id}/export`);
    const data = await res.json();
    set({ exportProgress: 85 });
    if (!data.consistencyVerified) {
      set({ exportProgress: null });
      return { ok: false, message: '页面状态与CSV字段不一致，已拦截' };
    }
    const bin = atob(data.content);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const blob = new Blob([buf], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename;
    a.click();
    URL.revokeObjectURL(url);
    set({ exportProgress: 100 });
    setTimeout(() => set({ exportProgress: null }), 1500);
    return { ok: true, message: `已校验一致性，文件：${data.filename}` };
  },

  resetExportProgress: () => set({ exportProgress: null }),
}));
