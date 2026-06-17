import { create } from 'zustand';
import type {
  StandardComplaint,
  RawComplaint,
  FilterState,
  FieldMapping,
  MergeSuggestion,
  Park,
  CityBlock,
  ComplaintStatus,
} from '@/shared/types';
import { DEFAULT_MAPPING } from '@/utils/fieldMapper';
import { appendHistory, createHistoryEntry } from '@/utils/historyTrail';
import { cityBlocks } from '@/mock/blocks';

interface BusinessState {
  complaints: StandardComplaint[];
  rawComplaints: RawComplaint[];
  selectedId: string | null;
  filters: FilterState;
  fieldMapping: FieldMapping;
  mergeSuggestions: MergeSuggestion[];
  isStarted: boolean;
  showFieldMappingModal: boolean;
  showMergeModal: string | null;
  showCoordIssuePanel: boolean;
  focusedComplaintId: string | null;
  parks: Park[];
  blocks: CityBlock[];
}

interface BusinessActions {
  setSelected: (id: string | null) => void;
  setFilters: (partial: Partial<FilterState>) => void;
  setFieldMapping: (mapping: FieldMapping) => void;
  toggleStart: () => void;
  setShowFieldMappingModal: (v: boolean) => void;
  setShowMergeModal: (groupId: string | null) => void;
  setShowCoordIssuePanel: (v: boolean) => void;
  setFocusedComplaintId: (id: string | null) => void;
  applyStartResult: (result: {
    raw: RawComplaint[];
    standard: StandardComplaint[];
    mergeSuggestions?: MergeSuggestion[];
    parks?: Park[];
    blocks?: CityBlock[];
  }) => void;
  applyRerunResult: (result: {
    raw: RawComplaint[];
    standard: StandardComplaint[];
    mergeSuggestions?: MergeSuggestion[];
  }) => void;
  updateComplaintStatus: (id: string, newStatus: ComplaintStatus) => void;
  confirmMerge: (groupId: string) => void;
  resolveCoordIssue: (
    id: string,
    correctedLng: number,
    correctedLat: number,
    newIntersection: string
  ) => void;
}

export type BusinessStore = BusinessState & BusinessActions;

export const useBusinessStore = create<BusinessStore>((set) => ({
  complaints: [],
  rawComplaints: [],
  selectedId: null,
  filters: {
    dateRange: { start: null, end: null },
    statuses: [],
    sources: [],
    intersections: [],
    hasCoordIssue: null,
    keyword: '',
  },
  fieldMapping: DEFAULT_MAPPING,
  mergeSuggestions: [],
  isStarted: false,
  showFieldMappingModal: false,
  showMergeModal: null,
  showCoordIssuePanel: false,
  focusedComplaintId: null,
  parks: [],
  blocks: cityBlocks,

  setSelected: (id) => set({ selectedId: id, focusedComplaintId: id }),

  setFilters: (partial) =>
    set((s) => ({ filters: { ...s.filters, ...partial } })),

  setFieldMapping: (mapping) => set({ fieldMapping: mapping }),

  toggleStart: () => set((s) => ({ isStarted: !s.isStarted })),

  setShowFieldMappingModal: (v) => set({ showFieldMappingModal: v }),

  setShowMergeModal: (groupId) => set({ showMergeModal: groupId }),

  setShowCoordIssuePanel: (v) => set({ showCoordIssuePanel: v }),

  setFocusedComplaintId: (id) => set({ focusedComplaintId: id }),

  applyStartResult: (result) =>
    set({
      rawComplaints: result.raw,
      complaints: result.standard,
      mergeSuggestions: result.mergeSuggestions ?? [],
      parks: result.parks ?? [],
      blocks: result.blocks ?? cityBlocks,
      isStarted: true,
      selectedId: null,
      focusedComplaintId: null,
    }),

  applyRerunResult: (result) =>
    set({
      rawComplaints: result.raw,
      complaints: result.standard,
      mergeSuggestions: result.mergeSuggestions ?? [],
    }),

  updateComplaintStatus: (id, newStatus) =>
    set((s) => ({
      complaints: s.complaints.map((c) => {
        if (c.id !== id) return c;
        const entry = createHistoryEntry('status', c.status, newStatus, '老曹');
        return appendHistory({ ...c, status: newStatus }, entry);
      }),
    })),

  confirmMerge: (groupId) =>
    set((s) => {
      const suggestion = s.mergeSuggestions.find((m) => m.groupId === groupId);
      if (!suggestion) return {};
      return {
        complaints: s.complaints.map((c) => {
          if (!suggestion.complaintIds.includes(c.id)) return c;
          const statusEntry = createHistoryEntry(
            'status',
            c.status,
            '已归并',
            '老曹',
            '人工确认归并'
          );
          const merged = appendHistory(c, statusEntry);
          const groupEntry = createHistoryEntry(
            'mergeGroupId',
            c.mergeGroupId,
            groupId,
            '老曹',
            '人工确认归并'
          );
          return appendHistory(
            { ...merged, status: '已归并', mergeGroupId: groupId },
            groupEntry
          );
        }),
        showMergeModal: null,
      };
    }),

  resolveCoordIssue: (id, correctedLng, correctedLat, newIntersection) =>
    set((s) => ({
      complaints: s.complaints.map((c) => {
        if (c.id !== id) return c;
        let updated = appendHistory(
          c,
          createHistoryEntry('lng', c.lng, correctedLng, '老曹', '坐标修正')
        );
        updated = appendHistory(
          updated,
          createHistoryEntry('lat', c.lat, correctedLat, '老曹', '坐标修正')
        );
        updated = appendHistory(
          updated,
          createHistoryEntry(
            'intersection',
            c.intersection,
            newIntersection,
            '老曹',
            '坐标修正'
          )
        );
        updated = appendHistory(
          updated,
          createHistoryEntry(
            'status',
            c.status,
            '待确认',
            '老曹',
            '坐标修正，恢复待确认'
          )
        );
        updated = appendHistory(
          updated,
          createHistoryEntry('coordIssue', c.coordIssue, undefined, '老曹', '清除坐标异常')
        );
        return {
          ...updated,
          lng: correctedLng,
          lat: correctedLat,
          intersection: newIntersection,
          status: '待确认',
          coordIssue: undefined,
        };
      }),
    })),
}));
