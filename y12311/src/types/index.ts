export interface Visitor {
  id: string;
  arrivalTime: Date;
  name: string;
  idCard: string;
  status: 'waiting' | 'serving' | 'completed' | 'left';
  sourceChannel: 'walk_in' | 'appointment' | 'online';
}

export interface Appointment {
  id: string;
  visitorId: string;
  appointmentNo: string;
  appointmentTime: Date;
  businessType: string;
  status: 'pending' | 'arrived' | 'no_show' | 'cancelled';
  isSupplemented: boolean;
  supplementTime?: Date;
  originalJudgment?: string;
}

export interface ServiceRecord {
  id: string;
  visitorId: string;
  windowId: string;
  startTime: Date;
  endTime?: Date;
  serviceDuration: number;
  businessType: string;
  queuePosition: number;
  waitDuration: number;
  hasException: boolean;
  originalJudgmentSnapshot?: string;
  isSupplemented: boolean;
  supplementFields: string[];
}

export interface Window {
  id: string;
  name: string;
  businessScope: string[];
  status: 'open' | 'closed' | 'paused';
  currentVisitor?: string;
  pauseReason?: string;
  pauseTime?: Date;
}

export interface WindowStatusLog {
  id: string;
  windowId: string;
  timestamp: Date;
  status: 'open' | 'closed' | 'paused';
  reason?: string;
}

export interface DataSupplement {
  id: string;
  recordId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  supplementTime: Date;
  operator: string;
  affectedRecords: string[];
}

export type ExceptionType = 'missed_appointment' | 'abnormal_duration' | 'window_pause';
export type ExceptionStatus = 'pending' | 'confirmed' | 'resolved';
export type ExceptionSeverity = 'low' | 'medium' | 'high';

export interface Exception {
  id: string;
  recordId: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  description: string;
  createdAt: Date;
  confirmedAt?: Date;
  resolvedAt?: Date;
  handler?: string;
  remark?: string;
  originalJudgment?: string;
}

export interface FilterState {
  dateRange: [Date, Date];
  windowIds: string[];
  businessTypes: string[];
  status: string[];
  keyword: string;
}

export interface SimulationConfig {
  arrivalRate: number;
  avgServiceTime: number;
  serviceTimeStd: number;
  windowCount: number;
  simulationDuration: number;
  noShowRate: number;
}

export interface SimulationResult {
  avgWaitTime: number;
  maxWaitTime: number;
  avgQueueLength: number;
  maxQueueLength: number;
  windowUtilization: number;
  timeoutRate: number;
  waitDistribution: number[];
  timeline: SimulationEvent[];
}

export interface SimulationEvent {
  time: number;
  type: 'arrival' | 'start_service' | 'end_service' | 'no_show';
  visitorId?: string;
  windowId?: number;
  waitTime?: number;
  queueLength: number;
}

export interface ComparisonPlan {
  id: string;
  name: string;
  config: SimulationConfig;
  result: SimulationResult;
  createdAt: Date;
}

export interface ComparisonResult {
  plans: ComparisonPlan[];
  bestPlanId: string | null;
  keyMetrics: {
    name: string;
    values: { planId: string; value: number }[];
    unit: string;
    lowerIsBetter: boolean;
  }[];
}

export interface QueueStatistics {
  totalVisitors: number;
  avgWaitTime: number;
  avgServiceTime: number;
  windowUtilization: number;
  noShowRate: number;
  exceptionRate: number;
  currentQueueLength: number;
}

export const BUSINESS_TYPES = [
  { value: 'id_card', label: '身份证办理' },
  { value: 'household', label: '户口业务' },
  { value: 'social_security', label: '社保业务' },
  { value: 'medical_insurance', label: '医保业务' },
  { value: 'housing_fund', label: '公积金业务' },
  { value: 'tax', label: '税务业务' },
  { value: 'business_license', label: '营业执照' },
  { value: 'other', label: '其他业务' },
] as const;

export const WINDOW_NAMES = ['A01', 'A02', 'A03', 'A04', 'B01', 'B02', 'B03', 'C01', 'C02'] as const;

export const ABNORMAL_DURATION_THRESHOLD = {
  MIN: 1,
  MAX: 60,
  STD_MULTIPLE: 3,
} as const;

export const NO_SHOW_THRESHOLD = {
  GRACE_PERIOD: 15,
} as const;

export const SUPPLEMENT_TRACKED_FIELDS = [
  'appointment_no',
  'service_duration',
  'end_time',
  'window_id',
] as const;
