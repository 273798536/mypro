export interface BuildingModel {
  id: string;
  name: string;
  floors: Floor[];
  lastModified: string;
}

export interface Floor {
  id: string;
  name: string;
  level: number;
  height: number;
  devices: Device[];
  position: [number, number, number];
  dimensions: [number, number, number];
}

export interface Device {
  id: string;
  name: string;
  type: 'hvac' | 'lighting' | 'elevator' | 'other';
  position: [number, number, number];
  dimensions: [number, number, number];
}

export interface MeterData {
  id: string;
  period: { start: string; end: string };
  floorMeters: FloorMeter[];
  lastModified: string;
}

export interface FloorMeter {
  floorId: string;
  floorName: string;
  energyConsumption: {
    electricity: number;
    water?: number;
    gas?: number;
  };
  devices: DeviceMeter[];
}

export interface DeviceMeter {
  deviceId: string;
  deviceName: string;
  energyConsumption: {
    electricity: number;
    water?: number;
    gas?: number;
  };
  isAbnormal: boolean;
  abnormalReason?: string;
}

export type MergeDiffType =
  | 'floor_added'
  | 'floor_removed'
  | 'floor_modified'
  | 'device_added'
  | 'device_removed'
  | 'device_duplicate'
  | 'meter_missing';

export interface MergeDiff {
  type: MergeDiffType;
  floorId?: string;
  floorName?: string;
  deviceId?: string;
  deviceName?: string;
  oldValue?: unknown;
  newValue?: unknown;
  message: string;
  suggestion: string;
}

export type EnergyType = 'electricity' | 'water' | 'gas';

export interface HistoryRecord {
  id: string;
  timestamp: string;
  name: string;
  cameraState: {
    position: [number, number, number];
    target: [number, number, number];
  };
  parameters: {
    energyType: EnergyType;
    timeRange: { start: string; end: string };
    selectedFloors: string[];
  };
  screenshot?: string;
  notes?: string;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

export interface AppState {
  buildingModel: BuildingModel | null;
  meterData: MeterData | null;
  mergeDiffs: MergeDiff[];
  selectedFloor: string | null;
  selectedDevice: string | null;
  energyType: EnergyType;
  timeRange: { start: string; end: string };
  isDataManagementOpen: boolean;
  isHistoryOpen: boolean;
  cameraState: CameraState | null;
}
