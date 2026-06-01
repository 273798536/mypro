import { create } from 'zustand';
import type {
  Volunteer,
  Position,
  Shift,
  Skill,
  LeaveRecord,
  Assignment,
  Anomaly,
  ConstraintNode,
  AssignmentResult,
  AlgorithmMode,
  FilterState,
  Correction,
  AnomalyType,
} from '@/types';
import { SKILLS, VOLUNTEERS, POSITIONS, SHIFTS, LEAVE_RECORDS } from '@/data/mockData';
import { runAssignment } from '@/algo/networkFlow';

interface AppState {
  skills: Skill[];
  volunteers: Volunteer[];
  positions: Position[];
  shifts: Shift[];
  leaveRecords: LeaveRecord[];
  filter: FilterState;
  algorithmMode: AlgorithmMode;
  currentResult: AssignmentResult | null;
  previousResult: AssignmentResult | null;
  corrections: Correction[];
  selectedAssignmentId: string | null;
  constraintDrawerOpen: boolean;

  setFilter: (filter: Partial<FilterState>) => void;
  setAlgorithmMode: (mode: AlgorithmMode) => void;
  runAssignmentAlgorithm: () => void;
  updateVolunteerSkill: (volunteerId: string, skillIds: string[]) => void;
  setSelectedAssignment: (id: string | null) => void;
  setConstraintDrawerOpen: (open: boolean) => void;
  resetPreviousResult: () => void;

  getVolunteerById: (id: string) => Volunteer | undefined;
  getPositionById: (id: string) => Position | undefined;
  getShiftById: (id: string) => Shift | undefined;
  getSkillById: (id: string) => Skill | undefined;
  getLeaveRecordsForVolunteer: (volunteerId: string) => LeaveRecord[];
  getFilteredVolunteers: () => Volunteer[];
  getFilteredAssignments: () => Assignment[];
  getFilteredAnomalies: () => Anomaly[];
}

export const useStore = create<AppState>((set, get) => ({
  skills: [...SKILLS],
  volunteers: VOLUNTEERS.map(v => ({ ...v, skillIds: [...v.skillIds], leaveSlots: [...v.leaveSlots] })),
  positions: POSITIONS.map(p => ({ ...p, requiredSkillIds: [...p.requiredSkillIds] })),
  shifts: [...SHIFTS],
  leaveRecords: [...LEAVE_RECORDS],
  filter: {
    skillIds: [],
    timeSlot: null,
    anomalyTypes: [],
    searchQuery: '',
  },
  algorithmMode: 'min_cost_max_flow',
  currentResult: null,
  previousResult: null,
  corrections: [],
  selectedAssignmentId: null,
  constraintDrawerOpen: false,

  setFilter: (partial) =>
    set((state) => ({ filter: { ...state.filter, ...partial } })),

  setAlgorithmMode: (mode) => set({ algorithmMode: mode }),

  runAssignmentAlgorithm: () => {
    const state = get();
    const result = runAssignment(
      state.volunteers,
      state.positions,
      state.shifts,
      state.skills,
      state.leaveRecords,
      state.algorithmMode
    );
    set((state) => ({
      currentResult: result,
      previousResult: state.currentResult ? { ...state.currentResult } : null,
    }));
  },

  updateVolunteerSkill: (volunteerId, skillIds) => {
    const state = get();
    const volunteer = state.volunteers.find(v => v.id === volunteerId);
    if (!volunteer) return;

    const oldSkillNames = volunteer.skillIds.map(sid => state.getSkillById(sid)?.name || sid).join('、');
    const newSkillNames = skillIds.map(sid => state.getSkillById(sid)?.name || sid).join('、');

    const correction: Correction = {
      id: `cor_${Date.now()}`,
      volunteerId,
      field: 'skillIds',
      oldValue: oldSkillNames,
      newValue: newSkillNames,
      timestamp: new Date().toLocaleString('zh-CN'),
    };

    set((state) => ({
      volunteers: state.volunteers.map(v =>
        v.id === volunteerId ? { ...v, skillIds } : v
      ),
      corrections: [...state.corrections, correction],
    }));

    get().runAssignmentAlgorithm();
  },

  setSelectedAssignment: (id) => set({ selectedAssignmentId: id, constraintDrawerOpen: id !== null }),
  setConstraintDrawerOpen: (open) => set({ constraintDrawerOpen: open }),
  resetPreviousResult: () => set({ previousResult: null }),

  getVolunteerById: (id) => get().volunteers.find(v => v.id === id),
  getPositionById: (id) => get().positions.find(p => p.id === id),
  getShiftById: (id) => get().shifts.find(s => s.id === id),
  getSkillById: (id) => get().skills.find(s => s.id === id),
  getLeaveRecordsForVolunteer: (volunteerId) => get().leaveRecords.filter(lr => lr.volunteerId === volunteerId),

  getFilteredVolunteers: () => {
    const state = get();
    let result = state.volunteers;
    if (state.filter.searchQuery) {
      const q = state.filter.searchQuery.toLowerCase();
      result = result.filter(v => v.name.toLowerCase().includes(q));
    }
    if (state.filter.skillIds.length > 0) {
      result = result.filter(v => state.filter.skillIds.some(sid => v.skillIds.includes(sid)));
    }
    if (state.filter.timeSlot) {
      result = result.filter(v => !v.leaveSlots.includes(state.filter.timeSlot!));
    }
    return result;
  },

  getFilteredAssignments: () => {
    const state = get();
    if (!state.currentResult) return [];
    let result = state.currentResult.assignments;
    if (state.filter.skillIds.length > 0) {
      result = result.filter(a => {
        const vol = state.getVolunteerById(a.volunteerId);
        return vol && state.filter.skillIds.some(sid => vol.skillIds.includes(sid));
      });
    }
    if (state.filter.timeSlot) {
      result = result.filter(a => {
        const sh = state.getShiftById(a.shiftId);
        return sh?.timeSlot === state.filter.timeSlot;
      });
    }
    if (state.filter.anomalyTypes.length > 0) {
      result = result.filter(a => a.isAnomaly && a.anomalyType && state.filter.anomalyTypes.includes(a.anomalyType));
    }
    return result;
  },

  getFilteredAnomalies: () => {
    const state = get();
    if (!state.currentResult) return [];
    let result = state.currentResult.anomalies;
    if (state.filter.anomalyTypes.length > 0) {
      result = result.filter(a => state.filter.anomalyTypes.includes(a.type));
    }
    if (state.filter.timeSlot) {
      result = result.filter(a => {
        if (a.shiftId) {
          const sh = state.getShiftById(a.shiftId);
          return sh?.timeSlot === state.filter.timeSlot;
        }
        return true;
      });
    }
    return result;
  },
}));
