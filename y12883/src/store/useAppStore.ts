import { create } from 'zustand';
import type {
  BuoyData,
  BuoyDataStatus,
  CorrectionRecord,
  CorrectionStatus,
  InspectionPhoto,
  WindWindowResult,
  CalculationParams,
} from '@/types';
import {
  mockBuoyData,
  mockCorrectionRecords,
  mockInspectionPhotos,
  mockWindWindowResult,
} from '@/data/mockData';
import { loadFromStorage, saveToStorage, isFirstVisit } from '@/utils/storage';
import { calculateWindWindow } from '@/utils/calculator';
import { generateId } from '@/utils/formatters';

interface AppState {
  buoyData: BuoyData[];
  correctionRecords: CorrectionRecord[];
  inspectionPhotos: InspectionPhoto[];
  windWindowResults: WindWindowResult[];
  isFirstVisit: boolean;
  selectedBuoyDataId: string | null;
  isInitialized: boolean;

  initData: () => void;
  loadSampleData: () => void;
  resetAllData: () => void;
  persistData: () => void;

  addBuoyData: (data: Omit<BuoyData, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBuoyData: (id: string, updates: Partial<BuoyData>) => void;
  updateBuoyStatus: (id: string, status: BuoyDataStatus) => void;
  deleteBuoyData: (id: string) => void;
  importBuoyData: (dataList: Omit<BuoyData, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    added: number;
    updated: number;
    duplicates: number;
  };

  addCorrectionRecord: (record: Omit<CorrectionRecord, 'id' | 'createdAt' | 'status'>) => void;
  approveCorrection: (id: string) => void;
  rejectCorrection: (id: string) => void;

  calculateWindow: (params: CalculationParams) => WindWindowResult;

  setSelectedBuoyDataId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  buoyData: [],
  correctionRecords: [],
  inspectionPhotos: [],
  windWindowResults: [],
  isFirstVisit: true,
  selectedBuoyDataId: null,
  isInitialized: false,

  initData: () => {
    if (get().isInitialized) return;

    const stored = loadFromStorage();
    if (stored && !stored.isFirstVisit) {
      set({
        buoyData: stored.buoyData || [],
        correctionRecords: stored.correctionRecords || [],
        inspectionPhotos: stored.inspectionPhotos || [],
        windWindowResults: stored.windWindowResults || [],
        isFirstVisit: false,
        isInitialized: true,
      });
    } else {
      set({
        isFirstVisit: true,
        isInitialized: true,
      });
    }
  },

  loadSampleData: () => {
    set({
      buoyData: mockBuoyData,
      correctionRecords: mockCorrectionRecords,
      inspectionPhotos: mockInspectionPhotos,
      windWindowResults: [mockWindWindowResult],
      isFirstVisit: false,
    });
    get().persistData();
  },

  resetAllData: () => {
    set({
      buoyData: [],
      correctionRecords: [],
      inspectionPhotos: [],
      windWindowResults: [],
      isFirstVisit: true,
      selectedBuoyDataId: null,
    });
    saveToStorage({
      buoyData: [],
      correctionRecords: [],
      inspectionPhotos: [],
      windWindowResults: [],
      isFirstVisit: true,
      lastUpdated: new Date().toISOString(),
    });
  },

  persistData: () => {
    const state = get();
    saveToStorage({
      buoyData: state.buoyData,
      correctionRecords: state.correctionRecords,
      inspectionPhotos: state.inspectionPhotos,
      windWindowResults: state.windWindowResults,
      isFirstVisit: state.isFirstVisit,
      lastUpdated: new Date().toISOString(),
    });
  },

  addBuoyData: (data) => {
    const now = new Date().toISOString();
    const newData: BuoyData = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      buoyData: [newData, ...state.buoyData],
    }));
    get().persistData();
  },

  updateBuoyData: (id, updates) => {
    set((state) => ({
      buoyData: state.buoyData.map((item) =>
        item.id === id
          ? { ...item, ...updates, updatedAt: new Date().toISOString() }
          : item
      ),
    }));
    get().persistData();
  },

  updateBuoyStatus: (id, status) => {
    get().updateBuoyData(id, { status });
  },

  deleteBuoyData: (id) => {
    set((state) => ({
      buoyData: state.buoyData.filter((item) => item.id !== id),
    }));
    get().persistData();
  },

  importBuoyData: (dataList) => {
    const existingData = get().buoyData;
    let added = 0;
    let updated = 0;
    let duplicates = 0;

    const updatedList = [...existingData];

    dataList.forEach((data) => {
      const existingIndex = updatedList.findIndex(
        (item) =>
          item.stationName === data.stationName &&
          item.timestamp === data.timestamp
      );

      if (existingIndex >= 0) {
        duplicates++;
        const existing = updatedList[existingIndex];
        if (
          existing.windSpeed !== data.windSpeed ||
          existing.waveHeight !== data.waveHeight ||
          existing.visibility !== data.visibility
        ) {
          updatedList[existingIndex] = {
            ...existing,
            ...data,
            updatedAt: new Date().toISOString(),
          };
          updated++;
        }
      } else {
        const now = new Date().toISOString();
        updatedList.unshift({
          ...data,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        });
        added++;
      }
    });

    updatedList.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    set({ buoyData: updatedList });
    get().persistData();

    return { added, updated, duplicates };
  },

  addCorrectionRecord: (record) => {
    const now = new Date().toISOString();
    const newRecord: CorrectionRecord = {
      ...record,
      id: generateId(),
      createdAt: now,
      status: 'pending',
    };
    set((state) => ({
      correctionRecords: [newRecord, ...state.correctionRecords],
    }));
    get().persistData();
  },

  approveCorrection: (id) => {
    const record = get().correctionRecords.find((r) => r.id === id);
    if (!record) return;

    set((state) => ({
      correctionRecords: state.correctionRecords.map((r) =>
        r.id === id
          ? { ...r, status: 'approved' as CorrectionStatus, confirmedAt: new Date().toISOString() }
          : r
      ),
      buoyData: state.buoyData.map((b) =>
        b.id === record.buoyDataId
          ? {
              ...b,
              [record.fieldName]: record.newValue,
              updatedAt: new Date().toISOString(),
            }
          : b
      ),
    }));
    get().persistData();
  },

  rejectCorrection: (id) => {
    set((state) => ({
      correctionRecords: state.correctionRecords.filter((r) => r.id !== id),
    }));
    get().persistData();
  },

  calculateWindow: (params) => {
    const result = calculateWindWindow(params);
    set((state) => ({
      windWindowResults: [result, ...state.windWindowResults],
    }));
    get().persistData();
    return result;
  },

  setSelectedBuoyDataId: (id) => {
    set({ selectedBuoyDataId: id });
  },
}));
