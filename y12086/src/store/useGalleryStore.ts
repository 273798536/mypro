import { create } from 'zustand';
import type { Issue, DuplicateValveIssue, RouteCrossZoneIssue, OverdueWorkOrderIssue } from '@/data/types';
import { valves, inspectionRoutes, workOrders, gallerySegments } from '@/data/mockData';
import { detectDuplicateValves, detectRouteCrossZone, detectOverdueWorkOrders } from '@/utils/detector';

interface GalleryStore {
  selectedValveId: string | null;
  selectedIssue: Issue | null;
  focusPosition: [number, number, number] | null;
  workOrderDrawerOpen: boolean;
  duplicateIssues: DuplicateValveIssue[];
  crossZoneIssues: RouteCrossZoneIssue[];
  overdueIssues: OverdueWorkOrderIssue[];

  selectValve: (valveId: string | null) => void;
  selectIssue: (issue: Issue | null) => void;
  setFocusPosition: (pos: [number, number, number] | null) => void;
  toggleWorkOrderDrawer: () => void;
  setWorkOrderDrawerOpen: (open: boolean) => void;
}

const dupIssues = detectDuplicateValves(valves);
const crossIssues = detectRouteCrossZone(inspectionRoutes, valves, gallerySegments);
const overdueIssues = detectOverdueWorkOrders(workOrders);

export const useGalleryStore = create<GalleryStore>((set) => ({
  selectedValveId: null,
  selectedIssue: null,
  focusPosition: null,
  workOrderDrawerOpen: false,
  duplicateIssues: dupIssues,
  crossZoneIssues: crossIssues,
  overdueIssues: overdueIssues,

  selectValve: (valveId) => set({ selectedValveId: valveId }),
  selectIssue: (issue) => set({ selectedIssue: issue }),
  setFocusPosition: (pos) => set({ focusPosition: pos }),
  toggleWorkOrderDrawer: () => set((s) => ({ workOrderDrawerOpen: !s.workOrderDrawerOpen })),
  setWorkOrderDrawerOpen: (open) => set({ workOrderDrawerOpen: open }),
}));
