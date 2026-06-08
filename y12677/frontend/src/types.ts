export interface ProcessingRecord {
  timestamp: string;
  segmentId: number;
  displacement: number;
  stress: number;
  temperature: number;
}

export interface TimeParameters {
  startTime: string;
  endTime: string;
  samplingInterval: number;
}

export interface UnitConversionError {
  hasError: boolean;
  description: string;
  errorDetails: string[];
}

export type RecordStatus = 'pending' | 'reviewed' | 'approved';

export interface ModelRecordSummary {
  id: string;
  runTime: string;
  status: RecordStatus;
  timeParameters: TimeParameters;
  unitConversionError: UnitConversionError;
  conclusion: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModelRecord extends ModelRecordSummary {
  processingRecords: ProcessingRecord[];
}

export interface ChangeDetail {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface HistoryRecord {
  id: string;
  recordId: string;
  modifier: string;
  modifiedAt: string;
  modificationReason: string;
  changes: ChangeDetail[];
  processingOpinion: string;
}

export interface UpdateRecordRequest {
  timeParameters?: TimeParameters;
  status?: RecordStatus;
  unitConversionError?: UnitConversionError;
  modifier: string;
  modificationReason: string;
  processingOpinion: string;
}
