export type DataQualityIssue =
  | 'missing_sample'
  | 'clock_drift'
  | 'sensor_offline'
  | 'outlier'
  | 'value_out_of_range';

export type DiagnosisType =
  | 'sensor_fault'
  | 'cargo_anomaly'
  | 'data_quality_issue'
  | 'environment_change'
  | 'unknown';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export type ImportFileType = 'temperature' | 'cargo' | 'maintenance';

export interface DataBatch {
  batchId: string;
  name: string;
  importedAt: Date;
  importedBy: string;
  sourceFiles: SourceFile[];
  completeness: number;
  status: 'processing' | 'completed' | 'error';
}

export interface SourceFile {
  id: string;
  fileName: string;
  fileType: ImportFileType;
  uploadTime: Date;
  uploadedBy: string;
  recordCount: number;
}

export interface TemperatureReading {
  id: string;
  batchId: string;
  sensorId: string;
  timestamp: Date;
  temperature: number;
  isOriginal: boolean;
  qualityFlag: DataQualityIssue | null;
  correctedTimestamp?: Date;
  correctedValue?: number;
}

export interface CargoBatch {
  id: string;
  batchId: string;
  cargoId: string;
  productName: string;
  startTime: Date;
  endTime: Date;
  location: string;
  minTemp: number;
  maxTemp: number;
}

export interface MaintenanceNote {
  id: string;
  batchId: string;
  sensorId: string;
  eventTime: Date;
  eventType: string;
  description: string;
  operator: string;
}

export interface AnomalyEvent {
  id: string;
  batchId: string;
  readingId: string;
  sensorId: string;
  eventTime: Date;
  temperature: number;
  threshold: number;
  deviation: number;
  anomalyType: DataQualityIssue;
  severity: SeverityLevel;
  diagnosis?: DiagnosisType;
  confidence: number;
  relatedBatch?: string;
  relatedMaintenance?: string;
  notes?: string;
}

export interface DiagnosisResult {
  id: string;
  anomalyId: string;
  diagnosisType: DiagnosisType;
  description: string;
  confidence: number;
  evidenceChain: EvidenceItem[];
}

export interface EvidenceItem {
  type: 'maintenance' | 'sensor_reading' | 'cargo_batch' | 'statistical';
  description: string;
  timestamp?: Date;
  value?: number;
}

export interface ProcessingLog {
  id: string;
  batchId: string;
  action: string;
  timestamp: Date;
  operator: string;
  details: Record<string, unknown>;
}

export interface SensorInfo {
  sensorId: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'warning';
  lastReading?: Date;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: Date;
  speed: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export type GroupByType = 'sensor' | 'anomalyType' | 'timePeriod';
export type TimePeriod = 'all' | 'morning' | 'afternoon' | 'evening' | 'night';

export interface CompareConfig {
  groupBy: GroupByType;
  selectedGroups: string[];
  timePeriod: TimePeriod;
  timeRange?: TimeRange;
  selectedSensors: string[];
  comparisonMetrics: {
    meanTemp: boolean;
    stdDev: boolean;
    anomalyRate: boolean;
    minMax: boolean;
  };
}

export interface PlaybackConfig {
  startTime: Date;
  endTime: Date;
  speed: number;
  selectedSensors: string[];
  playbackPoints: number;
}

export interface CompareResult {
  groupId: string;
  groupName: string;
  meanTemperature: number;
  stdDeviation: number;
  minTemperature: number;
  maxTemperature: number;
  readingCount: number;
  anomalyCount: number;
  anomalyRate: number;
  criticalAnomalyCount: number;
}

export interface ReportOptions {
  includeRawData: boolean;
  includeProcessedData: boolean;
  includeAnomalyDetails: boolean;
  includeDiagnosis: boolean;
  includeCharts: boolean;
  includeCompareAnalysis: boolean;
  includePlaybackConfig: boolean;
  timeRange?: TimeRange;
  compareConfig?: CompareConfig;
  playbackConfig?: PlaybackConfig;
}

export interface ReportData {
  batchInfo: DataBatch;
  summary: ReportSummary;
  anomalies: AnomalyEvent[];
  diagnoses: DiagnosisResult[];
  temperatureData: TemperatureReading[];
  cargoBatches: CargoBatch[];
  maintenanceNotes: MaintenanceNote[];
  charts: ChartData[];
  compareResults: CompareResult[];
  compareConfig?: CompareConfig;
  playbackConfig?: PlaybackConfig;
  generatedAt: Date;
}

export interface ReportSummary {
  totalReadings: number;
  totalAnomalies: number;
  criticalAnomalies: number;
  dataCompleteness: number;
  sensorFaultCount: number;
  cargoAnomalyCount: number;
  dataQualityIssues: number;
  totalSensors: number;
  totalCargoBatches: number;
  totalMaintenanceNotes: number;
}

export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'scatter';
  options: Record<string, unknown>;
}

export interface StatsCardData {
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  status: 'normal' | 'warning' | 'danger';
}
