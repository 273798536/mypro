import { create } from 'zustand';
import type { ParamState, RotationAxis, CalculationMethod, ReviewStatus, CalculationResult } from '../types/params';
import type { ModificationEntry } from '../types/records';
import { validateParameters, getReviewStatus } from '../utils/validation/reviewEngine';
import { calculateVolume } from '../utils/math/volumeCalculator';

interface ParamStore extends ParamState {
  currentResult: CalculationResult | null;
  isCalculating: boolean;

  setFunctionExpr: (expr: string) => void;
  setRotationAxis: (axis: RotationAxis) => void;
  setAxisOffset: (offset: number) => void;
  setIntervalA: (a: number) => void;
  setIntervalB: (b: number) => void;
  setSliceCount: (count: number) => void;
  setShowSlices: (show: boolean) => void;
  setMethod: (method: CalculationMethod) => void;
  setReviewStatus: (status: ReviewStatus, reviewer?: string, notes?: string) => void;
  validateAndCalculate: () => void;
  reset: () => void;
  getModification: (key: keyof ParamState, newValue: unknown) => ModificationEntry | null;
  trackModification: (field: string, oldValue: unknown, newValue: unknown) => void;
}

const defaultParams: ParamState = {
  functionExpr: 'x^2',
  rotationAxis: 'x',
  axisOffset: 0,
  intervalA: 0,
  intervalB: 1,
  sliceCount: 20,
  showSlices: false,
  method: 'disk',
  validation: {
    isIntervalReversed: false,
    isAxisAmbiguous: false,
    isSliceInsufficient: false,
    reviewStatus: 'approved',
    assignedReviewer: null,
    issues: [],
  },
};

function loadSavedParams(): ParamState {
  try {
    const saved = localStorage.getItem('rotation_solid_params');
    if (saved) {
      return { ...defaultParams, ...JSON.parse(saved) };
    }
  } catch {
    // ignore
  }
  return defaultParams;
}

export const useParamStore = create<ParamStore>((set, get) => ({
  ...loadSavedParams(),
  currentResult: null,
  isCalculating: false,

  setFunctionExpr: (expr: string) => {
    const oldValue = get().functionExpr;
    set({ functionExpr: expr });
    get().validateAndCalculate();
    if (oldValue !== expr) {
      get().trackModification('functionExpr', oldValue, expr);
    }
  },

  setRotationAxis: (axis: RotationAxis) => {
    const oldValue = get().rotationAxis;
    set({ rotationAxis: axis });
    get().validateAndCalculate();
    if (oldValue !== axis) {
      get().trackModification('rotationAxis', oldValue, axis);
    }
  },

  setAxisOffset: (offset: number) => {
    const oldValue = get().axisOffset;
    set({ axisOffset: offset });
    get().validateAndCalculate();
    if (oldValue !== offset) {
      get().trackModification('axisOffset', oldValue, offset);
    }
  },

  setIntervalA: (a: number) => {
    const oldValue = get().intervalA;
    set({ intervalA: a });
    get().validateAndCalculate();
    if (oldValue !== a) {
      get().trackModification('intervalA', oldValue, a);
    }
  },

  setIntervalB: (b: number) => {
    const oldValue = get().intervalB;
    set({ intervalB: b });
    get().validateAndCalculate();
    if (oldValue !== b) {
      get().trackModification('intervalB', oldValue, b);
    }
  },

  setSliceCount: (count: number) => {
    const oldValue = get().sliceCount;
    set({ sliceCount: count });
    get().validateAndCalculate();
    if (oldValue !== count) {
      get().trackModification('sliceCount', oldValue, count);
    }
  },

  setShowSlices: (show: boolean) => {
    set({ showSlices: show });
  },

  setMethod: (method: CalculationMethod) => {
    const oldValue = get().method;
    set({ method });
    get().validateAndCalculate();
    if (oldValue !== method) {
      get().trackModification('method', oldValue, method);
    }
  },

  setReviewStatus: (status: ReviewStatus, reviewer?: string, notes?: string) => {
    set((state) => ({
      validation: {
        ...state.validation,
        reviewStatus: status,
        assignedReviewer: reviewer || state.validation.assignedReviewer,
      },
    }));
    if (notes) {
      // store notes in record
    }
  },

  validateAndCalculate: () => {
    const state = get();
    const validationResult = validateParameters(state);

    set({
      isCalculating: true,
      validation: {
        isIntervalReversed: validationResult.issues.some((i) => i.type === 'interval_reversed'),
        isAxisAmbiguous: validationResult.issues.some((i) => i.type === 'axis_ambiguous'),
        isSliceInsufficient: validationResult.issues.some((i) => i.type === 'slice_insufficient'),
        reviewStatus: getReviewStatus(validationResult.issues),
        assignedReviewer: validationResult.issues.find((i) => i.reviewer)?.reviewer || null,
        issues: validationResult.issues,
      },
    });

    try {
      const result = calculateVolume(
        state.functionExpr,
        state.intervalA,
        state.intervalB,
        state.method,
        state.rotationAxis,
        state.axisOffset
      );
      set({ currentResult: result, isCalculating: false });
    } catch {
      set({ currentResult: null, isCalculating: false });
    }

    const currentState = get();
    localStorage.setItem(
      'rotation_solid_params',
      JSON.stringify({
        functionExpr: currentState.functionExpr,
        rotationAxis: currentState.rotationAxis,
        axisOffset: currentState.axisOffset,
        intervalA: currentState.intervalA,
        intervalB: currentState.intervalB,
        sliceCount: currentState.sliceCount,
        method: currentState.method,
      })
    );
  },

  reset: () => {
    set({ ...defaultParams });
    get().validateAndCalculate();
  },

  getModification: (key: keyof ParamState, newValue: unknown): ModificationEntry | null => {
    const oldValue = get()[key];
    if (oldValue === newValue) return null;

    return {
      id: `mod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      field: key as string,
      oldValue: String(oldValue),
      newValue: String(newValue),
      user: '当前用户',
    };
  },

  trackModification: (field: string, oldValue: unknown, newValue: unknown) => {
    // This will be used by record store to track history
  },
}));
