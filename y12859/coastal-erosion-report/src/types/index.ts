export interface BuoyData {
  id: string;
  buoyId: string;
  timestamp: string;
  location: {
    lat: number;
    lng: number;
  };
  expectedLocation: {
    lat: number;
    lng: number;
  };
  driftDistance: number;
  waveHeight: number;
  waterDepth: number;
  currentSpeed: number;
  sedimentConcentration: number;
  waterTemperature: number;
  dataQuality: 'good' | 'warning' | 'error';
  driftDetected: boolean;
  driftReason?: string;
}

export interface WaterQualityRecord {
  id: string;
  timestamp: string;
  stationId: string;
  stationName: string;
  ph: number;
  dissolvedOxygen: number;
  turbidity: number;
  ammoniaNitrogen: number;
  totalPhosphorus: number;
  cod: number;
  waterLevel: number;
  isSupplement: boolean;
  supplementTime?: string;
  reviewStatus: 'pending' | 'reviewed' | 'rejected';
  reviewRemark?: string;
  reviewer?: string;
  reviewTime?: string;
  warningLevel: 'normal' | 'attention' | 'warning' | 'danger';
}

export interface AquacultureLog {
  id: string;
  logDate: string;
  farmId: string;
  farmName: string;
  submitTime: string;
  expectedSubmitTime: string;
  isDelayed: boolean;
  delayHours?: number;
  stockingDensity: number;
  feedingAmount: number;
  waterExchangeRate: number;
  mortalityCount: number;
  waterQualityObservation: string;
  abnormalSituation?: string;
  operator: string;
}

export interface ErosionProfilePoint {
  distanceFromShore: number;
  elevation: number;
  depth: number;
}

export interface ErosionCalculationResult {
  profileId: string;
  calculationDate: string;
  sectionName: string;
  points: ErosionProfilePoint[];
  shorelinePosition: number;
  averageErosionRate: number;
  maximumErosionDepth: number;
  erosionVolume: number;
  sedimentTransportRate: number;
  formula: string;
  formulaDescription: string;
  units: {
    distance: string;
    elevation: string;
    erosionRate: string;
    volume: string;
    sedimentRate: string;
  };
  applicableScope: string;
  failureReasons: string[];
  warnings: string[];
  dataSources: string[];
  affectedByDelayedLogs: boolean;
  delayedLogCount: number;
  delayedLogIds: string[];
  calculationStatus: 'success' | 'partial' | 'failed';
}

export interface ErosionReport {
  reportId: string;
  reportDate: string;
  reportPeriod: {
    start: string;
    end: string;
  };
  sectionName: string;
  overview: {
    totalBuoyRecords: number;
    validBuoyRecords: number;
    driftRecords: number;
    waterQualityRecords: number;
    supplementRecords: number;
    delayedLogs: number;
    totalCalculations: number;
    successfulCalculations: number;
  };
  erosionResults: ErosionCalculationResult[];
  unavailableRecords: {
    type: string;
    count: number;
    reason: string;
    records: Array<{
      id: string;
      time: string;
      description: string;
    }>;
  }[];
  driftInterceptions: {
    total: number;
    interceptions: Array<{
      buoyId: string;
      timestamp: string;
      driftDistance: number;
      reason: string;
      action: string;
    }>;
  };
  delayedLogImpact: {
    affectedConclusions: string[];
    delayedLogs: Array<{
      logId: string;
      farmName: string;
      logDate: string;
      delayHours: number;
      affectedResults: string[];
    }>;
  };
  waterQualitySummary: {
    normalCount: number;
    attentionCount: number;
    warningCount: number;
    dangerCount: number;
    supplementCount: number;
    pendingReviewCount: number;
  };
  monthlySummary?: {
    month: string;
    unusableRecordTypes: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
    keyIssues: string[];
  };
}

export type ReportTab = 
  | 'calculator'
  | 'buoy-data' 
  | 'water-quality' 
  | 'aquaculture-logs' 
  | 'drift-interception'
  | 'report-export';
