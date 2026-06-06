export type AnnotationType = "rectangle" | "circle" | "polygon" | "freehand";

export type OperationType =
  | "add"
  | "update"
  | "delete"
  | "flip"
  | "scale"
  | "import";

export type FlipType =
  | "horizontal"
  | "vertical"
  | "both"
  | "rotation_90"
  | "rotation_180"
  | "rotation_270"
  | null;

export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  coordinates: Point[];
  color: string;
  label: string;
  isSnapped: boolean;
  originalCoords: Point[];
  createdAt: string;
  opacity?: number;
}

export interface Operation {
  id: string;
  type: OperationType;
  beforeState: unknown;
  afterState: unknown;
  timestamp: string;
  description: string;
}

export interface GridConfig {
  enabled: boolean;
  size: number;
  color: string;
  snapThreshold: number;
}

export interface ScaleConfig {
  value: number;
  unit: string;
  referencePoints?: { start: Point; end: Point; realDistance: number } | null;
}

export interface TrajectoryRecord {
  id: string;
  name: string;
  imageUrl: string;
  imageName?: string;
  scale: ScaleConfig;
  isFlipped: boolean;
  flipType: FlipType;
  flipReason?: string;
  flipExplanation?: string;
  annotations: Annotation[];
  operations: Operation[];
  gridConfig: GridConfig;
  createdAt: string;
  updatedAt: string;
}

export type ToolMode =
  | "select"
  | "rectangle"
  | "circle"
  | "polygon"
  | "freehand"
  | "pan"
  | "zoom";

export interface FilterOptions {
  types: AnnotationType[];
  colors: string[];
  labels: string[];
}

export const ANNOTATION_COLORS = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
];

export const ANNOTATION_LABELS = [
  "结节",
  "肿块",
  "钙化",
  "囊肿",
  "出血",
  "水肿",
  "其他",
];
