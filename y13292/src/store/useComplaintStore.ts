import { create } from 'zustand';
import type { ComplaintPoint, PhotoRecord, TimelineEvent, StatusChange, ComplaintStatus } from '../types';
import { mockComplaintPoints } from '../data/mockPoints';
import { mockPhotos } from '../data/mockPhotos';
import { mockTimelineEvents, mockStatusChanges } from '../data/mockTimeline';

interface ComplaintState {
  points: ComplaintPoint[];
  photos: PhotoRecord[];
  timelineEvents: TimelineEvent[];
  statusChanges: StatusChange[];
  selectedPointId: string | null;
  currentTime: string | null;
  filterStatus: ComplaintStatus | 'all';
  showOnlyOverload: boolean;
  
  selectPoint: (id: string | null) => void;
  setFilterStatus: (status: ComplaintStatus | 'all') => void;
  toggleOverloadFilter: () => void;
  setCurrentTime: (time: string | null) => void;
  getPhotosByPointId: (pointId: string) => PhotoRecord[];
  getTimelineByPointId: (pointId: string) => TimelineEvent[];
  getStatusChangesByPointId: (pointId: string) => StatusChange[];
  getSelectedPoint: () => ComplaintPoint | undefined;
  getFilteredPoints: () => ComplaintPoint[];
  addPhoto: (photo: Omit<PhotoRecord, 'id'>) => void;
  confirmPoint: (pointId: string, reason: string, operator: string) => void;
}

export const useComplaintStore = create<ComplaintState>((set, get) => ({
  points: mockComplaintPoints,
  photos: mockPhotos,
  timelineEvents: mockTimelineEvents,
  statusChanges: mockStatusChanges,
  selectedPointId: 'pt-002',
  currentTime: null,
  filterStatus: 'all',
  showOnlyOverload: false,

  selectPoint: (id) => set({ selectedPointId: id }),

  setFilterStatus: (status) => set({ filterStatus: status }),

  toggleOverloadFilter: () => set((state) => ({ showOnlyOverload: !state.showOnlyOverload })),

  setCurrentTime: (time) => set({ currentTime: time }),

  getPhotosByPointId: (pointId) => 
    get().photos.filter((p) => p.complaintId === pointId),

  getTimelineByPointId: (pointId) =>
    get().timelineEvents
      .filter((e) => e.complaintId === pointId)
      .sort((a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime()),

  getStatusChangesByPointId: (pointId) =>
    get().statusChanges
      .filter((s) => s.complaintId === pointId)
      .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()),

  getSelectedPoint: () => 
    get().points.find((p) => p.id === get().selectedPointId),

  getFilteredPoints: () => {
    const { points, filterStatus, showOnlyOverload } = get();
    if (showOnlyOverload) {
      return points.filter((p) => p.status === 'overload');
    }
    if (filterStatus === 'all') {
      return points;
    }
    return points.filter((p) => p.status === filterStatus);
  },

  addPhoto: (photo) => {
    const newPhoto: PhotoRecord = {
      ...photo,
      id: `photo-${Date.now()}`,
    };
    const newEvent: TimelineEvent = {
      id: `evt-${Date.now()}`,
      complaintId: photo.complaintId,
      type: 'photo',
      title: '现场照片补录',
      description: photo.description,
      eventAt: photo.uploadedAt,
    };
    set((state) => ({
      photos: [...state.photos, newPhoto],
      timelineEvents: [...state.timelineEvents, newEvent],
    }));
  },

  confirmPoint: (pointId, reason, operator) => {
    const point = get().points.find((p) => p.id === pointId);
    if (!point) return;

    const now = new Date().toISOString();
    const statusChange: StatusChange = {
      id: `sc-${Date.now()}`,
      complaintId: pointId,
      fromStatus: point.status,
      toStatus: 'confirmed',
      reason,
      operator,
      changedAt: now,
    };
    const timelineEvent: TimelineEvent = {
      id: `evt-${Date.now()}`,
      complaintId: pointId,
      type: 'confirm',
      title: '人工确认',
      description: reason,
      eventAt: now,
    };

    set((state) => ({
      points: state.points.map((p) =>
        p.id === pointId ? { ...p, status: 'confirmed' as const } : p
      ),
      statusChanges: [...state.statusChanges, statusChange],
      timelineEvents: [...state.timelineEvents, timelineEvent],
    }));
  },
}));
