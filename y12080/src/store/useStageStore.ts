import { create } from 'zustand';
import {
  StageModel,
  Light,
  ActorRoute,
  DetectionResult,
  VersionRecord,
  SmokeConfig,
  ViewMode,
  Vec3,
} from '../types';
import { sampleStage, sampleLights, sampleRoutes, sampleResults, sampleSmoke } from '../data/samples';
import { detectLightConflicts } from '../utils/collision';
import { detectRouteOcclusions, detectParagraphMismatch } from '../utils/occlusion';
import { createSnapshot, createVersionRecord, compareSnapshots } from '../utils/snapshot';

interface StageState {
  stage: StageModel;
  lights: Light[];
  routes: ActorRoute[];
  results: DetectionResult[];
  versions: VersionRecord[];
  smoke: SmokeConfig;
  
  selectedLightId: string | null;
  selectedRouteId: string | null;
  selectedResultId: string | null;
  selectedObstacleId: string | null;
  
  isPlaying: boolean;
  currentTime: number;
  showLabels: boolean;
  showLightCones: boolean;
  viewMode: ViewMode;
  
  setSelectedLight: (id: string | null) => void;
  setSelectedRoute: (id: string | null) => void;
  setSelectedResult: (id: string | null) => void;
  setSelectedObstacle: (id: string | null) => void;
  
  updateLight: (id: string, updates: Partial<Light>) => void;
  addLight: (light: Light) => void;
  deleteLight: (id: string) => void;
  
  updateRoute: (id: string, updates: Partial<ActorRoute>) => void;
  addRoute: (route: ActorRoute) => void;
  deleteRoute: (id: string) => void;
  
  updateResult: (id: string, updates: Partial<DetectionResult>) => void;
  
  runFullDetection: () => void;
  runLightConflictDetection: () => void;
  runOcclusionDetection: () => void;
  runParagraphDetection: () => void;
  
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setShowLabels: (show: boolean) => void;
  setShowLightCones: (show: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  
  updateSmoke: (config: Partial<SmokeConfig>) => void;
  
  saveVersion: (description: string) => void;
  loadVersion: (versionId: string) => void;
  
  resetToSample: () => void;
  
  getLightsByIds: (ids: string[]) => Light[];
  getRoutesByIds: (ids: string[]) => ActorRoute[];
  getObstaclesByIds: (ids: string[]) => typeof sampleStage.obstacles;
}

export const useStageStore = create<StageState>((set, get) => ({
  stage: sampleStage,
  lights: sampleLights,
  routes: sampleRoutes,
  results: sampleResults,
  versions: [],
  smoke: sampleSmoke,
  
  selectedLightId: null,
  selectedRouteId: null,
  selectedResultId: null,
  selectedObstacleId: null,
  
  isPlaying: false,
  currentTime: 0,
  showLabels: true,
  showLightCones: true,
  viewMode: 'perspective',
  
  setSelectedLight: (id) => set({ selectedLightId: id }),
  setSelectedRoute: (id) => set({ selectedRouteId: id }),
  setSelectedResult: (id) => set({ selectedResultId: id }),
  setSelectedObstacle: (id) => set({ selectedObstacleId: id }),
  
  updateLight: (id, updates) =>
    set((state) => ({
      lights: state.lights.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      ),
    })),
  
  addLight: (light) =>
    set((state) => ({
      lights: [...state.lights, light],
    })),
  
  deleteLight: (id) =>
    set((state) => ({
      lights: state.lights.filter((l) => l.id !== id),
      selectedLightId: state.selectedLightId === id ? null : state.selectedLightId,
    })),
  
  updateRoute: (id, updates) =>
    set((state) => ({
      routes: state.routes.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),
  
  addRoute: (route) =>
    set((state) => ({
      routes: [...state.routes, route],
    })),
  
  deleteRoute: (id) =>
    set((state) => ({
      routes: state.routes.filter((r) => r.id !== id),
      selectedRouteId: state.selectedRouteId === id ? null : state.selectedRouteId,
    })),
  
  updateResult: (id, updates) =>
    set((state) => ({
      results: state.results.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),
  
  runFullDetection: () => {
    const { lights, stage, routes } = get();
    const lightConflicts = detectLightConflicts(lights, stage.obstacles);
    
    let occlusionResults: DetectionResult[] = [];
    routes.forEach((route) => {
      const { results } = detectRouteOcclusions(route, lights, stage.obstacles);
      occlusionResults = [...occlusionResults, ...results];
    });
    
    const paragraphResults = detectParagraphMismatch(routes);
    
    const allResults = [...lightConflicts, ...occlusionResults, ...paragraphResults];
    set({ results: allResults });
  },
  
  runLightConflictDetection: () => {
    const { lights, stage } = get();
    const conflicts = detectLightConflicts(lights, stage.obstacles);
    set((state) => ({
      results: [
        ...state.results.filter((r) => r.type !== 'light_conflict'),
        ...conflicts,
      ],
    }));
  },
  
  runOcclusionDetection: () => {
    const { lights, stage, routes } = get();
    let allResults: DetectionResult[] = [];
    routes.forEach((route) => {
      const { results } = detectRouteOcclusions(route, lights, stage.obstacles);
      allResults = [...allResults, ...results];
    });
    set((state) => ({
      results: [
        ...state.results.filter((r) => r.type !== 'route_occlusion'),
        ...allResults,
      ],
    }));
  },
  
  runParagraphDetection: () => {
    const { routes } = get();
    const results = detectParagraphMismatch(routes);
    set((state) => ({
      results: [
        ...state.results.filter((r) => r.type !== 'paragraph_mismatch'),
        ...results,
      ],
    }));
  },
  
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setShowLabels: (show) => set({ showLabels: show }),
  setShowLightCones: (show) => set({ showLightCones: show }),
  setViewMode: (mode) => set({ viewMode: mode }),
  
  updateSmoke: (config) =>
    set((state) => ({
      smoke: { ...state.smoke, ...config },
    })),
  
  saveVersion: (description) => {
    const { stage, lights, routes, results, versions } = get();
    const currentSnapshot = createSnapshot(stage, lights, routes, results);
    
    let modifiedFields: string[] = [];
    if (versions.length > 0) {
      const lastVersion = versions[versions.length - 1];
      modifiedFields = compareSnapshots(lastVersion.currentState, currentSnapshot);
    } else {
      modifiedFields = ['stage', 'lights', 'routes', 'results'];
    }
    
    const previousSnapshot = versions.length > 0
      ? versions[versions.length - 1].currentState
      : currentSnapshot;
    
    const version = createVersionRecord(
      description,
      previousSnapshot,
      currentSnapshot,
      modifiedFields
    );
    
    set({ versions: [...versions, version] });
  },
  
  loadVersion: (versionId) => {
    const { versions } = get();
    const version = versions.find((v) => v.id === versionId);
    if (version) {
      set({
        stage: version.currentState.stage,
        lights: version.currentState.lights,
        routes: version.currentState.routes,
        results: version.currentState.results,
      });
    }
  },
  
  resetToSample: () =>
    set({
      stage: sampleStage,
      lights: sampleLights,
      routes: sampleRoutes,
      results: sampleResults,
    }),
  
  getLightsByIds: (ids) => get().lights.filter((l) => ids.includes(l.id)),
  getRoutesByIds: (ids) => get().routes.filter((r) => ids.includes(r.id)),
  getObstaclesByIds: (ids) => get().stage.obstacles.filter((o) => ids.includes(o.id)),
}));
