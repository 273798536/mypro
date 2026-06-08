import { create } from 'zustand';
import type {
  Turbine,
  SimulationParams,
  Viewpoint,
  ScreenshotCapture,
  Conclusion,
  ReviewStep,
  HighlightState,
  EdgeCase,
} from '@/types';
import {
  mockTurbines,
  defaultParams,
  initialReviewSteps,
  edgeCases,
} from '@/data/mockData';
import {
  calculateWakeField,
  generateWakeCones,
  getTotalWakeLoss,
  getAffectedTurbineIds,
  getOutOfBoundsTurbineIds,
} from '@/utils/wakeCalculation';
import type { WakeConeGeometry } from '@/utils/wakeCalculation';

interface ProjectState {
  turbines: Turbine[];
  params: SimulationParams;
  viewpoints: Viewpoint[];
  screenshots: ScreenshotCapture[];
  reviewSteps: ReviewStep[];
  conclusions: { old?: Conclusion; new?: Conclusion };
  edgeCases: EdgeCase[];
  activeEdgeCaseId: string | null;
  wrongUnitConversion: boolean;
  applyCoordinateOffset: boolean;
  highlight: HighlightState | null;
  selectedTurbineId: string | null;
  currentModelVersion: 'old' | 'new';
  showConclusionCompare: boolean;
  showEdgeCaseModal: boolean;
  showSupplementModal: boolean;
  showSignatureModal: boolean;

  wakeResults: ReturnType<typeof calculateWakeField>;
  wakeCones: WakeConeGeometry[];

  setParams: (params: Partial<SimulationParams>) => void;
  addViewpoint: (vp: Omit<Viewpoint, 'id' | 'createdAt'>) => void;
  removeViewpoint: (id: string) => void;
  addScreenshot: (shot: Omit<ScreenshotCapture, 'id' | 'createdAt'>) => void;
  removeScreenshot: (id: string) => void;

  setTurbines: (turbines: Turbine[]) => void;
  modifyTurbine: (id: string, updates: Partial<Turbine>) => void;
  triggerModelChange: () => void;

  completeRepeatRun: (count: number, operator: string, comment: string) => void;
  completeSupplement: (fields: string[], operator: string, comment: string) => void;
  completeConfirm: (signatureDataUrl: string, operator: string, comment: string) => void;

  activateEdgeCase: (id: string | null) => void;
  setWrongUnitConversion: (v: boolean) => void;
  setApplyCoordinateOffset: (v: boolean) => void;

  setHighlight: (h: HighlightState | null) => void;
  setSelectedTurbineId: (id: string | null) => void;
  setShowConclusionCompare: (v: boolean) => void;
  setShowEdgeCaseModal: (v: boolean) => void;
  setShowSupplementModal: (v: boolean) => void;
  setShowSignatureModal: (v: boolean) => void;

  recalculateWake: () => void;
  generateConclusion: (version: 'old' | 'new') => void;

