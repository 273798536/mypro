import { create } from 'zustand';
import type { BatchInfo, BuoyData, ViolationRecord, WaterQualityRecord, FarmLog, Anomaly, ReviewRound, WarningLevel } from '../types';
import {
  batchInfo as mockBatch,
  buoyDataList as mockBuoyData,
  violationRecords as mockViolations,
  waterQualityRecords as mockWater,
  farmLogs as mockLogs,
  anomalies as mockAnomalies,
  reviewRounds as mockReviews,
} from '../data/mockData';
import { calculateWaterQualityLevel } from '../utils/calculations';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface SupplementWaterPayload {
  newValue?: number;
  noteContent: string;
  reviewer?: string;
  source?: string;
}

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
  addBuoyDataBatch: (dataList: Partial<BuoyData>[]) => { added: number; errors: string[] };
  addReviewNote: (waterId: string, note: Omit<WaterQualityRecord['reviewNotes'][0], 'id' | 'timestamp'>) => void;
  supplementWaterQuality: (waterId: string, payload: SupplementWaterPayload) => void;
  addFarmLog: (log: FarmLog) => void;
  updateFarmLog: (logId: string, content: string) => void;
  resolveAnomaly: (anomalyId: string) => void;
  addReviewRound: (round: ReviewRound) => void;
  addSupplementMaterial: (anomalyId: string, material: string) => void;
  adjustCaliber: (anomalyId: string, adjustment: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
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

  addBuoyDataBatch: (dataList) => {
    const errors: string[] = [];
    const validData: BuoyData[] = [];

    dataList.forEach((raw, idx) => {
      const required: (keyof BuoyData)[] = ['temperature', 'salinity', 'dissolvedOxygen', 'pH', 'chlorophyll', 'turbidity'];
      const missing = required.filter((k) => typeof raw[k] !== 'number');

      if (missing.length > 0) {
        errors.push(`第 ${idx + 1} 条缺少字段：${missing.join(', ')}`);
        return;
      }

      validData.push({
        id: raw.id || generateId(),
        timestamp: raw.timestamp || new Date().toISOString(),
        location: raw.location || { lat: 36.1234, lng: 120.5678 },
        temperature: raw.temperature as number,
        salinity: raw.salinity as number,
        dissolvedOxygen: raw.dissolvedOxygen as number,
        pH: raw.pH as number,
        chlorophyll: raw.chlorophyll as number,
        turbidity: raw.turbidity as number,
      });
    });

    if (validData.length > 0) {
      set((state) => ({
        buoyData: [...state.buoyData, ...validData],
      }));
    }

    return { added: validData.length, errors };
  },

  addReviewNote: (waterId, note) =>
    set((state) => ({
      waterQuality: state.waterQuality.map((w) =>
        w.id === waterId
          ? {
              ...w,
              reviewNotes: [
                ...w.reviewNotes,
                {
                  ...note,
                  id: generateId(),
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : w
      ),
    })),

  supplementWaterQuality: (waterId, payload) => {
    const state = get();
    const target = state.waterQuality.find((w) => w.id === waterId);
    if (!target) return;

    let newValue = target.value;
    let newLevel: WarningLevel = target.level;

    if (typeof payload.newValue === 'number') {
      newValue = payload.newValue;
      newLevel = calculateWaterQualityLevel(newValue, target.standard, target.index);
    }

    const newNote = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      reviewer: payload.reviewer || '当前用户',
      content:
        typeof payload.newValue === 'number'
          ? `补录检测值：${payload.newValue}${target.unit}。${payload.noteContent}`
          : payload.noteContent,
      isSupplement: true,
      source: payload.source || '人工复核',
    };

    set({
      waterQuality: state.waterQuality.map((w) =>
        w.id === waterId
          ? {
              ...w,
              value: newValue,
              level: newLevel,
              reviewNotes: [...w.reviewNotes, newNote],
            }
          : w
      ),
      anomalies: state.anomalies.filter(
        (a) =>
          !(
            a.relatedDataId === waterId &&
            a.category === 'supplement_material' &&
            typeof payload.newValue === 'number' &&
            newLevel === 'normal'
          )
      ),
    });
  },

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
