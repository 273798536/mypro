export interface Point {
  x: number;
  y: number;
}

export type MaterialType = 'historical_answer' | 'boundary_sample' | 'oral_note';

export interface Material {
  id: string;
  type: MaterialType;
  content: string;
  version: number;
  lastModified: string;
  changedFromPrevious: boolean;
}

export interface CalculationStep {
  step: number;
  description: string;
  formula: string;
  values: Record<string, number | string>;
  result: number | string;
}

export type AnomalyType = 'empty_set' | 'division_by_zero' | 'normal' | 'other';

export interface ErrorRecord {
  id: string;
  sampleId: string;
  title: string;
  inputPoints: Point[] | null;
  rawInput: string;
  expectedArea: number | null;
  actualArea: number | null;
  anomalyType: AnomalyType;
  anomalyDetail?: string;
  materials: Material[];
  calculationSteps: CalculationStep[];
  has口径Change: boolean;
  submittedCount: number;
  status: 'pending' | 'reviewed';
  createdAt: string;
}

export type AnomalyFilter = 'all' | AnomalyType;
export type ChangedFilter = 'all' | 'changed' | 'unchanged';
