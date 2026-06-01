import { useMemo } from 'react';
import { create } from 'zustand';
import type {
  RawMaterial,
  ProcessedResult,
  IntegrationMethod,
  ChartDataPoint,
  MaterialSource,
} from '@/types';
import { computeIntegration } from '@/utils/integration';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface IntegrationStore {
  rawMaterials: RawMaterial[];
  processedResults: ProcessedResult[];
  chartDataMap: Record<string, ChartDataPoint[]>;
  activeMaterialId: string | null;
  selectedMethod: IntegrationMethod;

  addRawMaterial: (
    expression: string,
    stepSize: number,
    intervalA: number,
    intervalB: number,
    notes: string,
    source: MaterialSource
  ) => string;
  updateRawMaterial: (id: string, updates: Partial<Omit<RawMaterial, 'id' | 'createdAt'>>) => void;
  removeRawMaterial: (id: string) => void;
  setActiveMaterial: (id: string | null) => void;
  setSelectedMethod: (method: IntegrationMethod) => void;
  runComputation: (materialId: string) => void;
  runAllComputations: () => void;
  importMaterials: (materials: Array<{ expression: string; stepSize: number; intervalA: number; intervalB: number; notes?: string }>) => void;
  importNotes: (materialId: string, notes: string) => void;
}

export const useStore = create<IntegrationStore>((set, get) => ({
  rawMaterials: [],
  processedResults: [],
  chartDataMap: {},
  activeMaterialId: null,
  selectedMethod: 'simpson',

  addRawMaterial: (expression, stepSize, intervalA, intervalB, notes, source) => {
    const id = generateId();
    const material: RawMaterial = {
      id,
      expression,
      stepSize,
      intervalA,
      intervalB,
      notes,
      source,
      createdAt: Date.now(),
    };

    const method = get().selectedMethod;
    const input = { expression, stepSize, intervalA, intervalB, method };
    const { result, errorEstimate, chartData, warnings } = computeIntegration(input);
    const resultId = `${id}_${method}`;
    const processed: ProcessedResult = {
      id: resultId,
      materialId: id,
      method,
      result,
      errorEstimate,
      warnings,
      computedAt: Date.now(),
    };

    set((state) => ({
      rawMaterials: [...state.rawMaterials, material],
      processedResults: [...state.processedResults, processed],
      chartDataMap: { ...state.chartDataMap, [id]: chartData },
      activeMaterialId: id,
    }));

    return id;
  },

  updateRawMaterial: (id, updates) => {
    set((state) => ({
      rawMaterials: state.rawMaterials.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }));

    const material = get().rawMaterials.find((m) => m.id === id);
    if (!material) return;

    const method = get().selectedMethod;
    const input = {
      expression: material.expression,
      stepSize: material.stepSize,
      intervalA: material.intervalA,
      intervalB: material.intervalB,
      method,
    };
    const { result, errorEstimate, chartData, warnings } = computeIntegration(input);
    const resultId = `${id}_${method}`;
    const processed: ProcessedResult = {
      id: resultId,
      materialId: id,
      method,
      result,
      errorEstimate,
      warnings,
      computedAt: Date.now(),
    };

    set((state) => ({
      processedResults: [
        ...state.processedResults.filter((r) => r.id !== resultId),
        processed,
      ],
      chartDataMap: { ...state.chartDataMap, [id]: chartData },
    }));
  },

  removeRawMaterial: (id) => {
    set((state) => {
      const newResults = state.processedResults.filter((r) => r.materialId !== id);
      const newChartData = { ...state.chartDataMap };
      delete newChartData[id];
      return {
        rawMaterials: state.rawMaterials.filter((m) => m.id !== id),
        processedResults: newResults,
        chartDataMap: newChartData,
        activeMaterialId:
          state.activeMaterialId === id
            ? state.rawMaterials.find((m) => m.id !== id)?.id ?? null
            : state.activeMaterialId,
      };
    });
  },

  setActiveMaterial: (id) => set({ activeMaterialId: id }),

  setSelectedMethod: (method) => {
    const { activeMaterialId } = get();
    if (!activeMaterialId) {
      set({ selectedMethod: method });
      return;
    }

    const material = get().rawMaterials.find((m) => m.id === activeMaterialId);
    if (!material) {
      set({ selectedMethod: method });
      return;
    }

    const input = {
      expression: material.expression,
      stepSize: material.stepSize,
      intervalA: material.intervalA,
      intervalB: material.intervalB,
      method,
    };
    const { result, errorEstimate, chartData, warnings } = computeIntegration(input);
    const resultId = `${activeMaterialId}_${method}`;
    const processed: ProcessedResult = {
      id: resultId,
      materialId: activeMaterialId,
      method,
      result,
      errorEstimate,
      warnings,
      computedAt: Date.now(),
    };

    set((state) => ({
      selectedMethod: method,
      processedResults: [
        ...state.processedResults.filter((r) => r.id !== resultId),
        processed,
      ],
      chartDataMap: { ...state.chartDataMap, [activeMaterialId]: chartData },
    }));
  },

  runComputation: (materialId) => {
    const material = get().rawMaterials.find((m) => m.id === materialId);
    if (!material) return;

    const method = get().selectedMethod;
    const input = {
      expression: material.expression,
      stepSize: material.stepSize,
      intervalA: material.intervalA,
      intervalB: material.intervalB,
      method,
    };
    const { result, errorEstimate, chartData, warnings } = computeIntegration(input);
    const resultId = `${materialId}_${method}`;
    const processed: ProcessedResult = {
      id: resultId,
      materialId,
      method,
      result,
      errorEstimate,
      warnings,
      computedAt: Date.now(),
    };

    set((state) => ({
      processedResults: [
        ...state.processedResults.filter((r) => r.id !== resultId),
        processed,
      ],
      chartDataMap: { ...state.chartDataMap, [materialId]: chartData },
    }));
  },

  runAllComputations: () => {
    const { rawMaterials, runComputation } = get();
    for (const m of rawMaterials) {
      runComputation(m.id);
    }
  },

  importMaterials: (materials) => {
    for (const mat of materials) {
      get().addRawMaterial(
        mat.expression,
        mat.stepSize,
        mat.intervalA,
        mat.intervalB,
        mat.notes ?? '',
        'import'
      );
    }
  },

  importNotes: (materialId, notes) => {
    set((state) => ({
      rawMaterials: state.rawMaterials.map((m) =>
        m.id === materialId ? { ...m, notes } : m
      ),
    }));
  },
}));

