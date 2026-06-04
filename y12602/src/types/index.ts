export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';

export type ActionType = 'mark_hit' | 'mark_anomaly' | 'update_route' | 'import_material';

export type AnomalyType = 'color_out_of_bounds' | 'route_deviation' | 'missing_marker';

export type MaterialStatus = 'pending' | 'hit' | 'anomaly' | 'skipped';

export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface ActionLog {
  id: string;
  type: ActionType;
  point?: Point;
  materialId?: string;
  anomalyType?: AnomalyType;
  description: string;
  timestamp: number;
  operator: string;
  tracePoints: Point[];
  opinion?: string;
}

export interface Material {
  id: string;
  name: string;
  hash: string;
  dataUrl: string;
  importedAt: number;
  status: MaterialStatus;
  relatedLogId?: string;
}

export interface AnomalyDetail {
  logId: string;
  type: AnomalyType;
  description: string;
  tracePoints: Point[];
  opinion: string;
  relatedLogs: string[];
}

export interface AuditReport {
  id: string;
  gameSessionId: string;
  startTime: number;
  endTime: number;
  totalMarks: number;
  hitCount: number;
  anomalyCount: number;
  actionLogs: ActionLog[];
  materials: Material[];
  plainTextSummary: string;
  anomalies: AnomalyDetail[];
}

export interface GameSession {
  id: string;
  startTime: number;
  pauseTime: number;
  totalPausedDuration: number;
}

export interface AppState {
  gameStatus: GameStatus;
  gameSessionId: string;
  currentRound: number;
  startTime: number | null;
  pauseTime: number;
  totalPausedDuration: number;
  routePoints: Point[];
  actionLogs: ActionLog[];
  redoStack: ActionLog[];
  materials: Material[];
  currentReport: AuditReport | null;
  selectedMaterialId: string | null;
  isReplaying: boolean;
  replayIndex: number;
  showReplayModal: boolean;
  showReportModal: boolean;
  showMaterialViewer: boolean;
  showAnomalyDetail: string | null;
}

export interface AppActions {
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  finishGame: () => void;
  addPoint: (point: Point) => void;
  markHit: (payload: { materialId: string; point: Point; description: string }) => void;
  markAnomaly: (payload: { materialId: string; point: Point; anomalyType: AnomalyType; description: string; opinion: string }) => void;
  undo: () => void;
  redo: () => void;
  importMaterials: (materials: Material[]) => void;
  selectMaterial: (id: string | null) => void;
  startReplay: () => void;
  stopReplay: () => void;
  setReplayIndex: (index: number) => void;
  clearReport: () => void;
  setShowReplayModal: (show: boolean) => void;
  setShowReportModal: (show: boolean) => void;
  setShowMaterialViewer: (show: boolean) => void;
  setShowAnomalyDetail: (logId: string | null) => void;
  updateMaterialStatus: (id: string, status: MaterialStatus, logId?: string) => void;
  removeMaterial: (id: string) => void;
  getElapsedTime: () => number;
  canUndo: boolean;
  canRedo: boolean;
}

export type AppStore = AppState & AppActions;

export const ANOMALY_EXPLANATIONS: Record<AnomalyType, string> = {
  color_out_of_bounds: '该区域颜色超出规定的安全色范围，可能导致标识不清晰',
  route_deviation: '实际逃生路线与预设路线存在偏差，需要核对路径是否正确',
  missing_marker: '该位置缺少必要的逃生指示标识，存在安全隐患',
};

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  mark_hit: '标记命中',
  mark_anomaly: '标记异常',
  update_route: '更新路线',
  import_material: '导入素材',
};

export const MATERIAL_STATUS_LABELS: Record<MaterialStatus, string> = {
  pending: '待审核',
  hit: '已命中',
  anomaly: '异常',
  skipped: '已跳过',
};

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  color_out_of_bounds: '颜色越界',
  route_deviation: '路线偏差',
  missing_marker: '标识缺失',
};
