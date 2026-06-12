import { create } from 'zustand';

interface UIStore {
  showDetailPanel: boolean;
  showFilterPanel: boolean;
  showTimeline: boolean;
  showMapOverview: boolean;
  showImportWizard: boolean;
  activeTab: 'home' | 'review' | 'history' | 'risks' | 'import';
  detailPanelWidth: number;
  toggleDetailPanel: () => void;
  toggleFilterPanel: () => void;
  toggleTimeline: () => void;
  toggleMapOverview: () => void;
  toggleImportWizard: () => void;
  setActiveTab: (tab: UIStore['activeTab']) => void;
  setDetailPanelWidth: (w: number) => void;
  showTerminalHint: (msg: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  showDetailPanel: true,
  showFilterPanel: true,
  showTimeline: false,
  showMapOverview: true,
  showImportWizard: false,
  activeTab: 'home',
  detailPanelWidth: 340,

  toggleDetailPanel: () => set((s) => ({ showDetailPanel: !s.showDetailPanel })),
  toggleFilterPanel: () => set((s) => ({ showFilterPanel: !s.showFilterPanel })),
  toggleTimeline: () => set((s) => ({ showTimeline: !s.showTimeline })),
  toggleMapOverview: () => set((s) => ({ showMapOverview: !s.showMapOverview })),
  toggleImportWizard: () => set((s) => ({ showImportWizard: !s.showImportWizard })),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setDetailPanelWidth: (w) => set({ detailPanelWidth: w }),

  showTerminalHint: (msg) => {
    console.log(`%c[海洋浮游生物计数] ${msg}`, 'color: #5AADCB; font-family: monospace;');
  },
}));
