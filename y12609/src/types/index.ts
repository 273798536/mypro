export interface Point {
  x: number;
  y: number;
}

export interface WarehouseShelf {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  pickFrequency: number;
}

export interface HotzoneAnnotation {
  id: string;
  sampleId: string;
  points: Point[];
  color: string;
  level: number;
  createdAt: number;
  updatedAt: number;
  manualNote?: string;
  isDuplicate: boolean;
  duplicateWith?: string[];
  blockReason?: string;
  isValid: boolean;
}

export interface ColorRule {
  id: string;
  level: number;
  color: string;
  label: string;
  minFrequency: number;
  maxFrequency: number;
  createdAt: number;
}

export interface ReproducibleSample {
  id: string;
  name: string;
  warehouseLayout: WarehouseShelf[];
  expectedAnnotations: HotzoneAnnotation[];
  manualNotes: string[];
  createdAt: number;
  isDraft: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

export interface HistoryNode {
  id: string;
  timestamp: number;
  type: 'add' | 'delete' | 'modify' | 'rule_change';
  before: HotzoneAnnotation[];
  after: HotzoneAnnotation[];
  description: string;
}

export interface ValidationResult {
  annotationId: string;
  type: 'duplicate' | 'invalid_color' | 'out_of_bounds' | 'missing_level';
  severity: 'error' | 'warning';
  message: string;
  blocked: boolean;
}

export interface ExportReport {
  generatedAt: number;
  sampleId: string;
  sampleName: string;
  validAnnotations: HotzoneAnnotation[];
  invalidAnnotations: HotzoneAnnotation[];
  blockReasons: Record<string, string[]>;
  consistencyCheck: boolean;
  manualNotes: string[];
  colorRules: ColorRule[];
}

export type ToolMode = 'select' | 'draw' | 'pan' | 'delete';

export interface CanvasState {
  zoom: number;
  pan: Point;
  isDrawing: boolean;
  currentPoints: Point[];
}
