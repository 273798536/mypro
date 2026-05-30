import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Musician,
  Section,
  InstrumentSPL,
  Seat,
  SeatPressure,
  Viewpoint,
  SoundPressureChange,
  CorrectionSuggestion,
  OcclusionResult,
} from '../types';
import { sections, musicians, instrumentSPLs, generateSeats } from '../data/mockData';
import { computeSeatPressures, computeOcclusionResults } from '../utils/acoustics';
import { generateCorrections } from '../utils/corrections';

interface AppState {
  sections: Section[];
  musicians: Musician[];
  instrumentSPLs: InstrumentSPL[];
  seats: Seat[];
  seatPressures: SeatPressure[];
  occlusionResults: OcclusionResult[];
  corrections: CorrectionSuggestion[];
  viewpointHistory: SoundPressureChange[];
  viewpoints: Viewpoint[];

  activeSections: Set<string>;
  selectedSeatId: string | null;
  selectedMusicianId: string | null;
  showChangeOverlay: boolean;
  comparisonMode: 'current' | 'before' | 'both';

  toggleSection: (sectionId: string) => void;
  selectSeat: (seatId: string | null) => void;
  selectMusician: (musicianId: string | null) => void;
  setComparisonMode: (mode: 'current' | 'before' | 'both') => void;

  updateInstrumentSPL: (musicianId: string, newSpl: number) => void;
  dismissCorrection: (correctionId: string) => void;
  applyCorrection: (correctionId: string) => void;

  saveViewpoint: (name: string, cameraPosition: [number, number, number], cameraTarget: [number, number, number]) => void;
  loadViewpoint: (viewpointId: string) => Viewpoint | null;
  deleteViewpoint: (viewpointId: string) => void;

  recomputePressures: () => void;
}

