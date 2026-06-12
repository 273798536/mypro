export interface WeatherForecast {
  timestamp: string;
  windSpeed: number;
  windDirection: number;
  waveHeight: number;
  wavePeriod: number;
  airPressure: number;
  temperature?: number;
  source: string;
}

export type SalinityUnit = 'PSU' | '‰' | 'ppt' | 'mS/cm';

export interface SalinityRecord {
  id: string;
  station: string;
  timestamp: string;
  depth: number;
  value: number;
  unit: SalinityUnit;
  normalizedValue?: number;
  unitMismatch?: boolean;
}

export type ResultStatus = 'AVAILABLE' | 'DEFERRED' | 'RECOLLECT';

export interface EnergyDevice {
  id: string;
  name: string;
  lat: number;
  lng: number;
  ratedPower: number;
  efficiency: number;
  status: ResultStatus;
  notes?: string;
  inNoGoZone?: boolean;
}

export interface TidalHarmonic {
  constituent: string;
  amplitude: number;
  phase: number;
  sourceMaterial: string;
}

export interface TidalPoint {
  time: string;
  level: number;
  type?: 'H' | 'L' | null;
  confidence: number;
}

export type NextActionType =
  | 'upload_material'
  | 'unify_unit'
  | 'recalculate'
  | 'recollect'
  | 'verify';

export interface ResultNextAction {
  type: NextActionType;
  label: string;
  hint?: string;
}

export interface ResultItem {
  id: string;
  category: 'weather' | 'salinity' | 'tide' | 'device' | 'energy';
  label: string;
  status: ResultStatus;
  description: string;
  nextAction?: ResultNextAction;
  sourceRefs?: string[];
}

export interface MapViewPreset {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
  bounds?: [[number, number], [number, number]];
  createdAt: string;
}

export interface NoGoZone {
  id: string;
  name: string;
  type: 'channel' | 'reserve' | 'anchorage';
  coordinates: [number, number][];
}

export interface MissingMaterial {
  id: string;
  name: string;
  category: 'weather' | 'salinity' | 'tide' | 'other';
  dateRange?: string;
  impact: string;
  severity: ResultStatus;
}

export interface ImportValidationError {
  row?: number;
  field?: string;
  message: string;
  suggestion?: string;
}

export interface CalcState {
  projectName: string;
  weather: WeatherForecast[];
  weatherSourceName: string | null;
  salinity: SalinityRecord[];
  salinitySourceName: string | null;
  devices: EnergyDevice[];
  harmonics: TidalHarmonic[];
  tidalSeries: TidalPoint[];
  results: ResultItem[];
  viewPresets: MapViewPreset[];
  activeViewId?: string;
  screenshotMode: boolean;
  missingMaterials: MissingMaterial[];
  noGoZones: NoGoZone[];
  salinityUnitModalOpen: boolean;
  unitMismatchCount: number;
  lastUpdatedAt: string;
}
