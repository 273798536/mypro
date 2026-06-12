import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Buoy,
  EventRecord,
  RiskAssessment,
  TideReport,
  TrackPoint,
  DeliveryCard,
  SavedView,
  DiffItem,
  BuoyStatus,
} from '../types';
import {
  MOCK_BUOYS,
  MOCK_EVENTS,
  MOCK_ASSESSMENTS,
  MOCK_TIDE_REPORTS,
  MOCK_TRACK_POINTS,
  MOCK_DELIVERY_CARDS,
  MOCK_SAVED_VIEWS,
} from '../data/mockData';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

interface TrackerState {
  buoys: Buoy[];
  events: EventRecord[];
  assessments: RiskAssessment[];
  tideReports: TideReport[];
  trackPoints: TrackPoint[];
  deliveryCards: DeliveryCard[];
  savedViews: SavedView[];
  currentViewId: string;
  screenshotMode: boolean;
  statusFilter: BuoyStatus[];
  searchKeyword: string;

  setCurrentView: (viewId: string) => void;
  toggleScreenshotMode: () => void;
  setStatusFilter: (statuses: BuoyStatus[]) => void;
  setSearchKeyword: (kw: string) => void;

  addEventRecord: (record: Omit<EventRecord, 'id' | 'timestamp'> & { timestamp?: string }) => void;
  saveView: (view: Omit<SavedView, 'id' | 'createdAt'>) => void;
  deleteView: (viewId: string) => void;

  cleanTrackData: () => void;
  toggleTrackPointAvailability: (pointId: string) => void;

  updateAssessment: (id: string, patch: Partial<RiskAssessment>) => void;
  updateDeliveryStatus: (id: string, status: 'direct_use' | 'need_review') => void;

  compareVersions: (
    before?: Record<string, any>,
    after?: Record<string, any>
  ) => DiffItem[];

  generateShortDescription: (assessment: {
    availableData: string[];
    pendingData: string[];
    recollectData: string[];
  }) => string;

  getFilteredBuoys: () => Buoy[];
  getEventsByBuoy: (buoyId: string) => EventRecord[];
  getAssessmentByBuoy: (buoyId: string) => RiskAssessment | undefined;
  getTideByBuoy: (buoyId: string) => TideReport | undefined;
}

const FIELD_LABELS: Record<string, string> = {
  forecastWave: '预报浪高',
  forecastWind: '预报风速',
  forecastIssue: '预报发布',
  forecastSource: '预报来源',
  photoRemark: '照片备注',
  photoShootTime: '拍摄时间',
  photoAuditor: '审核人',
  salinityForecast: '盐度预报',
  runoffData: '径流量数据',
};

