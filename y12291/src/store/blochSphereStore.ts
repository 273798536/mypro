import { create } from 'zustand';
import type { QuantumState, MeasurementBasis, ProbabilityBar, ValidationIssue, TraceLink } from '@/types/quantum';
import { validateQuantumState, computeDataGap } from '@/utils/validation';

interface BlochSphereStore {
  quantumStates: Record<string, QuantumState>;
  anomalyList: ValidationIssue[];
  selectedStateId: string | null;

  addQuantumState: (params: Partial<QuantumState>) => string;
  updateMeasurementBasis: (id: string, basis: MeasurementBasis) => void;
  updateProbabilityBars: (id: string, bars: ProbabilityBar[]) => void;
  updateQuantumParams: (id: string, theta: number, phi: number, alpha: number, beta: number) => void;
  removeQuantumState: (id: string) => void;
  selectState: (id: string | null) => void;
  resolveAnomaly: (issueId: string) => void;
  getTraceForward: (id: string) => TraceLink[];
  getTraceBackward: (id: string) => TraceLink[];
  rebuildAnomalyList: () => void;
}

function generateId(): string {
  return `qs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function rebuildValidation(state: QuantumState): QuantumState {
  const validation = validateQuantumState(state);
  const gap = computeDataGap(state);
  return {
    ...state,
    validationStatus: validation,
    hasDataGap: gap.hasGap,
    dataGapFields: gap.fields,
    updatedAt: Date.now(),
  };
}

function buildTraceLinks(state: QuantumState): TraceLink[] {
  const links: TraceLink[] = [];
  links.push({
    from: state.id,
    to: `${state.id}-result`,
    relation: 'parameter-to-result',
    label: `θ=${state.theta.toFixed(2)}, φ=${state.phi.toFixed(2)}`,
  });
  if (state.measurementBasis) {
    links.push({
      from: `${state.id}-result`,
      to: `${state.id}-basis`,
      relation: 'result-to-basis',
      label: state.measurementBasis.type,
    });
    links.push({
      from: `${state.id}-basis`,
      to: state.id,
      relation: 'basis-to-parameter',
      label: '反查基',
    });
  }
  return links;
}

export const useBlochSphereStore = create<BlochSphereStore>((set, get) => ({
  quantumStates: {},
  anomalyList: [],
  selectedStateId: null,

  addQuantumState: (params) => {
    const id = generateId();
    const now = Date.now();
    const newState: QuantumState = {
      id,
      theta: params.theta ?? 0,
      phi: params.phi ?? 0,
      label: params.label ?? `量子态 ${Object.keys(get().quantumStates).length + 1}`,
      alpha: params.alpha ?? 1,
      beta: params.beta ?? 0,
      normalizedProbability: params.normalizedProbability ?? null,
      measurementBasis: params.measurementBasis ?? null,
      probabilityBars: params.probabilityBars ?? [],
      validationStatus: {
        isNormalized: null,
        normalizationDelta: null,
        isPhaseInRange: true,
        phaseOverflow: null,
        measurementBasisConfusion: false,
        issues: [],
      },
      traceLinks: [],
      createdAt: now,
      updatedAt: now,
      hasDataGap: true,
      dataGapFields: ['measurementBasis', 'probabilityBars', 'normalizedProbability'],
    };

    const validated = rebuildValidation(newState);
    validated.traceLinks = buildTraceLinks(validated);

    set((s) => ({
      quantumStates: { ...s.quantumStates, [id]: validated },
    }));
    get().rebuildAnomalyList();
    return id;
  },

  updateMeasurementBasis: (id, basis) => {
    set((s) => {
      const existing = s.quantumStates[id];
      if (!existing) return s;
      const updated: QuantumState = {
        ...existing,
        measurementBasis: basis,
      };
      const validated = rebuildValidation(updated);
      validated.traceLinks = buildTraceLinks(validated);
      return { quantumStates: { ...s.quantumStates, [id]: validated } };
    });
    get().rebuildAnomalyList();
  },

  updateProbabilityBars: (id, bars) => {
    set((s) => {
      const existing = s.quantumStates[id];
      if (!existing) return s;
      const updated: QuantumState = {
        ...existing,
        probabilityBars: bars,
      };
      const validated = rebuildValidation(updated);
      validated.traceLinks = buildTraceLinks(validated);
      return { quantumStates: { ...s.quantumStates, [id]: validated } };
    });
    get().rebuildAnomalyList();
  },

  updateQuantumParams: (id, theta, phi, alpha, beta) => {
    set((s) => {
      const existing = s.quantumStates[id];
      if (!existing) return s;
      const updated: QuantumState = {
        ...existing,
        theta,
        phi,
        alpha,
        beta,
      };
      const validated = rebuildValidation(updated);
      validated.traceLinks = buildTraceLinks(validated);
      return { quantumStates: { ...s.quantumStates, [id]: validated } };
    });
    get().rebuildAnomalyList();
  },

  removeQuantumState: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.quantumStates;
      return { quantumStates: rest };
    });
    get().rebuildAnomalyList();
  },

  selectState: (id) => set({ selectedStateId: id }),

  resolveAnomaly: (issueId) => {
    set((s) => ({
      anomalyList: s.anomalyList.map((issue) =>
        issue.id === issueId ? { ...issue, resolvedAt: Date.now() } : issue
      ),
    }));
  },

  getTraceForward: (id) => {
    const state = get().quantumStates[id];
    if (!state) return [];
    return state.traceLinks.filter((l) => l.from === id || l.relation === 'parameter-to-result');
  },

  getTraceBackward: (id) => {
    const state = get().quantumStates[id];
    if (!state) return [];
    return state.traceLinks.filter((l) => l.to === id || l.relation === 'basis-to-parameter');
  },

  rebuildAnomalyList: () => {
    const states = get().quantumStates;
    const allIssues: ValidationIssue[] = [];
    for (const state of Object.values(states)) {
      for (const issue of state.validationStatus.issues) {
        if (issue.resolvedAt === null) {
          allIssues.push(issue);
        }
      }
    }
    set({ anomalyList: allIssues });
  },
}));
