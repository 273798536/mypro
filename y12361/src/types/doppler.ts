export type CalculationStatus = 'incomplete' | 'normal' | 'pending' | 'error';

export type Direction = 'approaching' | 'receding' | null;

export type DataSource = 'manual' | 'import' | 'demo';

export interface CalculationLogEntry {
  timestamp: number;
  field: string;
  oldValue: any;
  newValue: any;
}

export interface DopplerRecord {
  id: string;
  fingerprint: string;
  createdAt: number;
  updatedAt: number;

  source: DataSource;
  sourceNote?: string;

  emittedFrequency: number | null;
  receivedFrequency: number | null;
  velocity: number | null;
  direction: Direction;
  temperature: number | null;

  speedOfSound: number;
  frequencyShift: number | null;

  status: CalculationStatus;
  statusReasons: string[];

  calculationLog: CalculationLogEntry[];
}

export interface StatusRule {
  field: keyof DopplerRecord | 'derived';
  condition: (record: DopplerRecord) => boolean;
  status: CalculationStatus;
  reason: string;
  priority: number;
}

export type CalculationMode = 'frequency_to_velocity' | 'velocity_to_frequency';

export interface ExportOptions {
  format: 'csv' | 'json';
  includeIncomplete?: boolean;
  includeLog?: boolean;
}
