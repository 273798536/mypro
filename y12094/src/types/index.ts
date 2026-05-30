export interface TerrainData {
  width: number;
  height: number;
  resolution: number;
  elevation: number[][];
}

export interface MonitoringDevice {
  id: string;
  name: string;
  position: [number, number, number];
  status: 'normal' | 'warning' | 'error';
}

export interface CrackPoint {
  id: string;
  deviceId: string;
  position: [number, number, number];
  width: number;
  depth: number;
  type: 'tensile' | 'shear' | 'compression';
  isDuplicate: boolean;
  duplicateWith?: string;
  timestamp: string;
}

export interface RainfallDataPoint {
  timestamp: string;
  rainfall: number;
  isMissing: boolean;
}

export interface Household {
  id: string;
  name: string;
  actualPosition: [number, number, number];
  reportedPosition: [number, number, number];
  hasCoordinateError: boolean;
}

export interface ProfileData {
  startPoint: [number, number];
  endPoint: [number, number];
  elevationData: { x: number; y: number; slope: number }[];
  cracksOnProfile: CrackPoint[];
}

export interface AppState {
  currentTimeIndex: number;
  isPlaying: boolean;
  playSpeed: number;
  slopeThreshold: number;
  rainfallThreshold: number;
  showDuplicateCracks: boolean;
  showMissingRainfall: boolean;
  showCoordinateErrors: boolean;
  showDevices: boolean;
  showHouseholds: boolean;
  showCracks: boolean;
  selectedProfile: ProfileData | null;
  hoveredObject: string | null;
}

export interface AppActions {
  setCurrentTimeIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaySpeed: (speed: number) => void;
  setSlopeThreshold: (threshold: number) => void;
  setRainfallThreshold: (threshold: number) => void;
  setShowDuplicateCracks: (show: boolean) => void;
  setShowMissingRainfall: (show: boolean) => void;
  setShowCoordinateErrors: (show: boolean) => void;
  setShowDevices: (show: boolean) => void;
  setShowHouseholds: (show: boolean) => void;
  setShowCracks: (show: boolean) => void;
  setSelectedProfile: (profile: ProfileData | null) => void;
  setHoveredObject: (id: string | null) => void;
  togglePlay: () => void;
}