function recomputeAll(
  musicians: Musician[],
  instrumentSPLs: InstrumentSPL[],
  seats: Seat[],
  sections: Section[]
) {
  const seatPressures = computeSeatPressures(musicians, instrumentSPLs, seats);
  const occlusionResults = computeOcclusionResults(musicians, seats, seatPressures);
  const corrections = generateCorrections(musicians, instrumentSPLs, sections, false);
  return { seatPressures, occlusionResults, corrections };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const initialMusicians = [...musicians];
      const initialSPLs = [...instrumentSPLs];
      const initialSeats = generateSeats();
      const initialSections = [...sections];
      const initial = recomputeAll(initialMusicians, initialSPLs, initialSeats, initialSections);

      return {
        sections: initialSections,
        musicians: initialMusicians,
        instrumentSPLs: initialSPLs,
        seats: initialSeats,
        seatPressures: initial.seatPressures,
        occlusionResults: initial.occlusionResults,
        corrections: initial.corrections,
        viewpointHistory: [],
        viewpoints: [],

        activeSections: new Set(initialSections.map((s) => s.id)),
        selectedSeatId: null,
        selectedMusicianId: null,
        showChangeOverlay: false,
        comparisonMode: 'current',

        toggleSection: (sectionId) => {
          set((state) => {
            const newSet = new Set(state.activeSections);
            if (newSet.has(sectionId)) {
              newSet.delete(sectionId);
            } else {
              newSet.add(sectionId);
            }
            return { activeSections: newSet };
          });
        },

        selectSeat: (seatId) => set({ selectedSeatId: seatId }),
        selectMusician: (musicianId) => set({ selectedMusicianId: musicianId }),
        setComparisonMode: (mode) => set({ comparisonMode: mode }),

        updateInstrumentSPL: (musicianId, newSpl) => {
          set((state) => {
            const musician = state.musicians.find((m) => m.id === musicianId);
            const oldSPLData = state.instrumentSPLs.find((s) => s.musicianId === musicianId);

            const newSPLs = state.instrumentSPLs.map((s) =>
              s.musicianId === musicianId ? { ...s, spl: newSpl, isEstimated: false } : s
            );

            const newHistory: SoundPressureChange[] = [
              {
                id: `change_${Date.now()}`,
                musicianId,
                musicianName: musician?.name ?? '',
                instrument: musician?.instrument ?? '',
                oldValue: oldSPLData?.spl ?? null,
                newValue: newSpl,
                timestamp: Date.now(),
                affectedSeatIds: [],
              },
              ...state.viewpointHistory,
            ];

            const recomputed = recomputeAll(state.musicians, newSPLs, state.seats, state.sections);

            return {
              instrumentSPLs: newSPLs,
              viewpointHistory: newHistory,
              ...recomputed,
            };
          });
        },

        dismissCorrection: (correctionId) => {
          set((state) => ({
            corrections: state.corrections.map((c) =>
              c.id === correctionId ? { ...c, dismissed: true } : c
            ),
          }));
        },

        applyCorrection: (correctionId) => {
          set((state) => {
            const correction = state.corrections.find((c) => c.id === correctionId);
            if (!correction) return {};

            if (correction?.type === 'missing_spl') {
              const musician = state.musicians.find((m) => m.id === correction.targetId);
              const sectionId = musician?.sectionId;
              const section = state.sections.find((s) => s.id === sectionId);
              const sectionMusicians = state.musicians.filter(
                (m) => m.sectionId === sectionId && m.id !== correction.targetId
              );
              const sectionSPLs = state.instrumentSPLs.filter(
                (s) => sectionMusicians.some((m) => m.id === s.musicianId) && s.spl !== null
              );
              const avg =
                sectionSPLs.length > 0
                  ? Math.round(sectionSPLs.reduce((sum, s) => sum + (s.spl || 0), 0) / sectionSPLs.length)
                  : 85;

              const newSPLs = state.instrumentSPLs.map((s) =>
                s.musicianId === correction.targetId ? { ...s, spl: avg, isEstimated: false } : s
              );

              const recomputed = recomputeAll(state.musicians, newSPLs, state.seats, state.sections);

              return {
                instrumentSPLs: newSPLs,
                corrections: state.corrections.map((c) =>
                  c.id === correctionId ? { ...c, applied: true } : c
                ),
                ...recomputed,
              };
            }

            if (correction?.type === 'missing_position') {
              const defaultPositions: Record<string, { x: number; y: number; z: number }> = {
                strings: { x: 0, y: 0, z: -6 },
                woodwinds: { x: -2, y: 0, z: -4 },
                brass: { x: 3, y: 0, z: -3 },
                percussion: { x: 6, y: 0, z: -1 },
              };
              const musician = state.musicians.find((m) => m.id === correction.targetId);
              const defPos = defaultPositions[musician?.sectionId ?? 'strings'] ?? { x: 0, y: 0, z: -6 };

              const newMusicians = state.musicians.map((m) =>
                m.id === correction.targetId ? { ...m, position: { ...defPos } } : m
              );

              const recomputed = recomputeAll(newMusicians, state.instrumentSPLs, state.seats, state.sections);

              return {
                musicians: newMusicians,
                corrections: state.corrections.map((c) =>
                  c.id === correctionId ? { ...c, applied: true } : c
                ),
                ...recomputed,
              };
            }

            return {
              corrections: state.corrections.map((c) =>
                c.id === correctionId ? { ...c, dismissed: true } : c
              ),
            };
          });
        },

        saveViewpoint: (name, cameraPosition, cameraTarget) => {
          set((state) => ({
            viewpoints: [
              ...state.viewpoints,
              {
                id: `vp_${Date.now()}`,
                name,
                cameraPosition,
                cameraTarget,
                createdAt: Date.now(),
              },
            ],
          }));
        },

        loadViewpoint: (viewpointId) => {
          const { viewpoints } = get();
          return viewpoints.find((v) => v.id === viewpointId) ?? null;
        },

        deleteViewpoint: (viewpointId) => {
          set((state) => ({
            viewpoints: state.viewpoints.filter((v) => v.id !== viewpointId),
          }));
        },

        recomputePressures: () => {
          set((state) => {
            const recomputed = recomputeAll(state.musicians, state.instrumentSPLs, state.seats, state.sections);
            return recomputed;
          });
        },
      };
    },
    {
      name: 'acoustic-viewer-storage',
      partialize: (state) => ({
        viewpoints: state.viewpoints,
        viewpointHistory: state.viewpointHistory,
      }),
    }
  )
);
