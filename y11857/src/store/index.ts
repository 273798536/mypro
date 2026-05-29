import { create } from 'zustand';
import {
  StationFloor,
  Issue,
  ViewPreset,
  Bottleneck,
  ValidationResult,
  ESCALATOR_CAPACITY_RANGE,
  GATE_PASS_RATE_RANGE,
  DataValidationReport
} from '../types';

interface AppState {
  stationName: string;
  floors: StationFloor[];
  visibleFloors: number[];
  selectedFloor: number | null;
  issues: Issue[];
  bottlenecks: Bottleneck[];
  viewPresets: ViewPreset[];
  validationReport: DataValidationReport | null;
  isDataLoaded: boolean;
  isSimulating: boolean;
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };

  setStationName: (name: string) => void;
  setFloors: (floors: StationFloor[]) => void;
  toggleFloorVisibility: (level: number) => void;
  setSelectedFloor: (level: number | null) => void;
  addIssue: (issue: Omit<Issue, 'id' | 'createdAt'>) => void;
  updateIssueStatus: (id: string, status: Issue['status']) => void;
  addBottleneck: (bottleneck: Bottleneck) => void;
  addViewPreset: (preset: Omit<ViewPreset, 'id' | 'createdAt'>) => void;
  setValidationReport: (report: DataValidationReport) => void;
  setDataLoaded: (loaded: boolean) => void;
  setSimulating: (simulating: boolean) => void;
  setCameraPosition: (pos: { x: number; y: number; z: number }) => void;
  setCameraTarget: (target: { x: number; y: number; z: number }) => void;
  updateEscalatorCapacity: (floorLevel: number, escalatorId: string, capacity: number) => ValidationResult;
  updateGatePassRate: (floorLevel: number, gateId: string, passRate: number) => ValidationResult;
  toggleBarrier: (floorLevel: number, barrierId: string) => void;
  getBlockedEscalatorCount: () => number;
  resetStore: () => void;
}

