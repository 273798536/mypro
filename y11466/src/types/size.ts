import { BaseEntity, ImportSource } from './common';

export type ModificationStatus = 'pending' | 'in_progress' | 'completed' | 'approved' | 'rejected';

export interface SizeMeasurement {
  size: string;
  measurementPoint: string;
  specValue: number;
  tolerance: number;
  unit: string;
}

export interface SizeModificationRecord extends BaseEntity {
  modificationNo: string;
  sampleNo: string;
  styleNo: string;
  
  originalMeasurements: SizeMeasurement[];
  modifiedMeasurements: SizeMeasurement[];
  
  modificationReason: string;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  
  status: ModificationStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  affectedFabrics?: string[];
  estimatedImpact?: string;
  
  importSource: ImportSource;
  sourceRowNumber: number;
  version: number;
  isLatest: boolean;
}

export interface SizeModificationVersion {
  modificationNo: string;
  version: number;
  changedAt: string;
  changedBy: string;
  changes: Record<string, {
    old: unknown;
    new: unknown;
  }>;
}
