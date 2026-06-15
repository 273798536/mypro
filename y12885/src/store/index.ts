import { create } from 'zustand';
import {
  TrackPoint,
  AnomalyRecord,
  WaterQualityData,
  ReviewTask,
  VersionRecord,
  ActionableError,
  User,
  FilterState,
  ClippingPlanesState,
  DataStatistics,
  DataQuality,
} from '../types';
import {
  mockTrackPoints,
  mockAnomalyRecords,
  mockWaterQualityData,
  mockReviewTasks,
  mockVersionRecords,
  mockActionableErrors,
  mockCurrentUser,
  getStatistics,
} from '../mock/data';

interface AppState {
  trackPoints: TrackPoint[];
  anomalyRecords: AnomalyRecord[];
  waterQualityData: WaterQualityData[];
  reviewTasks: ReviewTask[];
  versionRecords: VersionRecord[];
  actionableErrors: ActionableError[];
  currentUser: User;
  selectedTrackPoint: TrackPoint | null;
  selectedReviewTask: ReviewTask | null;
  statistics: DataStatistics;
  filters: FilterState;
  clippingPlanes: ClippingPlanesState;
  isLoading: boolean;
  notifications: { id: string; message: string; type: 'success' | 'error' | 'info' }[];
  viewMode: 'marine_affairs' | 'safety_officer';
  
  setSelectedTrackPoint: (point: TrackPoint | null) => void;
  setSelectedReviewTask: (task: ReviewTask | null) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  setClippingPlanes: (planes: Partial<ClippingPlanesState>) => void;
  resetClippingPlanes: () => void;
  toggleViewMode: () => void;
  
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  removeNotification: (id: string) => void;
  
  updateTrackPoint: (id: string, updates: Partial<TrackPoint>) => void;
  resolveAnomaly: (anomalyId: string, resolution: string) => void;
  submitReviewTask: (taskId: string, data: any) => void;
  approveReviewTask: (taskId: string, remark: string) => void;
  rejectReviewTask: (taskId: string, remark: string) => void;
  resolveError: (errorId: string, action: string) => void;
  autoCleanTrackPoints: (shipId: string) => void;
  
  getFilteredTrackPoints: () => TrackPoint[];
  getPendingReviewTasks: () => ReviewTask[];
  getTrackPointAnomalies: (trackPointId: string) => AnomalyRecord[];
  getVersionHistory: (entityType: 'track' | 'water_quality', entityId: string) => VersionRecord[];
}

const initialFilters: FilterState = {
  shipIds: [],
  timeRange: null,
  depthRange: [-10, 100],
  dataQualities: [],
  anomalyTypes: [],
};

const initialClippingPlanes: ClippingPlanesState = {
  x: { enabled: false, value: 0 },
  y: { enabled: false, value: 0 },
  z: { enabled: false, value: 0 },
};

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
}

