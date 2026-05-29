import { create } from 'zustand';
import {
  AppState,
  JointConfig,
  FilterOptions,
  WorkspaceResult,
  DiffResult,
  Obstacle,
  PointStatus,
  ConflictType,
  SamplePoint,
} from '@/types';
import { getDefaultJointConfig, getMockObstacles } from '@/utils/mockData';
import { monteCarloSample, createWorkspaceResult, computeDiff } from '@/utils/sampler';

interface WorkspaceStore extends AppState {
  setJointAngle: (index: number, value: number) => void;
  setJointConfig: (config: JointConfig) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  toggleStatusFilter: (status: PointStatus) => void;
  toggleJointFilter: (jointIndex: number) => void;
  toggleConflictTypeFilter: (type: ConflictType) => void;
  setSelectedPoint: (pointId: string | null) => void;
  setHoveredPoint: (pointId: string | null) => void;
  setShowDiff: (show: boolean) => void;
  setSampleResolution: (resolution: number) => void;
  computeWorkspace: () => Promise<void>;
  getFilteredPoints: () => SamplePoint[];
  getPointById: (id: string) => SamplePoint | undefined;
  clearDiff: () => void;
  resetFilters: () => void;
}

const defaultFilters: FilterOptions = {
  status: [],
  jointIndices: [],
  conflictTypes: [],
  manipulabilityRange: [0, Infinity],
};

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  currentJointConfig: getDefaultJointConfig(),
  workspaceResult: null,
  previousResult: null,
  diffResult: null,
  obstacles: getMockObstacles(),
  filters: defaultFilters,
  selectedPointId: null,
  hoveredPointId: null,
  isComputing: false,
  showDiff: false,
  sampleResolution: 500,

  setJointAngle: (index: number, value: number) => {
    set((state) => ({
      currentJointConfig: {
        ...state.currentJointConfig,
        jointAngles: state.currentJointConfig.jointAngles.map((angle, i) =>
          i === index ? value : angle
        ),
      },
    }));
  },

  setJointConfig: (config: JointConfig) => {
    set({ currentJointConfig: config });
  },

  setFilters: (filters: Partial<FilterOptions>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  toggleStatusFilter: (status: PointStatus) => {
    set((state) => {
      const currentStatus = state.filters.status;
      const newStatus = currentStatus.includes(status)
        ? currentStatus.filter((s) => s !== status)
        : [...currentStatus, status];
      return {
        filters: { ...state.filters, status: newStatus },
      };
    });
  },

  toggleJointFilter: (jointIndex: number) => {
    set((state) => {
      const currentJoints = state.filters.jointIndices;
      const newJoints = currentJoints.includes(jointIndex)
        ? currentJoints.filter((j) => j !== jointIndex)
        : [...currentJoints, jointIndex];
      return {
        filters: { ...state.filters, jointIndices: newJoints },
      };
    });
  },

  toggleConflictTypeFilter: (type: ConflictType) => {
    set((state) => {
      const currentTypes = state.filters.conflictTypes;
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter((t) => t !== type)
        : [...currentTypes, type];
      return {
        filters: { ...state.filters, conflictTypes: newTypes },
      };
    });
  },

  setSelectedPoint: (pointId: string | null) => {
    set({ selectedPointId: pointId });
  },

  setHoveredPoint: (pointId: string | null) => {
    set({ hoveredPointId: pointId });
  },

  setShowDiff: (show: boolean) => {
    set({ showDiff: show });
  },

  setSampleResolution: (resolution: number) => {
    set({ sampleResolution: resolution });
  },

  computeWorkspace: async () => {
    const { currentJointConfig, obstacles, sampleResolution, workspaceResult } = get();

    set({ isComputing: true });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const samplePoints = monteCarloSample(currentJointConfig, obstacles, {
      resolution: sampleResolution,
    });

    const newResult = createWorkspaceResult(samplePoints, currentJointConfig, obstacles);

    let diffResult: DiffResult | null = null;
    if (workspaceResult) {
      const diff = computeDiff(workspaceResult, newResult);
      diffResult = {
        ...diff,
        beforeId: workspaceResult.id,
        afterId: newResult.id,
      };
    }

    set({
      workspaceResult: newResult,
      previousResult: workspaceResult,
      diffResult,
      isComputing: false,
      showDiff: diffResult !== null,
      selectedPointId: null,
      hoveredPointId: null,
    });
  },

  getFilteredPoints: () => {
    const { workspaceResult, filters } = get();
    if (!workspaceResult) return [];

    return workspaceResult.samplePoints.filter((point) => {
      if (filters.status.length > 0 && !filters.status.includes(point.status)) {
        return false;
      }

      if (filters.jointIndices.length > 0) {
        const hasMatchingJoint = point.conflictSources.some(
          (cs) => cs.jointIndex !== undefined && filters.jointIndices.includes(cs.jointIndex)
        );
        if (!hasMatchingJoint) {
          return false;
        }
      }

      if (filters.conflictTypes.length > 0) {
        const hasMatchingType = point.conflictSources.some((cs) =>
          filters.conflictTypes.includes(cs.type)
        );
        if (!hasMatchingType) {
          return false;
        }
      }

      if (filters.manipulabilityRange) {
        const [min, max] = filters.manipulabilityRange;
        if (point.manipulability < min || point.manipulability > max) {
          return false;
        }
      }

      return true;
    });
  },

  getPointById: (id: string) => {
    const { workspaceResult } = get();
    return workspaceResult?.samplePoints.find((p) => p.id === id);
  },

  clearDiff: () => {
    set({ diffResult: null, showDiff: false, previousResult: null });
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
  },
}));