  resetAll: () => void;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function nowString(): string {
  return new Date().toISOString();
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  turbines: mockTurbines,
  params: defaultParams,
  viewpoints: [],
  screenshots: [],
  reviewSteps: initialReviewSteps,
  conclusions: {},
  edgeCases,
  activeEdgeCaseId: null,
  wrongUnitConversion: false,
  applyCoordinateOffset: false,
  highlight: null,
  selectedTurbineId: null,
  currentModelVersion: 'old',
  showConclusionCompare: false,
  showEdgeCaseModal: false,
  showSupplementModal: false,
  showSignatureModal: false,

  wakeResults: [],
  wakeCones: [],

  setParams: (p) =>
    set((state) => {
      const newParams = { ...state.params, ...p };
      const results = calculateWakeField(
        state.turbines,
        newParams,
        state.wrongUnitConversion
      );
      const cones = generateWakeCones(
        state.turbines,
        newParams,
        state.wrongUnitConversion
      );
      return { params: newParams, wakeResults: results, wakeCones: cones };
    }),

  addViewpoint: (vp) =>
    set((state) => ({
      viewpoints: [
        ...state.viewpoints,
        { ...vp, id: generateId('vp'), createdAt: nowString() },
      ],
    })),

  removeViewpoint: (id) =>
    set((state) => ({
      viewpoints: state.viewpoints.filter((v) => v.id !== id),
    })),

  addScreenshot: (shot) =>
    set((state) => ({
      screenshots: [
        ...state.screenshots,
        { ...shot, id: generateId('ss'), createdAt: nowString() },
      ],
    })),

  removeScreenshot: (id) =>
    set((state) => ({
      screenshots: state.screenshots.filter((s) => s.id !== id),
    })),

  setTurbines: (turbines) =>
    set((state) => {
      const results = calculateWakeField(turbines, state.params, state.wrongUnitConversion);
      const cones = generateWakeCones(turbines, state.params, state.wrongUnitConversion);
      return { turbines, wakeResults: results, wakeCones: cones };
    }),

  modifyTurbine: (id, updates) =>
    set((state) => {
      const turbines = state.turbines.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      );
      const results = calculateWakeField(turbines, state.params, state.wrongUnitConversion);
      const cones = generateWakeCones(turbines, state.params, state.wrongUnitConversion);
      return { turbines, wakeResults: results, wakeCones: cones };
    }),

  triggerModelChange: () =>
    set((state) => {
      const version = state.currentModelVersion === 'old' ? 'new' : 'old';
      return { currentModelVersion: version, showConclusionCompare: true };
    }),

  completeRepeatRun: (count, operator, comment) =>
    set((state) => ({
      reviewSteps: state.reviewSteps.map((s) =>
        s.stepType === 'REPEAT_RUN'
          ? {
              ...s,
              completed: true,
              operator,
              comment,
              repeatCount: count,
              completedAt: nowString(),
            }
          : s
      ),
    })),

  completeSupplement: (fields, operator, comment) =>
    set((state) => ({
      reviewSteps: state.reviewSteps.map((s) =>
        s.stepType === 'SUPPLEMENT'
          ? {
              ...s,
              completed: true,
              operator,
              comment,
              supplementedFields: fields,
              completedAt: nowString(),
            }
          : s
      ),
    })),

  completeConfirm: (signatureDataUrl, operator, comment) =>
    set((state) => ({
      reviewSteps: state.reviewSteps.map((s) =>
        s.stepType === 'CONFIRM'
          ? {
              ...s,
              completed: true,
              operator,
              comment,
              signatureDataUrl,
              completedAt: nowString(),
            }
          : s
      ),
    })),

  activateEdgeCase: (id) =>
    set((state) => {
      const activeCase = state.edgeCases.find((e) => e.id === id);
      let newState: Partial<ProjectState> = { activeEdgeCaseId: id };

      if (activeCase) {
        if (activeCase.caseType === 'UNIT_ERROR') {
          const payload = activeCase.payload as Record<string, unknown>;
          newState.wrongUnitConversion = payload.applyWrongConversion as boolean;
          if (payload.windSpeed) {
            newState.params = {
              ...state.params,
              windSpeed: payload.windSpeed as number,
              windSpeedUnit: payload.windSpeedUnit as 'm/s' | 'knots',
            };
          }
          if (payload.spacingMultiple) {
            newState.params = {
              ...state.params,
              spacingMultiple: payload.spacingMultiple as number,
              spacingUnit: payload.spacingUnit as 'D' | 'km' | 'nautical_mile',
            };
          }
        }
        if (activeCase.caseType === 'COORDINATE_MIX') {
          const payload = activeCase.payload as Record<string, unknown>;
          newState.applyCoordinateOffset = true;
          const turbines = state.turbines.map((t) => {
            if (t.id === payload.targetTurbineId) {
              return {
                ...t,
                x: t.x + (payload.offsetX as number),
                y: t.y + (payload.offsetY as number),
                isOffset: true,
              };
            }
            return t;
          });
          newState.turbines = turbines;
        }
      } else {
        newState = {
          activeEdgeCaseId: null,
          wrongUnitConversion: false,
          applyCoordinateOffset: false,
          params: defaultParams,
          turbines: mockTurbines,
        };
      }

      const results = calculateWakeField(
        (newState.turbines || state.turbines) as Turbine[],
        (newState.params || state.params) as SimulationParams,
        (newState.wrongUnitConversion ?? state.wrongUnitConversion) as boolean
      );
      const cones = generateWakeCones(
        (newState.turbines || state.turbines) as Turbine[],
        (newState.params || state.params) as SimulationParams,
        (newState.wrongUnitConversion ?? state.wrongUnitConversion) as boolean
      );
      newState.wakeResults = results;
      newState.wakeCones = cones;

      return newState;
    }),

