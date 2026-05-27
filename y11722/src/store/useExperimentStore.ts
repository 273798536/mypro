import { create } from 'zustand';
import {
  ExperimentParams,
  ForceAnalysis,
  ExperimentRecord,
  ImportStrategy,
  ImportResult,
  Anomaly,
  MotionStatus,
} from '../types';
import { calculateForces } from '../utils/physics';
import { detectAllAnomalies } from '../utils/detection';

interface ExperimentState {
  currentParams: ExperimentParams;
  analysisResult: ForceAnalysis | null;
  records: ExperimentRecord[];
  selectedRecordId: string | null;
  importStrategy: ImportStrategy;
  isAnimating: boolean;
  animationSpeed: number;
  currentAnomalies: Anomaly[];
  blockPosition: number;
  
  setParams: (params: Partial<ExperimentParams>) => void;
  calculateForces: () => void;
  saveRecord: (source: string, notes?: string, steps?: string[]) => void;
  selectRecord: (id: string | null) => void;
  loadRecord: (id: string) => void;
  deleteRecord: (id: string) => void;
  importRecords: (data: ExperimentRecord[], strategy: ImportStrategy) => ImportResult;
  setImportStrategy: (strategy: ImportStrategy) => void;
  toggleAnimation: () => void;
  setAnimationSpeed: (speed: number) => void;
  setBlockPosition: (position: number) => void;
  setStudentJudgment: (judgment: MotionStatus) => void;
  detectAnomalies: (studentJudgment?: MotionStatus) => Anomaly[];
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const defaultParams: ExperimentParams = {
  id: generateId(),
  angle: 30,
  angleUnit: 'degree',
  frictionCoefficient: 0.5,
  mass: 1,
  externalForce: 0,
  externalForceAngle: 0,
  externalForceDirection: 'up',
};

export const useExperimentStore = create<ExperimentState>((set, get) => ({
  currentParams: defaultParams,
  analysisResult: null,
  records: [],
  selectedRecordId: null,
  importStrategy: 'append',
  isAnimating: false,
  animationSpeed: 1,
  currentAnomalies: [],
  blockPosition: 0.3,
  
  setParams: (params) => {
    set((state) => ({
      currentParams: { ...state.currentParams, ...params },
    }));
    get().calculateForces();
    get().detectAnomalies();
  },
  
  calculateForces: () => {
    const { currentParams } = get();
    const analysis = calculateForces(currentParams);
    set({ analysisResult: analysis });
  },
  
  saveRecord: (source, notes, steps) => {
    const { currentParams, analysisResult, currentAnomalies } = get();
    if (!analysisResult) return;
    
    const now = new Date();
    const newRecord: ExperimentRecord = {
      id: generateId(),
      version: 1,
      params: { ...currentParams, id: generateId() },
      analysis: analysisResult,
      source,
      createdAt: now,
      updatedAt: now,
      anomalies: currentAnomalies,
      notes,
      steps,
    };
    
    set((state) => ({
      records: [...state.records, newRecord],
    }));
  },
  
  selectRecord: (id) => {
    set({ selectedRecordId: id });
  },
  
  loadRecord: (id) => {
    const { records } = get();
    const record = records.find((r) => r.id === id);
    if (record) {
      set({
        currentParams: record.params,
        analysisResult: record.analysis,
        currentAnomalies: record.anomalies,
      });
    }
  },
  
  deleteRecord: (id) => {
    set((state) => ({
      records: state.records.filter((r) => r.id !== id),
      selectedRecordId: state.selectedRecordId === id ? null : state.selectedRecordId,
    }));
  },
  
  importRecords: (data, strategy) => {
    const { records } = get();
    let imported = 0;
    let skipped = 0;
    let overwritten = 0;
    const allAnomalies: Anomaly[] = [];
    
    const newRecords: ExperimentRecord[] = strategy === 'ignore' ? [...records] : [];
    
    data.forEach((record) => {
      const existingIndex = records.findIndex((r) => r.id === record.id);
      
      if (existingIndex >= 0) {
        if (strategy === 'ignore') {
          skipped++;
        } else if (strategy === 'overwrite') {
          newRecords[existingIndex] = {
            ...record,
            updatedAt: new Date(),
            version: records[existingIndex].version + 1,
          };
          overwritten++;
        } else {
          newRecords.push({
            ...record,
            id: generateId(),
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          imported++;
        }
      } else {
        newRecords.push({
          ...record,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        imported++;
      }
      
      allAnomalies.push(...record.anomalies);
    });
    
    set({ records: newRecords });
    
    return {
      success: true,
      totalRecords: data.length,
      importedRecords: imported,
      skippedRecords: skipped,
      overwrittenRecords: overwritten,
      anomalies: allAnomalies,
    };
  },
  
  setImportStrategy: (strategy) => {
    set({ importStrategy: strategy });
  },
  
  toggleAnimation: () => {
    set((state) => ({ isAnimating: !state.isAnimating }));
  },
  
  setAnimationSpeed: (speed) => {
    set({ animationSpeed: speed });
  },
  
  setBlockPosition: (position) => {
    set({ blockPosition: Math.max(0, Math.min(1, position)) });
  },
  
  setStudentJudgment: (judgment) => {
    const { selectedRecordId, records } = get();
    if (selectedRecordId) {
      set((state) => ({
        records: state.records.map((r) =>
          r.id === selectedRecordId ? { ...r, studentJudgment: judgment } : r
        ),
      }));
    }
    get().detectAnomalies(judgment);
  },
  
  detectAnomalies: (studentJudgment) => {
    const { currentParams, analysisResult } = get();
    const anomalies = detectAllAnomalies(currentParams, {
      studentJudgment,
      theoreticalStatus: analysisResult?.status,
    });
    set({ currentAnomalies: anomalies });
    return anomalies;
  },
}));
