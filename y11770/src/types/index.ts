export type RatingLevel = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' | 'CC' | 'C' | 'D';

export type IndustryType =
  | '制造业'
  | '金融业'
  | '房地产业'
  | '批发零售业'
  | '交通运输业'
  | '信息技术业'
  | '其他';

export type AnomalyType =
  | 'LOW_SAMPLE'
  | 'DUPLICATE_BALANCE'
  | 'INVALID_FILTER'
  | 'NEGATIVE_BALANCE'
  | 'INVALID_MIGRATION_COUNT'
  | 'MISSING_INDUSTRY';

export interface MigrationRecord {
  id: string;
  customerId: string;
  month: string;
  fromRating: RatingLevel;
  toRating: RatingLevel;
  migrationCount: number;
  balance: number;
  industry: IndustryType | '';
  riskReport: string;
  createdAt: string;
  dataSourceId: string;
  anomalies: AnomalyRecord[];
  revisions: RevisionLog[];
}

export interface AnomalyRecord {
  id: string;
  migrationId: string;
  type: AnomalyType;
  severity: 'warning' | 'error';
  description: string;
  isResolved: boolean;
}

export interface RevisionLog {
  id: string;
  migrationId: string;
  operator: string;
  action: 'create' | 'update' | 'delete' | 'deduplicate';
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
  reason: string;
}

export interface DataSource {
  id: string;
  name: string;
  description: string;
  importTime: string;
  recordCount: number;
}

export interface FilterConditions {
  industries: IndustryType[];
  balanceMin: number;
  balanceMax: number;
  migrationCountMin: number;
  migrationCountMax: number;
  ratings: RatingLevel[];
}

export interface MatrixCubeData {
  x: number;
  y: number;
  z: number;
  fromRating: RatingLevel;
  toRating: RatingLevel;
  month: string;
  count: number;
  totalBalance: number;
  avgBalance: number;
  records: MigrationRecord[];
  anomalies: AnomalyRecord[];
  isFiltered: boolean;
  isVisible: boolean;
}

export interface CameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

export interface AppState {
  records: MigrationRecord[];
  dataSources: DataSource[];
  filters: FilterConditions;
  selectedCube: MatrixCubeData | null;
  hoveredCube: MatrixCubeData | null;
  currentMonth: string;
  playbackSpeed: number;
  isPlaying: boolean;
  balanceWeightEnabled: boolean;
  showAnomalies: boolean;
  cameraState: CameraState;
  months: string[];
}
