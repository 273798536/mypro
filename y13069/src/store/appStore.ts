import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppState,
  RigPoint,
  SchemeVersion,
  Note,
  AppFilters,
  AppViewState,
} from '../types';
import {
  mockProject,
  mockVersions,
  mockPointsByVersionId,
  mockAnomalies,
} from '../data/mockData';

const activeVersion = mockVersions.find((v) => v.isActive) ?? mockVersions[mockVersions.length - 1];

const defaultFilters: AppFilters = {
  rigNos: [],
  zones: [],
  statuses: [],
  versionScope: 'current',
  keyword: '',
};

const defaultViewState: AppViewState = {
  activeVersionId: activeVersion.id,
  selectedPointIds: [],
  cameraPosition: [14, 12, 14],
  expandedNoteIds: [],
  showTraceModalFor: null,
};

const initialNotesByPointId: Record<string, Note[]> = {};
Object.values(mockPointsByVersionId).forEach((points) => {
  points.forEach((p) => {
    if (p.notes.length > 0) initialNotesByPointId[p.id] = p.notes;
  });
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      project: mockProject,
      versions: mockVersions,
      pointsByVersionId: mockPointsByVersionId,
      anomalies: mockAnomalies,
      filters: defaultFilters,
      viewState: defaultViewState,
      notesByPointId: initialNotesByPointId,

      setFilters: (f) =>
        set((s) => ({ filters: { ...s.filters, ...f } })),

      setViewState: (v) =>
        set((s) => ({ viewState: { ...s.viewState, ...v } })),

      addNote: (pointId, note) => {
        const newNote: Note = {
          ...note,
          id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          notesByPointId: {
            ...s.notesByPointId,
            [pointId]: [...(s.notesByPointId[pointId] ?? []), newNote],
          },
        }));
      },

      togglePointSelect: (pointId) =>
        set((s) => {
          const has = s.viewState.selectedPointIds.includes(pointId);
          return {
            viewState: {
              ...s.viewState,
              selectedPointIds: has
                ? s.viewState.selectedPointIds.filter((i) => i !== pointId)
                : [...s.viewState.selectedPointIds, pointId],
            },
          };
        }),

      expandNote: (noteId) =>
        set((s) => {
          const has = s.viewState.expandedNoteIds.includes(noteId);
          return {
            viewState: {
              ...s.viewState,
              expandedNoteIds: has
                ? s.viewState.expandedNoteIds.filter((i) => i !== noteId)
                : [...s.viewState.expandedNoteIds, noteId],
            },
          };
        }),

      showTrace: (pointId) =>
        set((s) => ({
          viewState: { ...s.viewState, showTraceModalFor: pointId },
        })),

      resetAll: () =>
        set({
          filters: defaultFilters,
          viewState: { ...defaultViewState, activeVersionId: activeVersion.id },
        }),

      switchVersion: (versionId) => {
        const currentVersion = get().getActiveVersion();
        const prevSelectedRigNos = get()
          .viewState.selectedPointIds.map((pid) => get().getPointById(pid)?.rigNo)
          .filter(Boolean) as string[];

        const newPoints = get().pointsByVersionId[versionId] ?? [];
        const keepSelected = newPoints
          .filter((p) => prevSelectedRigNos.includes(p.rigNo))
          .map((p) => p.id);

        set((s) => ({
          viewState: {
            ...s.viewState,
            activeVersionId: versionId,
            selectedPointIds: keepSelected,
          },
        }));
      },

      getFilteredPoints: () => {
        const {
          filters,
          viewState,
          pointsByVersionId,
          versions,
        } = get();
        const activeVersionId = viewState.activeVersionId ?? activeVersion.id;
        let points: RigPoint[] = [];

        if (filters.versionScope === 'current') {
          points = pointsByVersionId[activeVersionId] ?? [];
        } else if (filters.versionScope === 'includeOld') {
          points = versions.flatMap((v) => pointsByVersionId[v.id] ?? []);
        } else if (filters.versionScope === 'onlyWithdrawn') {
          points = versions
            .filter((v) => v.isWithdrawn)
            .flatMap((v) => pointsByVersionId[v.id] ?? []);
        }

        if (filters.rigNos.length > 0) {
          points = points.filter((p) => filters.rigNos.includes(p.rigNo));
        }
        if (filters.zones.length > 0) {
          points = points.filter((p) => filters.zones.includes(p.zone));
        }
        if (filters.statuses.length > 0) {
          points = points.filter((p) => filters.statuses.includes(p.status));
        }
        if (filters.keyword.trim()) {
          const k = filters.keyword.trim().toLowerCase();
          points = points.filter(
            (p) =>
              p.rigNo.toLowerCase().includes(k) ||
              p.zone.toLowerCase().includes(k),
          );
        }
        return points;
      },

      getActiveVersion: () => {
        const { versions, viewState } = get();
        const id = viewState.activeVersionId;
        return (versions.find((v) => v.id === id) ??
          versions.find((v) => v.isActive) ??
          versions[0] ?? null) as SchemeVersion | null;
      },

      getAnomaliesForActiveVersion: () => {
        const { viewState, anomalies } = get();
        return anomalies.filter((a) => a.versionId === viewState.activeVersionId);
      },

      getAnomaliesForVersionId: (versionId: string) => {
        const { anomalies } = get();
        return anomalies.filter((a) => a.versionId === versionId);
      },

      getPointById: (pointId) => {
        const { pointsByVersionId, notesByPointId } = get();
        for (const v in pointsByVersionId) {
          const p = pointsByVersionId[v].find((x) => x.id === pointId);
          if (p) {
            const extraNotes = notesByPointId[p.id] ?? [];
            const mergedNotesMap = new Map<string, Note>();
            [...p.notes, ...extraNotes].forEach((n) => mergedNotesMap.set(n.id, n));
            return { ...p, notes: Array.from(mergedNotesMap.values()) };
          }
        }
        return null;
      },
    }),
    {
      name: 'rig-scheme-workbench-v1',
      partialize: (state) => ({
        filters: state.filters,
        viewState: state.viewState,
        notesByPointId: state.notesByPointId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const valid = state.versions.some((v) => v.id === state.viewState.activeVersionId);
          if (!valid) state.viewState.activeVersionId = activeVersion.id;
        }
      },
    },
  ),
);
