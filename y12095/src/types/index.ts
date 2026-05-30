export type ConflictType = 'cable_crossing' | 'equipment_blocking' | 'movement_collision';

export type Severity = 'warning' | 'error' | 'critical';

export interface Musician {
  id: string;
  name: string;
  instrument: string;
  x: number;
  z: number;
  rotation: number;
  color: string;
  radius: number;
}

export interface Cable {
  id: string;
  fromId: string;
  toId: string;
  points: [number, number, number][];
  color: string;
  thickness: number;
}

export interface Stage {
  width: number;
  depth: number;
  height: number;
  musicians: Musician[];
  cables: Cable[];
}

export interface Conflict {
  id: string;
  type: ConflictType;
  description: string;
  position: [number, number, number];
  severity: Severity;
  involvedIds: string[];
}

export interface SceneVersion {
  id: string;
  name: string;
  timestamp: number;
  stage: Stage;
  conflicts: Conflict[];
}

export type ViewMode = 'single' | 'compare';

export type ViewPreset = 'perspective' | 'top' | 'front' | 'side';

export interface AppState {
  currentVersion: SceneVersion | null;
  compareVersion: SceneVersion | null;
  viewMode: ViewMode;
  showCables: boolean;
  selectedMusician: string | null;
  highlightedConflict: string | null;
  viewPreset: ViewPreset;
}

export interface AppActions {
  setCurrentVersion: (version: SceneVersion | null) => void;
  setCompareVersion: (version: SceneVersion | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setShowCables: (show: boolean) => void;
  setSelectedMusician: (id: string | null) => void;
  setHighlightedConflict: (id: string | null) => void;
  setViewPreset: (preset: ViewPreset) => void;
  updateMusicianPosition: (id: string, x: number, z: number) => void;
  saveNewVersion: (name: string) => void;
  runConflictDetection: () => void;
}

export const CONFLICT_TYPE_LABELS: Record<ConflictType, string> = {
  cable_crossing: '线缆穿越',
  equipment_blocking: '设备遮挡',
  movement_collision: '走位冲突',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  warning: '警告',
  error: '错误',
  critical: '严重',
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  warning: '#f59e0b',
  error: '#ef4444',
  critical: '#dc2626',
};
