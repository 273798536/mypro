import { create } from 'zustand';
import type { BatchInfo, BuoyData, ViolationRecord, WaterQualityRecord, FarmLog, Anomaly, ReviewRound } from '../types';
import {
  batchInfo as mockBatch,
  buoyDataList as mockBuoyData,
  violationRecords as mockViolations,
  waterQualityRecords as mockWater,
  farmLogs as mockLogs,
  anomalies as mockAnomalies,
  reviewRounds as mockReviews,
} from '../data/mockData';

interface AppState {
  currentBatch: BatchInfo;
  buoyData: BuoyData[];
  violations: ViolationRecord[];
  waterQuality: WaterQualityRecord[];
  farmLogs: FarmLog[];
  anomalies: Anomaly[];
  reviewRounds: ReviewRound[];
  affectedConclusions: string[];
  activeTab: string;

  setActiveTab: (tab: string) => void;
  addBuoyData: (data: BuoyData) => void;
  addReviewNote: (waterId: string, note: WaterQualityRecord['reviewNotes'][0]) => void;
  addFarmLog: (log: FarmLog) => void;
  updateFarmLog: (logId: string, content: string) => void;
  resolveAnomaly: (anomalyId: string) => void;
  addReviewRound: (round: ReviewRound) => void;
  addSupplementMaterial: (anomalyId: string, material: string) => void;
  adjustCaliber: (anomalyId: string, adjustment: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentBatch: mockBatch,
  buoyData: mockBuoyData,
  violations: mockViolations,
  waterQuality: mockWater,
  farmLogs: mockLogs,
  anomalies: mockAnomalies,
  reviewRounds: mockReviews,
  affectedConclusions: ['conclusion-002', 'conclusion-004'],
  activeTab: 'overview',

  setActiveTab: (tab) => set({ activeTab: tab }),

  addBuoyData: (data) =>
    set((state) => ({
      buoyData: [...state.buoyData, data],
    })),

  addReviewNote: (waterId, note) =>
    set((state) => ({
      waterQuality: state.waterQuality.map((w) =>
        w.id === waterId ? { ...w, reviewNotes: [...w.reviewNotes, note] } : w
      ),
    })),

  addFarmLog: (log) =>
    set((state) => ({
      farmLogs: [...state.farmLogs, log],
    })),

  updateFarmLog: (logId, content) =>
    set((state) => ({
      farmLogs: state.farmLogs.map((log) =>
        log.id === logId
          ? {
              ...log,
              previousVersion: log.content,
              content,
              version: log.version + 1,
              isDelayed: false,
            }
          : log
      ),
      anomalies: state.anomalies.filter(
        (a) => !(a.relatedDataId === logId && a.category === 'supplement_material')
      ),
    })),

  resolveAnomaly: (anomalyId) =>
    set((state) => ({
      anomalies: state.anomalies.filter((a) => a.id !== anomalyId),
    })),

  addReviewRound: (round) =>
    set((state) => ({
      reviewRounds: [...state.reviewRounds, round],
    })),

  addSupplementMaterial: (anomalyId, material) =>
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === anomalyId
          ? { ...a, description: a.description + `\n已补充：${material}` }
          : a
      ),
    })),

  adjustCaliber: (anomalyId, adjustment) =>
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === anomalyId
          ? { ...a, description: a.description + `\n已调整：${adjustment}` }
          : a
      ),
    })),
}));
