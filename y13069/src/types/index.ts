export type SourceType = 'official' | 'verbal' | 'old_withdrawn';
export type AnomalyType = 'screenshot_missing' | 'withdrawn' | 'conflict' | 'old_version';
export type PointStatus = 'approved' | 'pending' | 'rejected' | 'withdrawn' | 'conflict';
export type VersionScope = 'current' | 'includeOld' | 'onlyWithdrawn';

export interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export interface SchemeVersion {
  id: string;
  projectId: string;
  versionNo: number;
  label: string;
  timestamp: string;
  isActive: boolean;
  isWithdrawn: boolean;
  description: string;
}

export interface DataSource {
  id: string;
  pointId: string;
  sourceType: SourceType;
  content: string;
  impactWeight: number;
  createdAt: string;
  operator: string;
}

export interface Note {
  id: string;
  pointId: string;
  content: string;
  isVerbal: boolean;
  author: string;
  createdAt: string;
}

export interface AnomalyRecord {
  id: string;
  versionId: string;
  pointId?: string;
  anomalyType: AnomalyType;
  description: string;
  status: 'open' | 'processing' | 'closed';
  markedAsNormal: false;
  createdAt: string;
}

export interface RigPoint {
  id: string;
  versionId: string;
  rigNo: string;
  zone: string;
  x_coord: number;
  y_coord: number;
  z_coord: number;
  status: PointStatus;
  isOldVersion: boolean;
  dataSources: DataSource[];
  notes: Note[];
}

export interface AppFilters {
  rigNos: string[];
  zones: string[];
  statuses: PointStatus[];
  versionScope: VersionScope;
  keyword: string;
}

export interface AppViewState {
  activeVersionId: string | null;
  selectedPointIds: string[];
  cameraPosition: [number, number, number];
  expandedNoteIds: string[];
  showTraceModalFor: string | null;
}

export interface AppState {
  project: Project;
  versions: SchemeVersion[];
  pointsByVersionId: Record<string, RigPoint[]>;
  anomalies: AnomalyRecord[];
  filters: AppFilters;
  viewState: AppViewState;
  notesByPointId: Record<string, Note[]>;
  setFilters: (f: Partial<AppFilters>) => void;
  setViewState: (v: Partial<AppViewState>) => void;
  addNote: (pointId: string, note: Omit<Note, 'id' | 'createdAt'>) => void;
  togglePointSelect: (pointId: string) => void;
  expandNote: (noteId: string) => void;
  showTrace: (pointId: string | null) => void;
  resetAll: () => void;
  switchVersion: (versionId: string) => void;
  getFilteredPoints: () => RigPoint[];
  getActiveVersion: () => SchemeVersion | null;
  getAnomaliesForActiveVersion: () => AnomalyRecord[];
  getAnomaliesForVersionId: (versionId: string) => AnomalyRecord[];
  getPointById: (pointId: string) => RigPoint | null;
}
