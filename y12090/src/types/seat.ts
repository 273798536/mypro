export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Seat {
  id: string;
  row: string;
  number: number;
  section: string;
  position: Point3D;
  eyeHeight: number;
  targetPoint: Point3D;
  originalLineNumber?: number;
  rawData?: string;
  isBadRow?: boolean;
  badRowReason?: string;
}

export interface BadRow {
  id: string;
  lineNumber: number;
  rawContent: string;
  reason: string;
}

export interface CommentRow {
  lineNumber: number;
  content: string;
}

export interface ParsedData {
  seats: Seat[];
  badRows: BadRow[];
  comments: CommentRow[];
  subtitleScreen?: SubtitleScreenConfig;
  auditoriumBounds?: AuditoriumBounds;
}

export interface SubtitleScreenConfig {
  position: Point3D;
  width: number;
  height: number;
  rotation: Point3D;
  validHeightRange: { min: number; max: number };
}

export interface AuditoriumBounds {
  min: Point3D;
  max: Point3D;
}
