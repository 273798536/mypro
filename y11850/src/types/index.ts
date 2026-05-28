export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type Orientation = 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW';

export type ReviewType = 'occlusion_miss' | 'floor_confusion' | 'data_inconsistency';

export type ReviewStatus = 'pending' | 'confirmed' | 'resolved';

export interface Building {
  id: string;
  name: string;
  height: number;
  floors: number;
  position: [number, number, number];
  dimensions: [number, number, number];
  color: string;
  apartments: Apartment[];
}

export interface Apartment {
  id: string;
  unitNumber: string;
  floor: number;
  orientation: Orientation;
  windowPositions: [number, number, number][];
}

export interface SunPosition {
  hour: number;
  altitude: number;
  azimuth: number;
}

export interface SunPath {
  timezone: string;
  latitude: number;
  longitude: number;
  spring: SunPosition[];
  summer: SunPosition[];
  autumn: SunPosition[];
  winter: SunPosition[];
}

export interface SetbackLine {
  id: string;
  points: [number, number, number][];
  type: 'boundary' | 'setback' | 'road';
}

export interface DataPackage {
  id: string;
  name: string;
  timezone: string;
  buildings: Building[];
  sunPath: SunPath;
  setbackLines: SetbackLine[];
}

export interface ShadowPeriod {
  start: number;
  end: number;
  reason: string;
  blockingBuildingId?: string;
}

export interface ShadowAnalysis {
  apartmentId: string;
  buildingId: string;
  season: Season;
  totalSunlightHours: number;
  shadowPeriods: ShadowPeriod[];
  issues: string[];
  needsReview: boolean;
}

export interface ValidationError {
  code: string;
  message: string;
  humanMessage: string;
  step: string;
  details: Record<string, unknown>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  humanMessage: string;
  details: Record<string, unknown>;
}

export interface ReviewItem {
  id: string;
  type: ReviewType;
  description: string;
  humanDescription: string;
  buildingId?: string;
  apartmentId?: string;
  status: ReviewStatus;
  reviewerNote?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  needsReview: ReviewItem[];
}

export interface SavedView {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  createdAt: number;
}

export interface AppState {
  currentSeason: Season;
  currentTime: number;
  selectedBuildingId: string | null;
  selectedFloor: number | null;
  dataPackage: DataPackage | null;
  validationResult: ValidationResult | null;
  analysisResults: ShadowAnalysis[];
  reviewMarks: ReviewItem[];
  savedViews: SavedView[];
  isPlaying: boolean;
  showSunPath: boolean;
  showShadows: boolean;
  showSetbackLines: boolean;
}

export interface AppActions {
  setSeason: (season: Season) => void;
  setTime: (time: number | ((prev: number) => number)) => void;
  setSelectedBuilding: (id: string | null) => void;
  setSelectedFloor: (floor: number | null) => void;
  setDataPackage: (pkg: DataPackage | null) => void;
  setValidationResult: (result: ValidationResult | null) => void;
  setAnalysisResults: (results: ShadowAnalysis[]) => void;
  addReviewMark: (mark: ReviewItem) => void;
  updateReviewMark: (id: string, updates: Partial<ReviewItem>) => void;
  saveView: (view: Omit<SavedView, 'id' | 'createdAt'>) => void;
  deleteView: (id: string) => void;
  togglePlaying: () => void;
  toggleSunPath: () => void;
  toggleShadows: () => void;
  toggleSetbackLines: () => void;
  validateData: () => void;
  runAnalysis: () => void;
  loadMockData: () => void;
}

export type AppStore = AppState & AppActions;
