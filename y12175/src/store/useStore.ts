import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState, Track, RuleSet, HistoryVersion, ImportPhase } from '@/types';
import { calculateAndValidate } from '@/services/calculation';
import { defaultRuleSet, phase1RuleSet } from '@/data/sampleData';
import { generateId } from '@/utils/helpers';

interface AppStore extends AppState {
  importTracks: (tracks: Track[]) => void;
  updateRules: (rules: Partial<RuleSet>) => void;
  selectVersion: (trackId: string, versionId: string) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  recalculate: () => void;
  saveVersion: (description: string) => void;
  loadVersion: (versionId: string) => void;
  toggleCompare: (versionId: string | null) => void;
  highlightTrack: (trackId: string | null) => void;
  setPhase: (phase: ImportPhase) => void;
  loadSampleData: (phase: 'phase1' | 'phase2') => void;
  reset: () => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      tracks: [],
      ruleSet: defaultRuleSet,
      currentValidation: null,
      previousValidation: null,
      history: [],
      importPhase: 'INIT',
      selectedHistoryId: null,
      compareMode: false,
      compareVersionId: null,
      highlightTrackId: null,

      importTracks: (tracks: Track[]) => {
        set({ tracks });
        get().recalculate();
      },

      updateRules: (updates) => {
        const prevValidation = get().currentValidation;
        set((state) => ({
          ruleSet: { ...state.ruleSet, ...updates },
          previousValidation: prevValidation
        }));
        get().recalculate();
      },

      selectVersion: (trackId, versionId) => {
        const prevValidation = get().currentValidation;
        set((state) => ({
          tracks: state.tracks.map(t =>
            t.id === trackId ? { ...t, selectedVersionId: versionId } : t
          ),
          previousValidation: prevValidation
        }));
        get().recalculate();
      },

      updateTrack: (trackId, updates) => {
        const prevValidation = get().currentValidation;
        set((state) => ({
          tracks: state.tracks.map(t =>
            t.id === trackId ? { ...t, ...updates } : t
          ),
          previousValidation: prevValidation
        }));
        get().recalculate();
      },

      recalculate: () => {
        const { tracks, ruleSet } = get();
        if (tracks.length === 0) {
          set({ currentValidation: null });
          return;
        }
        const result = calculateAndValidate(tracks, ruleSet);
        set({ currentValidation: result });
      },

      saveVersion: (description) => {
        const { tracks, ruleSet, currentValidation, history } = get();
        if (!currentValidation) return;

        const newVersion: HistoryVersion = {
          id: generateId(),
          timestamp: Date.now(),
          name: `版本 ${history.length + 1}`,
          ruleSet: JSON.parse(JSON.stringify(ruleSet)),
          tracks: JSON.parse(JSON.stringify(tracks)),
          validationResult: JSON.parse(JSON.stringify(currentValidation)),
          parentId: history.length > 0 ? history[0].id : undefined,
          changeDescription: description
        };

        set({
          history: [newVersion, ...history]
        });
      },

      loadVersion: (versionId) => {
        const version = get().history.find(h => h.id === versionId);
        if (!version) return;

        const prevValidation = get().currentValidation;
        set({
          tracks: JSON.parse(JSON.stringify(version.tracks)),
          ruleSet: JSON.parse(JSON.stringify(version.ruleSet)),
          currentValidation: JSON.parse(JSON.stringify(version.validationResult)),
          previousValidation: prevValidation,
          selectedHistoryId: versionId
        });
      },

      toggleCompare: (versionId) => {
        if (versionId === null) {
          set({ compareMode: false, compareVersionId: null });
        } else {
          set({ compareMode: true, compareVersionId: versionId });
        }
      },

      highlightTrack: (trackId) => {
        set({ highlightTrackId: trackId });
      },

      setPhase: (phase) => {
        set({ importPhase: phase });
      },

      loadSampleData: (phase) => {
        const { sampleTracks } = require('@/data/sampleData');
        const prevValidation = get().currentValidation;

        if (phase === 'phase1') {
          const tracksWithoutEncore = sampleTracks.map(t => ({ ...t, isEncore: false }));
          set({
            tracks: tracksWithoutEncore,
            ruleSet: phase1RuleSet,
            importPhase: 'PHASE1',
            previousValidation: prevValidation
          });
        } else {
          set({
            tracks: sampleTracks,
            ruleSet: defaultRuleSet,
            importPhase: 'PHASE2',
            previousValidation: prevValidation
          });
        }
        get().recalculate();
      },

      reset: () => {
        set({
          tracks: [],
          ruleSet: defaultRuleSet,
          currentValidation: null,
          previousValidation: null,
          history: [],
          importPhase: 'INIT',
          selectedHistoryId: null,
          compareMode: false,
          compareVersionId: null,
          highlightTrackId: null
        });
      }
    }),
    {
      name: 'concert-duration-storage',
      partialize: (state) => ({
        tracks: state.tracks,
        ruleSet: state.ruleSet,
        history: state.history,
        importPhase: state.importPhase
      })
    }
  )
);
