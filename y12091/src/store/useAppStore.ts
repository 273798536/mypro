import { create } from 'zustand';
import {
  AppStore,
  RiverSection,
  FlowData,
  SedimentData,
  CalculationParams,
  DEFAULT_PARAMS,
  DataQualityIssue,
  PlanSnapshot,
  CalculationResult,
} from '../types';
import { MOCK_SECTIONS, MOCK_FLOW_DATA, MOCK_SEDIMENT_DATA, TIME_RANGE } from '../data/mockData';
import { validateDataQuality } from '../utils/dataValidator';
import { calculateErosionDeposition } from '../utils/erosionEngine';
import {
  createPlanSnapshot,
  savePlanToStorage,
  getPlansFromStorage,
  deletePlanFromStorage,
  getPlanFromStorage,
} from '../utils/planManager';

const hourMs = 3600 * 1000;

const initialTime = {
  currentTime: TIME_RANGE.start,
  startTime: TIME_RANGE.start,
  endTime: TIME_RANGE.end,
  isPlaying: false,
  playbackSpeed: 1,
  currentIndex: 0,
};

function runCalculation(
  sections: RiverSection[],
  flowData: FlowData[],
  sedimentData: SedimentData[],
  params: CalculationParams,
  timeRange: [number, number]
): CalculationResult {
  return calculateErosionDeposition(sections, flowData, sedimentData, params, timeRange);
}

