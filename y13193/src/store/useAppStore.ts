import { create } from 'zustand';
import type { BatterySample, ParameterSet, AttributionResult, HistoryRecord } from '../types';
import { mockSamples, mockParameterSets, mockHistory, boundarySample } from '../data/mockData';
import { calculateAttribution } from '../utils/calculator';

interface AppState {
  samples: BatterySample[];
  selectedSampleId: string | null;
  parameterSets: ParameterSet[];
  activeParamSetId: string;
  compareParamSetId: string | null;
  compareMode: boolean;
  currentResult: AttributionResult | null;
  compareResult: AttributionResult | null;
  history: HistoryRecord[];
  boundaryDetailVisible: boolean;
  gapSectionVisible: boolean;
  newlyAddedSampleId: string | null;

  actions: {
    selectSample: (id: string) => void;
    addBoundarySample: () => void;
    setCompareMode: (enabled: boolean) => void;
    setCompareParamSet: (id: string | null) => void;
    switchParamSet: (id: string) => void;
    confirmVersion: (description: string) => void;
    revertToHistory: (historyId: string) => void;
    toggleBoundaryDetail: () => void;
    toggleGapSection: () => void;
    clearNewlyAdded: () => void;
  };
}

function generateId(): string {
  return `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useAppStore = create<AppState>((set, get) => {
  const initialSamples = [...mockSamples];
  const initialParamSet = mockParameterSets[0];
  const initialSelectedId = initialSamples[0]?.id || null;
  const initialResult = initialSelectedId
    ? calculateAttribution(
        initialSamples.find(s => s.id === initialSelectedId)!,
        initialParamSet
      )
    : null;

  return {
    samples: initialSamples,
    selectedSampleId: initialSelectedId,
    parameterSets: mockParameterSets,
    activeParamSetId: initialParamSet.id,
    compareParamSetId: null,
    compareMode: false,
    currentResult: initialResult,
    compareResult: null,
    history: [...mockHistory],
    boundaryDetailVisible: false,
    gapSectionVisible: true,
    newlyAddedSampleId: null,

    actions: {
      selectSample: (id: string) => {
        const state = get();
        const sample = state.samples.find(s => s.id === id);
        const activeParamSet = state.parameterSets.find(p => p.id === state.activeParamSetId);
        if (!sample || !activeParamSet) return;

        const result = calculateAttribution(sample, activeParamSet);
        let compareResult: AttributionResult | null = null;

        if (state.compareMode && state.compareParamSetId) {
          const compareParam = state.parameterSets.find(p => p.id === state.compareParamSetId);
          if (compareParam) {
            compareResult = calculateAttribution(sample, compareParam);
          }
        }

        set({
          selectedSampleId: id,
          currentResult: result,
          compareResult
        });
      },

      addBoundarySample: () => {
        const state = get();
        if (state.samples.find(s => s.id === boundarySample.id)) return;

        const activeParamSet = state.parameterSets.find(p => p.id === state.activeParamSetId)!;
        const newResult = calculateAttribution(boundarySample, activeParamSet);

        const historyRecord: HistoryRecord = {
          id: generateId(),
          timestamp: new Date().toLocaleString('zh-CN'),
          type: 'add_sample',
          description: `补充边界样本：${boundarySample.name}`,
          beforeSnapshot: state.currentResult,
          afterSnapshot: newResult,
          operator: '阿岑'
        };

        set({
          samples: [...state.samples, boundarySample],
          selectedSampleId: boundarySample.id,
          currentResult: newResult,
          history: [...state.history, historyRecord],
          newlyAddedSampleId: boundarySample.id
        });
      },

      setCompareMode: (enabled: boolean) => {
        const state = get();
        if (!enabled) {
          set({ compareMode: false, compareParamSetId: null, compareResult: null });
          return;
        }

        const compareId = state.parameterSets.find(p => p.id !== state.activeParamSetId)?.id || null;
        let compareResult: AttributionResult | null = null;

        if (compareId && state.selectedSampleId) {
          const sample = state.samples.find(s => s.id === state.selectedSampleId)!;
          const compareParam = state.parameterSets.find(p => p.id === compareId)!;
          compareResult = calculateAttribution(sample, compareParam);
        }

        const historyRecord: HistoryRecord = {
          id: generateId(),
          timestamp: new Date().toLocaleString('zh-CN'),
          type: 'compare',
          description: '开启双参数组对照模式',
          beforeSnapshot: state.currentResult,
          afterSnapshot: compareResult,
          operator: '排班同事'
        };

        set({
          compareMode: true,
          compareParamSetId: compareId,
          compareResult,
          history: [...state.history, historyRecord]
        });
      },

      setCompareParamSet: (id: string | null) => {
        const state = get();
        if (!id || !state.selectedSampleId) {
          set({ compareParamSetId: id, compareResult: null });
          return;
        }

        const sample = state.samples.find(s => s.id === state.selectedSampleId)!;
        const compareParam = state.parameterSets.find(p => p.id === id)!;
        const compareResult = calculateAttribution(sample, compareParam);

        set({ compareParamSetId: id, compareResult });
      },

      switchParamSet: (id: string) => {
        const state = get();
        if (state.activeParamSetId === id) return;

        const beforeResult = state.currentResult;
        const paramSet = state.parameterSets.find(p => p.id === id);
        const sample = state.selectedSampleId
          ? state.samples.find(s => s.id === state.selectedSampleId)
          : null;

        if (!paramSet || !sample) return;

        const newResult = calculateAttribution(sample, paramSet);

        let compareResult: AttributionResult | null = null;
        if (state.compareMode && state.compareParamSetId) {
          const compareParam = state.parameterSets.find(p => p.id === state.compareParamSetId);
          if (compareParam) {
            compareResult = calculateAttribution(sample, compareParam);
          }
        }

        const historyRecord: HistoryRecord = {
          id: generateId(),
          timestamp: new Date().toLocaleString('zh-CN'),
          type: 'param_change',
          description: `切换参数组：${paramSet.name} (${paramSet.version})`,
          beforeSnapshot: beforeResult,
          afterSnapshot: newResult,
          operator: '排班同事'
        };

        set({
          activeParamSetId: id,
          currentResult: newResult,
          compareResult,
          history: [...state.history, historyRecord]
        });
      },

      confirmVersion: (description: string) => {
        const state = get();
        const historyRecord: HistoryRecord = {
          id: generateId(),
          timestamp: new Date().toLocaleString('zh-CN'),
          type: 'confirm',
          description: description || '人工确认当前版本',
          beforeSnapshot: null,
          afterSnapshot: state.currentResult,
          operator: '阿岑'
        };

        set({ history: [...state.history, historyRecord] });
      },

      revertToHistory: (historyId: string) => {
        const state = get();
        const record = state.history.find(h => h.id === historyId);
        if (!record?.afterSnapshot) return;

        const historyRecord: HistoryRecord = {
          id: generateId(),
          timestamp: new Date().toLocaleString('zh-CN'),
          type: 'revert',
          description: `回退到历史版本：${record.description}`,
          beforeSnapshot: state.currentResult,
          afterSnapshot: record.afterSnapshot,
          operator: '排班同事'
        };

        set({
          currentResult: record.afterSnapshot,
          history: [...state.history, historyRecord]
        });
      },

      toggleBoundaryDetail: () => {
        set(state => ({ boundaryDetailVisible: !state.boundaryDetailVisible }));
      },

      toggleGapSection: () => {
        set(state => ({ gapSectionVisible: !state.gapSectionVisible }));
      },

      clearNewlyAdded: () => {
        set({ newlyAddedSampleId: null });
      }
    }
  };
});
