import { create } from 'zustand';
import type { PracticeReport } from '../types/report';

export interface CounterexampleEdit {
  counterexampleId: string;
  beforeConclusion: string;
  afterConclusion: string;
}

interface ReportState {
  report: PracticeReport | null;
  isGenerating: boolean;
  counterexampleEdits: CounterexampleEdit[];
}

interface ReportActions {
  setReport: (report: PracticeReport) => void;
  addCounterexampleEdit: (
    counterexampleId: string,
    beforeConclusion: string,
    afterConclusion: string
  ) => void;
  clearReport: () => void;
}

const initialState: ReportState = {
  report: null,
  isGenerating: false,
  counterexampleEdits: [],
};

export const useReportStore = create<ReportState & ReportActions>((set) => ({
  ...initialState,

  setReport: (report: PracticeReport) => {
    set({ report, isGenerating: false });
  },

  addCounterexampleEdit: (
    counterexampleId: string,
    beforeConclusion: string,
    afterConclusion: string
  ) => {
    set((state) => ({
      counterexampleEdits: [
        ...state.counterexampleEdits,
        { counterexampleId, beforeConclusion, afterConclusion },
      ],
    }));
  },

  clearReport: () => {
    set(initialState);
  },
}));
