export type BerthStatus = 'available' | 'occupied' | 'maintenance';

export type OperationType = 'move' | 'resize' | 'pan' | 'zoom' | 'annotate' | 'create' | 'delete' | 'status_change';

export type AnnotationType = 'rect' | 'arrow' | 'text' | 'circle';

export type ToolType = 'select' | 'pan' | 'annotate' | 'filter';

export type MaterialType = 'screenshot' | 'draft' | 'opinion';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Berth {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: BerthStatus;
  shipName?: string;
  eta?: string;
  etd?: string;
  cargoType?: string;
  materialIds: string[];
  remark?: string;
  hasError?: boolean;
  errorType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  author: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  isSupplementary?: boolean;
}

export interface Material {
  id: string;
  title: string;
  type: MaterialType;
  imageUrl: string;
  annotations: Annotation[];
  comments: Comment[];
  tags: string[];
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Operation {
  id: string;
  type: OperationType;
  timestamp: string;
  operator: string;
  description: string;
  beforeState: any;
  afterState: any;
  materialId?: string;
  berthId?: string;
  isError?: boolean;
  errorType?: string;
  errorReason?: string;
  comment?: string;
  isSupplementary?: boolean;
  isConfirmed?: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
}

export interface ErrorRecord {
  id: string;
  operationId: string;
  errorType: string;
  errorPosition: Point;
  errorReason: string;
  materialId: string;
  suggestion: string;
  createdAt: string;
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  selectedId: string | null;
  tool: ToolType;
  scale: number;
  scaleUnit: string;
  isCoordinateFlipped: boolean;
}

export interface FilterState {
  status?: BerthStatus;
  keyword?: string;
  hasError?: boolean;
  dateRange?: { start: string; end: string };
}