export const useTrackerStore = create<TrackerState>()(
  persist(
    (set, get) => ({
      buoys: MOCK_BUOYS,
      events: MOCK_EVENTS,
      assessments: MOCK_ASSESSMENTS,
      tideReports: MOCK_TIDE_REPORTS,
      trackPoints: MOCK_TRACK_POINTS,
      deliveryCards: MOCK_DELIVERY_CARDS,
      savedViews: MOCK_SAVED_VIEWS,
      currentViewId: MOCK_SAVED_VIEWS[0].id,
      screenshotMode: false,
      statusFilter: [],
      searchKeyword: '',

      setCurrentView: (viewId) => {
        const view = get().savedViews.find((v) => v.id === viewId);
        if (view) {
          set({
            currentViewId: viewId,
            statusFilter: view.filter.statuses,
          });
        }
      },

      toggleScreenshotMode: () =>
        set((s) => ({ screenshotMode: !s.screenshotMode })),

      setStatusFilter: (statuses) => set({ statusFilter: statuses }),
      setSearchKeyword: (kw) => set({ searchKeyword: kw }),

      addEventRecord: (record) =>
        set((s) => ({
          events: [
            {
              id: uuidv4(),
              timestamp: record.timestamp ?? dayjs().toISOString(),
              ...record,
            } as EventRecord,
            ...s.events,
          ],
        })),

      saveView: (view) =>
        set((s) => ({
          savedViews: [
            ...s.savedViews,
            {
              id: uuidv4(),
              createdAt: dayjs().toISOString(),
              ...view,
            },
          ],
        })),

      deleteView: (viewId) =>
        set((s) => ({
          savedViews: s.savedViews.filter((v) => v.id !== viewId),
          currentViewId:
            s.currentViewId === viewId ? 'view-all' : s.currentViewId,
        })),

      cleanTrackData: () =>
        set((s) => ({
          trackPoints: s.trackPoints.map((pt) => {
            if (pt.qualityFlags.includes('duplicate') && pt.duplicateOf) {
              return { ...pt, availability: 'unavailable' as const };
            }
            if (pt.qualityFlags.includes('null_value') && !pt.lat && !pt.lng) {
              return { ...pt, availability: 'unavailable' as const };
            }
            if (pt.qualityFlags.includes('null_value') && pt.lat && pt.lng) {
              return { ...pt, availability: 'need_clean' as const };
            }
            if (pt.availability === 'need_clean' && !pt.qualityFlags.includes('mixed_remark')) {
              return { ...pt, availability: 'available' as const };
            }
            return pt;
          }),
        })),

      toggleTrackPointAvailability: (pointId) =>
        set((s) => ({
          trackPoints: s.trackPoints.map((pt) => {
            if (pt.id !== pointId) return pt;
            const order: TrackPoint['availability'][] = ['available', 'need_clean', 'unavailable'];
            const idx = order.indexOf(pt.availability);
            return { ...pt, availability: order[(idx + 1) % 3] };
          }),
        })),

      updateAssessment: (id, patch) =>
        set((s) => ({
          assessments: s.assessments.map((a) =>
            a.id === id ? { ...a, ...patch } : a
          ),
        })),

      updateDeliveryStatus: (id, status) =>
        set((s) => ({
          deliveryCards: s.deliveryCards.map((d) =>
            d.id === id ? { ...d, status } : d
          ),
        })),

      compareVersions: (before = {}, after = {}) => {
        const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
        const diffs: DiffItem[] = [];
        for (const key of allKeys) {
          const label = FIELD_LABELS[key] ?? key;
          const inB = Object.prototype.hasOwnProperty.call(before, key);
          const inA = Object.prototype.hasOwnProperty.call(after, key);
          const vB = before[key];
          const vA = after[key];
          if (inB && !inA) {
            diffs.push({ field: key, fieldLabel: label, oldValue: vB, newValue: undefined, type: 'deleted' });
          } else if (!inB && inA) {
            diffs.push({ field: key, fieldLabel: label, oldValue: undefined, newValue: vA, type: 'added' });
          } else if (String(vB) !== String(vA)) {
            diffs.push({ field: key, fieldLabel: label, oldValue: vB, newValue: vA, type: 'modified' });
          }
        }
        return diffs;
      },

      generateShortDescription: ({ availableData, pendingData, recollectData }) => {
        const parts: string[] = [];
        if (availableData.length) parts.push(`可用：${availableData.slice(0, 3).join('、')}${availableData.length > 3 ? '等' : ''}`);
        if (pendingData.length) parts.push(`暂缓：${pendingData.slice(0, 2).join('、')}${pendingData.length > 2 ? '等' : ''}`);
        if (recollectData.length) parts.push(`需重采：${recollectData.slice(0, 2).join('、')}`);
        return parts.join('；') + '。';
      },

      getFilteredBuoys: () => {
        const { buoys, statusFilter, searchKeyword } = get();
        return buoys.filter((b) => {
          if (statusFilter.length && !statusFilter.includes(b.status)) return false;
          if (searchKeyword) {
            const kw = searchKeyword.toLowerCase();
            if (
              !b.name.toLowerCase().includes(kw) &&
              !b.code.toLowerCase().includes(kw) &&
              !b.operator.toLowerCase().includes(kw)
            )
              return false;
          }
          return true;
        });
      },

      getEventsByBuoy: (buoyId) =>
        get()
          .events.filter((e) => e.buoyId === buoyId)
          .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)),

      getAssessmentByBuoy: (buoyId) =>
        get().assessments.find((a) => a.buoyId === buoyId),

      getTideByBuoy: (buoyId) =>
        get().tideReports.find((t) => t.buoyId === buoyId) ?? get().tideReports[0],
    }),
    {
      name: 'buoy-tracker-store-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        buoys: state.buoys,
        events: state.events,
        assessments: state.assessments,
        trackPoints: state.trackPoints,
        deliveryCards: state.deliveryCards,
        savedViews: state.savedViews,
        screenshotMode: state.screenshotMode,
      }),
    }
  )
);
