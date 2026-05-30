import { create } from 'zustand';
import { AppState, AppActions, SceneVersion, ViewMode, ViewPreset } from '@/types';
import { createStageWithCables, createStageWithoutCables } from '@/data/demoScene';
import { detectAllConflicts } from '@/detectors';

type StoreState = AppState & AppActions;

export const useStageStore = create<StoreState>((set, get) => ({
  currentVersion: null,
  compareVersion: null,
  viewMode: 'single',
  showCables: true,
  selectedMusician: null,
  highlightedConflict: null,
  viewPreset: 'perspective',

  setCurrentVersion: (version) => set({ currentVersion: version }),
  setCompareVersion: (version) => set({ compareVersion: version }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setShowCables: (show) => set({ showCables: show }),
  setSelectedMusician: (id) => set({ selectedMusician: id }),
  setHighlightedConflict: (id) => set({ highlightedConflict: id }),
  setViewPreset: (preset) => set({ viewPreset: preset }),

  updateMusicianPosition: (id, x, z) => {
    const { currentVersion } = get();
    if (!currentVersion) return;

    const updatedMusicians = currentVersion.stage.musicians.map((m) =>
      m.id === id ? { ...m, x, z } : m
    );

    const updatedStage = {
      ...currentVersion.stage,
      musicians: updatedMusicians,
    };

    const newConflicts = detectAllConflicts(updatedStage);

    set({
      currentVersion: {
        ...currentVersion,
        stage: updatedStage,
        conflicts: newConflicts,
      },
    });
  },

  saveNewVersion: (name) => {
    const { currentVersion } = get();
    if (!currentVersion) return;

    const newVersion: SceneVersion = {
      id: `v${Date.now()}`,
      name,
      timestamp: Date.now(),
      stage: JSON.parse(JSON.stringify(currentVersion.stage)),
      conflicts: JSON.parse(JSON.stringify(currentVersion.conflicts)),
    };

    set({ compareVersion: newVersion });
  },

  runConflictDetection: () => {
    const { currentVersion } = get();
    if (!currentVersion) return;

    const conflicts = detectAllConflicts(currentVersion.stage);

    set({
      currentVersion: {
        ...currentVersion,
        conflicts,
      },
    });
  },
}));

export const initializeDemoData = () => {
  const stageWithoutCables = createStageWithoutCables();
  const stageWithCables = createStageWithCables();

  const conflictsWithoutCables = detectAllConflicts(stageWithoutCables);
  const conflictsWithCables = detectAllConflicts(stageWithCables);

  const version1: SceneVersion = {
    id: 'v1',
    name: '仅舞台',
    timestamp: Date.now() - 1000,
    stage: stageWithoutCables,
    conflicts: conflictsWithoutCables,
  };

  const version2: SceneVersion = {
    id: 'v2',
    name: '加线缆',
    timestamp: Date.now(),
    stage: stageWithCables,
    conflicts: conflictsWithCables,
  };

  useStageStore.setState({
    currentVersion: version2,
    compareVersion: version1,
  });
};
