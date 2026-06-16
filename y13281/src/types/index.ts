export type TimePeriod = 'morning' | 'evening';
export type PointStatus = 'pending' | 'processed' | 'confirmed' | 'need_evidence';
export type MaterialType = 'photo' | 'boundary' | 'note';
export type ReviewStatus = 'pending' | 'confirmed' | 'rejected';

export interface MonitorPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  area: string;
  status: PointStatus;
  noiseCapacity: number;
}

export interface InspectionMaterial {
  id: string;
  monitorPointId: string;
  type: MaterialType;
  title: string;
  description: string;
  imageUrl: string;
  noiseValue: number;
  timePeriod: TimePeriod;
  submittedBy: string;
  submittedAt: string;
  caliberChanged: boolean;
  originalCaliber: string;
  currentCaliber: string;
}

export interface PhotoRecord {
  id: string;
  monitorPointId: string;
  imageUrl: string;
  description: string;
  recordedBy: string;
  recordedAt: string;
  changes: string[];
}

export interface ReviewRecord {
  id: string;
  monitorPointId: string;
  isOverLimit: boolean;
  noiseCapacity: number;
  measuredValue: number;
  timePeriod: TimePeriod;
  needManualConfirm: boolean;
  confirmReason: string;
  nextStep: string;
  reviewedBy: string;
  reviewedAt: string;
  status: ReviewStatus;
}

export interface ChangeLog {
  id: string;
  materialId: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedAt: string;
}

export interface Filters {
  status: PointStatus | 'all';
  area: string | 'all';
  timePeriod: TimePeriod | 'all';
}

export interface AppState {
  monitorPoints: MonitorPoint[];
  materials: InspectionMaterial[];
  photoRecords: PhotoRecord[];
  reviewRecords: ReviewRecord[];
  changeLogs: ChangeLog[];
  selectedPointId: string | null;
  timePeriod: TimePeriod;
  filters: Filters;
  isPhotoUploaderOpen: boolean;
}

export interface AppActions {
  setSelectedPointId: (id: string | null) => void;
  setTimePeriod: (period: TimePeriod) => void;
  setFilters: (filters: Partial<Filters>) => void;
  addPhotoRecord: (record: Omit<PhotoRecord, 'id' | 'recordedAt'>) => void;
  updateReviewRecord: (id: string, updates: Partial<ReviewRecord>) => void;
  updatePointStatus: (pointId: string, status: PointStatus) => void;
  togglePhotoUploader: (open: boolean) => void;
  confirmReview: (reviewId: string, confirmed: boolean) => void;
}
