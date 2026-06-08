export interface Keyframe {
  id: string;
  timestampMs: number;
  label: string;
  params: Record<string, number>;
}

export interface DeviceCoordinate {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  sourceRef: string;
}

export interface Screenshot {
  id: string;
  filename: string;
  filePath: string;
  thumbnailPath: string;
  timestampMs: number;
  reviewStatus: 'approved' | 'pending' | 'rejected';
  reviewNote: string | null;
  linkedCoordinateIds: string[];
  sectionPlane?: {
    axis: 'x' | 'y' | 'z';
    depth: number;
  };
}

export interface Exercise {
  id: string;
  name: string;
  sourceRowNumber: number | null;
  sourceImageName: string | null;
  sourceRemark: string | null;
  status: 'draft' | 'reviewing' | 'confirmed' | 'archived';
  createdAt: string;
  updatedAt: string;
  timelineStartMs: number;
  timelineEndMs: number;
  keyframes: Keyframe[];
  coordinates: DeviceCoordinate[];
  screenshots: Screenshot[];
  conclusion: string;
}

export interface ExerciseVersion {
  id: string;
  exerciseId: string;
  versionNumber: number;
  snapshot: Exercise;
  changedBy: string;
  changeSummary: string;
  diff: Record<string, { old: unknown; new: unknown }>;
  createdAt: string;
}

export interface ImportConflict {
  rowIndex: number;
  existingId: string;
  incomingData: Partial<Exercise>;
}

export interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  duplicates: ImportConflict[];
}

export interface ExportJob {
  id: string;
  format: string;
  filter: Record<string, unknown> | null;
  filePath: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt: string | null;
}

export interface ExerciseListQuery {
  status?: Exercise['status'];
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