const EMPTY_CHART_DATA: ChartDataPoint[] = [];

export function useActiveMaterial(): RawMaterial | undefined {
  const rawMaterials = useStore((s) => s.rawMaterials);
  const activeMaterialId = useStore((s) => s.activeMaterialId);
  return useMemo(
    () => rawMaterials.find((m) => m.id === activeMaterialId),
    [rawMaterials, activeMaterialId]
  );
}

export function useActiveResult(): ProcessedResult | undefined {
  const processedResults = useStore((s) => s.processedResults);
  const activeMaterialId = useStore((s) => s.activeMaterialId);
  const selectedMethod = useStore((s) => s.selectedMethod);
  return useMemo(() => {
    if (!activeMaterialId) return undefined;
    const resultId = `${activeMaterialId}_${selectedMethod}`;
    return processedResults.find((r) => r.id === resultId);
  }, [processedResults, activeMaterialId, selectedMethod]);
}

export function useActiveChartData(): ChartDataPoint[] {
  const chartDataMap = useStore((s) => s.chartDataMap);
  const activeMaterialId = useStore((s) => s.activeMaterialId);
  return useMemo(() => {
    if (!activeMaterialId) return EMPTY_CHART_DATA;
    return chartDataMap[activeMaterialId] ?? EMPTY_CHART_DATA;
  }, [chartDataMap, activeMaterialId]);
}
