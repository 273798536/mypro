export type Role = 'engineer' | 'student';

export type VerificationStatus = 'pass' | 'review' | 'fail' | 'pending';

export type AlertLevel = 'safe' | 'warning' | 'danger';

export type RetestPriority = 'high' | 'medium' | 'low';

export interface TemperatureProfile {
  id: string;
  version: string;
  name: string;
  createdAt: string;
  description: string;
  curveData: string;
  points: Array<{ time: number; temperature: number }>;
}

export interface SourceRow {
  rowNumber: number;
  recordId?: string;
  rawContent: string;
  imageName: string;
  remark: string;
}

export interface AdditiveItem {
  id: string;
  recordId?: string;
  name: string;
  measuredValue: number;
  measuredUnit: 'mg/kg' | 'ppm' | 'μg/mL' | 'g/kg';
  convertedMgPerKg: number;
  limitValue: number;
  limitStandard: string;
  isPass: boolean;
  failureReason: string;
  sourceRowNumber: number;
  sourceImageName: string;
}

export interface SafetyAlert {
  id: string;
  recordId?: string;
  level: AlertLevel;
  message: string;
  standardClause: string;
  additiveName: string;
}

export interface RetestSuggestion {
  id: string;
  recordId?: string;
  reason: string;
  sampleCount: number;
  method: string;
  priority: RetestPriority;
  additiveName: string;
}

export interface VerificationRecord {
  id: string;
  batchNumber: string;
  createdAt: string;
  status: VerificationStatus;
  reviewedBy: string;
  sourceNote: string;
  temperatureProfileId: string | null;
  summary: {
    total: number;
    passCount: number;
    reviewCount: number;
    failCount: number;
  };
}

export interface FormulaMeta {
  id: string;
  name: string;
  formula: string;
  unit: string;
  scope: string;
  failureReasons: string[];
}

export interface GradeResult {
  level: 'direct' | 'review' | 'reject';
  label: string;
  description: string;
}