  setWrongUnitConversion: (v) =>
    set((state) => {
      const results = calculateWakeField(state.turbines, state.params, v);
      const cones = generateWakeCones(state.turbines, state.params, v);
      return { wrongUnitConversion: v, wakeResults: results, wakeCones: cones };
    }),

  setApplyCoordinateOffset: (v) =>
    set(() => ({ applyCoordinateOffset: v })),

  setHighlight: (h) => set({ highlight: h }),
  setSelectedTurbineId: (id) => set({ selectedTurbineId: id }),
  setShowConclusionCompare: (v) => set({ showConclusionCompare: v }),
  setShowEdgeCaseModal: (v) => set({ showEdgeCaseModal: v }),
  setShowSupplementModal: (v) => set({ showSupplementModal: v }),
  setShowSignatureModal: (v) => set({ showSignatureModal: v }),

  recalculateWake: () =>
    set((state) => {
      const results = calculateWakeField(
        state.turbines,
        state.params,
        state.wrongUnitConversion
      );
      const cones = generateWakeCones(
        state.turbines,
        state.params,
        state.wrongUnitConversion
      );
      return { wakeResults: results, wakeCones: cones };
    }),

  generateConclusion: (version) =>
    set((state) => {
      const results = state.wakeResults;
      const conclusion: Conclusion = {
        id: generateId('concl'),
        modelVersion: version,
        content:
          version === 'old'
            ? '基于原始三维模型的尾流评估结论'
            : '基于修改后三维模型的尾流评估结论',
        totalWakeLoss: getTotalWakeLoss(results),
        wakeResults: results,
        affectedTurbines: getAffectedTurbineIds(results),
        createdAt: nowString(),
      };
      return {
        conclusions: { ...state.conclusions, [version]: conclusion },
        showConclusionCompare: true,
      };
    }),

  resetAll: () =>
    set(() => {
      const results = calculateWakeField(mockTurbines, defaultParams, false);
      const cones = generateWakeCones(mockTurbines, defaultParams, false);
      return {
        turbines: mockTurbines,
        params: defaultParams,
        viewpoints: [],
        screenshots: [],
        reviewSteps: initialReviewSteps,
        conclusions: {},
        activeEdgeCaseId: null,
        wrongUnitConversion: false,
        applyCoordinateOffset: false,
        highlight: null,
        selectedTurbineId: null,
        currentModelVersion: 'old',
        showConclusionCompare: false,
        showEdgeCaseModal: false,
        showSupplementModal: false,
        showSignatureModal: false,
        wakeResults: results,
        wakeCones: cones,
      };
    }),
}));

const initState = useProjectStore.getState();
const initResults = calculateWakeField(mockTurbines, defaultParams, false);
const initCones = generateWakeCones(mockTurbines, defaultParams, false);
useProjectStore.setState({
  ...initState,
  wakeResults: initResults,
  wakeCones: initCones,
});

export { getOutOfBoundsTurbineIds };
