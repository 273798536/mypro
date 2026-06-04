export type SampleStatus = 'success' | 'pending' | 'bad';
export type DetectionResultType = 'pass' | 'warning' | 'fail';
export type DetectionType = 'color-boundary' | 'collision' | 'success';
export type DeviceStatus = 'active' | 'inactive' | 'maintenance';
export type ToolType = 'polygon' | 'circle' | 'none';

export interface Point {
  x: number;
  y: number;
}

export interface BaseCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Sample {
  id: string;
  name: string;
  status: SampleStatus;
  imageUrl: string;
  baseCoordinates: BaseCoordinates;
  manualNote?: string;
  createdAt: Date;
}

export interface Selection {
  id: string;
  sampleId: string;
  points: Point[];
  color: string;
  isOutOfBounds: boolean;
  isColliding: boolean;
  detectionResult: DetectionResultType;
}

export interface DetectionResult {
  id: string;
  type: DetectionType;
  passed: boolean;
  description: string;
  explanation: string;
}

export interface Device {
  id: string;
  name: string;
  model: string;
  status: DeviceStatus;
  passRate: number;
  detections: DetectionResult[];
}

export interface Report {
  id: string;
  sampleId: string;
  selections: Selection[];
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failed: number;
  };
  mandarinExplanation: string;
  generatedAt: Date;
}

export interface CanvasState {
  zoom: number;
  pan: Point;
  imageLoaded: boolean;
  imageSize: { width: number; height: number };
}

export interface ExplanationTemplate {
  type: DetectionType;
  title: string;
  template: string;
}
