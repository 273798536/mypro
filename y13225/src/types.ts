export interface Material {
  id: string;
  fileName: string;
  sourceGroup: string;
  sender: string;
  uploadedAt: string;
  isDirty: boolean;
  dirtyTag: string;
  thumbnailUrl: string;
}

export interface ReviewItem {
  id: string;
  songNumber: string;
  versionNumber: string;
  status: 'confirmed' | 'pending' | 'anomaly';
  materialId: string;
  reviewDate: string;
  alignedWith: { files: boolean; trackList: boolean; finalChecklist: boolean };
}

export interface Note {
  id: string;
  itemId: string;
  content: string;
  isOverride: boolean;
  previousJudgment: string | null;
  author: string;
  createdAt: string;
}

export interface AuthorizationNote {
  id: string;
  content: string;
  createdAt: string;
  alignmentDone: boolean;
}

export interface AnomalyRecord {
  id: string;
  noteId: string;
  originalValue: string;
  overrideValue: string;
  operator: string;
  occurredAt: string;
}

export interface FilterState {
  dateRange: [string, string] | null;
  songNumber: string;
  versionNumber: string;
  sourceChannel: string;
}

export interface PageSummary {
  totalItems: number;
  confirmed: number;
  pending: number;
  anomaly: number;
  lastAlignmentAt: string | null;
  filtersApplied: FilterState;
}
