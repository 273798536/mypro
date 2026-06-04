import { create } from 'zustand';
import type { Report, Selection } from '@/types';

interface ReportStore {
  currentReport: Report | null;
  generateReport: (sampleId: string, selections: Selection[], mandarinExplanation: string) => void;
  clearReport: () => void;
}

export const useReportStore = create<ReportStore>((set) => ({
  currentReport: null,
  generateReport: (sampleId, selections, mandarinExplanation) => {
    const summary = {
      total: selections.length,
      passed: selections.filter(s => s.detectionResult === 'pass').length,
      warnings: selections.filter(s => s.detectionResult === 'warning').length,
      failed: selections.filter(s => s.detectionResult === 'fail').length
    };

    const report: Report = {
      id: `report-${Date.now()}`,
      sampleId,
      selections,
      summary,
      mandarinExplanation,
      generatedAt: new Date()
    };

    set({ currentReport: report });
  },
  clearReport: () => set({ currentReport: null })
}));
