export interface TideData {
  time: string;
  hour: number;
  level: number;
  isMissing: boolean;
  predicted?: number;
}

export interface DeviceStatus {
  time: string;
  hour: number;
  status: 'running' | 'stopped' | 'maintenance';
  power: number;
}

export interface ElectricityPrice {
  time: string;
  hour: number;
  price: number;
  period: 'peak' | 'flat' | 'valley';
}

export type ScenarioType = 'normal' | 'missing' | 'outage' | 'conflict';

export interface GenerationWindow {
  startHour: number;
  endHour: number;
  estimatedOutput: number;
  estimatedRevenue: number;
  isValid: boolean;
  conflictNote?: string;
}

export interface ScenarioStats {
  totalGeneration: number;
  totalRevenue: number;
  missingDataCount: number;
  outageHours: number;
  conflictCount: number;
}

export interface ScenarioData {
  type: ScenarioType;
  name: string;
  description: string;
  tideData: TideData[];
  deviceStatus: DeviceStatus[];
  priceData: ElectricityPrice[];
  generationWindows: GenerationWindow[];
  stats: ScenarioStats;
}
