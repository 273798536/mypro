export type DataSourceType = 'ledger' | 'model' | 'memo';

export type ConflictType = 
  | 'caliber_mismatch' 
  | 'missing_period' 
  | 'duplicate_adjustment' 
  | 'data_inconsistency';

export interface Project {
  projectId: string;
  projectName: string;
  fundName: string;
  investDate: string;
  investAmount: number;
  industry?: string;
}

export interface Valuation {
  valuationId: string;
  projectId: string;
  projectName?: string;
  fundName?: string;
  valuationDate: string;
  valuationMethod: string;
  valuationAmount: number;
  sharePrice?: number;
  shareNumber?: number;
  dataSource: DataSourceType;
  version: string;
  isManual: boolean;
  createdAt: string;
  updatedAt: string;
  modifiedBy?: string;
}

export interface ValuationLog {
  logId: string;
  valuationId: string;
  projectId: string;
  projectName?: string;
  fieldName: string;
  oldValue: string | number;
  newValue: string | number;
  modifiedBy: string;
  modifiedAt: string;
  reason: string;
  impactScope: string[];
}

export interface Conflict {
  conflictId: string;
  valuationId: string;
  projectId: string;
  projectName?: string;
  conflictType: ConflictType;
  description: string;
  location: {
    source: string;
    row?: number;
    field?: string;
  };
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface FilterState {
  fundNames: string[];
  projectIds: string[];
  dateRange: { start: string; end: string };
  valuationMethods: string[];
  dataSources: DataSourceType[];
}

export interface ImportFile {
  id: string;
  name: string;
  type: DataSourceType;
  size: number;
  uploadTime: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  message?: string;
  rowCount?: number;
}

export interface ComparisonRecord {
  valuationId: string;
  fieldName: string;
  originalValue: string | number;
  modifiedValue: string | number;
  difference: number;
  differencePercent: number;
  reason: string;
}
