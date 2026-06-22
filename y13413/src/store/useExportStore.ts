import { create } from 'zustand';
import Papa from 'papaparse';
import type { ReviewRecord } from '@/types';
import { useBatchStore } from './useBatchStore';
import { useRecordStore } from './useRecordStore';

const statusTextMap: Record<ReviewRecord['status'], string> = {
  new: '待审核',
  reviewing: '审核中',
  approved: '已通过',
  skipped: '已跳过',
  anomaly: '异常',
  normal: '正常',
};

interface ExportActions {
  generateCSV: (batchId: string) => string;
  getReportData: (
    batchIds: string[]
  ) => {
    summary: { total: number; new: number; skipped: number; anomaly: number };
    newRecords: ReviewRecord[];
    skippedRecords: ReviewRecord[];
    anomalyRecords: ReviewRecord[];
  };
}

export const useExportStore = create<ExportActions>(() => ({
  generateCSV: (batchId: string) => {
    const records = useRecordStore.getState().getRecordsByBatch(batchId);
    const rows = records.map((r) => {
      const currentVersion = r.versions.find((v) => v.id === r.currentVersionId);
      return {
        记录编号: r.recordNo,
        状态: statusTextMap[r.status] || r.status,
        来源文件: r.sourceFile,
        当前版本: currentVersion ? `v${currentVersion.version}` : '-',
        创建时间: r.createdAt,
        是否越界: r.isOutOfBounds ? '是' : '否',
        一致性校验: r.consistencyCheck ? '通过' : '失败',
      };
    });
    return Papa.unparse(rows);
  },

  getReportData: (batchIds: string[]) => {
    const allRecords: ReviewRecord[] = [];
    batchIds.forEach((batchId) => {
      const records = useRecordStore.getState().getRecordsByBatch(batchId);
      allRecords.push(...records);
    });

    const newRecords = allRecords.filter((r) => r.status === 'new');
    const skippedRecords = allRecords.filter((r) => r.status === 'skipped');
    const anomalyRecords = allRecords.filter((r) => r.status === 'anomaly');

    return {
      summary: {
        total: allRecords.length,
        new: newRecords.length,
        skipped: skippedRecords.length,
        anomaly: anomalyRecords.length,
      },
      newRecords,
      skippedRecords,
      anomalyRecords,
    };
  },
}));
