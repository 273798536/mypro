export interface AudioFile {
  id: string;
  name: string;
  duration: number;
  sampleRate: number;
  waveformData: number[];
  createdAt: Date;
  loudnessData: LoudnessPoint[];
}

export interface LoudnessPoint {
  time: number;
  value: number;
}

export interface Segment {
  id: string;
  audioFileId: string;
  startTime: number;
  endTime: number;
  type: 'speech' | 'music' | 'ad' | 'silence';
  loudness: number;
  status: 'detected' | 'modified' | 'confirmed';
  modifiedBy?: 'auto' | 'manual';
  modifiedAt?: Date;
  originalType?: string;
}

export interface Issue {
  id: string;
  segmentId: string;
  type: 'loudness' | 'silence' | 'sampleRate' | 'clipping';
  severity: 'low' | 'medium' | 'high';
  description: string;
  isFixed: boolean;
  fixedAt?: Date;
  affectedByManualChange?: boolean;
  affectedByAdAddition?: boolean;
  sourceRef: {
    audioFileId: string;
    segmentId: string;
    startTime: number;
    endTime: number;
  };
}

export interface Version {
  id: string;
  audioFileId: string;
  versionNumber: number;
  segments: Segment[];
  issues: Issue[];
  createdAt: Date;
  note: string;
}

export interface Report {
  id: string;
  audioFileId: string;
  versionId: string;
  issues: Issue[];
  exportedAt: Date;
  exportFormat: 'pdf' | 'html';
  summary: {
    totalIssues: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
    fixedIssues: number;
  };
}

export interface ManualChangeLog {
  id: string;
  segmentId: string;
  changeType: 'type_change' | 'boundary_change' | 'ad_added';
  oldValue: string;
  newValue: string;
  timestamp: Date;
  affectedIssues: string[];
}
