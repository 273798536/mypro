import { create } from 'zustand';
import type {
  DetectionState,
  DetectionResult,
  Viewpoint,
  ChangeRecord,
  VectorFieldFormula,
  SeedPoint,
  ColorScale,
} from '@/types';
import { useUIStore } from './uiStore';
import {
  traceAllStreamlines,
  type TraceOptions,
} from '@/engine/streamline';
import {
  processAllStreamlines,
  createDetectionResult,
} from '@/engine/detection';
import {
  checkConsistency,
  generateResultHash,
  markColorScaleAffected,
  findChangedStreamlines,
} from '@/engine/consistency';
import { generateId } from '@/utils/math';
import {
  loadViewpoints,
  loadResults,
  loadChangeHistory,
  saveViewpoints,
  saveResults,
  saveChangeHistory,
} from '@/utils/storage';

interface DetectionActions {
  runDetection: (
    formula: VectorFieldFormula,
    seedPoints: SeedPoint[],
    traceOptions?: Partial<TraceOptions>
  ) => Promise<DetectionResult>;
  runDetectionWithConsistencyCheck: (
    formula: VectorFieldFormula,
    seedPoints: SeedPoint[],
    runs?: number,
    traceOptions?: Partial<TraceOptions>
  ) => Promise<DetectionResult | null>;
  setCurrentResult: (result: DetectionResult | null) => void;
  addResultToHistory: (result: DetectionResult) => void;
  clearResults: () => void;
  clearResult: () => void;
  addViewpoint: (viewpoint: Viewpoint) => void;
  removeViewpoint: (id: string) => void;
  setSavedViewpoints: (viewpoints: Viewpoint[]) => void;
  loadViewpointsFromStorage: () => void;
  addChangeRecord: (record: Omit<ChangeRecord, 'id' | 'timestamp'>) => void;
  applyColorScale: (scale: ColorScale) => void;
  compareWithPrevious: () => {
    changed: string[];
    before: DetectionResult | null;
    after: DetectionResult | null;
  };
  loadStoredData: () => void;
  exportCurrentResult: () => void;
}

