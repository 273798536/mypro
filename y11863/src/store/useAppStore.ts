import { create } from 'zustand';
import type {
  BuildingModel,
  MeterData,
  MergeDiff,
  EnergyType,
  CameraState,
  HistoryRecord,
} from '../types';
import { mockBuildingModel, mockMeterData } from '../data/mockData';
import { detectDifferences } from '../utils/diffDetector';
import {
  saveHistoryRecord,
  getAllHistoryRecords,
  deleteHistoryRecord,
  generateRecordId,
  isDuplicateRecord,
} from '../utils/idb';

interface AppStore {
  buildingModel: BuildingModel;
  meterData: MeterData;
  mergeDiffs: MergeDiff[];
  selectedFloor: string | null;
  selectedDevice: string | null;
  energyType: EnergyType;
  timeRange: { start: string; end: string };
  isDataManagementOpen: boolean;
  isHistoryOpen: boolean;
  cameraState: CameraState | null;
  historyRecords: HistoryRecord[];
  isLoading: boolean;

  setBuildingModel: (model: BuildingModel) => void;
  setMeterData: (data: MeterData) => void;
  setSelectedFloor: (floorId: string | null) => void;
  setSelectedDevice: (deviceId: string | null) => void;
  setEnergyType: (type: EnergyType) => void;
  setTimeRange: (range: { start: string; end: string }) => void;
  setDataManagementOpen: (open: boolean) => void;
  setHistoryOpen: (open: boolean) => void;
  setCameraState: (state: CameraState | null) => void;

  detectMergeDiffs: () => void;
  loadHistoryRecords: () => Promise<void>;
  saveCurrentView: (name: string, notes?: string) => Promise<boolean>;
  removeHistoryRecord: (id: string) => Promise<void>;
  restoreView: (record: HistoryRecord) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  buildingModel: mockBuildingModel,
  meterData: mockMeterData,
  mergeDiffs: [],
  selectedFloor: null,
  selectedDevice: null,
  energyType: 'electricity',
  timeRange: {
    start: mockMeterData.period.start,
    end: mockMeterData.period.end,
  },
  isDataManagementOpen: false,
  isHistoryOpen: false,
  cameraState: null,
  historyRecords: [],
  isLoading: false,

  setBuildingModel: (model) => set({ buildingModel: model }),
  setMeterData: (data) => set({ meterData: data }),
  setSelectedFloor: (floorId) => set({ selectedFloor: floorId }),
  setSelectedDevice: (deviceId) => set({ selectedDevice: deviceId }),
  setEnergyType: (type) => set({ energyType: type }),
  setTimeRange: (range) => set({ timeRange: range }),
  setDataManagementOpen: (open) => set({ isDataManagementOpen: open }),
  setHistoryOpen: (open) => set({ isHistoryOpen: open }),
  setCameraState: (state) => set({ cameraState: state }),

  detectMergeDiffs: () => {
    const { buildingModel, meterData } = get();
    const diffs = detectDifferences(buildingModel, meterData);
    set({ mergeDiffs: diffs });
  },

  loadHistoryRecords: async () => {
    set({ isLoading: true });
    try {
      const records = await getAllHistoryRecords();
      set({ historyRecords: records });
    } catch (error) {
      console.error('Failed to load history records:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  saveCurrentView: async (name: string, notes?: string) => {
    const { cameraState, energyType, timeRange, buildingModel } = get();
    
    if (!cameraState) {
      return false;
    }

    const isDuplicate = await isDuplicateRecord(
      cameraState.position,
      energyType,
      timeRange
    );

    if (isDuplicate) {
      return false;
    }

    const record: HistoryRecord = {
      id: generateRecordId(),
      timestamp: new Date().toISOString(),
      name,
      cameraState,
      parameters: {
        energyType,
        timeRange,
        selectedFloors: [],
      },
      notes,
    };

    await saveHistoryRecord(record);
    await get().loadHistoryRecords();
    return true;
  },

  removeHistoryRecord: async (id: string) => {
    await deleteHistoryRecord(id);
    await get().loadHistoryRecords();
  },

  restoreView: (record: HistoryRecord) => {
    set({
      energyType: record.parameters.energyType,
      timeRange: record.parameters.timeRange,
      cameraState: record.cameraState,
      isHistoryOpen: false,
    });
  },
}));
