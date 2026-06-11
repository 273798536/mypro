import { create } from "zustand";
import { shallow, useShallow } from "zustand/shallow";
export { shallow, useShallow };
import type {
  SensorRecord,
  FilterCondition,
  UnifiedResult,
  ReviewItem,
  WarehouseZone,
  RiskLevel,
  RecordType,
  EvidenceType,
} from "@/types";
import { MOCK_RECORDS } from "@/data/mockData";

type RecordsState = {
  records: SensorRecord[];
  loadMock: () => void;
  appendRecord: (record: SensorRecord) => void;
  appendRecords: (records: SensorRecord[]) => void;
  clearRecords: () => void;
};

export const useRecordsStore = create<RecordsState>()((set) => ({
  records: [],
  loadMock: () => set({ records: [...MOCK_RECORDS] }),
  appendRecord: (record) =>
    set((state) => ({ records: [...state.records, record] })),
  appendRecords: (newRecords) =>
    set((state) => ({ records: [...state.records, ...newRecords] })),
  clearRecords: () => set({ records: [] }),
}));

type FilterState = FilterCondition & {
  setTimeStart: (timeStart: string | null) => void;
  setTimeEnd: (timeEnd: string | null) => void;
  setZones: (zones: WarehouseZone[]) => void;
  toggleZone: (zone: WarehouseZone) => void;
  setRiskLevels: (riskLevels: RiskLevel[]) => void;
  toggleRiskLevel: (riskLevel: RiskLevel) => void;
  setRecordTypes: (recordTypes: RecordType[]) => void;
  toggleRecordType: (recordType: RecordType) => void;
  setSearchKeyword: (searchKeyword: string) => void;
  resetFilters: () => void;
  setAll: (filters: Partial<FilterCondition>) => void;
};

const initialFilterState: FilterCondition = {
  timeStart: null,
  timeEnd: null,
  zones: [],
  riskLevels: [],
  recordTypes: [],
  searchKeyword: "",
};

export const useFilterStore = create<FilterState>()((set) => ({
  ...initialFilterState,
  setTimeStart: (timeStart) => set({ timeStart }),
  setTimeEnd: (timeEnd) => set({ timeEnd }),
  setZones: (zones) => set({ zones }),
  toggleZone: (zone) =>
    set((state) => ({
      zones: state.zones.includes(zone)
        ? state.zones.filter((z) => z !== zone)
        : [...state.zones, zone],
    })),
  setRiskLevels: (riskLevels) => set({ riskLevels }),
  toggleRiskLevel: (riskLevel) =>
    set((state) => ({
      riskLevels: state.riskLevels.includes(riskLevel)
        ? state.riskLevels.filter((r) => r !== riskLevel)
        : [...state.riskLevels, riskLevel],
    })),
  setRecordTypes: (recordTypes) => set({ recordTypes }),
  toggleRecordType: (recordType) =>
    set((state) => ({
      recordTypes: state.recordTypes.includes(recordType)
        ? state.recordTypes.filter((t) => t !== recordType)
        : [...state.recordTypes, recordType],
    })),
  setSearchKeyword: (searchKeyword) => set({ searchKeyword }),
  resetFilters: () => set(initialFilterState),
  setAll: (filters) => set((state) => ({ ...state, ...filters })),
}));

type ResultState = {
  result: UnifiedResult | null;
  processing: boolean;
  error: string | null;
  setResult: (result: UnifiedResult | null) => void;
  setProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
  startProcessing: () => void;
  finishProcessing: (result: UnifiedResult) => void;
  failProcessing: (error: string) => void;
  reset: () => void;
};

export const useResultStore = create<ResultState>()((set) => ({
  result: null,
  processing: false,
  error: null,
  setResult: (result) => set({ result }),
  setProcessing: (processing) => set({ processing }),
  setError: (error) => set({ error }),
  startProcessing: () => set({ processing: true, error: null, result: null }),
  finishProcessing: (result) =>
    set({ processing: false, error: null, result }),
  failProcessing: (error) => set({ processing: false, error, result: null }),
  reset: () => set({ result: null, processing: false, error: null }),
}));

type TimelineState = {
  currentSegmentId: string | null;
  hoveredTime: string | null;
  setCurrentSegmentId: (id: string | null) => void;
  setHoveredTime: (time: string | null) => void;
  reset: () => void;
};

export const useTimelineStore = create<TimelineState>()((set) => ({
  currentSegmentId: null,
  hoveredTime: null,
  setCurrentSegmentId: (currentSegmentId) => set({ currentSegmentId }),
  setHoveredTime: (hoveredTime) => set({ hoveredTime }),
  reset: () => set({ currentSegmentId: null, hoveredTime: null }),
}));

