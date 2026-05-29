import { create } from 'zustand';
import type {
  VestingSummary,
  VestingDetail,
  Employee,
  VestingPlan,
  Exercise,
  CorrectionHistory,
} from '../../shared/types';
import { api } from '../utils/api';

interface VestingState {
  summaries: VestingSummary[];
  summariesLoading: boolean;
  currentDetail: VestingDetail | null;
  detailLoading: boolean;
  plans: VestingPlan[];
  exercises: Exercise[];
  history: CorrectionHistory[];
  historyLoading: boolean;
  searchQuery: string;
  filterStatus: string;
  filterException: string;

  fetchSummaries: () => Promise<void>;
  fetchDetail: (employeeId: string) => Promise<void>;
  fetchPlans: () => Promise<void>;
  fetchExercises: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: string) => void;
  setFilterException: (exception: string) => void;
  correctVesting: (
    employeeId: string,
    fieldName: string,
    newValue: string,
    reason: string,
    operator: string,
  ) => Promise<void>;
  approveExercise: (
    exerciseId: string,
    status: 'approved' | 'rejected',
    approver: string,
    rejectionReason?: string,
  ) => Promise<void>;
}

export const useVestingStore = create<VestingState>((set, get) => ({
  summaries: [],
  summariesLoading: false,
  currentDetail: null,
  detailLoading: false,
  plans: [],
  exercises: [],
  history: [],
  historyLoading: false,
  searchQuery: '',
  filterStatus: '',
  filterException: '',

  fetchSummaries: async () => {
    set({ summariesLoading: true });
    try {
      const data = await api.getVestingSummaries();
      set({ summaries: data });
    } finally {
      set({ summariesLoading: false });
    }
  },

  fetchDetail: async (employeeId: string) => {
    set({ detailLoading: true });
    try {
      const data = await api.getVestingDetail(employeeId);
      set({ currentDetail: data });
    } finally {
      set({ detailLoading: false });
    }
  },

  fetchPlans: async () => {
    const data = await api.getPlans();
    set({ plans: data });
  },

  fetchExercises: async () => {
    const data = await api.getExercises();
    set({ exercises: data });
  },

  fetchHistory: async () => {
    set({ historyLoading: true });
    try {
      const data = await api.getHistory();
      set({ history: data });
    } finally {
      set({ historyLoading: false });
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setFilterStatus: (status: string) => set({ filterStatus: status }),
  setFilterException: (exception: string) => set({ filterException: exception }),

  correctVesting: async (
    employeeId: string,
    fieldName: string,
    newValue: string,
    reason: string,
    operator: string,
  ) => {
    const result = await api.correctVesting(employeeId, {
      grantId: get().currentDetail?.grant.id || '',
      fieldName,
      newValue,
      reason,
      operator,
    });
    set({ currentDetail: result.detail });
    await get().fetchSummaries();
    await get().fetchHistory();
  },

  approveExercise: async (
    exerciseId: string,
    status: 'approved' | 'rejected',
    approver: string,
    rejectionReason?: string,
  ) => {
    await api.approveExercise(exerciseId, {
      status,
      approver,
      rejectionReason,
    });
    await get().fetchExercises();
    if (get().currentDetail) {
      await get().fetchDetail(get().currentDetail.employee.id);
    }
  },
}));