export const useAppStore = create<AppState>((set, get) => ({
  trackPoints: mockTrackPoints,
  anomalyRecords: mockAnomalyRecords,
  waterQualityData: mockWaterQualityData,
  reviewTasks: mockReviewTasks,
  versionRecords: mockVersionRecords,
  actionableErrors: mockActionableErrors,
  currentUser: mockCurrentUser,
  selectedTrackPoint: null,
  selectedReviewTask: null,
  statistics: getStatistics(),
  filters: initialFilters,
  clippingPlanes: initialClippingPlanes,
  isLoading: false,
  notifications: [],
  viewMode: 'safety_officer',

  setSelectedTrackPoint: (point) => set({ selectedTrackPoint: point }),
  setSelectedReviewTask: (task) => set({ selectedReviewTask: task }),
  
  setFilters: (newFilters) => 
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  
  resetFilters: () => set({ filters: initialFilters }),
  
  setClippingPlanes: (planes) =>
    set((state) => ({
      clippingPlanes: {
        x: { ...state.clippingPlanes.x, ...planes.x },
        y: { ...state.clippingPlanes.y, ...planes.y },
        z: { ...state.clippingPlanes.z, ...planes.z },
      },
    })),
  
  resetClippingPlanes: () => set({ clippingPlanes: initialClippingPlanes }),
  
  toggleViewMode: () => 
    set((state) => ({
      viewMode: state.viewMode === 'safety_officer' ? 'marine_affairs' : 'safety_officer',
    })),

  addNotification: (message, type) => {
    const id = generateId('NOTIF');
    set((state) => ({
      notifications: [...state.notifications, { id, message, type }],
    }));
    setTimeout(() => {
      get().removeNotification(id);
    }, 5000);
  },
  
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  updateTrackPoint: (id, updates) => {
    const { trackPoints, versionRecords, currentUser } = get();
    const point = trackPoints.find((p) => p.id === id);
    if (!point) return;

    const before: Record<string, any> = {};
    const after: Record<string, any> = {};
    Object.entries(updates).forEach(([field, newValue]) => {
      before[field] = point[field as keyof TrackPoint];
      after[field] = newValue;
    });

    const newVersionRecord: VersionRecord = {
      id: generateId('VER'),
      recordId: id,
      operatorName: currentUser.name,
      changeType: 'update',
      before,
      after,
      remark: '人工修正数据',
      timestamp: Date.now(),
    };

    const updatedPoints = trackPoints.map((p) =>
      p.id === id
        ? { ...p, ...updates, version: p.version + 1, updatedAt: Date.now(), dataQuality: 'pending' as DataQuality }
        : p
    );

    set({
      trackPoints: updatedPoints,
      versionRecords: [...versionRecords, newVersionRecord],
      statistics: getStatistics(),
    });
    get().addNotification('数据已更新，版本记录已保存', 'success');
  },

  resolveAnomaly: (anomalyId, resolution) => {
    const { anomalyRecords, currentUser } = get();
    set({
      anomalyRecords: anomalyRecords.map((a) =>
        a.id === anomalyId
          ? {
              ...a,
              resolved: true,
              resolvedAt: Date.now(),
              resolvedBy: currentUser.name,
              resolution,
            }
          : a
      ),
    });
    get().addNotification('异常已标记为已解决', 'success');
  },

  submitReviewTask: (taskId, data) => {
    const { reviewTasks, currentUser } = get();
    const task = reviewTasks.find((t) => t.id === taskId);
    if (!task) return;

    const newTask: ReviewTask = {
      ...task,
      status: 'pending',
      submitterName: currentUser.name,
      createdAt: Date.now(),
      dataSnapshot: data,
    };

    set({
      reviewTasks: reviewTasks.map((t) => (t.id === taskId ? newTask : t)),
    });
    get().addNotification('复核任务已提交', 'success');
  },

  approveReviewTask: (taskId, remark) => {
    const { reviewTasks, trackPoints, currentUser } = get();
    const task = reviewTasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedTask: ReviewTask = {
      ...task,
      status: 'approved',
      reviewerName: currentUser.name,
      reviewedAt: Date.now(),
      rejectReason: remark,
    };

    const updatedPoints = trackPoints.map((p) =>
      task.relatedRecordIds.includes(p.id) ? { ...p, dataQuality: 'approved' as DataQuality } : p
    );

    set({
      reviewTasks: reviewTasks.map((t) => (t.id === taskId ? updatedTask : t)),
      trackPoints: updatedPoints,
      statistics: getStatistics(),
    });
    get().addNotification('复核已通过', 'success');
  },

  rejectReviewTask: (taskId, remark) => {
    const { reviewTasks, trackPoints, currentUser } = get();
    const task = reviewTasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedTask: ReviewTask = {
      ...task,
      status: 'rejected',
      reviewerName: currentUser.name,
      reviewedAt: Date.now(),
      rejectReason: remark,
    };

    const updatedPoints = trackPoints.map((p) =>
      task.relatedRecordIds.includes(p.id) ? { ...p, dataQuality: 'rejected' as DataQuality } : p
    );

    set({
      reviewTasks: reviewTasks.map((t) => (t.id === taskId ? updatedTask : t)),
      trackPoints: updatedPoints,
      statistics: getStatistics(),
    });
    get().addNotification('复核已驳回', 'info');
  },

  resolveError: (errorId, action) => {
    const { actionableErrors } = get();
    const error = actionableErrors.find((e) => e.id === errorId);
    if (!error) return;

    if (action === 'auto_clean') {
      const shipId = error.context.shipId;
      get().autoCleanTrackPoints(shipId);
    } else if (action === 'mark_suspended') {
      const shipId = error.context.shipId;
      set((state) => ({
        trackPoints: state.trackPoints.map((p) =>
          p.shipId === shipId && p.depth < 0
            ? { ...p, dataQuality: 'suspended' as DataQuality }
            : p
        ),
      }));
      get().addNotification('已标记为暂缓数据', 'info');
    } else if (action === 'export_available') {
      get().addNotification('正在导出可用数据...', 'info');
    }

    set({
      actionableErrors: actionableErrors.filter((e) => e.id !== errorId),
    });
  },

  autoCleanTrackPoints: (shipId) => {
    const { trackPoints, anomalyRecords, currentUser } = get();
    let cleanedCount = 0;

    const updatedPoints = trackPoints.map((p) => {
      if (p.shipId === shipId && p.depth < 0) {
        const nearbyPoints = trackPoints.filter(
          (np) =>
            np.shipId === shipId &&
            Math.abs(np.timestamp - p.timestamp) < 30 * 60 * 1000 &&
            np.depth > 0
        );
        if (nearbyPoints.length > 0) {
          const avgDepth = nearbyPoints.reduce((sum, np) => sum + np.depth, 0) / nearbyPoints.length;
          cleanedCount++;
          return { ...p, depth: Math.round(avgDepth * 100) / 100, dataQuality: 'cleaned' as DataQuality };
        }
      }
      return p;
    });

    const updatedAnomalies = anomalyRecords.map((a) => {
      const point = updatedPoints.find((p) => p.id === a.trackPointId);
      if (point && point.depth > 0 && a.type === 'negative_depth') {
        return {
          ...a,
          resolved: true,
          resolvedAt: Date.now(),
          resolvedBy: currentUser.name,
          resolution: '自动清洗：插值修正深度值',
        };
      }
      return a;
    });

    set({
      trackPoints: updatedPoints,
      anomalyRecords: updatedAnomalies,
      statistics: getStatistics(),
    });

    if (cleanedCount > 0) {
      get().addNotification(`已自动清洗 ${cleanedCount} 个异常数据点`, 'success');
    } else {
      get().addNotification('未发现可自动清洗的数据', 'info');
    }
  },

  getFilteredTrackPoints: () => {
    const { trackPoints, filters } = get();
    let filtered = [...trackPoints];

    if (filters.shipIds.length > 0) {
      filtered = filtered.filter((p) => filters.shipIds.includes(p.shipId));
    }

    if (filters.timeRange) {
      const [start, end] = filters.timeRange;
      filtered = filtered.filter((p) => p.timestamp >= start && p.timestamp <= end);
    }

    const [minDepth, maxDepth] = filters.depthRange;
    filtered = filtered.filter((p) => p.depth >= minDepth && p.depth <= maxDepth);

    if (filters.dataQualities.length > 0) {
      filtered = filtered.filter((p) => filters.dataQualities.includes(p.dataQuality));
    }

    if (filters.anomalyTypes.length > 0) {
      const pointIdsWithAnomalies = new Set(
        get().anomalyRecords
          .filter((a) => filters.anomalyTypes.includes(a.type))
          .map((a) => a.trackPointId)
      );
      filtered = filtered.filter((p) => pointIdsWithAnomalies.has(p.id));
    }

    return filtered;
  },

  getPendingReviewTasks: () => {
    return get().reviewTasks.filter((t) => t.status === 'pending');
  },

  getTrackPointAnomalies: (trackPointId) => {
    return get().anomalyRecords.filter((a) => a.trackPointId === trackPointId);
  },

  getVersionHistory: (entityType, entityId) => {
    return get()
      .versionRecords.filter((v) => v.recordId === entityId)
      .sort((a, b) => b.timestamp - a.timestamp);
  },
}));