type Scene3DState = {
  selectedSchemeId: string | null;
  highlightedRecordIds: string[];
  cameraTarget: { x: number; y: number; z: number } | null;
  setSelectedSchemeId: (id: string | null) => void;
  setHighlightedRecordIds: (ids: string[]) => void;
  addHighlightedRecordId: (id: string) => void;
  removeHighlightedRecordId: (id: string) => void;
  toggleHighlightedRecordId: (id: string) => void;
  clearHighlightedRecordIds: () => void;
  setCameraTarget: (target: { x: number; y: number; z: number } | null) => void;
  reset: () => void;
};

export const useScene3DStore = create<Scene3DState>()((set) => ({
  selectedSchemeId: null,
  highlightedRecordIds: [],
  cameraTarget: null,
  setSelectedSchemeId: (selectedSchemeId) => set({ selectedSchemeId }),
  setHighlightedRecordIds: (highlightedRecordIds) =>
    set({ highlightedRecordIds }),
  addHighlightedRecordId: (id) =>
    set((state) => ({
      highlightedRecordIds: state.highlightedRecordIds.includes(id)
        ? state.highlightedRecordIds
        : [...state.highlightedRecordIds, id],
    })),
  removeHighlightedRecordId: (id) =>
    set((state) => ({
      highlightedRecordIds: state.highlightedRecordIds.filter(
        (rid) => rid !== id,
      ),
    })),
  toggleHighlightedRecordId: (id) =>
    set((state) => ({
      highlightedRecordIds: state.highlightedRecordIds.includes(id)
        ? state.highlightedRecordIds.filter((rid) => rid !== id)
        : [...state.highlightedRecordIds, id],
    })),
  clearHighlightedRecordIds: () => set({ highlightedRecordIds: [] }),
  setCameraTarget: (cameraTarget) => set({ cameraTarget }),
  reset: () =>
    set({
      selectedSchemeId: null,
      highlightedRecordIds: [],
      cameraTarget: null,
    }),
}));

type ReviewStats = {
  total: number;
  processed: number;
  evidenceNeeded: number;
  byEvidenceType: Partial<Record<EvidenceType, number>>;
};

type ReviewState = {
  reviews: ReviewItem[];
  addReview: (
    review: Omit<ReviewItem, "id" | "updatedAt"> & {
      id?: string;
      updatedAt?: string;
    },
  ) => ReviewItem;
  updateReview: (id: string, updates: Partial<Omit<ReviewItem, "id">>) => void;
  deleteReview: (id: string) => void;
  getReviewById: (id: string) => ReviewItem | undefined;
  getReviewsByRecordId: (recordId: string) => ReviewItem[];
  setReviews: (reviews: ReviewItem[]) => void;
  clearReviews: () => void;
  getStats: () => ReviewStats;
};

function generateId(): string {
  return `REV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useReviewStore = create<ReviewState>()((set, get) => ({
  reviews: [],
  addReview: (review) => {
    const newReview: ReviewItem = {
      id: review.id ?? generateId(),
      relatedRecordId: review.relatedRecordId,
      status: review.status,
      evidenceType: review.evidenceType,
      note: review.note,
      updatedAt: review.updatedAt ?? new Date().toISOString(),
    };
    set((state) => ({ reviews: [...state.reviews, newReview] }));
    return newReview;
  },
  updateReview: (id, updates) =>
    set((state) => ({
      reviews: state.reviews.map((r) =>
        r.id === id
          ? { ...r, ...updates, updatedAt: new Date().toISOString() }
          : r,
      ),
    })),
  deleteReview: (id) =>
    set((state) => ({
      reviews: state.reviews.filter((r) => r.id !== id),
    })),
  getReviewById: (id) => get().reviews.find((r) => r.id === id),
  getReviewsByRecordId: (recordId) =>
    get().reviews.filter((r) => r.relatedRecordId === recordId),
  setReviews: (reviews) => set({ reviews }),
  clearReviews: () => set({ reviews: [] }),
  getStats: () => {
    const { reviews } = get();
    const total = reviews.length;
    let processed = 0;
    let evidenceNeeded = 0;
    const byEvidenceType: Partial<Record<EvidenceType, number>> = {};

    for (const r of reviews) {
      if (r.status === "processed") processed++;
      if (r.status === "evidence_needed") evidenceNeeded++;
      if (r.evidenceType) {
        byEvidenceType[r.evidenceType] =
          (byEvidenceType[r.evidenceType] ?? 0) + 1;
      }
    }

    return { total, processed, evidenceNeeded, byEvidenceType };
  },
}));
