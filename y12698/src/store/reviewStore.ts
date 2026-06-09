import { create } from 'zustand';
import type { ScreenshotItem } from '../types';
import { TIME_PARAMS } from '../data/sampleRecords';

interface ReviewState {
  currentTimeParam: string;
  timeParams: string[];
  showExportModal: boolean;
  showLegend: boolean;
  screenshots: ScreenshotItem[];
  selectedScreenshotIds: string[];
  setCurrentTimeParam: (t: string) => void;
  setShowExportModal: (v: boolean) => void;
  toggleLegend: () => void;
  addScreenshot: (s: ScreenshotItem) => void;
  removeScreenshot: (id: string) => void;
  toggleScreenshotSelection: (id: string) => void;
  selectAllScreenshots: () => void;
  clearScreenshotSelection: () => void;
  clearScreenshots: () => void;
}

const STORAGE_KEY = 'hydrothermal-screenshots';

function loadScreenshots(): ScreenshotItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function persistScreenshots(items: ScreenshotItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  currentTimeParam: TIME_PARAMS[0],
  timeParams: TIME_PARAMS,
  showExportModal: false,
  showLegend: true,
  screenshots: loadScreenshots(),
  selectedScreenshotIds: [],

  setCurrentTimeParam: (t) => set({ currentTimeParam: t }),
  setShowExportModal: (v) => set({ showExportModal: v }),
  toggleLegend: () => set({ showLegend: !get().showLegend }),

  addScreenshot: (s) => {
    const screenshots = [...get().screenshots, s];
    persistScreenshots(screenshots);
    set({ screenshots });
  },

  removeScreenshot: (id) => {
    const screenshots = get().screenshots.filter((s) => s.id !== id);
    persistScreenshots(screenshots);
    set({
      screenshots,
      selectedScreenshotIds: get().selectedScreenshotIds.filter((x) => x !== id),
    });
  },

  toggleScreenshotSelection: (id) => {
    const sel = get().selectedScreenshotIds;
    set({
      selectedScreenshotIds: sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id],
    });
  },

  selectAllScreenshots: () => {
    set({ selectedScreenshotIds: get().screenshots.map((s) => s.id) });
  },

  clearScreenshotSelection: () => set({ selectedScreenshotIds: [] }),
  clearScreenshots: () => {
    persistScreenshots([]);
    set({ screenshots: [], selectedScreenshotIds: [] });
  },
}));
