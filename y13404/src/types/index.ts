export type SampleType = 'missing' | 'alias' | 'late';

export type BranchResult = 'normal' | 'warning' | 'error';

export type BoundaryType = 'empty' | 'zero' | 'extrapolate';

export type SourceMaterialType = 'csv' | 'excel' | 'note' | 'screenshot';

export interface SourceMaterial {
  id: string;
  name: string;
  type: SourceMaterialType;
  url: string;
  uploadTime: Date;
}

export interface Sample {
  id: string;
  type: SampleType;
  name: string;
  data: Record<string, any>;
  branchResult: BranchResult;
  description: string;
}

export interface Draft {
  id: string;
  content: string;
  teacherNote: string;
  importTime: Date;
  samples: Sample[];
}

export interface BoundaryRecord {
  id: string;
  type: BoundaryType;
  valueBefore: number | null;
  valueAfter: number | null;
  threshold: number;
  explanation: string;
  sourceMaterial: SourceMaterial;
}

export interface FilterConfig {
  dateRange: [string, string];
  sampleTypes: SampleType[];
  branchResults: BranchResult[];
  boundaryTypes: BoundaryType[];
}

export interface StatsCard {
  id: string;
  title: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
}

export interface DetailRow {
  id: string;
  sampleName: string;
  sampleType: SampleType;
  branchResult: BranchResult;
  boundaryType?: BoundaryType;
  value: number;
  operator: string;
  time: Date;
  note: string;
}

export interface CalculationResult {
  id: string;
  calcTime: Date;
  filters: FilterConfig;
  stats: StatsCard[];
  details: DetailRow[];
  boundaryRecords: BoundaryRecord[];
  chartData: ChartDataPoint[];
}

export interface ChartDataPoint {
  name: string;
  value: number;
  threshold: number;
  isBoundary: boolean;
  boundaryType?: BoundaryType;
}

export interface BoundaryResult {
  isBoundary: boolean;
  type?: BoundaryType;
  valueBefore?: number | null;
  valueAfter?: number | null;
  explanation: string;
}

export const defaultFilters: FilterConfig = {
  dateRange: ['2026-06-01', '2026-06-21'],
  sampleTypes: ['missing', 'alias', 'late'],
  branchResults: ['normal', 'warning', 'error'],
  boundaryTypes: ['empty', 'zero', 'extrapolate'],
};
