import { create } from 'zustand';
import { CrackPoint, HistoryRecord, DataGap, RiskReport, AppState } from '../types';
import { mockCracks, mockHistory, mockDataGaps, mockReports } from '../data/mockData';
import { detectDuplicates } from '../utils/duplicateDetection';
import { detectDataGaps } from '../utils/dataGapDetection';
import { createHistoryRecord, compareCracks } from '../utils/historyManager';
import { generateRiskReport } from '../utils/reportGenerator';
import { format } from 'date-fns';

interface AppActions {
  setSelectedCrack: (crack: CrackPoint | null) => void;
  setEditingCrack: (crack: CrackPoint | null) => void;
  updateCrack: (updatedCrack: CrackPoint, operator: string) => void;
  markAsNotDuplicate: (crackId: string, operator: string) => void;
  deleteCrack: (crackId: string, operator: string) => void;
  runDuplicateDetection: () => void;
  runDataGapDetection: () => void;
  generateReport: () => void;
  resetToOriginal: () => void;
  getCrackHistory: (crackId: string) => HistoryRecord[];
}

export const useAppStore = create<AppState & AppActions>((set, get) => {
  const initialCracks = detectDuplicates([...mockCracks]);
  const initialGaps = detectDataGaps(initialCracks);

  return {
    cracks: initialCracks,
    selectedCrack: null,
    history: [...mockHistory],
    dataGaps: initialGaps,
    reports: [...mockReports],
    originalCracks: JSON.parse(JSON.stringify(mockCracks)),
    editingCrack: null,

    setSelectedCrack: (crack) => set({ selectedCrack: crack }),

    setEditingCrack: (crack) => set({ editingCrack: crack }),

    updateCrack: (updatedCrack, operator) => {
      const state = get();
      const oldCrack = state.cracks.find((c) => c.id === updatedCrack.id);

      if (!oldCrack) return;

      const changes = compareCracks(oldCrack, updatedCrack);
      const newHistory = [...state.history];

      changes.forEach((change) => {
        newHistory.push(
          createHistoryRecord(
            updatedCrack.id,
            'update',
            operator,
            change.field,
            change.oldValue,
            change.newValue,
            '手动修正',
          ),
        );
      });

      const updatedCracks = state.cracks.map((c) =>
        c.id === updatedCrack.id
          ? { ...updatedCrack, updateTime: format(new Date(), 'yyyy-MM-dd HH:mm:ss') }
          : c,
      );

      const newGaps = detectDataGaps(updatedCracks);

      set({
        cracks: updatedCracks,
        history: newHistory,
        dataGaps: newGaps,
        selectedCrack: updatedCrack,
        editingCrack: null,
      });
    },

    markAsNotDuplicate: (crackId, operator) => {
      const state = get();
      const crack = state.cracks.find((c) => c.id === crackId);

      if (!crack) return;

      const newHistory = [
        ...state.history,
        createHistoryRecord(
          crackId,
          'update',
          operator,
          'isDuplicate',
          'true',
          'false',
          '人工确认非重复',
        ),
      ];

      const updatedCracks = state.cracks.map((c) =>
        c.id === crackId
          ? {
              ...c,
              isDuplicate: false,
              status: 'normal' as const,
              duplicateOf: undefined,
              updateTime: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
            }
          : c,
      );

      set({
        cracks: updatedCracks,
        history: newHistory,
        selectedCrack: updatedCracks.find((c) => c.id === crackId) || null,
      });
    },

    deleteCrack: (crackId, operator) => {
      const state = get();
      const crack = state.cracks.find((c) => c.id === crackId);

      if (!crack) return;

      const newHistory = [
        ...state.history,
        createHistoryRecord(crackId, 'delete', operator, undefined, undefined, undefined, '删除重复/异常记录'),
      ];

      const updatedCracks = state.cracks.filter((c) => c.id !== crackId);
      const newGaps = detectDataGaps(updatedCracks);

      set({
        cracks: updatedCracks,
        history: newHistory,
        dataGaps: newGaps,
        selectedCrack: null,
      });
    },

    runDuplicateDetection: () => {
      const state = get();
      const detectedCracks = detectDuplicates([...state.cracks]);
      set({ cracks: detectedCracks });
    },

    runDataGapDetection: () => {
      const state = get();
      const gaps = detectDataGaps(state.cracks);
      set({ dataGaps: gaps });
    },

    generateReport: () => {
      const state = get();
      const report = generateRiskReport(state.cracks);
      set({ reports: [...state.reports, report] });
    },

    resetToOriginal: () => {
      const original = JSON.parse(JSON.stringify(get().originalCracks));
      const resetCracks = detectDuplicates(original);
      const resetGaps = detectDataGaps(resetCracks);
      set({
        cracks: resetCracks,
        dataGaps: resetGaps,
        selectedCrack: null,
        editingCrack: null,
      });
    },

    getCrackHistory: (crackId) => {
      return get()
        .history.filter((h) => h.crackId === crackId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },
  };
});
