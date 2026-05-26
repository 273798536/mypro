export type ImportStrategy = 'ignore' | 'overwrite' | 'append';

export interface ColdZone {
  id: string;
  name: string;
  targetTemp: number;
  maxTemp: number;
  minTemp: number;
}

export interface Evaporator {
  id: string;
  name: string;
  zoneId: string;
  powerKw: number;
  defrostDurationMin: number;
  defrostIntervalMin: number;
}

export interface TempLayer {
  id: string;
  zoneId: string;
  name: string;
  tempCeiling: number;
  maxDeviation: number;
}

export interface Task {
  id: string;
  type: 'in' | 'out';
  zoneId: string;
  scheduledStart: number;
  scheduledEnd: number;
  penaltyPerMin: number;
}

export type DefrostStatus = 'planned' | 'running' | 'done' | 'overtime';

export interface DefrostSlot {
  id: string;
  evaporatorId: string;
  start: number;
  end: number;
  status: DefrostStatus;
}

export type OpEventType = 'defrost' | 'task' | 'alert' | 'normal';

export interface OpReport {
  id: string;
  zoneId: string;
  timestamp: number;
  temperature: number;
  eventType: OpEventType;
}

export interface MaterialSource {
  batchId: string;
  fileName: string;
  importedAt: number;
  strategy: ImportStrategy;
  itemCounts: Record<string, number>;
}

export type ScoreEventType = 'overtime' | 'temp' | 'delay' | 'bonus' | 'base';

export interface ScoreEvent {
  time: number;
  type: ScoreEventType;
  value: number;
  detail: string;
}

export interface LevelResult {
  score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  events: ScoreEvent[];
  passed: boolean;
  maxTemp: number;
  totalDelayMin: number;
  totalOvertimeMin: number;
}

export interface GameMaterials {
  zones: ColdZone[];
  evaporators: Evaporator[];
  tempLayers: TempLayer[];
  tasks: Task[];
  defrostSlots: DefrostSlot[];
  opReports: OpReport[];
}

export interface TemperaturePoint {
  time: number;
  zoneId: string;
  temperature: number;
  eventType?: OpEventType;
}

export interface AlertItem {
  time: number;
  zoneId?: string;
  type: 'overtime' | 'temp' | 'delay';
  message: string;
}
