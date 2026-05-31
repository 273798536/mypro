import { create } from "zustand";
import type {
  Charge,
  FieldLineData,
  HistorySnapshot,
  SampleRecord,
  TimelineStatus,
  RecordFilter,
} from "@/types";
import { generateFieldLines, checkOverlap } from "@/utils/fieldCalculator";
import { sampleRecords } from "@/data/sampleRecords";

interface FieldStore {
  charges: Charge[];
  fieldLines: FieldLineData[];
  sampleRecords: SampleRecord[];
  recordFilter: RecordFilter;
  history: HistorySnapshot[];
  currentHistoryIndex: number;
  timelineStatus: TimelineStatus;
  selectedChargeId: string | null;
  hoveredFieldPoint: { position: [number, number, number]; fieldVector: [number, number, number]; magnitude: number } | null;
  overlapDetected: boolean;
  isPaused: boolean;

  addCharge: (charge: Charge) => void;
  removeCharge: (id: string) => void;
  updateChargePosition: (id: string, position: [number, number, number]) => void;
  updateChargeValue: (id: string, charge: number) => void;
  selectCharge: (id: string | null) => void;
  setHoveredFieldPoint: (point: { position: [number, number, number]; fieldVector: [number, number, number]; magnitude: number } | null) => void;
  recalculateField: () => void;
  pushHistory: (label: string) => void;
  setTimelineStatus: (status: TimelineStatus) => void;
  goToHistoryIndex: (index: number) => void;
  setRecordFilter: (filter: RecordFilter) => void;
  togglePause: () => void;
  resetScene: () => void;
  restoreFromHistory: (snapshot: HistorySnapshot) => void;
}

const defaultCharges: Charge[] = [
  { id: "q1", position: [2, 0, 0], charge: 1, label: "Q₁ +" },
  { id: "q2", position: [-2, 0, 0], charge: -1, label: "Q₂ −" },
];

function computeInitialState() {
  const charges = defaultCharges;
  const fieldLines = generateFieldLines(charges);
  const overlapDetected = checkOverlap(charges);
  const snapshot: HistorySnapshot = {
    id: `snap-${Date.now()}`,
    timestamp: Date.now(),
    charges: JSON.parse(JSON.stringify(charges)),
    fieldLines: JSON.parse(JSON.stringify(fieldLines)),
    label: "初始状态",
    overlapDetected,
  };
  return { charges, fieldLines, history: [snapshot], currentHistoryIndex: 0, overlapDetected };
}

const initial = computeInitialState();

export const useFieldStore = create<FieldStore>((set, get) => ({
  charges: initial.charges,
  fieldLines: initial.fieldLines,
  sampleRecords,
  recordFilter: "all",
  history: initial.history,
  currentHistoryIndex: initial.currentHistoryIndex,
  timelineStatus: "stopped",
  selectedChargeId: null,
  hoveredFieldPoint: null,
  overlapDetected: initial.overlapDetected,
  isPaused: false,

  addCharge: (charge) => {
    set((state) => {
      const charges = [...state.charges, charge];
      const fieldLines = generateFieldLines(charges);
      const overlapDetected = checkOverlap(charges);
      return { charges, fieldLines, overlapDetected };
    });
    get().pushHistory("添加电荷");
  },

  removeCharge: (id) => {
    set((state) => {
      const charges = state.charges.filter((c) => c.id !== id);
      const fieldLines = generateFieldLines(charges);
      const overlapDetected = checkOverlap(charges);
      const selectedChargeId = state.selectedChargeId === id ? null : state.selectedChargeId;
      return { charges, fieldLines, overlapDetected, selectedChargeId };
    });
    get().pushHistory("删除电荷");
  },

  updateChargePosition: (id, position) => {
    set((state) => {
      const charges = state.charges.map((c) =>
        c.id === id ? { ...c, position } : c
      );
      const fieldLines = generateFieldLines(charges);
      const overlapDetected = checkOverlap(charges);
      return { charges, fieldLines, overlapDetected };
    });
  },

  updateChargeValue: (id, charge) => {
    set((state) => {
      const charges = state.charges.map((c) =>
        c.id === id ? { ...c, charge, label: charge >= 0 ? `${c.label.split(" ")[0]} +` : `${c.label.split(" ")[0]} −` } : c
      );
      const fieldLines = generateFieldLines(charges);
      const overlapDetected = checkOverlap(charges);
      return { charges, fieldLines, overlapDetected };
    });
    get().pushHistory("修改电量");
  },

  selectCharge: (id) => set({ selectedChargeId: id }),
  setHoveredFieldPoint: (point) => set({ hoveredFieldPoint: point }),

  recalculateField: () => {
    set((state) => {
      const fieldLines = generateFieldLines(state.charges);
      const overlapDetected = checkOverlap(state.charges);
      return { fieldLines, overlapDetected };
    });
  },

  pushHistory: (label) => {
    set((state) => {
      const snapshot: HistorySnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: Date.now(),
        charges: JSON.parse(JSON.stringify(state.charges)),
        fieldLines: JSON.parse(JSON.stringify(state.fieldLines)),
        label,
        overlapDetected: state.overlapDetected,
      };
      const history = [...state.history.slice(0, state.currentHistoryIndex + 1), snapshot];
      if (history.length > 50) history.shift();
      return { history, currentHistoryIndex: history.length - 1 };
    });
  },

  setTimelineStatus: (status) => set({ timelineStatus: status }),

  goToHistoryIndex: (index) => {
    const state = get();
    if (index < 0 || index >= state.history.length) return;
    const snapshot = state.history[index];
    set({
      currentHistoryIndex: index,
      charges: JSON.parse(JSON.stringify(snapshot.charges)),
      fieldLines: JSON.parse(JSON.stringify(snapshot.fieldLines)),
      overlapDetected: snapshot.overlapDetected || false,
    });
  },

  setRecordFilter: (filter) => set({ recordFilter: filter }),

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  resetScene: () => {
    const fresh = computeInitialState();
    set({
      charges: fresh.charges,
      fieldLines: fresh.fieldLines,
      history: fresh.history,
      currentHistoryIndex: fresh.currentHistoryIndex,
      overlapDetected: fresh.overlapDetected,
      selectedChargeId: null,
      hoveredFieldPoint: null,
      isPaused: false,
      timelineStatus: "stopped",
    });
  },

  restoreFromHistory: (snapshot) => {
    set({
      charges: JSON.parse(JSON.stringify(snapshot.charges)),
      fieldLines: JSON.parse(JSON.stringify(snapshot.fieldLines)),
      overlapDetected: snapshot.overlapDetected || false,
    });
  },
}));
