import { create } from 'zustand';
import type {
  GapSensorData,
  SpeedRecord,
  CarMapping,
  ThresholdVersion,
  JudgmentResult,
  WorkOrder,
  CorrectionRecord,
  ImportState,
  SectionAttribution,
} from '@/types';
import { storage } from '@/utils/storage';
import {
  executeJudgment,
  compareResults,
  generateWorkOrders,
  recalculateWithNewThreshold,
} from '@/utils/calculationEngine';
import {
  mockThresholdVersions,
  mockSectionAttributions,
  mockCarMappings,
} from '@/utils/mockData';

interface AppState {
  gapSensorData: GapSensorData[];
  speedRecords: SpeedRecord[];
  carMappings: CarMapping[];
  thresholdVersions: ThresholdVersion[];
  currentThresholdId: string | null;
  judgmentResults: JudgmentResult[];
  phase1Results: JudgmentResult[];
  phase2Results: JudgmentResult[];
  workOrders: WorkOrder[];
  correctionRecords: CorrectionRecord[];
  sectionAttributions: SectionAttribution[];
  importState: ImportState;
  selectedResult: JudgmentResult | null;
  isLoading: boolean;
  error: string | null;

  initializeData: () => void;
  setGapSensorData: (data: GapSensorData[]) => void;
  setSpeedRecords: (data: SpeedRecord[]) => void;
  setCarMappings: (data: CarMapping[]) => void;
  executePhase1Judgment: () => void;
  executePhase2Judgment: () => void;
  getPhaseComparison: () => ReturnType<typeof compareResults> | null;
  setCurrentThreshold: (id: string) => void;
  addThresholdVersion: (version: Omit<ThresholdVersion, 'id'>) => void;
  recalculateWithThreshold: (thresholdId: string) => void;
  generateWorkOrdersFromResults: () => WorkOrder[];
  updateWorkOrderStatus: (id: string, status: WorkOrder['status']) => void;
  applyCarMappingCorrection: (correctedMappings: CarMapping[], operator: string) => CorrectionRecord;
  setSelectedResult: (result: JudgmentResult | null) => void;
  clearAllData: () => void;
  runConsistencyCheck: () => boolean;
}

