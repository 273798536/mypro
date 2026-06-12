export interface Station {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  sampleCount?: number;
  anomalyCount?: number;
  createdAt?: string;
}

export interface WeatherForecast {
  id?: string;
  sampleId?: string;
  windSpeed: number;
  windDirection: string;
  waveHeight: number;
  airTemperature: number;
  humidity: number;
  weatherCondition?: string;
  forecastDate: string;
  createdAt?: string;
}

export interface BuoyData {
  id?: string;
  sampleId?: string;
  isLate: boolean;
  arrivedAt: string | null;
  affectedConclusions: string[] | null;
  waterTemperature: number;
  salinity: number;
  dissolvedOxygen: number;
  ph?: number;
  chlorophyllA?: number;
  turbidity?: number;
  reportedAt?: string | null;
  createdAt?: string;
}

export interface TideData {
  id?: string;
  sampleId?: string;
  stationId?: string;
  tideType?: string;
  highTideTime?: string;
  lowTideTime?: string;
  highTideHeight?: number;
  lowTideHeight?: number;
  timezone: string;
  timezoneValid: boolean;
  timezoneError: string | null;
  createdAt?: string;
}

export interface AquacultureLog {
  id: string;
  stationId: string;
  stationName?: string;
  sampleId?: string;
  species: string;
  activity: string;
  mortality?: number | null;
  observation?: string | null;
  reportedBy: string;
  reportDate: string;
  createdAt?: string;
}

export interface Anomaly {
  id: string;
  sampleId: string;
  type: 'supplement' | 'recalibrate';
  description: string;
  resolution: string | null;
  status: 'pending' | 'resolved';
  createdAt?: string;
  resolvedAt?: string | null;
}

export interface Sample {
  id: string;
  stationId: string;
  stationName: string;
  sampleDate: string;
  status: string;
  collector?: string;
  ph: number;
  salinity: number;
  dissolvedOxygen: number;
  chlorophyllA: number;
  temperature: number;
  turbidity?: number;
  notes?: string | null;
  conclusion?: string | null;
  createdAt?: string;
  updatedAt?: string;
  weatherForecast: WeatherForecast[];
  buoyData: BuoyData[];
  tideData: TideData[];
  anomalies: Anomaly[];
  aquacultureLog: AquacultureLog[];
}

export interface DashboardData {
  pendingCount: number;
  anomalyCountByType: Record<string, number>;
  buoyLateCount: number;
  recentAuditLogs: AuditLogEntry[];
  weatherForecastSummary: {
    stationName: string;
    windSpeed: number;
    waveHeight: number;
    forecastTime: string;
  }[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface ReportSample {
  id: string;
  stationId: string;
  stationName: string;
  stationRegion?: string;
  stationLatitude?: number;
  stationLongitude?: number;
  sampleDate: string;
  status: string;
  collector?: string;
  ph: number;
  dissolvedOxygen: number;
  chlorophyllA: number;
  salinity: number;
  temperature: number;
  turbidity?: number;
  notes?: string | null;
  conclusion?: string | null;
  buoyData?: Partial<BuoyData>;
  tideData?: Partial<TideData>;
  anomaly?: Partial<Anomaly> & { interceptionExplanation?: string };
}

export interface ReportData {
  generatedAt: string;
  stationCount: number;
  sampleStats: {
    total: number;
    pending: number;
    reviewed: number;
    rejected: number;
  };
  anomalyStats: {
    total: number;
    pending: number;
    resolved: number;
    byType: Record<string, number>;
  };
  samples: ReportSample[];
}
