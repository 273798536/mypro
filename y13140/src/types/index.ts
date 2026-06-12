export interface Parameter {
  id: string;
  name: string;
  currentValue: number;
  currentWeight: number;
  changeCount: number;
  unit: string;
}

export interface Version {
  id: string;
  paramId: string;
  version: number;
  value: number;
  newValue: number;
  weight: number;
  newWeight: number;
  operator: string;
  timestamp: string;
  reason: string | null;
}

export interface Note {
  id: string;
  versionId: string;
  content: string;
  timestamp: string;
  author: string;
}

export interface Screenshot {
  id: string;
  versionId: string;
  dataUrl: string;
  description: string;
  timestamp: string;
}

export interface Record {
  id: string;
  title: string;
  isSeeminglyNormal: boolean;
  inputParams: Record<string, number>;
  calculation: {
    formula: string;
    steps: string[];
    result: number;
  };
  contributionToConclusion: number;
  impactExplanation: string;
}

export interface Anomaly {
  id: string;
  type: 'extrapolation' | 'weight' | 'other';
  title: string;
  rawStatement: string;
  paramId: string;
  versionId: string;
  traceNote: string;
}

export interface Snapshot {
  id: string;
  lockTime: string;
  lockedBy: string;
  paramsState: Parameter[];
  anomaliesState: Anomaly[];
  reviewState: {
    explanation: string;
    conclusion: string;
  };
  markdown: string;
}

export interface AppStoreState {
  parameters: Parameter[];
  versions: Version[];
  notes: Note[];
  screenshots: Screenshot[];
  records: Record[];
  anomalies: Anomaly[];
  snapshots: Snapshot[];
  expandedRecords: string[];
  highlightedParamId: string | null;
  selectedSnapshotId: string | null;
  isLocked: boolean;
  reviewExplanation: string;
  reviewConclusion: string;
}
