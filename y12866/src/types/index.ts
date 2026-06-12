export type RiskLevel = 'high' | 'medium' | 'low' | 'pending';

export type SalinityUnit = 'PSU' | 'ppt' | 'permil' | 'percent' | 'unknown';

export type ExchangeMethod = 'flow-through' | 'dilution' | 'none';

export type DeclarationStatus = 'pending' | 'reviewing' | 'completed';

export type DataSourceId = 'risk-notice' | 'tide-table' | 'ship-track';

export type DataSourceStatus = 'online' | 'syncing' | 'offline';

export type BoundaryIssueType = 'salinity-unit-mix' | 'timezone-error' | 'other';

export type BoundarySeverity = 'critical' | 'warning';

export type WeatherGapStatus = 'missing' | 'filled' | 'not-needed';

export type ReviewNoteType = 'manual' | 'auto-risk-change' | 'auto-boundary-detect' | 'auto-weather-gap';

export type ViewPreset = 'overview' | 'risk-detail' | 'boundary-compare';

export interface BallastWaterRecord {
  id: string;
  tankId: string;
  volume: number;
  salinity: number;
  salinityUnit: SalinityUnit;
  exchangeMethod: ExchangeMethod;
  exchangeRate: number;
}

export interface RiskChangeRecord {
  id: string;
  timestamp: string;
  beforeLevel: RiskLevel;
  afterLevel: RiskLevel;
  changedBy: string;
  reason: string;
  affectedFields: string[];
}

export interface BoundaryIssue {
  id: string;
  type: BoundaryIssueType;
  severity: BoundarySeverity;
  description: string;
  originalValue: string;
  correctedValue: string;
  impactsResult: boolean;
  relatedRecordId?: string;
}

export interface WeatherGapItem {
  id: string;
  fieldName: string;
  displayName: string;
  requiredForCalculations: string[];
  alreadyCompleted: string[];
  status: WeatherGapStatus;
}

export interface DataSource {
  id: DataSourceId;
  name: string;
  sourcePath: string;
  lastSyncTime: string;
  status: DataSourceStatus;
  recordCount: number;
}

export interface ShipTrackPoint {
  id: string;
  lat: number;
  lng: number;
  timestamp: string;
  speed: number;
  note?: string;
}

export interface RiskNotice {
  id: string;
  title: string;
  source: string;
  date: string;
  level: RiskLevel;
  content: string;
}

export interface TideRecord {
  id: string;
  time: string;
  height: number;
  type: 'high' | 'low' | 'mid';
}

export interface ReviewNote {
  id: string;
  timestamp: string;
  author: string;
  content: string;
  type: ReviewNoteType;
  snapshot?: RiskLevelSnapshot;
}

export interface RiskLevelSnapshot {
  level: RiskLevel;
  salinityCompliant: boolean;
  exchangeRateCompliant: boolean;
  weatherCondition: string;
  tideMatch: boolean;
}

export interface Declaration {
  id: string;
  vesselName: string;
  vesselNo: string;
  arrivalTime: string;
  departureTime: string;
  applicant: string;
  applyTime: string;
  status: DeclarationStatus;
  ballastWater: BallastWaterRecord[];
  initialRiskLevel: RiskLevel;
  currentRiskLevel: RiskLevel;
  riskChangeHistory: RiskChangeRecord[];
  boundaryIssues: BoundaryIssue[];
  weatherGaps: WeatherGapItem[];
  sources: DataSource[];
  shipTrack: ShipTrackPoint[];
  riskNotices: RiskNotice[];
  tideRecords: TideRecord[];
  reviewNotes: ReviewNote[];
}

export interface BoundaryCase {
  id: string;
  category: 'salinity' | 'timezone';
  title: string;
  description: string;
  originalData: string;
  correctedData: string;
  beforeResult: string;
  afterResult: string;
  impactsResult: boolean;
  severity: BoundarySeverity;
  realWorldNote: string;
}
