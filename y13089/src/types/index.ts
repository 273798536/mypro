export interface PointCoordinate {
  id: string;
  name: string;
  originalName: string;
  x: number;
  y: number;
  z: number;
  showcaseId: string;
  showcaseName: string;
  lightingScheme: string;
  lux: number;
  colorTemperature: number;
  cri: number;
  beamAngle: number;
  sourceFile: string;
  rowNumber: number;
  importedAt: string;
}

export interface MergedPointGroup {
  groupId: string;
  mergedName: string;
  points: PointCoordinate[];
  isNameConsistent: boolean;
  inconsistentNames: string[];
  centroid: { x: number; y: number; z: number };
  boundingBox: {
    minX: number; maxX: number;
    minY: number; maxY: number;
    minZ: number; maxZ: number;
  };
}

export interface FilterState {
  scheme: string[];
  showcase: string[];
  luxRange: [number, number];
  criRange: [number, number];
  colorTempRange: [number, number];
  searchKeyword: string;
  showOnlyInconsistent: boolean;
  showOnlyExceptions: boolean;
}

export interface ManualRemark {
  id: string;
  targetId: string;
  targetType: 'point' | 'group' | 'exception';
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export type ExceptionType = 
  | 'name_inconsistency' 
  | 'lux_out_of_range' 
  | 'cri_too_low' 
  | 'adjacent_merge_ambiguous'
  | 'missing_coordinate'
  | 'duplicate_point';

export interface ExceptionItem {
  id: string;
  type: ExceptionType;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  relatedPointIds: string[];
  relatedGroupId?: string;
  originalEvidence: {
    pointName: string;
    coordinate: { x: number; y: number; z: number };
    sourceFile: string;
    rowNumber: number;
    originalValue: string;
  }[];
  status: 'pending' | 'processing' | 'resolved' | 'evidence_needed';
  assignee: string;
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface ProcessingStatus {
  totalPoints: number;
  processedPoints: number;
  pendingPoints: number;
  totalExceptions: number;
  resolvedExceptions: number;
  pendingExceptions: number;
  evidenceNeededExceptions: number;
}

export type ViewMode = 'list' | 'detail' | 'dashboard' | 'exceptions';
