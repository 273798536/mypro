import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DataPoint,
  BackgroundNoise,
  MaterialInfo,
  TimeUnit,
  FitResult,
  Anomaly
} from '../types';
import { checkBoundaryValues, checkTimeIntervals } from '../utils/boundaryCheck';
import { detectAllAnomalies, markAbnormalPoints } from '../utils/anomalyDetection';
import { exponentialFit, correctBackground } from '../utils/exponentialFit';
import { generateReport } from '../utils/reportGenerator';
import { convertTime } from '../utils/unitConversion';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

interface AppState {
  material: MaterialInfo;
  dataPoints: DataPoint[];
  background: BackgroundNoise;
  currentTimeUnit: TimeUnit;
  fitResults: FitResult[];
  activeResultId: string | null;
  compareMode: boolean;
  compareResultIds: [string, string] | null;
  anomalies: Anomaly[];
  isFitting: boolean;
  focusedRow: number | null;
  
  setMaterial: (material: Partial<MaterialInfo>) => void;
  setTimeUnit: (unit: TimeUnit) => void;
  addDataPoint: (time?: number, count?: number) => void;
  updateDataPoint: (id: string, updates: Partial<DataPoint>) => void;
  removeDataPoint: (id: string) => void;
  setBackground: (background: Partial<BackgroundNoise>) => void;
  runAnomalyDetection: () => void;
  runFitting: () => { success: boolean; message?: string };
  setActiveResult: (id: string | null) => void;
  toggleCompareMode: () => void;
  setCompareResultIds: (ids: [string, string] | null) => void;
  deleteResult: (id: string) => void;
  clearAllResults: () => void;
  loadSampleData: () => void;
  clearData: () => void;
  setFocusedRow: (row: number | null) => void;
  loadResultToEditor: (id: string) => void;
}

const initialMaterial: MaterialInfo = {
  name: '钡-137m',
  unit: 's'
};

