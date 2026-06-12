export type FuelRecordStatus = 'pending' | 'approved' | 'rejected';

export type RecordStatus = 'pending' | 'approved' | 'rejected';

export type CleanStepOperator = 'system' | 'user';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Vessel {
  id: string;
  name: string;
  tonnage: number;
  callSign?: string;
  enginePower?: number;
  fuelTankCapacity?: number;
  buildYear?: number;
  homePort?: string;
  skipper?: string;
}

export interface Voyage {
  id: string;
  vesselId: string;
  startDate: string;
  endDate: string;
  route: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  departurePort?: string;
  arrivalPort?: string;
  voyageNo?: string;
  totalFuel?: number;
  totalDistance?: number;
  purpose?: string;
  weatherCondition?: string;
}

export interface FuelRecord {
  id: string;
  voyageId: string;
  vesselId?: string;
  timestamp: string;
  fuelConsumption: number;
  expectedFuel: number;
  speed: number;
  source: string;
  status: FuelRecordStatus;
  lat: number;
  lng: number;
  hasCorrection: boolean;
}

export interface WeatherRaw {
  timestamp: string;
  windSpeed: number | null;
  windDirection: string;
  waveHeight: number | null;
  temperature: number | null;
  remark: string;
  lat?: number | null;
  lng?: number | null;
}

export interface WeatherData {
  id: string;
  fuelRecordId: string;
  timestamp: string;
  windSpeed: number;
  windDirection: string;
  waveHeight: number;
  temperature: number;
  remark: string;
  lat?: number;
  lng?: number;
  isNullFilled: boolean;
  nullFillSource: string;
  isDuplicateRemoved: boolean;
  parsedFromRemark: boolean;
}

export interface TideData {
  id: string;
  fuelRecordId: string;
  timestamp?: string;
  tideLevel: number;
  timezone: string;
  hasTimezoneError: boolean;
  correctedTideLevel?: number;
}

export interface BuoySupplement {
  id: string;
  voyageId: string;
  supplementTime: string;
  operator: string;
  originalRemark: string;
  fuelRecordId?: string;
}

export interface Correction {
  id: string;
  recordId: string;
  operator: string;
  operateTime: string;
  beforeValue: number;
  afterValue: number;
  reason: string;
  fromStatus: FuelRecordStatus;
  toStatus: FuelRecordStatus;
}

export interface CleanStep {
  step: string;
  before: unknown;
  after: unknown;
  reason: string;
  operator: CleanStepOperator;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  recordId: string;
  action: string;
  operator: string;
  timestamp: string;
  detail: string;
}

export interface WaterAlert {
  id: string;
  voyageId: string;
  alertType: string;
  severity: AlertSeverity;
  alertDate: string;
  description: string;
  affectedFuelRecords: string[];
  value?: number;
  threshold?: number;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
}

export interface DuplicateGroup {
  groupId: string;
  records: string[];
  confidence: number;
  conflictingFields: string[];
  resolved: boolean;
  chosenRecordId?: string;
}
