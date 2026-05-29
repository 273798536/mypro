import { create } from 'zustand';
import {
  type Charge,
  type TestPoint,
  type Anomaly,
  calculateFieldAt,
  generateFieldLines,
  detectAnomalies,
} from '@/utils/fieldCalculation';
import {
  type ConclusionState,
  type ConclusionChange,
  captureConclusionState,
  compareConclusions,
} from '@/utils/conclusionComparison';

let chargeCounter = 0;
let testPointCounter = 0;

export interface Snapshot {
  id: string;
  timestamp: number;
  dataUrl: string;
  charges: Charge[];
  testPoints: TestPoint[];
  anomalies: Anomaly[];
  notes: string;
}

interface StoreState {
  charges: Charge[];
  testPoints: TestPoint[];
  anomalies: Anomaly[];
  fieldLines: [number, number, number][][];
  notes: string;
  snapshots: Snapshot[];
  conclusionBaseline: ConclusionState | null;
  conclusionChange: ConclusionChange | null;
  selectedChargeId: string | null;
  selectedTestPointId: string | null;
  gridVisible: boolean;
  panelCollapsed: { left: boolean; right: boolean };

  addCharge: (magnitude?: number, position?: [number, number, number]) => void;
  removeCharge: (id: string) => void;
  updateChargePosition: (id: string, position: [number, number, number]) => void;
  updateChargeMagnitude: (id: string, magnitude: number) => void;
  updateChargeLabel: (id: string, label: string) => void;
  selectCharge: (id: string | null) => void;

  addTestPoint: (position?: [number, number, number]) => void;
  removeTestPoint: (id: string) => void;
  updateTestPointPosition: (id: string, position: [number, number, number]) => void;
  selectTestPoint: (id: string | null) => void;

  setNotes: (notes: string) => void;
  addSnapshot: (dataUrl: string) => void;

  recalculate: () => void;
  snapshotConclusion: () => void;
  checkConclusionChanges: () => ConclusionChange;

  toggleGrid: () => void;
  togglePanel: (side: 'left' | 'right') => void;
}

function deriveAnomaliesAndFieldLines(charges: Charge[], testPoints: TestPoint[]) {
  const fieldLines = generateFieldLines(charges, 8);
  const anomalies = detectAnomalies(charges, testPoints);
  return { fieldLines, anomalies };
}

export const useStore = create<StoreState>((set, get) => ({
  charges: [
    { id: 'q0', position: [2, 0, 0], magnitude: 1, label: 'Q₁' },
    { id: 'q1', position: [-2, 0, 0], magnitude: -1, label: 'Q₂' },
  ],
  testPoints: [],
  anomalies: [],
  fieldLines: [],
  notes: '',
  snapshots: [],
  conclusionBaseline: null,
  conclusionChange: null,
  selectedChargeId: null,
  selectedTestPointId: null,
  gridVisible: true,
  panelCollapsed: { left: false, right: false },

  addCharge: (magnitude = 1, position) => {
    chargeCounter++;
    const id = `q${Date.now()}_${chargeCounter}`;
    const label = `Q${chargeCounter + 2}`;
    const pos = position ?? [
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      0,
    ];
    const charge: Charge = { id, position: pos as [number, number, number], magnitude, label };
    set((state) => {
      const charges = [...state.charges, charge];
      const { fieldLines, anomalies } = deriveAnomaliesAndFieldLines(charges, state.testPoints);
      return { charges, fieldLines, anomalies };
    });
  },

  removeCharge: (id) => {
    set((state) => {
      const charges = state.charges.filter((c) => c.id !== id);
      const { fieldLines, anomalies } = deriveAnomaliesAndFieldLines(charges, state.testPoints);
      return { charges, fieldLines, anomalies, selectedChargeId: state.selectedChargeId === id ? null : state.selectedChargeId };
    });
  },

  updateChargePosition: (id, position) => {
    set((state) => {
      const charges = state.charges.map((c) =>
        c.id === id ? { ...c, position } : c
      );
      const { fieldLines, anomalies } = deriveAnomaliesAndFieldLines(charges, state.testPoints);
      return { charges, fieldLines, anomalies };
    });
  },

  updateChargeMagnitude: (id, magnitude) => {
    set((state) => {
      const charges = state.charges.map((c) =>
        c.id === id ? { ...c, magnitude } : c
      );
      const { fieldLines, anomalies } = deriveAnomaliesAndFieldLines(charges, state.testPoints);
      return { charges, fieldLines, anomalies };
    });
  },

  updateChargeLabel: (id, label) => {
    set((state) => ({
      charges: state.charges.map((c) =>
        c.id === id ? { ...c, label } : c
      ),
    }));
  },

  selectCharge: (id) => set({ selectedChargeId: id }),

  addTestPoint: (position) => {
    testPointCounter++;
    const id = `tp${Date.now()}_${testPointCounter}`;
    const pos = position ?? [
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3,
      0,
    ];
    const testPoint: TestPoint = { id, position: pos as [number, number, number] };
    set((state) => {
      const testPoints = [...state.testPoints, testPoint];
      const { fieldLines, anomalies } = deriveAnomaliesAndFieldLines(state.charges, testPoints);
      return { testPoints, fieldLines, anomalies };
    });
  },

  removeTestPoint: (id) => {
    set((state) => {
      const testPoints = state.testPoints.filter((tp) => tp.id !== id);
      const { fieldLines, anomalies } = deriveAnomaliesAndFieldLines(state.charges, testPoints);
      return { testPoints, fieldLines, anomalies, selectedTestPointId: state.selectedTestPointId === id ? null : state.selectedTestPointId };
    });
  },

  updateTestPointPosition: (id, position) => {
    set((state) => {
      const testPoints = state.testPoints.map((tp) =>
        tp.id === id ? { ...tp, position } : tp
      );
      const { fieldLines, anomalies } = deriveAnomaliesAndFieldLines(state.charges, testPoints);
      return { testPoints, fieldLines, anomalies };
    });
  },

  selectTestPoint: (id) => set({ selectedTestPointId: id }),

  setNotes: (notes) => set({ notes }),

  addSnapshot: (dataUrl) => {
    const state = get();
    const snapshot: Snapshot = {
      id: `snap_${Date.now()}`,
      timestamp: Date.now(),
      dataUrl,
      charges: [...state.charges],
      testPoints: [...state.testPoints],
      anomalies: [...state.anomalies],
      notes: state.notes,
    };
    set((state) => ({ snapshots: [...state.snapshots, snapshot] }));
  },

  recalculate: () => {
    set((state) => {
      const { fieldLines, anomalies } = deriveAnomaliesAndFieldLines(state.charges, state.testPoints);
      return { fieldLines, anomalies };
    });
  },

  snapshotConclusion: () => {
    const state = get();
    const baseline = captureConclusionState(state.charges, state.testPoints, calculateFieldAt);
    set({ conclusionBaseline: baseline, conclusionChange: null });
  },

  checkConclusionChanges: () => {
    const state = get();
    const current = captureConclusionState(state.charges, state.testPoints, calculateFieldAt);
    const change = compareConclusions(state.conclusionBaseline, current);
    set({ conclusionChange: change });
    return change;
  },

  toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),
  togglePanel: (side) => set((state) => ({
    panelCollapsed: { ...state.panelCollapsed, [side]: !state.panelCollapsed[side] },
  })),
}));

useStore.getState().recalculate();
