import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as XLSX from 'xlsx';
import type {
  RunBatch,
  MeasurementRecord,
  Anomaly,
  ReviewAction,
  CutPlaneState,
  AnomalyType,
  AnomalyStatus,
} from '@/types';
import {
  sampleBatches,
  sampleRecords,
  sampleAnomalies,
  sampleReviewActions,
} from '@/data/sampleData';

interface AppState {
  batches: RunBatch[];
  currentBatchId: string | null;
  records: MeasurementRecord[];
  anomalies: Anomaly[];
  reviewActions: ReviewAction[];
  cutPlanes: CutPlaneState;
  selectedRecordId: string | null;
  isSampleLoaded: boolean;

  setCurrentBatch: (id: string) => void;
  loadSampleData: () => void;
  importRecords: (batchName: string, records: MeasurementRecord[]) => void;
  reviewAnomaly: (
    anomalyId: string,
    action: 'APPROVE' | 'REJECT',
    reason: string,
    operator: string
  ) => void;
  setCutPlane: (axis: 'x' | 'y' | 'z', value: number | null) => void;
  setSelectedRecord: (id: string | null) => void;
  resetCutPlanes: () => void;
  exportReport: (options: { onlyAnomalies: boolean; format: 'xlsx' | 'csv' }) => {
    blob: Blob;
    filename: string;
  };
  detectAnomaliesForBatch: (batchId: string) => void;
}

