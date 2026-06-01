export interface Sample {
  id: string;
  name: string;
  source: string;
  format: string;
  duration: number;
  hash: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  versions: Version[];
  isDuplicate?: boolean;
  duplicateWith?: string[];
}

export interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  sampleIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  versions: Version[];
  isMissingLicense?: boolean;
}

export interface License {
  id: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  trackIds: string[];
  status: 'active' | 'expired' | 'expiring_soon';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  versions: Version[];
  manualEdits: ManualEdit[];
}

export interface Version {
  id: string;
  objectId: string;
  objectType: 'sample' | 'track' | 'license';
  versionNumber: number;
  data: object;
  modifiedBy: string;
  modifiedAt: string;
  changeNote: string;
}

export interface ManualEdit {
  id: string;
  field: string;
  oldValue: any;
  newValue: any;
  editedBy: string;
  editedAt: string;
  reason: string;
}

export interface RiskAlert {
  id: string;
  type: 'expired' | 'duplicate' | 'missing_license';
  severity: 'high' | 'medium' | 'low';
  message: string;
  relatedObjectId: string;
  relatedObjectType: string;
}

export interface TraceNode {
  id: string;
  type: 'sample' | 'track' | 'license';
  name: string;
  status: 'normal' | 'warning' | 'danger';
  children?: TraceNode[];
  parent?: TraceNode;
}

export interface DiffEntry {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'removed' | 'modified';
}

export interface ImpactAnalysis {
  affectedObjects: {
    id: string;
    type: 'sample' | 'track' | 'license';
    name: string;
    impact: 'direct' | 'indirect';
  }[];
  affectedFields: string[];
}
