export type CommandType =
  | 'device_drag'
  | 'device_import'
  | 'annotation_add'
  | 'annotation_edit'
  | 'annotation_delete'
  | 'layer_toggle'
  | 'filter_apply'
  | 'coordinate_correction'
  | 'device_delete';

export type DeviceType = 'crane' | 'scaffold' | 'fire_extinguisher' | 'electrical';

export type RiskLevel = 'safe' | 'warning' | 'danger';

export type FlipType = 'lat_lng_swapped' | 'out_of_range' | 'wrong_coordinate_system';

export type AnnotationType = 'rectangle' | 'text' | 'arrow' | 'comment';

export interface CoordinateFlipInfo {
  type: FlipType;
  originalX: number;
  originalY: number;
  correctedX: number;
  correctedY: number;
  reason: string;
  userConfirmed: boolean;
}

export interface Annotation {
  id: string;
  deviceId: string;
  type: AnnotationType;
  content: string;
  riskLevel: RiskLevel;
  opinion: string;
  timestamp: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  x: number;
  y: number;
  layerId: string;
  riskLevel: RiskLevel;
  coordinateFlip?: CoordinateFlipInfo;
  annotations: Annotation[];
}

export interface Command<T = unknown> {
  id: string;
  type: CommandType;
  timestamp: number;
  operator: string;
  description: string;
  payload: T;
  previousState?: T;
  screenshotId?: string;
}

export interface BatchRecord {
  id: string;
  runId: string;
  commands: Command[];
  currentIndex: number;
  createdAt: number;
  operator: string;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  zIndex: number;
  filter?: FilterCondition;
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
  value: string | number;
}

export interface CanvasState {
  scale: number;
  offsetX: number;
  offsetY: number;
  selectedDeviceId: string | null;
  selectedAnnotationId: string | null;
}

export interface ReportData {
  summary: {
    totalDevices: number;
    safeCount: number;
    warningCount: number;
    dangerCount: number;
    coordinateIssues: number;
  };
  devices: Device[];
  anomalies: Device[];
  auditTrail: Command[];
  generatedAt: number;
  runId: string;
}

export interface AuditEntry {
  command: Command;
  device?: Device;
  annotation?: Annotation;
  screenshot?: string;
}

export interface CoordinateCheckResult {
  hasFlip: boolean;
  flipType?: FlipType;
  reason: string;
  correctedX: number;
  correctedY: number;
}

export type ExportFormat = 'pdf' | 'csv' | 'json';

export interface Screenshot {
  id: string;
  commandId: string;
  dataUrl: string;
  timestamp: number;
}
