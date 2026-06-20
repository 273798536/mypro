import { create } from 'zustand';
import type { TimelineEvent, LateFeature, ConsistencyReport } from '@/types';
import {
  exportTimelineCSV, exportTimelineJSON, exportLateFeaturesCSV, downloadFile
} from '@/utils/exportHelpers';
import { formatTime } from '@/utils/time';

interface ExportState {
  isExporting: boolean;
  exportProgress: number;
  lastExportLog: string | null;
  simulateProgress: () => void;
  exportTimeline: (format: 'csv' | 'json', events: TimelineEvent[], report: ConsistencyReport | null) => void;
  exportLateFeatures: (features: LateFeature[]) => void;
  clearLog: () => void;
}

export const useExportStore = create<ExportState>((set, _get) => ({
  isExporting: false,
  exportProgress: 0,
  lastExportLog: null,
  simulateProgress: () => {
    set({ isExporting: true, exportProgress: 0 });
    let p = 0;
    const t = setInterval(() => {
      p += 20;
      set({ exportProgress: Math.min(p, 100) });
      if (p >= 100) {
        clearInterval(t);
        setTimeout(() => set({ isExporting: false }), 300);
      }
    }, 120);
  },
  exportTimeline: (format, events, report) => {
    if (!report) {
      set({ lastExportLog: '请先执行一致性校验后再导出' });
      return;
    }
    set({ isExporting: true, exportProgress: 0 });
    let p = 0;
    const t = setInterval(() => {
      p += 25;
      set({ exportProgress: Math.min(p, 100) });
      if (p >= 100) {
        clearInterval(t);
        const ts = formatTime(new Date().toISOString()).replace(/[-: ]/g, '');
        if (format === 'csv') {
          downloadFile(exportTimelineCSV(events, report), `timeline_${ts}.csv`, 'text/csv;charset=utf-8');
        } else {
          downloadFile(exportTimelineJSON(events, report), `timeline_${ts}.json`, 'application/json');
        }
        set({ lastExportLog: `✓ 时间线导出成功: ${report.summary}` });
        setTimeout(() => set({ isExporting: false }), 300);
      }
    }, 100);
  },
  exportLateFeatures: (features) => {
    set({ isExporting: true, exportProgress: 0 });
    let p = 0;
    const t = setInterval(() => {
      p += 33;
      set({ exportProgress: Math.min(p, 100) });
      if (p >= 100) {
        clearInterval(t);
        const ts = formatTime(new Date().toISOString()).replace(/[-: ]/g, '');
        downloadFile(exportLateFeaturesCSV(features), `late_features_${ts}.csv`, 'text/csv;charset=utf-8');
        set({ lastExportLog: `✓ 特征迟到隔离清单导出成功 (${features.length} 条记录)` });
        setTimeout(() => set({ isExporting: false }), 300);
      }
    }, 100);
  },
  clearLog: () => set({ lastExportLog: null })
}));
