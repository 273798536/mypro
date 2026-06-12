export interface ReportSummary {
  totalSectionCount: number;
  totalPointCount: number;
  anomalyCount: Record<AnomalySeverity, number>;
  avgDepth: number;
  minDepth: number;
  maxDepth: number;
  negativeDepthCount: number;
  siltationTotal: number;
}

export interface ChannelReport {
  reportId: string;
  reportName: string;
  reportDate: string;
  version: string;
  channelName: string;
  startMileage: number;
  endMileage: number;
  datumPlane: string;
  sections: Section[];
  summary: ReportSummary;
}

export interface Section {
  sectionId: string;
  sectionName: string;
  mileage: number;
  width: number;
  surveyLines: SurveyLine[];
  siltationVolume: number;
}

export interface SurveyLine {
  lineId: string;
  lineName: string;
  direction: 'longitudinal' | 'transverse';
  points: MeasurePoint[];
}

export interface MeasurePoint {
  pointId: string;
  mileage: number;
  offset: number;
  rawDepth: number;
  correctedDepth: number;
  tideCorrection: number;
  datumCorrection: number;
  gpsX: number;
  gpsY: number;
  measureTime: string;
  tideVersionId: string;
  waterQualityId?: string;
  aquacultureId?: string;
  photoIds: string[];
  isAnomaly: boolean;
  anomalyType?: AnomalyType;
  flags: string[];
}

export interface WaterQualityRecord {
  waterQualityId: string;
  sampleTime: string;
  stationId: string;
  turbidity: number;
  salinity: number;
  ph: number;
  do: number;
  source: 'sensor' | 'manual';
}

export interface AquacultureLog {
  aquacultureId: string;
  cageId: string;
  recordTime: string;
  feedingAmount: number;
  waterExchangeRate: number;
  oxygenLevel: number;
  remarks: string;
}

export interface TideVersion {
  tideVersionId: string;
  publishTime: string;
  effectiveTime: string;
  status: 'synchronized' | 'delayed' | 'missing';
  delayHours: number;
  records: TideRecord[];
}

export interface TideRecord {
  time: string;
  height: number;
  type: 'high' | 'low' | 'rising' | 'falling';
}

export interface ConclusionImpact {
  impactId: string;
  relatedAnomalyId?: string;
  conclusionId: string;
  conclusionDesc: string;
  originalValue: string;
  originalBasis: string;
  tempValue: string;
  tempBasis: string;
  impactLevel: 'critical' | 'major' | 'minor';
  recoverCondition: string;
  estRecoverTime?: string;
  tideVersionId: string;
}

export type RuleType = 'outlier' | 'movingAvg' | 'kalman' | 'manualReview';

export interface CleanRule {
  ruleId: string;
  type: RuleType;
  name: string;
  enabled: boolean;
  params: Record<string, number>;
}

export interface CleanRuleChain {
  chainId: string;
  rules: CleanRule[];
  appliedAt: string;
}

export interface TrajectorySnapshot {
  snapshotId: string;
  timestamp: string;
  chainId: string;
  trigger: 'initial' | 'photoAdded' | 'ruleChanged' | 'manual';
  triggerPhotoIds?: string[];
  pointsBefore: MeasurePoint[];
  pointsAfter: MeasurePoint[];
  diffCount: number;
}

export interface InspectionPhoto {
  photoId: string;
  uploadedAt: string;
  gpsX: number;
  gpsY: number;
  photoTime: string;
  relatedPointId?: string;
  caption: string;
  dataUrl: string;
}

export type AnomalyType =
  | 'negative_depth'
  | 'water_quality_mismatch'
  | 'trajectory_drift'
  | 'tide_delayed'
  | 'log_gap'
  | 'other';

export type AnomalySeverity = 'red' | 'orange' | 'yellow' | 'blue';
export type DisposalDirection = 'supplement_material' | 'adjust_caliber';
export type AnomalyStatus = 'pending' | 'processing' | 'reviewing' | 'closed';

export interface DisposalStep {
  stepId: string;
  stepNumber: number;
  direction: DisposalDirection;
  instruction: string;
  required: boolean;
  completed: boolean;
  completedAt?: string;
  meta?: Record<string, unknown>;
}

export interface Anomaly {
  anomalyId: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  title: string;
  description: string;
  relatedPointIds: string[];
  relatedSectionIds: string[];
  status: AnomalyStatus;
  disposalDirection: DisposalDirection;
  disposalSteps: DisposalStep[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  logId: string;
  timestamp: string;
  operator: string;
  action: string;
  target: string;
  details: string;
}

export interface ExplainStep {
  title: string;
  description: string;
  formula?: string;
}

export interface ExampleCase {
  rawDepth: number;
  tideCorrection: number;
  datumCorrection: number;
  sigma: number;
  correctedDepth: number;
  interceptReason: string;
}

export type ClippingOrientation = 'x' | 'y' | 'z';

export interface ClippingState {
  orientation: ClippingOrientation;
  value: number;
  enabled: boolean;
}

export interface SceneSelection {
  selectedSectionIds: string[];
  selectedLineIds: string[];
  selectedPointId: string | null;
}
