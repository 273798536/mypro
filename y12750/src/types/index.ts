export type RecordStatus = 'passed' | 'pending' | 'error';

export type UserRole = 'monitor' | 'student' | 'teacher';

export interface SourceRef {
  notebookId: string;
  lineNumber: number;
  spectrumFile: string;
  samplingTime: string;
  originalNote?: string;
}

export interface CalculationStep {
  step: number;
  title: string;
  equation: string;
  value: string;
  explanation: string;
  hasIssue: boolean;
}

export interface Point {
  volume: number;
  ph: number;
}

export interface Range {
  start: number;
  end: number;
}

export interface SpectrumData {
  points: Point[];
  endpointVolume: number;
  endpointPh: number;
  jumpRange: Range;
  note?: string;
}

export interface Annotation {
  id: string;
  time: string;
  author: string;
  content: string;
  refType: 'calculation' | 'spectrum' | 'general';
  refId?: string;
}

export interface TitrationRecord {
  id: string;
  sampleCode: string;
  titrationType: string;
  status: RecordStatus;
  reviewer: string;
  student: string;
  summary: string;
  source: SourceRef;
  calculation: CalculationStep[];
  spectrum: SpectrumData;
  annotations: Annotation[];
  isSample?: boolean;
  teacherNote?: string;
}

export type FilterStatus = 'all' | RecordStatus;
