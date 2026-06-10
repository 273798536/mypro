export interface QCRecord {
  id: string;
  sampleId: string;
  qcScore: number;
  readQuality: number;
  lowQualityReads: number;
  totalReads: number;
  sourceMaterial: string;
  equipment: string;
  operator: string;
  testTime: Date;
  conclusion: string;
  isLowQuality: boolean;
  filterReasons: string[];
}

export interface QCThresholds {
  minQcScore: number;
  minReadQuality: number;
  maxLowQualityRatio: number;
}

export interface FilterResult {
  passed: boolean;
  lowQualityReads: number;
  reasons: string[];
  suggestedAction: string;
}

export interface TraceNode {
  id: string;
  type: 'material' | 'experiment' | 'qc' | 'correction' | 'analysis' | 'conclusion';
  title: string;
  description: string;
  operator?: string;
  time?: Date;
  metadata?: Record<string, string>;
}

export interface MaterialInfo {
  id: string;
  name: string;
  batchNumber: string;
  supplier: string;
  receivedDate: Date;
  storageCondition: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
}
