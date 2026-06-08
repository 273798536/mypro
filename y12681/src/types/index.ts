export type SandboxStatus = 'draft' | 'reviewing' | 'confirmed';

export type UnitType = 'degree' | 'radian';

export interface Screenshot {
  id: string;
  url: string;
  description: string;
  timestamp: string;
  judgment?: string;
}

export interface CameraView {
  x: number;
  y: number;
  z: number;
  zoom: number;
}

export interface Sandbox {
  id: string;
  name: string;
  status: SandboxStatus;
  inclination: number;
  unit: UnitType;
  cameraView: CameraView;
  screenshots: Screenshot[];
  modelOverlap?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryRecord {
  id: string;
  sandboxId: string;
  version: number;
  data: Sandbox;
  modifiedBy: string;
  changeReason: string;
  createdAt: string;
  fieldsChanged: string[];
}

export interface DiffField {
  path: string;
  oldValue: unknown;
  newValue: unknown;
}

export type DiffResult = DiffField[];
