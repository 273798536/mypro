export type Availability = "AVAILABLE" | "PENDING" | "RECOLLECT";
export type EntityStatus = "DRAFT" | "PENDING_CONFIRM" | "APPROVED" | "REJECTED";
export type Role = "DISPATCHER" | "SUPERVISOR" | "MARITIME_REVIEWER";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type EntityType = "PHOTO" | "RISK_ALERT" | "CONCLUSION" | "TRAJECTORY";
export type CalcStatus = "SUCCESS" | "FAILED";
export type ReviewStage = "DISPATCHER" | "SUPERVISOR" | "MARITIME";

export interface User {
  id: string;
  name: string;
  role: Role;
  employeeNo: string;
}

export interface Photo {
  id: string;
  inspectionId: string;
  url: string;
  caption: string;
  exifGps?: { lat: number; lng: number };
  capturedAt: string;
  revision: number;
  previousUrl?: string;
}

export interface RiskAlert {
  id: string;
  inspectionId: string;
  type: string;
  description: string;
  level: RiskLevel;
  needsReview: boolean;
  lastSyncedAt: string;
}

export interface Conclusion {
  id: string;
  inspectionId: string;
  summary: string;
  recommendation: string;
  needsReview: boolean;
  sourceMaterialIds: string[];
  dataStatus: {
    photos: Availability;
    trajectory: Availability;
    waterQuality: Availability;
  };
}

export interface TrajectoryPoint {
  id: string;
  inspectionId: string;
  lat: number;
  lng: number;
  timestamp: string;
  speedKnots: number;
}

export interface DriftCalculation {
  id: string;
  inspectionId: string;
  driftDistanceMeters?: number;
  driftDistanceNautical?: number;
  driftRatePercent?: number;
  formulaUsed: string;
  missingInputs: string[];
  failureHint?: string;
  failureSteps?: { title: string; detail: string; action: string }[];
  status: CalcStatus;
  calculationSteps?: { label: string; value: string; unit: string }[];
}

export interface Revision {
  id: string;
  entityType: EntityType;
  entityId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason: string;
  performedBy: string;
  performedByName: string;
  performedAt: string;
  approvalStatus: EntityStatus;
  snapshotId?: string;
}

export interface ReviewNote {
  id: string;
  inspectionId: string;
  stage: ReviewStage;
  reviewerName: string;
  note: string;
  timestamp: string;
  approved: boolean;
}

export interface WaterQualitySample {
  id: string;
  inspectionId: string;
  ph: number;
  dissolvedOxygen: number;
  turbidityNtu: number;
  temperatureC: number;
  sampledAt: string;
}

export interface MeteoReport {
  id: string;
  reportDate: string;
  reportTime: string;
  windSpeedMs: number;
  windDirectionDeg: number;
  waveHeightM: number;
  source: string;
}

export interface PlannedWaypoint {
  lat: number;
  lng: number;
  name: string;
}

export interface CleaningPipelineResult {
  step: string;
  stepLabel: string;
  inputCount: number;
  outputCount: number;
  removedCount: number;
  description: string;
}

export interface Inspection {
  id: string;
  code: string;
  date: string;
  ranchName: string;
  status: EntityStatus;
  availability: Availability;
  dispatcherId: string;
  dispatcherName: string;
  photos: Photo[];
  riskAlerts: RiskAlert[];
  conclusion?: Conclusion;
  trajectory: TrajectoryPoint[];
  plannedRoute?: PlannedWaypoint[];
  driftCalculation?: DriftCalculation;
  revisions: Revision[];
  reviewNotes: ReviewNote[];
  waterQualitySamples?: WaterQualitySample[];
  meteoReports?: MeteoReport[];
  recollectReason?: string;
}

export interface LinkageDelta {
  inspectionId: string;
  modifiedEntityType: EntityType;
  modifiedEntityId: string;
  affectedAlerts: string[];
  affectedConclusion: boolean;
}

export type ViewRole = "DISPATCHER" | "MARITIME";