const detectAnomaliesForRecords = (
  records: MeasurementRecord[]
): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  const now = new Date().toISOString();
  const sorted = [...records].sort(
    (a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
  );

  records.forEach((rec) => {
    if (rec.weight > 25000) {
      anomalies.push({
        id: `anom-auto-${rec.id}-weight`,
        recordId: rec.id,
        type: 'WEIGHT_OVERLOAD',
        severity: 'CRITICAL',
        description: `单件货物重量 ${rec.weight}kg 超过 ${rec.cabinNo} 舱单件限重 25000kg`,
        status: 'PENDING',
        detectedAt: now,
      });
    }

    if (rec.positionX > 6 || rec.positionX < 0) {
      anomalies.push({
        id: `anom-auto-${rec.id}-pos`,
        recordId: rec.id,
        type: 'POSITION_OUTLIER',
        severity: 'WARNING',
        description: `X 坐标 ${rec.positionX} 超出 ${rec.cabinNo} 舱正常范围 (0-6)，位置偏离`,
        status: 'PENDING',
        detectedAt: now,
      });
    }
  });

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const diff =
        new Date(sorted[i].measuredAt).getTime() -
        new Date(sorted[i - 1].measuredAt).getTime();
      if (diff > 60000 || diff < -60000) {
        const target = Math.abs(diff) > 120000 ? sorted[i] : sorted[i - 1];
        const existing = anomalies.find(
          (a) => a.recordId === target.id && a.type === 'TIMESTAMP_MISMATCH'
        );
        if (!existing) {
          anomalies.push({
            id: `anom-auto-${target.id}-ts`,
            recordId: target.id,
            type: 'TIMESTAMP_MISMATCH',
            severity: Math.abs(diff) > 120000 ? 'CRITICAL' : 'WARNING',
            description: `该货物测量时间与相邻记录偏差 ${Math.round(
              Math.abs(diff) / 1000
            )} 秒，存在时间轴不同步风险`,
            status: 'PENDING',
            detectedAt: now,
          });
        }
      }
    }
  }

  return anomalies;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      batches: [],
      currentBatchId: null,
      records: [],
      anomalies: [],
      reviewActions: [],
      cutPlanes: { x: null, y: null, z: null },
      selectedRecordId: null,
      isSampleLoaded: false,

      setCurrentBatch: (id) => {
        set({ currentBatchId: id });
      },

      loadSampleData: () => {
        const state = get();
        if (state.isSampleLoaded && state.batches.length > 0) {
          set({ currentBatchId: state.batches[state.batches.length - 1].id });
          return;
        }
        set({
          batches: sampleBatches,
          currentBatchId: 'batch-002',
          records: sampleRecords,
          anomalies: sampleAnomalies,
          reviewActions: sampleReviewActions,
          isSampleLoaded: true,
        });
      },

      importRecords: (batchName, newRecords) => {
        const state = get();
        const batchId = `batch-${Date.now()}`;
        const newBatch: RunBatch = {
          id: batchId,
          name: batchName,
          runAt: new Date().toISOString(),
          operator: '当前用户',
        };
        const stampedRecords = newRecords.map((r) => ({
          ...r,
          id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          batchId,
          createdAt: new Date().toISOString(),
        }));
        const newAnomalies = detectAnomaliesForRecords(stampedRecords);
        set({
          batches: [...state.batches, newBatch],
          currentBatchId: batchId,
          records: [...state.records, ...stampedRecords],
          anomalies: [...state.anomalies, ...newAnomalies],
        });
      },

      reviewAnomaly: (anomalyId, action, reason, operator) => {
        const state = get();
        const anomaly = state.anomalies.find((a) => a.id === anomalyId);
        if (!anomaly) return;

        const newStatus: AnomalyStatus =
          action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        const review: ReviewAction = {
          id: `act-${Date.now()}`,
          anomalyId,
          operator,
          action,
          reason,
          beforeData: anomaly.status,
          afterData: newStatus,
          operatedAt: new Date().toISOString(),
        };
        set({
          anomalies: state.anomalies.map((a) =>
            a.id === anomalyId ? { ...a, status: newStatus } : a
          ),
          reviewActions: [...state.reviewActions, review],
        });
      },

      setCutPlane: (axis, value) => {
        const state = get();
        set({ cutPlanes: { ...state.cutPlanes, [axis]: value } });
      },

      setSelectedRecord: (id) => {
        set({ selectedRecordId: id });
      },

      resetCutPlanes: () => {
        set({ cutPlanes: { x: null, y: null, z: null } });
      },

      detectAnomaliesForBatch: (batchId) => {
        const state = get();
        const batchRecords = state.records.filter((r) => r.batchId === batchId);
        const existingIds = new Set(
          state.anomalies
            .filter((a) => batchRecords.some((r) => r.id === a.recordId))
            .map((a) => a.recordId + a.type)
        );
        const newDetected = detectAnomaliesForRecords(batchRecords).filter(
          (a) => !existingIds.has(a.recordId + a.type)
        );
        if (newDetected.length > 0) {
          set({ anomalies: [...state.anomalies, ...newDetected] });
        }
      },

      exportReport: ({ onlyAnomalies, format }) => {
        const state = get();
        const batch = state.batches.find((b) => b.id === state.currentBatchId);
        const batchRecords = state.records.filter(
          (r) => r.batchId === state.currentBatchId
        );
        const batchAnomalies = state.anomalies.filter((a) =>
          batchRecords.some((r) => r.id === a.recordId)
        );
        const anomalyRecordIds = new Set(batchAnomalies.map((a) => a.recordId));

        const targetRecords = onlyAnomalies
          ? batchRecords.filter((r) => anomalyRecordIds.has(r.id))
          : batchRecords;

        const rows = targetRecords.map((r) => {
          const anoms = batchAnomalies.filter((a) => a.recordId === r.id);
          const actions = state.reviewActions.filter((ra) =>
            anoms.some((a) => a.id === ra.anomalyId)
          );
          return {
            货物编号: r.cargoNo,
            船舱编号: r.cabinNo,
            X坐标: r.positionX,
            Y坐标: r.positionY,
            Z坐标: r.positionZ,
            重量_kg: r.weight,
            体积_m3: r.volume,
            测量时间: r.measuredAt,
            测量来源: r.measurementSource,
            测量设备: r.measurementDevice,
            异常类型: anoms.map((a) => a.type).join(';') || '无',
            异常描述: anoms.map((a) => a.description).join(' | ') || '无',
            复核状态: anoms.length
              ? anoms.map((a) => a.status).join(';')
              : '正常',
            处理意见: actions.length
              ? actions.map((a) => `${a.operator}: ${a.reason}`).join(' | ')
              : '',
            批次: batch?.name || '',
            运行时间: batch?.runAt || '',
          };
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '配载复核结果');

        const batchLabel = batch ? batch.id.replace('batch-', '') : 'unknown';
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, 19);
        const scopeLabel = onlyAnomalies ? '仅异常' : '全部';
        const filename = `船舱配载复核_批次${batchLabel}_${scopeLabel}_${timestamp}.${format}`;

        let blob: Blob;
        if (format === 'csv') {
          const csv = XLSX.utils.sheet_to_csv(ws);
          blob = new Blob(['\ufeff' + csv], {
            type: 'text/csv;charset=utf-8;',
          });
        } else {
          const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          blob = new Blob([wbout], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
        }

        return { blob, filename };
      },
    }),
    {
      name: 'cargo-stowage-3d-store',
      partialize: (state) => ({
        batches: state.batches,
        currentBatchId: state.currentBatchId,
        records: state.records,
        anomalies: state.anomalies,
        reviewActions: state.reviewActions,
        isSampleLoaded: state.isSampleLoaded,
      }),
    }
  )
);

export const getRecordsOfCurrentBatch = (): MeasurementRecord[] => {
  const { records, currentBatchId } = useAppStore.getState();
  return records.filter((r) => r.batchId === currentBatchId);
};

export const getAnomaliesOfCurrentBatch = (): Anomaly[] => {
  const recs = getRecordsOfCurrentBatch();
  const recIds = new Set(recs.map((r) => r.id));
  return useAppStore.getState().anomalies.filter((a) => recIds.has(a.recordId));
};

export const getAnomaliesByType = (
  type: AnomalyType | 'ALL'
): Anomaly[] => {
  const batchAnoms = getAnomaliesOfCurrentBatch();
  if (type === 'ALL') return batchAnoms;
  return batchAnoms.filter((a) => a.type === type);
};
