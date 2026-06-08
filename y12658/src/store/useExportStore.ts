import { create } from 'zustand';
import type { ExportScreenshot, TimeConclusion, Resolution } from '@/types';
import { generateMockTimeConclusions } from '@/data/mockEddyData';
import { uid } from '@/utils/hash';

const LS_KEY = 'ocean-eddy-exports';

function loadExports(): ExportScreenshot[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

function saveExports(list: ExportScreenshot[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

interface ExportState {
  currentTimestamp: string;
  timestamps: string[];
  conclusions: TimeConclusion[];
  activeConclusionId: string | null;
  exports: ExportScreenshot[];
  showExportModal: boolean;
  pendingScreenshotDataUrl: string | null;
  setCurrentTimestamp: (ts: string) => void;
  setTimestamps: (list: string[]) => void;
  setActiveConclusionId: (id: string | null) => void;
  jumpToConclusion: (id: string) => void;
  loadInitialConclusions: () => void;
  addConclusion: (ts: string, value: number, text: string, linkedIds: string[]) => void;
  openExportModal: (dataUrl: string) => void;
  closeExportModal: () => void;
  commitExport: (opts: {
    filename: string;
    viewpointId?: string;
    hasLegend: boolean;
    hasWatermark: boolean;
    resolution: Resolution;
    checklist: ExportScreenshot['checklist'];
    dataUrl: string;
  }) => void;
  deleteExport: (id: string) => void;
  loadExports: () => void;
}

export const useExportStore = create<ExportState>((set, get) => ({
  currentTimestamp: '2026-06-01T10:00:00Z',
  timestamps: [],
  conclusions: [],
  activeConclusionId: null,
  exports: [],
  showExportModal: false,
  pendingScreenshotDataUrl: null,

  setCurrentTimestamp: (ts) => {
    set({ currentTimestamp: ts });
    const c = get().conclusions.find((cc) => cc.timestamp === ts);
    if (c) set({ activeConclusionId: c.id });
  },
  setTimestamps: (list) => set({ timestamps: list }),
  setActiveConclusionId: (id) => set({ activeConclusionId: id }),

  jumpToConclusion: (id) => {
    const c = get().conclusions.find((cc) => cc.id === id);
    if (!c) return;
    set({ currentTimestamp: c.timestamp, activeConclusionId: id });
  },

  loadInitialConclusions: () => {
    const cs = generateMockTimeConclusions();
    set({
      conclusions: cs,
      timestamps: cs.map((c) => c.timestamp),
      currentTimestamp: cs[2]?.timestamp ?? get().currentTimestamp,
      activeConclusionId: cs[2]?.id ?? null,
    });
  },

  addConclusion: (ts, value, text, linkedIds) => {
    const c: TimeConclusion = { id: uid(), timestamp: ts, parameterValue: value, conclusionText: text, linkedRecordIds: linkedIds };
    set({ conclusions: [...get().conclusions, c] });
  },

  openExportModal: (dataUrl) => set({ showExportModal: true, pendingScreenshotDataUrl: dataUrl }),
  closeExportModal: () => set({ showExportModal: false, pendingScreenshotDataUrl: null }),

  commitExport: (opts) => {
    const exp: ExportScreenshot = {
      id: uid(),
      filename: opts.filename,
      viewpointId: opts.viewpointId,
      hasLegend: opts.hasLegend,
      hasWatermark: opts.hasWatermark,
      resolution: opts.resolution,
      checklist: opts.checklist,
      createdAt: new Date().toISOString(),
      dataUrl: opts.dataUrl,
    };
    const next = [exp, ...get().exports];
    saveExports(next);
    set({ exports: next, showExportModal: false, pendingScreenshotDataUrl: null });
  },

  deleteExport: (id) => {
    const next = get().exports.filter((e) => e.id !== id);
    saveExports(next);
    set({ exports: next });
  },

  loadExports: () => set({ exports: loadExports() }),
}));
