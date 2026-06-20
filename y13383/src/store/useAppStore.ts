import { create } from 'zustand';
import { HandoverChecklist } from '@/types';

interface AppState {
  selectedSampleId: string | null;
  drawerOpen: boolean;
  currentBatchId: string;
  activeStatusFilter: 'all' | 'processed' | 'pending_material' | 'manual_review';
  handoverChecklist: HandoverChecklist;
  activeView: 'teacher' | 'engineer';
  openDrawer: (sampleId: string) => void;
  closeDrawer: () => void;
  setStatusFilter: (f: AppState['activeStatusFilter']) => void;
  toggleChecklistItem: (key: keyof HandoverChecklist) => void;
  setActiveView: (v: AppState['activeView']) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedSampleId: null,
  drawerOpen: false,
  currentBatchId: 'batch_v1_3_20260620',
  activeStatusFilter: 'all',
  activeView: 'teacher',
  handoverChecklist: {
    caliperAligned: true,
    boundaryMarked: true,
    pollutionIsolated: true,
    grayBreakdownReady: true,
  },
  openDrawer: (sampleId) => set({ selectedSampleId: sampleId, drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false, selectedSampleId: null }),
  setStatusFilter: (f) => set({ activeStatusFilter: f }),
  toggleChecklistItem: (key) =>
    set((s) => ({
      handoverChecklist: { ...s.handoverChecklist, [key]: !s.handoverChecklist[key] },
    })),
  setActiveView: (v) => set({ activeView: v }),
}));
