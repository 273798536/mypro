export interface Photo {
  id: string;
  originalName: string;
  systemName: string;
  url: string;
  latitude: number;
  longitude: number;
  address: string;
  takenAt: string;
  isNameMismatch: boolean;
  source: string;
}

export interface Complaint {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  status: 'pending' | 'processing' | 'resolved';
  photos: Photo[];
  createdAt: string;
  updatedAt: string;
  hasCoordinateOffset: boolean;
  offsetDistance: number;
  changeHistory: ChangeRecord[];
}

export interface ChangeRecord {
  id: string;
  timestamp: string;
  type: 'photo_add' | 'coordinate_fix' | 'status_update' | 'rerun';
  description: string;
  beforeValue: string;
  afterValue: string;
}

export interface SystemStatus {
  lastProcessedAt: string;
  currentComplaintId: string | null;
  reportVersion: number;
}

export interface SeedResponse {
  success: boolean;
  message: string;
  complaintsCreated: number;
}

export interface RerunResponse {
  success: boolean;
  message: string;
  photosChecked: number;
  nameMismatchesFound: number;
  coordinateOffsetsFound: number;
}

export interface AddPhotoRequest {
  originalName: string;
  systemName: string;
  url: string;
  latitude: number;
  longitude: number;
  address: string;
  source: string;
}
