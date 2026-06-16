import { create } from 'zustand';
import type { AppState, AppActions, TimePeriod, Filters, PhotoRecord, PointStatus } from '../types';
import { mockMonitorPoints, mockMaterials, mockPhotoRecords, mockReviewRecords, mockChangeLogs } from '../mock/data';

interface AppStore extends AppState, AppActions {}

export const useAppStore = create<AppStore>((set, get) => ({
  monitorPoints: mockMonitorPoints,
  materials: mockMaterials,
  photoRecords: mockPhotoRecords,
  reviewRecords: mockReviewRecords,
  changeLogs: mockChangeLogs,
  selectedPointId: null,
  timePeriod: 'morning',
  filters: {
    status: 'all',
    area: 'all',
    timePeriod: 'all',
  },
  isPhotoUploaderOpen: false,

  setSelectedPointId: (id) => set({ selectedPointId: id }),

  setTimePeriod: (period: TimePeriod) => set({ timePeriod: period }),

  setFilters: (newFilters: Partial<Filters>) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  addPhotoRecord: (record: Omit<PhotoRecord, 'id' | 'recordedAt'>) => {
    const newRecord: PhotoRecord = {
      ...record,
      id: `photo-${Date.now()}`,
      recordedAt: new Date().toLocaleString('zh-CN'),
    };
    set((state) => ({
      photoRecords: [...state.photoRecords, newRecord],
      isPhotoUploaderOpen: false,
    }));
    
    const { updatePointStatus } = get();
    updatePointStatus(record.monitorPointId, 'processed');
  },

  updateReviewRecord: (id, updates) =>
    set((state) => ({
      reviewRecords: state.reviewRecords.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),

  updatePointStatus: (pointId: string, status: PointStatus) =>
    set((state) => ({
      monitorPoints: state.monitorPoints.map((p) =>
        p.id === pointId ? { ...p, status } : p
      ),
    })),

  togglePhotoUploader: (open) => set({ isPhotoUploaderOpen: open }),

  confirmReview: (reviewId: string, confirmed: boolean) => {
    const review = get().reviewRecords.find((r) => r.id === reviewId);
    if (!review) return;

    set((state) => ({
      reviewRecords: state.reviewRecords.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              status: confirmed ? 'confirmed' : 'rejected',
              reviewedBy: '现场老师',
              reviewedAt: new Date().toLocaleString('zh-CN'),
              needManualConfirm: false,
            }
          : r
      ),
    }));

    if (confirmed) {
      const { updatePointStatus } = get();
      updatePointStatus(review.monitorPointId, 'confirmed');
    }
  },
}));

export const useFilteredPoints = () => {
  const { monitorPoints, filters } = useAppStore();
  
  return monitorPoints.filter((point) => {
    if (filters.status !== 'all' && point.status !== filters.status) return false;
    if (filters.area !== 'all' && point.area !== filters.area) return false;
    return true;
  });
};

export const useFilteredMaterials = () => {
  const { materials, selectedPointId, timePeriod, filters } = useAppStore();
  
  return materials.filter((mat) => {
    if (selectedPointId && mat.monitorPointId !== selectedPointId) return false;
    if (filters.timePeriod !== 'all' && mat.timePeriod !== filters.timePeriod) return false;
    if (filters.timePeriod === 'all' && mat.timePeriod !== timePeriod) return false;
    return true;
  });
};

export const usePointReviews = (pointId: string | null) => {
  const { reviewRecords, timePeriod } = useAppStore();
  if (!pointId) return [];
  return reviewRecords.filter(
    (r) => r.monitorPointId === pointId && r.timePeriod === timePeriod
  );
};

export const usePointPhotos = (pointId: string | null) => {
  const { photoRecords } = useAppStore();
  if (!pointId) return [];
  return photoRecords.filter((p) => p.monitorPointId === pointId);
};

export const useMaterialChangeLogs = (materialId: string) => {
  const { changeLogs } = useAppStore();
  return changeLogs.filter((log) => log.materialId === materialId);
};

export const useSummaryStats = () => {
  const { monitorPoints, reviewRecords, materials, timePeriod } = useAppStore();
  
  const total = monitorPoints.length;
  const confirmed = monitorPoints.filter((p) => p.status === 'confirmed').length;
  const processed = monitorPoints.filter((p) => p.status === 'processed').length;
  const pending = monitorPoints.filter((p) => p.status === 'pending').length;
  const needEvidence = monitorPoints.filter((p) => p.status === 'need_evidence').length;
  
  const overLimitCount = reviewRecords.filter(
    (r) => r.isOverLimit && r.timePeriod === timePeriod
  ).length;
  
  const caliberChangedCount = materials.filter((m) => m.caliberChanged).length;
  
  const needManualConfirmCount = reviewRecords.filter(
    (r) => r.needManualConfirm && r.status === 'pending'
  ).length;

  return {
    total,
    confirmed,
    processed,
    pending,
    needEvidence,
    overLimitCount,
    caliberChangedCount,
    needManualConfirmCount,
  };
};
