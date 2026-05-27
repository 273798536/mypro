export interface Location {
  lat: number;
  lng: number;
  name: string;
  timezone: string;
}

export interface SolarParams {
  location: Location;
  date: string;
  tiltAngle: number;
  weatherFactor: number;
  panelArea: number;
}

export interface SolarResults {
  solarElevation: number;
  solarAzimuth: number;
  irradiation: number;
  powerOutput: number;
}

export interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning';
}

export interface HistoryEntry {
  timestamp: string;
  changes: string;
}

export interface SolarScenario {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  source: string;
  version: number;
  history: HistoryEntry[];
  params: SolarParams;
  results: SolarResults;
}

export type ImportMode = 'ignore' | 'overwrite' | 'append';