const initialBackground: BackgroundNoise = {
  value: 45,
  isDeducted: true
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      material: initialMaterial,
      dataPoints: [],
      background: initialBackground,
      currentTimeUnit: 's',
      fitResults: [],
      activeResultId: null,
      compareMode: false,
      compareResultIds: null,
      anomalies: [],
      isFitting: false,
      focusedRow: null,

      setMaterial: (material) => {
        set(state => ({
          material: { ...state.material, ...material }
        }));
        get().runAnomalyDetection();
      },

      setTimeUnit: (unit) => {
        set(state => {
          const convertedPoints = state.dataPoints.map(p => ({
            ...p,
            time: convertTime(p.time, state.currentTimeUnit, unit)
          }));
          return {
            currentTimeUnit: unit,
            dataPoints: convertedPoints,
            material: { ...state.material, unit }
          };
        });
        get().runAnomalyDetection();
      },

      addDataPoint: (time, count) => {
        set(state => {
          const lastTime = state.dataPoints.length > 0
            ? state.dataPoints[state.dataPoints.length - 1].time
            : 0;
          const defaultInterval = state.currentTimeUnit === 's' ? 30 : 
                                 state.currentTimeUnit === 'min' ? 0.5 : 1/60;
          
          const newPoint: DataPoint = {
            id: generateId(),
            time: time ?? (lastTime + defaultInterval),
            count: count ?? 0
          };
          return {
            dataPoints: [...state.dataPoints, newPoint]
          };
        });
        get().runAnomalyDetection();
      },

      updateDataPoint: (id, updates) => {
        set(state => ({
          dataPoints: state.dataPoints.map(p =>
            p.id === id ? { ...p, ...updates } : p
          )
        }));
        get().runAnomalyDetection();
      },

      removeDataPoint: (id) => {
        set(state => ({
          dataPoints: state.dataPoints.filter(p => p.id !== id)
        }));
        get().runAnomalyDetection();
      },

      setBackground: (background) => {
        set(state => ({
          background: { ...state.background, ...background }
        }));
        get().runAnomalyDetection();
      },

      runAnomalyDetection: () => {
        const { dataPoints, background, material } = get();
        
        if (dataPoints.length < 2) {
          set({ anomalies: [] });
          return;
        }

        const boundaryResult = checkBoundaryValues(dataPoints, background, material);
        const intervalAnomalies = checkTimeIntervals(dataPoints);
        const dataAnomalies = detectAllAnomalies(boundaryResult.markedPoints, material);
        
        const allAnomalies = [
          ...boundaryResult.anomalies,
          ...intervalAnomalies,
          ...dataAnomalies
        ];

        const markedPoints = markAbnormalPoints(
          boundaryResult.markedPoints,
          allAnomalies
        );

        set({
          anomalies: allAnomalies,
          dataPoints: markedPoints
        });
      },

      runFitting: () => {
        const { dataPoints, background, material, currentTimeUnit, anomalies } = get();
        
        set({ isFitting: true });

        const errors = anomalies.filter(a => a.severity === 'error');
        if (errors.length > 0) {
          set({ isFitting: false });
          return {
            success: false,
            message: `存在 ${errors.length} 个错误，请先修正后再拟合`
          };
        }

        if (dataPoints.length < 2) {
          set({ isFitting: false });
          return {
            success: false,
            message: '至少需要2个数据点才能进行拟合'
          };
        }

        try {
          const correctedPoints = correctBackground(dataPoints, background.value, background.isDeducted);
          const fitParams = exponentialFit(correctedPoints, currentTimeUnit);
          
          const newResult: FitResult = {
            id: generateId(),
            timestamp: Date.now(),
            halfLife: fitParams.halfLife,
            halfLifeUnit: currentTimeUnit,
            decayConstant: fitParams.decayConstant,
            initialActivity: fitParams.initialActivity,
            rSquared: fitParams.rSquared,
            dataPoints: correctedPoints,
            background: { ...background },
            material: { ...material },
            anomalies: [...anomalies],
            report: ''
          };

          newResult.report = generateReport(newResult);

          set(state => ({
            fitResults: [newResult, ...state.fitResults].slice(0, 20),
            activeResultId: newResult.id,
            isFitting: false
          }));

          return {
            success: true,
            message: '拟合完成'
          };
        } catch (error) {
          set({ isFitting: false });
          return {
            success: false,
            message: error instanceof Error ? error.message : '拟合失败'
          };
        }
      },

      setActiveResult: (id) => {
        set({ activeResultId: id });
      },

      toggleCompareMode: () => {
        set(state => ({
          compareMode: !state.compareMode,
          compareResultIds: null
        }));
      },

      setCompareResultIds: (ids) => {
        set({ compareResultIds: ids });
      },

      deleteResult: (id) => {
        set(state => ({
          fitResults: state.fitResults.filter(r => r.id !== id),
          activeResultId: state.activeResultId === id ? null : state.activeResultId,
          compareResultIds: state.compareResultIds?.includes(id) ? null : state.compareResultIds
        }));
      },

      clearAllResults: () => {
        set({
          fitResults: [],
          activeResultId: null,
          compareMode: false,
          compareResultIds: null
        });
      },

      loadSampleData: () => {
        const sampleMaterial: MaterialInfo = {
          name: '钡-137m',
          unit: 's'
        };

        const sampleBackground: BackgroundNoise = {
          value: 45,
          isDeducted: true
        };

        const halfLife = 153;
        const initialActivity = 1200;
        const lambda = Math.log(2) / halfLife;

        const samplePoints: DataPoint[] = [];
        for (let i = 1; i <= 12; i++) {
          const time = i * 30;
          const theoreticalCount = initialActivity * Math.exp(-lambda * time) + sampleBackground.value;
          const noise = (Math.random() - 0.5) * 20;
          const count = Math.round(theoreticalCount + noise);
          
          samplePoints.push({
            id: generateId(),
            time,
            count: Math.max(0, count)
          });
        }

        set({
          material: sampleMaterial,
          dataPoints: samplePoints,
          background: sampleBackground,
          currentTimeUnit: 's'
        });

        setTimeout(() => get().runAnomalyDetection(), 0);
      },

      clearData: () => {
        set({
          dataPoints: [],
          anomalies: [],
          activeResultId: null,
          compareMode: false,
          compareResultIds: null
        });
      },

      setFocusedRow: (row) => {
        set({ focusedRow: row });
      },

      loadResultToEditor: (id) => {
        const result = get().fitResults.find(r => r.id === id);
        if (!result) return;

        const points: DataPoint[] = result.dataPoints.map(p => ({
          id: generateId(),
          time: p.time,
          count: p.count
        }));

        set({
          material: { ...result.material },
          dataPoints: points,
          background: { ...result.background },
          currentTimeUnit: result.halfLifeUnit
        });

        setTimeout(() => get().runAnomalyDetection(), 0);
      }
    }),
    {
      name: 'decay-fit-storage',
      partialize: (state) => ({
        fitResults: state.fitResults,
        material: state.material,
        background: state.background
      })
    }
  )
);