export const useStore = create<AppState>((set, get) => ({
  gapSensorData: [],
  speedRecords: [],
  carMappings: [],
  thresholdVersions: [],
  currentThresholdId: null,
  judgmentResults: [],
  phase1Results: [],
  phase2Results: [],
  workOrders: [],
  correctionRecords: [],
  sectionAttributions: [],
  importState: {
    phase: 'PHASE1',
    hasGapData: false,
    hasSpeedData: false,
    hasCarMapping: false,
  },
  selectedResult: null,
  isLoading: false,
  error: null,

  initializeData: () => {
    let thresholdVersions = storage.getThresholdVersions();
    let sectionAttributions = storage.getSectionAttributions();
    let carMappings = storage.getCarMappings();
    let currentThresholdId = storage.getCurrentThresholdId();

    if (thresholdVersions.length === 0) {
      thresholdVersions = mockThresholdVersions;
      storage.setThresholdVersions(thresholdVersions);
    }
    if (sectionAttributions.length === 0) {
      sectionAttributions = mockSectionAttributions;
      storage.setSectionAttributions(sectionAttributions);
    }
    if (carMappings.length === 0) {
      carMappings = mockCarMappings;
      storage.setCarMappings(carMappings);
    }
    if (!currentThresholdId && thresholdVersions.length > 0) {
      currentThresholdId = thresholdVersions[0].id;
      storage.setCurrentThresholdId(currentThresholdId);
    }

    set({
      thresholdVersions,
      currentThresholdId,
      sectionAttributions,
      carMappings,
      judgmentResults: storage.getJudgmentResults(),
      workOrders: storage.getWorkOrders(),
      correctionRecords: storage.getCorrectionRecords(),
      gapSensorData: storage.getGapSensorData(),
      speedRecords: storage.getSpeedRecords(),
      importState: {
        phase: storage.getSpeedRecords().length > 0 ? 'PHASE2' : 'PHASE1',
        hasGapData: storage.getGapSensorData().length > 0,
        hasSpeedData: storage.getSpeedRecords().length > 0,
        hasCarMapping: storage.getCarMappings().length > 0,
      },
    });
  },

  setGapSensorData: (data) => {
    storage.setGapSensorData(data);
    set({
      gapSensorData: data,
      importState: { ...get().importState, hasGapData: data.length > 0 },
    });
  },

  setSpeedRecords: (data) => {
    storage.setSpeedRecords(data);
    set({
      speedRecords: data,
      importState: {
        ...get().importState,
        hasSpeedData: data.length > 0,
        phase: data.length > 0 ? 'PHASE2' : 'PHASE1',
      },
    });
  },

  setCarMappings: (data) => {
    storage.setCarMappings(data);
    set({
      carMappings: data,
      importState: { ...get().importState, hasCarMapping: data.length > 0 },
    });
  },

  executePhase1Judgment: () => {
    const { gapSensorData, carMappings } = get();
    set({ isLoading: true, error: null });

    try {
      const results = executeJudgment(gapSensorData, [], carMappings);
      storage.setJudgmentResults(results);
      set({
        phase1Results: results,
        judgmentResults: results,
        isLoading: false,
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '判定失败', isLoading: false });
    }
  },

  executePhase2Judgment: () => {
    const { gapSensorData, speedRecords, carMappings, phase1Results } = get();
    set({ isLoading: true, error: null });

    try {
      let p1Results = phase1Results;
      if (p1Results.length === 0) {
        p1Results = executeJudgment(gapSensorData, [], carMappings);
      }
      const results = executeJudgment(gapSensorData, speedRecords, carMappings);
      storage.setJudgmentResults(results);
      set({
        phase1Results: p1Results,
        phase2Results: results,
        judgmentResults: results,
        isLoading: false,
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '判定失败', isLoading: false });
    }
  },

  getPhaseComparison: () => {
    const { phase1Results, phase2Results } = get();
    if (phase1Results.length === 0 || phase2Results.length === 0) return null;
    return compareResults(phase1Results, phase2Results);
  },

  setCurrentThreshold: (id) => {
    storage.setCurrentThresholdId(id);
    set({ currentThresholdId: id });
  },

  addThresholdVersion: (version) => {
    const newVersion: ThresholdVersion = {
      ...version,
      id: `th-${Date.now()}`,
    };
    const versions = [...get().thresholdVersions, newVersion];
    storage.setThresholdVersions(versions);
    set({ thresholdVersions: versions });
  },

  recalculateWithThreshold: (thresholdId) => {
    const { gapSensorData, speedRecords, carMappings, thresholdVersions } = get();
    const threshold = thresholdVersions.find((v) => v.id === thresholdId);
    if (!threshold) return;

    set({ isLoading: true, error: null });

    try {
      const { results, updatedWorkOrders } = recalculateWithNewThreshold(
        threshold,
        gapSensorData,
        speedRecords,
        carMappings
      );
      storage.setJudgmentResults(results);
      storage.setWorkOrders(updatedWorkOrders);
      set({
        judgmentResults: results,
        phase2Results: results,
        workOrders: updatedWorkOrders,
        isLoading: false,
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '重新计算失败', isLoading: false });
    }
  },

  generateWorkOrdersFromResults: () => {
    const { judgmentResults, sectionAttributions } = get();
    const orders = generateWorkOrders(judgmentResults, sectionAttributions);
    orders.forEach((order) => storage.addWorkOrder(order));
    set({ workOrders: storage.getWorkOrders() });
    return orders;
  },

  updateWorkOrderStatus: (id, status) => {
    const orders = get().workOrders.map((o) =>
      o.id === id ? { ...o, status } : o
    );
    storage.setWorkOrders(orders);
    set({ workOrders: orders });
  },

  applyCarMappingCorrection: (correctedMappings, operator) => {
    const { gapSensorData, speedRecords, carMappings, judgmentResults } = get();
    const originalMappings = [...carMappings];
    const originalResults = [...judgmentResults];

    const correctedResults = executeJudgment(gapSensorData, speedRecords, correctedMappings);

    const record: CorrectionRecord = {
      id: `cor-${Date.now()}`,
      originalCarMapping: originalMappings,
      correctedCarMapping: correctedMappings,
      originalResults,
      correctedResults,
      createdAt: Date.now(),
      operator,
    };

    storage.addCorrectionRecord(record);
    storage.setCarMappings(correctedMappings);
    storage.setJudgmentResults(correctedResults);

    set({
      carMappings: correctedMappings,
      judgmentResults: correctedResults,
      phase2Results: correctedResults,
      correctionRecords: storage.getCorrectionRecords(),
    });

    return record;
  },

  setSelectedResult: (result) => set({ selectedResult: result }),

  clearAllData: () => {
    storage.clearAll();
    set({
      gapSensorData: [],
      speedRecords: [],
      carMappings: [],
      judgmentResults: [],
      phase1Results: [],
      phase2Results: [],
      workOrders: [],
      correctionRecords: [],
      importState: {
        phase: 'PHASE1',
        hasGapData: false,
        hasSpeedData: false,
        hasCarMapping: false,
      },
      selectedResult: null,
    });
    get().initializeData();
  },

  runConsistencyCheck: () => {
    const { gapSensorData, speedRecords, carMappings, judgmentResults } = get();

    const results1 = executeJudgment(gapSensorData, speedRecords, carMappings);
    const results2 = executeJudgment(gapSensorData, speedRecords, carMappings);

    const hash1 = results1.map((r) => r.id).sort().join('|');
    const hash2 = results2.map((r) => r.id).sort().join('|');

    const storedHashes = judgmentResults.map((r) => r.id).sort().join('|');

    return hash1 === hash2 && hash1 === storedHashes;
  },
}));
