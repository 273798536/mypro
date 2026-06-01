export type ObjectType = 'rack' | 'vent' | 'tray' | 'sensor';

export type AlarmLevel = 'critical' | 'warning' | 'info';

export type AlarmType = 'sensor_offline' | 'vent_blocked' | 'rack_duplicate';

export type ObjectStatus = 'normal' | 'warning' | 'critical';

export interface Rack {
  id: string;
  name: string;
  position: [number, number, number];
  temperature: number;
  status: ObjectStatus;
  model: string;
  row: number;
  column: number;
}

export interface Sensor {
  id: string;
  rackId: string;
  type: string;
  value: number;
  status: ObjectStatus;
  lastOnline: string;
  position: [number, number, number];
}

export interface AirVent {
  id: string;
  name: string;
  position: [number, number, number];
  status: ObjectStatus;
  airflow: number;
  maxAirflow: number;
}

export interface CableTray {
  id: string;
  name: string;
  points: [number, number, number][];
  status: ObjectStatus;
  cableCount: number;
}

export interface AlarmClue {
  id: string;
  type: ObjectType;
  relatedId: string;
  description: string;
}

export interface Alarm {
  id: string;
  type: AlarmType;
  level: AlarmLevel;
  message: string;
  createdAt: string;
  sourceMaterial: string;
  blockPoint: string;
  nextStep: string;
  clues: AlarmClue[];
  relatedObjectId: string;
}

export interface SelectedObject {
  type: ObjectType;
  id: string;
  name: string;
}

export interface FilterState {
  selectedTypes: ObjectType[];
  alarmLevels: AlarmLevel[];
  temperatureRange: [number, number];
  searchKeyword: string;
  showTemperatureField: boolean;
}
