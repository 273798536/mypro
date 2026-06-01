export type Position = [number, number, number];

export interface Shelf {
  id: string;
  name: string;
  position: Position;
  dimensions: { width: number; height: number; depth: number };
  lastModified: string;
  probeIds: string[];
}

export type ProbeStatus = 'online' | 'offline' | 'warning';

export interface Probe {
  id: string;
  name: string;
  shelfId: string;
  position: Position;
  status: ProbeStatus;
  currentTemp: number;
  history: { timestamp: string; temp: number }[];
  lastCalibration: string;
}

export type FanStatus = 'running' | 'stopped' | 'error';

export interface Fan {
  id: string;
  name: string;
  position: Position;
  status: FanStatus;
  speed: number;
}

export type TemperatureSensitivity = 'high' | 'medium' | 'low';

export interface ProductBatch {
  id: string;
  name: string;
  shelfId: string;
  position: Position;
  dimensions: { width: number; height: number; depth: number };
  temperatureSensitivity: TemperatureSensitivity;
  storageTime: string;
  isBlocking: boolean;
}

export type EventType = 'probe_offline' | 'product_block' | 'fan_stop';
export type EventSeverity = 'critical' | 'warning' | 'info';
export type SourceType = 'probe' | 'product' | 'fan' | 'shelf';

export interface RelatedClue {
  type: string;
  id: string;
  name: string;
}

export interface Event {
  id: string;
  type: EventType;
  timestamp: string;
  severity: EventSeverity;
  sourceId: string;
  sourceType: SourceType;
  description: string;
  location: string;
  triggerSource: string;
  blockPosition: string;
  nextAction: string;
  relatedClues: RelatedClue[];
}

export interface TemperatureGridPoint {
  x: number;
  y: number;
  z: number;
  temp: number;
}

export interface TemperatureData {
  timestamp: string;
  grid: TemperatureGridPoint[];
}

export type SelectionType = 'shelf' | 'probe' | 'fan' | 'product' | 'event' | null;

export interface Selection {
  type: SelectionType;
  id: string | null;
}