const initialState = {
  stationName: '',
  floors: [],
  visibleFloors: [],
  selectedFloor: null,
  issues: [],
  bottlenecks: [],
  viewPresets: [],
  validationReport: null,
  isDataLoaded: false,
  isSimulating: false,
  cameraPosition: { x: 30, y: 40, z: 30 },
  cameraTarget: { x: 0, y: 0, z: 0 }
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  setStationName: (name) => set({ stationName: name }),

  setFloors: (floors) => set({
    floors,
    visibleFloors: floors.map(f => f.level)
  }),

  toggleFloorVisibility: (level) => set((state) => {
    const visible = state.visibleFloors.includes(level)
      ? state.visibleFloors.filter(l => l !== level)
      : [...state.visibleFloors, level];
    return { visibleFloors: visible };
  }),

  setSelectedFloor: (level) => set({ selectedFloor: level }),

  addIssue: (issue) => set((state) => ({
    issues: [...state.issues, {
      ...issue,
      id: `issue-${Date.now()}`,
      createdAt: new Date()
    }]
  })),

  updateIssueStatus: (id, status) => set((state) => ({
    issues: state.issues.map(issue =>
      issue.id === id ? { ...issue, status } : issue
    )
  })),

  addBottleneck: (bottleneck) => set((state) => ({
    bottlenecks: [...state.bottlenecks, bottleneck]
  })),

  addViewPreset: (preset) => set((state) => ({
    viewPresets: [...state.viewPresets, {
      ...preset,
      id: `preset-${Date.now()}`,
      createdAt: new Date()
    }]
  })),

  setValidationReport: (report) => set({ validationReport: report }),

  setDataLoaded: (loaded) => set({ isDataLoaded: loaded }),

  setSimulating: (simulating) => set({ isSimulating: simulating }),

  setCameraPosition: (pos) => set({ cameraPosition: pos }),

  setCameraTarget: (target) => set({ cameraTarget: target }),

  updateEscalatorCapacity: (floorLevel, escalatorId, capacity) => {
    const state = get();
    let result: ValidationResult = { valid: true, level: 'normal', message: '正常' };

    if (capacity < ESCALATOR_CAPACITY_RANGE.min || capacity > ESCALATOR_CAPACITY_RANGE.max) {
      result = { valid: false, level: 'error', message: `容量参数越界(${ESCALATOR_CAPACITY_RANGE.min}-${ESCALATOR_CAPACITY_RANGE.max})，已拦截` };
    }

    set((state) => ({
      floors: state.floors.map(floor => {
        if (floor.level !== floorLevel) return floor;
        return {
          ...floor,
          escalators: floor.escalators.map(esc => {
            if (esc.id !== escalatorId) return esc;
            const ratio = capacity / esc.maxCapacity;
            let status: 'normal' | 'warning' | 'error' = 'normal';
            if (ratio >= ESCALATOR_CAPACITY_RANGE.errorThreshold) status = 'error';
            else if (ratio >= ESCALATOR_CAPACITY_RANGE.warningThreshold) status = 'warning';
            return { ...esc, capacity, status };
          })
        };
      })
    }));

    if (!result.valid) {
      const floor = state.floors.find(f => f.level === floorLevel);
      const escalator = floor?.escalators.find(e => e.id === escalatorId);
      state.addIssue({
        type: 'escalator_capacity',
        severity: 'critical',
        title: `扶梯容量参数越界: ${escalator?.name || escalatorId}`,
        description: `输入容量 ${capacity} 超出合理范围 ${ESCALATOR_CAPACITY_RANGE.min}-${ESCALATOR_CAPACITY_RANGE.max}`,
        floor: floorLevel,
        facilityId: escalatorId,
        responsiblePerson: '张工 - 设施部',
        documentPath: '/docs/station/B1-floor-spec.docx',
        status: 'open',
        parameterSnapshot: { capacity, escalatorId, floorLevel }
      });
    }

    return result;
  },

  updateGatePassRate: (floorLevel, gateId, passRate) => {
    let result: ValidationResult = { valid: true, level: 'normal', message: '正常' };

    if (passRate < GATE_PASS_RATE_RANGE.min || passRate > GATE_PASS_RATE_RANGE.max) {
      result = { valid: false, level: 'error', message: `闸机速率越界(${GATE_PASS_RATE_RANGE.min}-${GATE_PASS_RATE_RANGE.max})，已拦截` };
    }

    set((state) => ({
      floors: state.floors.map(floor => {
        if (floor.level !== floorLevel) return floor;
        return {
          ...floor,
          gates: floor.gates.map(gate =>
            gate.id === gateId ? { ...gate, passRate } : gate
          )
        };
      })
    }));

    return result;
  },

  toggleBarrier: (floorLevel, barrierId) => {
    const state = get();
    const floor = state.floors.find(f => f.level === floorLevel);
    const barrier = floor?.barriers.find(b => b.id === barrierId);

    set((state) => ({
      floors: state.floors.map(floor => {
        if (floor.level !== floorLevel) return floor;
        return {
          ...floor,
          barriers: floor.barriers.map(b =>
            b.id === barrierId ? { ...b, active: !b.active } : b
          )
        };
      })
    }));

    if (barrier && barrier.active) {
      state.addIssue({
        type: 'barrier_inactive',
        severity: 'warning',
        title: `围挡未生效: ${barrier.name}`,
        description: `B${floorLevel}层围挡 ${barrier.name} 已关闭，请注意客流回流`,
        floor: floorLevel,
        facilityId: barrierId,
        responsiblePerson: '李工 - 施工协调',
        documentPath: `/docs/construction/barrier-plan-B${floorLevel}.pdf`,
        status: 'open'
      });
    }
  },

  getBlockedEscalatorCount: () => {
    const state = get();
    return state.issues.filter(i => i.type === 'escalator_capacity' && i.status !== 'resolved').length;
  },

  resetStore: () => set(initialState)
}));
