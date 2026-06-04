export type RecordStatus = 'valid' | 'pending' | 'invalid';

export type ElementType = 'car' | 'road' | 'arrow' | 'marker' | 'text' | 'shape' | 'line';

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  text?: string;
  fontSize?: number;
  name?: string;
  sourceMaterial?: string;
  isColorOutOfBounds?: boolean;
}

export interface Annotation {
  id: string;
  elementId: string;
  content: string;
  timestamp: string;
  author: string;
}

export interface AccidentRecord {
  id: string;
  title: string;
  status: RecordStatus;
  description: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  elements: CanvasElement[];
  annotations: Annotation[];
  scale: number;
  positionX: number;
  positionY: number;
  issues: string[];
}

export interface CanvasState {
  scale: number;
  positionX: number;
  positionY: number;
  selectedElementId: string | null;
  elements: CanvasElement[];
}

export interface HistoryState {
  past: CanvasState[];
  present: CanvasState;
  future: CanvasState[];
}

export const ELEMENT_PRESETS: Record<ElementType, Partial<CanvasElement>> = {
  car: { width: 60, height: 30, color: '#3b82f6', strokeColor: '#1d4ed8', strokeWidth: 2 },
  road: { width: 200, height: 40, color: '#6b7280', strokeColor: '#374151', strokeWidth: 2 },
  arrow: { width: 50, height: 30, color: '#ef4444', strokeColor: '#b91c1c', strokeWidth: 2 },
  marker: { width: 20, height: 20, color: '#f59e0b', strokeColor: '#d97706', strokeWidth: 2 },
  text: { width: 100, height: 30, color: '#1f2937', strokeColor: '#1f2937', strokeWidth: 1, fontSize: 14 },
  shape: { width: 50, height: 50, color: '#8b5cf6', strokeColor: '#6d28d9', strokeWidth: 2 },
  line: { width: 100, height: 4, color: '#1f2937', strokeColor: '#1f2937', strokeWidth: 2 },
};

export const STATUS_LABELS: Record<RecordStatus, string> = {
  valid: '顺利记录',
  pending: '待确认',
  invalid: '坏数据',
};

export const STATUS_COLORS: Record<RecordStatus, string> = {
  valid: 'bg-green-500',
  pending: 'bg-yellow-500',
  invalid: 'bg-red-500',
};

export const STATUS_TEXT_COLORS: Record<RecordStatus, string> = {
  valid: 'text-green-600',
  pending: 'text-yellow-600',
  invalid: 'text-red-600',
};