export const useAppStore = create<AppStore>((set, get) => ({
  sections: MOCK_SECTIONS,
  flowData: MOCK_FLOW_DATA,
  sedimentData: MOCK_SEDIMENT_DATA,
  issues: [],
  time: initialTime,
  params: { ...DEFAULT_PARAMS },
  currentPlan: null,
  comparePlan: null,
  planHistory: getPlansFromStorage(),
  selectedSectionId: MOCK_SECTIONS[0]?.id || null,
  viewMode: '3d',
  calculationResult: null,
  isCalculating: false,

  setParams: (newParams: Partial<CalculationParams>) => {
    const state = get();
    const updatedParams = { ...state.params, ...newParams };
    set({ params: updatedParams });
    get().recalculate();
  },

  setCurrentTime: (time: number) => {
    const state = get();
    const clampedTime = Math.max(state.time.startTime, Math.min(state.time.endTime, time));
    const totalDuration = state.time.endTime - state.time.startTime;
    const currentIndex = Math.floor(((clampedTime - state.time.startTime) / totalDuration) * 100);

    set({
      time: {
        ...state.time,
        currentTime: clampedTime,
        currentIndex,
      },
    });
  },

  togglePlayback: () => {
    const state = get();
    set({
      time: {
        ...state.time,
        isPlaying: !state.time.isPlaying,
      },
    });
  },

  setPlaying: (playing: boolean) => {
    const state = get();
    set({
      time: {
        ...state.time,
        isPlaying: playing,
      },
    });
  },

  setPlaybackSpeed: (speed: number) => {
    const state = get();
    set({
      time: {
        ...state.time,
        playbackSpeed: Math.max(0.1, Math.min(10, speed)),
      },
    });
  },

  validateData: () => {
    const state = get();
    const issues = validateDataQuality(state.sections, state.flowData, state.sedimentData);
    set({ issues });
  },

  savePlan: (name: string) => {
    const state = get();
    if (!state.calculationResult) return;

    const plan = createPlanSnapshot(
      name,
      state.params,
      state.calculationResult,
      state.flowData,
      state.currentPlan?.id
    );

    savePlanToStorage(plan);
    set({
      currentPlan: plan,
      planHistory: getPlansFromStorage(),
    });
  },

  loadPlan: (planId: string, forCompare: boolean = false) => {
    const plan = getPlanFromStorage(planId);
    if (!plan) return;

    if (forCompare) {
      set({ comparePlan: plan });
    } else {
      set({
        currentPlan: plan,
        params: { ...plan.parameters },
        flowData: [...plan.flowData],
        calculationResult: plan.resultData,
      });
    }
  },

  deletePlan: (planId: string) => {
    deletePlanFromStorage(planId);
    const state = get();
    set({
      planHistory: getPlansFromStorage(),
      currentPlan: state.currentPlan?.id === planId ? null : state.currentPlan,
      comparePlan: state.comparePlan?.id === planId ? null : state.comparePlan,
    });
  },

  ignoreIssue: (issueId: string) => {
    const state = get();
    set({
      issues: state.issues.map(issue =>
        issue.id === issueId ? { ...issue, ignored: true } : issue
      ),
    });
  },

  fixIssue: (issueId: string, fixData: Record<string, any>) => {
    const state = get();
    const issue = state.issues.find(i => i.id === issueId);
    if (!issue) return;

    let newSections = [...state.sections];
    let newFlowData = [...state.flowData];

    switch (fixData.action) {
      case 'smooth': {
        const { dataIndex, sectionId, suggestedValue } = fixData;
        const sectionFlows = newFlowData
          .filter(f => f.sectionId === sectionId)
          .sort((a, b) => a.timestamp - b.timestamp);
        if (sectionFlows[dataIndex]) {
          sectionFlows[dataIndex].flow = suggestedValue;
        }
        break;
      }
      case 'interpolate_flow': {
        const { sectionId } = fixData;
        const otherSections = newSections.filter(s => s.id !== sectionId);
        if (otherSections.length >= 2) {
          const upstream = otherSections[0];
          const downstream = otherSections[otherSections.length - 1];
          const upstreamFlows = state.flowData.filter(f => f.sectionId === upstream.id);
          const downstreamFlows = state.flowData.filter(f => f.sectionId === downstream.id);

          upstreamFlows.forEach((uf, idx) => {
            if (downstreamFlows[idx]) {
              newFlowData.push({
                id: `flow-interp-${Date.now()}-${idx}`,
                sectionId,
                timestamp: uf.timestamp,
                flow: (uf.flow + downstreamFlows[idx].flow) / 2,
                waterLevel: (uf.waterLevel + downstreamFlows[idx].waterLevel) / 2,
                source: '插值',
              });
            }
          });
        }
        break;
      }
      case 'fill_gap': {
        const { sectionId, startTime, endTime } = fixData;
        const sectionFlows = newFlowData
          .filter(f => f.sectionId === sectionId)
          .sort((a, b) => a.timestamp - b.timestamp);

        const before = sectionFlows.find(f => f.timestamp <= startTime);
        const after = sectionFlows.find(f => f.timestamp >= endTime);

        if (before && after) {
          for (let t = startTime + hourMs; t < endTime; t += hourMs) {
            const ratio = (t - startTime) / (endTime - startTime);
            newFlowData.push({
              id: `flow-filled-${Date.now()}-${t}`,
              sectionId,
              timestamp: t,
              flow: before.flow + (after.flow - before.flow) * ratio,
              waterLevel: before.waterLevel + (after.waterLevel - before.waterLevel) * ratio,
              source: '插值填充',
            });
          }
        }
        break;
      }
      case 'sort': {
        const { sectionId } = fixData;
        newSections = newSections.map(s => {
          if (s.id === sectionId) {
            return {
              ...s,
              coordinates: [...s.coordinates].sort((a, b) => a[0] - b[0]),
            };
          }
          return s;
        });
        break;
      }
      case 'align_time': {
        const { sectionId, alignHours } = fixData;
        const newSedimentData = state.sedimentData.map(s => {
          if (s.sectionId === sectionId && s.delayHours > 0) {
            return {
              ...s,
              timestamp: s.timestamp - alignHours * hourMs,
              delayHours: 0,
            };
          }
          return s;
        });
        set({ sedimentData: newSedimentData });
        break;
      }
      case 'estimate_sediment': {
        const { sectionId } = fixData;
        const sectionFlows = state.flowData.filter(f => f.sectionId === sectionId);
        const newSedimentData = [...state.sedimentData];

        sectionFlows.forEach(f => {
          newSedimentData.push({
            id: `sed-est-${Date.now()}-${f.timestamp}`,
            sectionId,
            timestamp: f.timestamp,
            concentration: 0.0005 * f.flow,
            particleSize: 0.08,
            delayHours: 0,
          });
        });
        set({ sedimentData: newSedimentData });
        break;
      }
    }

    set({
      sections: newSections,
      flowData: newFlowData,
      issues: state.issues.map(i =>
        i.id === issueId ? { ...i, ignored: true } : i
      ),
    });

    get().recalculate();
    get().validateData();
  },

  selectSection: (sectionId: string | null) => {
    set({ selectedSectionId: sectionId });
  },

  setViewMode: (mode: '3d' | 'compare' | 'chart') => {
    set({ viewMode: mode });
  },

  updateFlowData: (index: number, newFlow: number) => {
    const state = get();
    const sortedFlows = [...state.flowData].sort((a, b) => a.timestamp - b.timestamp);
    if (sortedFlows[index]) {
      const newFlowData = state.flowData.map(f =>
        f.id === sortedFlows[index].id ? { ...f, flow: newFlow } : f
      );
      set({ flowData: newFlowData });
      get().recalculate();
      get().validateData();
    }
  },

  recalculate: () => {
    const state = get();
    set({ isCalculating: true });

    setTimeout(() => {
      const s = get();
      const result = runCalculation(
        s.sections,
        s.flowData,
        s.sedimentData,
        s.params,
        [s.time.startTime, s.time.endTime]
      );
      set({
        calculationResult: result,
        isCalculating: false,
      });
    }, 100);
  },
}));

useAppStore.getState().validateData();
useAppStore.getState().recalculate();
