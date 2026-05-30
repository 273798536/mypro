export type VisitStatus = 'appointed' | 'walkIn' | 'noShow' | 'served';
export type DataGroup = 'normal' | 'boundary' | 'badInput';
export type HolidayType = 'workday' | 'weekend' | 'holiday';
export type ExperimentStatus = 'pending' | 'running' | 'completed' | 'error';
export type AnomalyType = 'noShow' | 'abnormalDuration' | 'temporaryClose';
export type EventType = 'arrive' | 'startService' | 'endService' | 'noShow';

export interface VisitRecord {
  id: string;
  visitorId: string;
  arriveTime: Date;
  appointmentTime?: Date;
  status: VisitStatus;
  serviceDuration: number;
  dataGroup: DataGroup;
  notes?: string;
}

export interface WindowShift {
  id: string;
  windowNo: number;
  startTime: Date;
  endTime: Date;
  capacity: number;
  isTemporaryClosed: boolean;
  closeStartTime?: Date;
  closeEndTime?: Date;
}

export interface Holiday {
  id: string;
  date: string;
  type: HolidayType;
  name: string;
}

export interface ExperimentConfig {
  windowCount: number;
  simulationTime: number;
  includeBoundary: boolean;
  includeBadInput: boolean;
}

export interface Experiment {
  id: string;
  name: string;
  config: ExperimentConfig;
  status: ExperimentStatus;
  createdAt: Date;
  progress: number;
}

export interface QueueEvent {
  time: number;
  type: EventType;
  visitorId: string;
  windowNo?: number;
}

export interface WindowActivity {
  windowNo: number;
  busyTime: number;
  idleTime: number;
  servedCount: number;
}

export interface QueueTrace {
  timeline: QueueEvent[];
  windowActivity: WindowActivity[];
}

export interface OptimizationSuggestion {
  recommendedWindows: number;
  peakHourSuggestions: string[];
  costAnalysis: string;
}

export interface WaitDistribution {
  buckets: { range: string; count: number }[];
  percentile90: number;
  percentile95: number;
}

export interface SimulationResult {
  id: string;
  experimentId: string;
  dataGroup: DataGroup;
  avgWaitTime: number;
  maxWaitTime: number;
  avgQueueLength: number;
  windowUtilization: number;
  totalServed: number;
  queueTrace: QueueTrace;
  optimization: OptimizationSuggestion;
  waitDistribution: WaitDistribution;
}

export interface AnomalyRecord {
  id: string;
  experimentId: string;
  type: AnomalyType;
  description: string;
  impact: {
    extraWaitTime: number;
    affectedCount: number;
  };
  rootCause: string;
  suggestion: string;
}