export const useDetectionStore = create<DetectionState & DetectionActions>(
  (set, get) => ({
    currentResult: null,
    previousResult: null,
    resultHistory: [],
    changeHistory: [],
    savedViewpoints: [],

    runDetection: async (formula, seedPoints, traceOptions) => {
      const { setLoading, setLoadingProgress } = useUIStore.getState();
      
      setLoading(true, '正在追踪流线...');
      setLoadingProgress(10);
      
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const streamlines = traceAllStreamlines(
        seedPoints,
        formula,
        traceOptions,
        (completed, total) => {
          setLoadingProgress(10 + Math.floor((completed / total) * 40));
          setLoading(
            true,
            `正在追踪流线... ${completed}/${total}`
          );
        }
      );

      setLoading(true, '正在检测边界异常...');
      setLoadingProgress(50);
      
      const { streamlines: processedStreamlines, anomalies } = processAllStreamlines(
        streamlines,
        { formula },
        (completed, total) => {
          setLoadingProgress(50 + Math.floor((completed / total) * 40));
          setLoading(
            true,
            `正在检测异常... ${completed}/${total}`
          );
        }
      );

      const result = createDetectionResult(
        formula,
        seedPoints,
        processedStreamlines,
        anomalies,
        get().resultHistory.length + 1,
        !!get().currentResult?.hasColorScale
      );

      result.consistencyHash = generateResultHash(result);
      result.runHash = generateResultHash(result);
      
      setLoadingProgress(100);
      setLoading(false);
      
      return result;
    },

    runDetectionWithConsistencyCheck: async (
      formula,
      seedPoints,
      runs = 2,
      traceOptions
    ) => {
      const { runDetection, addResultToHistory, addChangeRecord } = get();
      const results: DetectionResult[] = [];

      for (let i = 0; i < runs; i++) {
        const result = await runDetection(formula, seedPoints, traceOptions);
        results.push(result);
        
        if (i < runs - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      if (runs >= 2) {
        const consistency = checkConsistency(results[0], results[1]);
        results[0].isConsistent = consistency.isConsistent;
        results[1].isConsistent = consistency.isConsistent;
      }

      const finalResult = results[0];
      
      addResultToHistory(finalResult);
      addChangeRecord({
        type: 'detection',
        description: `运行第 ${finalResult.runNumber} 次检测，${finalResult.isConsistent ? '结果一致' : '结果不一致'}`,
        before: get().previousResult ? {
          anomalies: get().previousResult.anomalies.length,
          statistics: get().previousResult.statistics,
        } : null,
        after: {
          anomalies: finalResult.anomalies.length,
          statistics: finalResult.statistics,
          isConsistent: finalResult.isConsistent,
        },
        affectedIds: finalResult.anomalies.map(a => a.id),
      });

      set({
        currentResult: finalResult,
        previousResult: get().currentResult,
      });

      return finalResult;
    },

    setCurrentResult: (result) => {
      set((state) => ({
        currentResult: result,
        previousResult: state.currentResult,
      }));
    },

    addResultToHistory: (result) => {
      set((state) => ({
        resultHistory: [...state.resultHistory, result],
      }));
      saveResults(get().resultHistory);
    },

    clearResults: () => {
      set({
        currentResult: null,
        previousResult: null,
        resultHistory: [],
      });
      saveResults([]);
    },

    clearResult: () => {
      set({
        currentResult: null,
        previousResult: null,
      });
    },

    addViewpoint: (viewpoint) => {
      set((state) => ({
        savedViewpoints: [...state.savedViewpoints, viewpoint],
      }));
      
      saveViewpoints(get().savedViewpoints);
      
      get().addChangeRecord({
        type: 'viewpoint',
        description: `保存视角: ${viewpoint.name}`,
        before: null,
        after: { viewpoint },
        affectedIds: [viewpoint.id],
      });
    },

    removeViewpoint: (id) => {
      set((state) => ({
        savedViewpoints: state.savedViewpoints.filter((v) => v.id !== id),
      }));
      saveViewpoints(get().savedViewpoints);
    },

    setSavedViewpoints: (viewpoints) => {
      set({ savedViewpoints: viewpoints });
      saveViewpoints(viewpoints);
    },

    loadViewpointsFromStorage: () => {
      const stored = loadViewpoints();
      if (stored.length > 0) {
        set({ savedViewpoints: stored });
      }
    },

    addChangeRecord: (record) => {
      const newRecord: ChangeRecord = {
        ...record,
        id: generateId('change'),
        timestamp: Date.now(),
      };
      
      set((state) => ({
        changeHistory: [newRecord, ...state.changeHistory].slice(0, 100),
      }));
      
      saveChangeHistory(get().changeHistory);
    },

    applyColorScale: (scale) => {
      const { currentResult } = get();
      if (!currentResult) return;

      const affectedIds = currentResult.streamlines
        .filter((s) => s.status === 'normal')
        .map((s) => s.id);

      const updatedResult = markColorScaleAffected(currentResult, affectedIds);
      updatedResult.hasColorScale = true;

      const changedIds = findChangedStreamlines(currentResult, updatedResult);

      set({
        currentResult: updatedResult,
        previousResult: currentResult,
      });

      get().addChangeRecord({
        type: 'color_scale',
        description: '补录颜色标尺: 速度颜色映射',
        before: {
          hasColorScale: currentResult.hasColorScale,
          affectedCount: 0,
        },
        after: {
          hasColorScale: true,
          colorScale: scale,
          affectedCount: affectedIds.length,
        },
        affectedIds: changedIds,
      });
    },

    compareWithPrevious: () => {
      const { currentResult, previousResult } = get();
      
      if (!currentResult || !previousResult) {
        return {
          changed: [],
          before: previousResult,
          after: currentResult,
        };
      }

      return {
        changed: findChangedStreamlines(previousResult, currentResult),
        before: previousResult,
        after: currentResult,
      };
    },

    loadStoredData: () => {
      const storedResults = loadResults();
      const storedHistory = loadChangeHistory();
      
      if (storedResults.length > 0) {
        set({
          resultHistory: storedResults,
          currentResult: storedResults[storedResults.length - 1],
        });
      }
      
      if (storedHistory.length > 0) {
        set({ changeHistory: storedHistory });
      }
      
      get().loadViewpointsFromStorage();
    },

    exportCurrentResult: () => {
      const { currentResult } = get();
      if (!currentResult) return;

      const exportData = {
        result: currentResult,
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vector-field-result-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  })
);
