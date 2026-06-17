import { create } from 'zustand';
import type { FilterState, ComplaintType, ComplaintStatus, SourceType } from '@/types';
import { complaintEvents, approvalRecords, historySnapshots, photoSupplements, locations } from '@/data/mockData';

interface AppState {
  selectedLocationId: string | null;
  selectedEventId: string | null;
  selectedApprovalId: string | null;
  timeRangeStart: string;
  timeRangeEnd: string;
  filter: FilterState;
  hoveredLocationId: string | null;
  rightPanelTab: 'timeline' | 'approval';

  setSelectedLocationId: (id: string | null) => void;
  setSelectedEventId: (id: string | null) => void;
  setSelectedApprovalId: (id: string | null) => void;
  setTimeRange: (start: string, end: string) => void;
  setFilter: (filter: Partial<FilterState>) => void;
  setHoveredLocationId: (id: string | null) => void;
  setRightPanelTab: (tab: 'timeline' | 'approval') => void;

  getFilteredEvents: () => typeof complaintEvents;
  getFilteredApprovals: () => typeof approvalRecords;
  getEventsForLocation: (locationId: string) => typeof complaintEvents;
  getApprovalsForEvent: (eventId: string) => typeof approvalRecords;
  getSnapshotsForApproval: (approvalId: string) => typeof historySnapshots;
  getPhotosForEvent: (eventId: string) => typeof photoSupplements;
  getPhotosForLocation: (locationId: string) => typeof photoSupplements;
  getLocationById: (id: string) => typeof locations[0] | undefined;
  resolveLocationByAlias: (alias: string) => typeof locations[0] | undefined;
  getStatusCounts: () => { processed: number; pending: number; evidence_needed: number };
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedLocationId: null,
  selectedEventId: null,
  selectedApprovalId: null,
  timeRangeStart: '2025-01-01',
  timeRangeEnd: '2025-12-31',
  filter: {
    types: [] as ComplaintType[],
    statuses: [] as ComplaintStatus[],
    sourceTypes: [] as SourceType[],
    locationId: null,
    searchAlias: '',
  },
  hoveredLocationId: null,
  rightPanelTab: 'timeline',

  setSelectedLocationId: (id) => set({ selectedLocationId: id, selectedEventId: null, selectedApprovalId: null }),
  setSelectedEventId: (id) => {
    const evt = complaintEvents.find((e) => e.id === id);
    if (evt) {
      set({ selectedEventId: id, selectedLocationId: evt.locationId, selectedApprovalId: null });
    } else {
      set({ selectedEventId: id, selectedApprovalId: null });
    }
  },
  setSelectedApprovalId: (id) => set({ selectedApprovalId: id }),
  setTimeRange: (start, end) => set({ timeRangeStart: start, timeRangeEnd: end }),
  setFilter: (partial) => set((state) => ({ filter: { ...state.filter, ...partial } })),
  setHoveredLocationId: (id) => set({ hoveredLocationId: id }),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

  getFilteredEvents: () => {
    const { filter, timeRangeStart, timeRangeEnd, selectedLocationId } = get();
    return complaintEvents.filter((evt) => {
      if (selectedLocationId && evt.locationId !== selectedLocationId) return false;
      if (filter.types.length > 0 && !filter.types.includes(evt.type)) return false;
      if (filter.statuses.length > 0 && !filter.statuses.includes(evt.status)) return false;
      if (evt.eventDate < timeRangeStart || evt.eventDate > timeRangeEnd) return false;
      return true;
    });
  },

  getFilteredApprovals: () => {
    const events = get().getFilteredEvents();
    const eventIds = new Set(events.map((e) => e.id));
    return approvalRecords.filter((ar) => {
      if (!eventIds.has(ar.complaintId)) return false;
      if (get().filter.sourceTypes.length > 0 && !get().filter.sourceTypes.includes(ar.sourceType)) return false;
      return true;
    });
  },

  getEventsForLocation: (locationId) => complaintEvents.filter((e) => e.locationId === locationId),

  getApprovalsForEvent: (eventId) => approvalRecords.filter((a) => a.complaintId === eventId),

  getSnapshotsForApproval: (approvalId) => historySnapshots.filter((s) => s.approvalId === approvalId),

  getPhotosForEvent: (eventId) => photoSupplements.filter((p) => p.complaintId === eventId),

  getPhotosForLocation: (locationId) => photoSupplements.filter((p) => p.locationId === locationId),

  getLocationById: (id) => locations.find((l) => l.id === id),

  resolveLocationByAlias: (alias) => {
    const normalized = alias.trim().toLowerCase();
    return locations.find((loc) => {
      if (loc.canonicalName.toLowerCase() === normalized) return true;
      return loc.aliases.some((a) => a.toLowerCase() === normalized);
    });
  },

  getStatusCounts: () => {
    const events = get().getFilteredEvents();
    return {
      processed: events.filter((e) => e.status === 'processed').length,
      pending: events.filter((e) => e.status === 'pending').length,
      evidence_needed: events.filter((e) => e.status === 'evidence_needed').length,
    };
  },
}));
