import { create } from 'zustand';
import type { SceneStoreState, TerrainData, Annotation, TrainingLogEntry } from '../types';
import { generateTerrainData, generateTrainingPath } from '../utils/terrainGenerator';

export const useSceneStore = create<SceneStoreState>((set, get) => ({
  terrainData: null,
  trainingPath: [],
  currentStep: 0,
  isPlaying: false,
  annotations: [],
  showWireframe: false,
  useLogScale: false,

  setTerrainData: (data: TerrainData | null) => set({ terrainData: data }),

  setCurrentStep: (step: number | ((prev: number) => number)) => {
    if (typeof step === 'function') {
      set(state => ({ currentStep: step(state.currentStep) }));
    } else {
      set({ currentStep: step });
    }
  },

  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),

  addAnnotation: (annotation: Annotation) => {
    set(state => ({
      annotations: [...state.annotations, annotation]
    }));
  },

  removeAnnotation: (id: string) => {
    set(state => ({
      annotations: state.annotations.filter(a => a.id !== id)
    }));
  },

  toggleWireframe: () => {
    set(state => ({ showWireframe: !state.showWireframe }));
  },

  toggleLogScale: () => {
    const newLogScale = !get().useLogScale;
    set({ useLogScale: newLogScale });
  },

  generateTerrain: (logEntries: TrainingLogEntry[], paramX: string, paramY: string) => {
    const { useLogScale } = get();
    const terrainData = generateTerrainData(logEntries, paramX, paramY, useLogScale);
    const trainingPath = generateTrainingPath(logEntries, terrainData, useLogScale);
    
    set({ terrainData, trainingPath, currentStep: 0 });
  }
}));
