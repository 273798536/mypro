export interface HullParams {
  id: string;
  source: "input" | "import" | "sample";
  name: string;
  length: number;
  beam: number;
  depth: number;
  draft: number;
  displacement: number;
  cgX: number;
  cgY: number;
  cgZ: number;
  cgModified: boolean;
  cgOriginal?: { x: number; y: number; z: number };
  density: number;
  densityUnit: "fresh" | "salt";
  remark: string;
}

export interface LoadItem {
  id: string;
  hullId: string;
  weight: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  name: string;
}

export interface InclinationRecord {
  id: string;
  hullId: string;
  rollAngle: number;
  pitchAngle: number;
  measuredAt: string;
  source: "sensor" | "manual" | "calculated";
}

export type AnomalyType =
  | "load_eccentricity"
  | "density_misuse"
  | "inclination_exceedance";

export interface AnomalyDetail {
  type: AnomalyType;
  label: string;
  description: string;
  severity: "warning" | "critical";
  relatedParam: string;
  threshold: number;
  actual: number;
}

export interface VerificationResult {
  id: string;
  hullId: string;
  hullName: string;
  status: "pass" | "anomaly" | "uncalculable";
  gm: number | null;
  rollAngle: number | null;
  pitchAngle: number | null;
  trimAngle: number | null;
  anomalies: AnomalyDetail[];
  hullSource: string;
  inclinationSource: string;
  calculatedAt: string;
}

export interface CgModificationImpact {
  hullId: string;
  hullName: string;
  originalCg: { x: number; y: number; z: number };
  modifiedCg: { x: number; y: number; z: number };
  deltaCg: { x: number; y: number; z: number };
  originalGm: number | null;
  modifiedGm: number | null;
  deltaGm: number | null;
  impactDescription: string;
}

export type ExportFormat = "csv" | "json";

export interface ExportOptions {
  format: ExportFormat;
  includeNormal: boolean;
  includeAnomaly: boolean;
  includeComparison: boolean;
}
