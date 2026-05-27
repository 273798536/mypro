export interface SchemeParams {
  arrivalRate: number;
  serviceRate: number;
  numCounters: number;
  queueThreshold: number;
  lunchStart: string;
  lunchEnd: string;
  peakArrivalRate: number;
  avgServiceTime: number;
  maxServiceTime: number;
  switchCost: number;
}

export interface QueueResult {
  rho: number;
  P0: number;
  Lq: number;
  L: number;
  Wq: number;
  W: number;
  Pw: number;
  utilization: number;
}

export type AnomalyType = 'arrival_spike' | 'long_tail' | 'switch_cost';
export type AnomalySeverity = 'warning' | 'critical';

export interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  excludedFromNormal: boolean;
}

export interface Revision {
  id: string;
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  source: string;
  reason: string;
}

export interface Scheme {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  source: string;
  params: SchemeParams;
  result: QueueResult;
  anomalies: Anomaly[];
  revisions: Revision[];
}

export type ImportStrategy = 'ignore' | 'overwrite' | 'append';

export const DEFAULT_PARAMS: SchemeParams = {
  arrivalRate: 3,
  serviceRate: 2,
  numCounters: 3,
  queueThreshold: 5,
  lunchStart: '12:00',
  lunchEnd: '13:00',
  peakArrivalRate: 8,
  avgServiceTime: 3,
  maxServiceTime: 15,
  switchCost: 2,
};
