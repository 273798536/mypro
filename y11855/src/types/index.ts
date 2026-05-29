export type CoordinateSystem = 'WGS84' | 'local' | 'unknown';

export type BuildingType = 'terminal' | 'hangar' | 'tower' | 'hotel' | 'office' | 'residential' | 'other';

export type BuildingStatus = 'existing' | 'planned' | 'proposed';

export type SurfaceType = 'approach' | 'takeoff' | 'transition' | 'inner' | 'conical' | 'horizontal';

export type IssueSeverity = 'error' | 'warning' | 'info';

export type IssueType = 'missing_field' | 'coordinate_error' | 'duplicate' | 'occlusion' | 'height_exceeded' | 'unknown';

export type ElementType = 'runway' | 'building' | 'surface' | 'scene';

export interface Runway {
  id: string;
  name: string;
  length: number;
  width: number;
  heading: number;
  coordinates: [number, number, number];
  coordinateSystem: CoordinateSystem;
}

export interface Building {
  id: string;
  name: string;
  type: BuildingType;
  height: number;
  position: [number, number, number];
  footprint: [number, number];
  status: BuildingStatus;
  floors?: number;
  address?: string;
}

export interface ClearanceSurface {
  id: string;
  type: SurfaceType;
  maxHeight: number;
  boundaryPoints: [number, number, number][];
  color: string;
  description?: string;
}

export interface SceneData {
  id: string;
  name: string;
  description: string;
  runway: Runway;
  buildings: Building[];
  surfaces: ClearanceSurface[];
  coordinateSystem?: CoordinateSystem;
}

export interface ValidationIssue {
  id: string;
  severity: IssueSeverity;
  type: IssueType;
  message: string;
  suggestion: string;
  elementId: string;
  elementType: ElementType;
}

export interface CollisionResult {
  buildingId: string;
  surfaceId: string;
  exceededHeight: number;
  distance: number;
}

export interface Filters {
  buildingTypes: BuildingType[];
  heightRange: [number, number];
  statusTypes: BuildingStatus[];
  issueTypes: IssueType[];
  searchQuery: string;
}

export interface VisibleLayers {
  buildings: boolean;
  surfaces: boolean;
  runway: boolean;
  grid: boolean;
}

export interface SelectedElement {
  type: 'building' | 'surface' | 'runway';
  id: string;
}

export interface AppState {
  currentScene: SceneData | null;
  validationIssues: ValidationIssue[];
  collisionResults: CollisionResult[];
  selectedElement: SelectedElement | null;
  filters: Filters;
  visibleLayers: VisibleLayers;
  comparisonScenes: SceneData[];
  isCollisionDetected: boolean;
  showValidationModal: boolean;
}

export interface AppActions {
  setCurrentScene: (scene: SceneData | null) => void;
  setValidationIssues: (issues: ValidationIssue[]) => void;
  setCollisionResults: (results: CollisionResult[]) => void;
  setSelectedElement: (element: SelectedElement | null) => void;
  setFilters: (filters: Partial<Filters>) => void;
  setVisibleLayers: (layers: Partial<VisibleLayers>) => void;
  setIsCollisionDetected: (value: boolean) => void;
  setShowValidationModal: (value: boolean) => void;
  addComparisonScene: (scene: SceneData) => void;
  removeComparisonScene: (sceneId: string) => void;
  loadScene: (scene: SceneData) => void;
  resetFilters: () => void;
  runCollisionDetection: () => void;
}

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  terminal: '航站楼',
  hangar: '机库',
  tower: '塔台',
  hotel: '酒店',
  office: '办公楼',
  residential: '住宅',
  other: '其他'
};

export const BUILDING_STATUS_LABELS: Record<BuildingStatus, string> = {
  existing: '已建成',
  planned: '规划中',
  proposed: '拟建'
};

export const SURFACE_TYPE_LABELS: Record<SurfaceType, string> = {
  approach: '进近面',
  takeoff: '起飞面',
  transition: '过渡面',
  inner: '内水平面',
  conical: '锥形面',
  horizontal: '外水平面'
};

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  missing_field: '字段缺失',
  coordinate_error: '坐标系错误',
  duplicate: '重复数据',
  occlusion: '遮挡问题',
  height_exceeded: '超高',
  unknown: '未知问题'
};

export const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  error: '#ef4444',
  warning: '#f97316',
  info: '#3b82f6'
};

export const BUILDING_TYPE_COLORS: Record<BuildingType, string> = {
  terminal: '#6366f1',
  hangar: '#8b5cf6',
  tower: '#ec4899',
  hotel: '#f59e0b',
  office: '#10b981',
  residential: '#06b6d4',
  other: '#6b7280'
};
