export type ObjectType = 'stage' | 'musician' | 'equipment' | 'cable' | 'route';

export type ConflictType = 'cable_cross' | 'equipment_block' | 'route_conflict';

export type DataSource = 'main_model' | 'musician_report' | 'equipment_box';

export type Severity = 'critical' | 'warning' | 'info';

export type MusicianRole = '主唱' | '吉他手' | '贝斯手' | '鼓手' | '键盘手';

export type EquipmentType = '音箱' | '效果器' | '功放' | '混音台';

export type CableType = '音频线' | '电源线' | '网线';

export type TabType = 'conflicts' | 'routes' | 'screenshots';

export interface StageObject {
  id: string;
  name: string;
  type: ObjectType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
}

export interface PositionReport {
  id: string;
  source: DataSource;
  timestamp: number;
  position: [number, number, number];
  confidence: number;
}

export interface Musician extends StageObject {
  type: 'musician';
  instrument: string;
  role: MusicianRole;
  positionReports: PositionReport[];
}

export interface EquipmentBox extends StageObject {
  type: 'equipment';
  equipmentType: EquipmentType;
  model: string;
  cableConnections: string[];
}

export interface Cable extends StageObject {
  type: 'cable';
  cableType: CableType;
  fromId: string;
  toId: string;
  pathPoints: [number, number, number][];
}

export interface Route extends StageObject {
  type: 'route';
  musicianId: string;
  waypoints: [number, number, number][];
  timestamps: number[];
}

export interface TraceRecord {
  id: string;
  timestamp: number;
  source: DataSource;
  action: string;
  note: string;
  user: string;
}

export interface Screenshot {
  id: string;
  timestamp: number;
  dataUrl: string;
  conflictId?: string;
  description: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  objectIds: string[];
}

export interface Conflict {
  id: string;
  type: ConflictType;
  severity: Severity;
  timestamp: number;
  objectIds: string[];
  description: string;
  humanReadableDesc: string;
  traceRecords: TraceRecord[];
  screenshotIds: string[];
  resolved: boolean;
}

export interface AppState {
  currentTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  selectedObjectId: string | null;
  filters: {
    conflictTypes: ConflictType[];
    objectTypes: ObjectType[];
    timeRange: [number, number];
  };
  showDetailPanel: boolean;
  activeTab: TabType;
  screenshots: Screenshot[];
  showReportModal: boolean;
  totalDuration: number;
}

export interface AppActions {
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setSelectedObjectId: (id: string | null) => void;
  setShowDetailPanel: (show: boolean) => void;
  setActiveTab: (tab: TabType) => void;
  toggleConflictFilter: (type: ConflictType) => void;
  toggleObjectTypeFilter: (type: ObjectType) => void;
  setTimeRange: (range: [number, number]) => void;
  addScreenshot: (screenshot: Screenshot) => void;
  removeScreenshot: (id: string) => void;
  setShowReportModal: (show: boolean) => void;
  resolveConflict: (id: string) => void;
  addTraceRecord: (conflictId: string, record: TraceRecord) => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
}

export type AppStore = AppState & AppActions;
