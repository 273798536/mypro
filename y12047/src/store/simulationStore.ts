import { create } from 'zustand';
import type { SimulationResult, JudgeResult } from '../types';
import { stressAnalysisEngine, type SimulationConfig } from '../engine/stressAnalysis';
import { resultJudge } from '../engine/resultJudge';
import { storageAdapter } from '../data/storageAdapter';
import type { Node, Member } from '../types';

interface SimulationState {
  isSimulating: boolean;
  isComputing: boolean;
  currentStep: number;
  totalSteps: number;
  results: SimulationResult[];
  currentResult: SimulationResult | null;
  judgeResult: JudgeResult | null;
  loadMagnitude: number;
  simulationConfig: SimulationConfig;
  error: string | null;
  progress: number;

  setLoadMagnitude: (load: number) => void;
  setSimulationConfig: (config: Partial<SimulationConfig>) => void;
  setCurrentStep: (step: number) => void;
  setCurrentResult: (result: SimulationResult | null) => void;

  runSimulation: (
    nodes: Node[],
    members: Member[],
    versionId: string,
    budget: number,
    onProgress?: (step: number, result: SimulationResult) => void
  ) => Promise<SimulationResult[]>;

  runSimulationStep: (
    nodes: Node[],
    members: Member[],
    step: number,
    versionId: string
  ) => SimulationResult | null;

  judgeCurrentResult: (
    nodes: Node[],
    members: Member[],
    budget: number
  ) => JudgeResult | null;

  loadResults: (versionId: string) => void;
  saveResults: (versionId: string, results: SimulationResult[]) => void;

  verifyReproducibility: (
    nodes: Node[],
    members: Member[],
    versionId: string,
    budget: number
  ) => Promise<{ isConsistent: boolean; message: string }>;

  reset: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  isSimulating: false,
  isComputing: false,
  currentStep: 0,
  totalSteps: 20,
  results: [],
  currentResult: null,
  judgeResult: null,
  loadMagnitude: 80000,
  simulationConfig: {
    totalSteps: 20,
    loadMagnitude: 80000,
    startPosition: 0,
    endPosition: 100,
  },
  error: null,
  progress: 0,

  setLoadMagnitude: (load) =>
    set({
      loadMagnitude: load,
      simulationConfig: { ...get().simulationConfig, loadMagnitude: load },
    }),

  setSimulationConfig: (config) =>
    set((state) => ({
      simulationConfig: { ...state.simulationConfig, ...config },
    })),

  setCurrentStep: (step) => {
    const { results } = get();
    const currentResult = results[step] || null;
    set({ currentStep: step, currentResult });
  },

  setCurrentResult: (result) => set({ currentResult: result }),

  runSimulation: async (nodes, members, versionId, budget, onProgress) => {
    set({ isSimulating: true, isComputing: true, progress: 0, error: null });

    const config = { ...get().simulationConfig, loadMagnitude: get().loadMagnitude };

    try {
      stressAnalysisEngine.clearCache();

      const results: SimulationResult[] = [];
      const totalSteps = config.totalSteps;

      for (let step = 0; step <= totalSteps; step++) {
        const result = stressAnalysisEngine.simulateStep(nodes, members, step, config);
        result.versionId = versionId;
        results.push(result);

        const judgeResult = resultJudge.judgeAll(result, members, nodes, budget);
        result.status = judgeResult.passed ? 'running' : 'failed';
        if (!judgeResult.passed) {
          result.failureReason = judgeResult.message;
          result.failureMemberId = judgeResult.memberId;
        }

        storageAdapter.saveResult(result);

        const progress = Math.round((step / totalSteps) * 100);
        set({ progress, currentStep: step, currentResult: result });

        if (onProgress) {
          onProgress(step, result);
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const finalResult = results[results.length - 1];
      const judgeResult = resultJudge.judgeAll(finalResult, members, nodes, budget);

      if (judgeResult.passed) {
        finalResult.status = 'success';
      }

      set({
        results,
        currentResult: finalResult,
        judgeResult,
        isSimulating: false,
        isComputing: false,
        progress: 100,
        totalSteps,
      });

      return results;
    } catch (e) {
      set({
        isSimulating: false,
        isComputing: false,
        error: (e as Error).message,
      });
      throw e;
    }
  },

  runSimulationStep: (nodes, members, step, versionId) => {
    const config = { ...get().simulationConfig, loadMagnitude: get().loadMagnitude };

    try {
      const result = stressAnalysisEngine.simulateStep(nodes, members, step, config);
      result.versionId = versionId;
      return result;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  judgeCurrentResult: (nodes, members, budget) => {
    const { currentResult } = get();
    if (!currentResult) return null;

    const judgeResult = resultJudge.judgeAll(currentResult, members, nodes, budget);
    set({ judgeResult });
    return judgeResult;
  },

  loadResults: (versionId) => {
    const results = storageAdapter.getResultsByVersionId(versionId);
    const totalSteps = results.length > 0 ? results.length - 1 : 0;
    set({
      results,
      totalSteps,
      currentStep: 0,
      currentResult: results[0] || null,
    });
  },

  saveResults: (versionId, results) => {
    storageAdapter.deleteResultsByVersionId(versionId);
    for (const result of results) {
      result.versionId = versionId;
      storageAdapter.saveResult(result);
    }
  },

  verifyReproducibility: async (nodes, members, versionId, budget) => {
    const config = { ...get().simulationConfig, loadMagnitude: get().loadMagnitude };

    try {
      stressAnalysisEngine.clearCache();
      const results1: number[] = [];
      
      for (let step = 0; step <= config.totalSteps; step++) {
        const result = stressAnalysisEngine.simulateStep(nodes, members, step, config);
        results1.push(result.maxStress);
      }

      stressAnalysisEngine.clearCache();
      const results2: number[] = [];
      
      for (let step = 0; step <= config.totalSteps; step++) {
        const result = stressAnalysisEngine.simulateStep(nodes, members, step, config);
        results2.push(result.maxStress);
      }

      let isConsistent = true;
      let maxDiff = 0;
      
      for (let i = 0; i < results1.length; i++) {
        const diff = Math.abs(results1[i] - results2[i]);
        maxDiff = Math.max(maxDiff, diff);
        if (diff > 1e-6) {
          isConsistent = false;
          break;
        }
      }

      return {
        isConsistent,
        message: isConsistent
          ? `结果可复现验证通过，两次运行最大差值：${maxDiff.toExponential(2)} Pa`
          : `结果可复现验证失败，第${results1.findIndex((r, i) => Math.abs(r - results2[i]) > 1e-6) + 1}步出现差异`,
      };
    } catch (e) {
      return {
        isConsistent: false,
        message: `验证过程出错：${(e as Error).message}`,
      };
    }
  },

  reset: () => {
    stressAnalysisEngine.clearCache();
    set({
      isSimulating: false,
      isComputing: false,
      currentStep: 0,
      totalSteps: 20,
      results: [],
      currentResult: null,
      judgeResult: null,
      error: null,
      progress: 0,
    });
  },
}));
