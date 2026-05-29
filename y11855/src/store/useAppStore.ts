import { create } from 'zustand';
import type {
  AppState,
  AppActions,
  SceneData,
  ValidationIssue,
  CollisionResult,
  SelectedElement,
  Filters,
  VisibleLayers,
  BuildingType,
  BuildingStatus,
  IssueType
} from '../types';
import { validateScene } from '../utils/validation';
import { checkAllCollisions } from '../utils/geometry';

const initialFilters: Filters = {
  buildingTypes: [],
  heightRange: [0, 200],
  statusTypes: [],
  issueTypes: [],
  searchQuery: ''
};

const initialVisibleLayers: VisibleLayers = {
  buildings: true,
  surfaces: true,
  runway: true,
  grid: true
};

interface Store extends AppState, AppActions {}

export const useAppStore = create<Store>((set, get) => ({
  currentScene: null,
  validationIssues: [],
  collisionResults: [],
  selectedElement: null,
  filters: initialFilters,
  visibleLayers: initialVisibleLayers,
  comparisonScenes: [],
  isCollisionDetected: false,
  showValidationModal: false,

  setCurrentScene: (scene: SceneData | null) =>
    set({ currentScene: scene }),

  setValidationIssues: (issues: ValidationIssue[]) =>
    set({ validationIssues: issues }),

  setCollisionResults: (results: CollisionResult[]) =>
    set({ collisionResults: results }),

  setSelectedElement: (element: SelectedElement | null) =>
    set({ selectedElement: element }),

  setFilters: (filters: Partial<Filters>) =>
    set((state) => ({
      filters: { ...state.filters, ...filters }
    })),

  setVisibleLayers: (layers: Partial<VisibleLayers>) =>
    set((state) => ({
      visibleLayers: { ...state.visibleLayers, ...layers }
    })),

  setIsCollisionDetected: (value: boolean) =>
    set({ isCollisionDetected: value }),

  setShowValidationModal: (value: boolean) =>
    set({ showValidationModal: value }),

  addComparisonScene: (scene: SceneData) =>
    set((state) => ({
      comparisonScenes: [...state.comparisonScenes, scene]
    })),

  removeComparisonScene: (sceneId: string) =>
    set((state) => ({
      comparisonScenes: state.comparisonScenes.filter(s => s.id !== sceneId)
    })),

  loadScene: (scene: SceneData) => {
    const issues = validateScene(scene);
    const hasErrors = issues.some(i => i.severity === 'error');
    
    set({
      currentScene: scene,
      validationIssues: issues,
      collisionResults: [],
      isCollisionDetected: false,
      selectedElement: null,
      showValidationModal: issues.length > 0
    });

    if (hasErrors) {
      console.warn('Scene loaded with validation errors:', issues);
    }
  },

  resetFilters: () =>
    set({ filters: initialFilters }),

  runCollisionDetection: () => {
    const { currentScene } = get();
    if (!currentScene) {
      set({ collisionResults: [], isCollisionDetected: false });
      return;
    }

    const results = checkAllCollisions(currentScene.buildings, currentScene.surfaces);
    set({
      collisionResults: results,
      isCollisionDetected: true
    });
  }
}));

export const useFilteredBuildings = () => {
  const { currentScene, filters, validationIssues, collisionResults } = useAppStore();
  
  if (!currentScene) return [];
  
  const { buildingTypes, heightRange, statusTypes, issueTypes, searchQuery } = filters;
  
  return currentScene.buildings.filter(building => {
    if (buildingTypes.length > 0 && !buildingTypes.includes(building.type as BuildingType)) {
      return false;
    }
    
    if (statusTypes.length > 0 && !statusTypes.includes(building.status as BuildingStatus)) {
      return false;
    }
    
    if (building.height < heightRange[0] || building.height > heightRange[1]) {
      return false;
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nameMatch = building.name?.toLowerCase().includes(query);
      const idMatch = building.id.toLowerCase().includes(query);
      if (!nameMatch && !idMatch) return false;
    }
    
    if (issueTypes.length > 0) {
      const buildingIssues = validationIssues.filter(i => 
        i.elementId === building.id && i.elementType === 'building'
      );
      const buildingCollisions = collisionResults.filter(c => c.buildingId === building.id);
      
      const hasMatchingIssue = buildingIssues.some(i => 
        issueTypes.includes(i.type as IssueType)
      );
      const hasHeightExceeded = buildingCollisions.length > 0 && issueTypes.includes('height_exceeded');
      
      if (!hasMatchingIssue && !hasHeightExceeded) return false;
    }
    
    return true;
  });
};

export const useBuildingIssues = (buildingId: string) => {
  const validationIssues = useAppStore(state => state.validationIssues);
  return validationIssues.filter(i => i.elementId === buildingId && i.elementType === 'building');
};

export const useBuildingCollisions = (buildingId: string) => {
  const collisionResults = useAppStore(state => state.collisionResults);
  return collisionResults.filter(c => c.buildingId === buildingId);
};

export const useSceneMaxHeight = () => {
  const currentScene = useAppStore(state => state.currentScene);
  if (!currentScene) return 200;
  
  const maxBuildingHeight = Math.max(...currentScene.buildings.map(b => b.height), 0);
  const maxSurfaceHeight = Math.max(...currentScene.surfaces.map(s => s.maxHeight), 0);
  
  return Math.max(maxBuildingHeight, maxSurfaceHeight, 100);
};
