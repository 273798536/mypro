export interface RouteCorridor {
  id: string;
  name: string;
  code: string;
  startPoint: string;
  endPoint: string;
  length: number;
  altitudeMin: number;
  altitudeMax: number;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionRecord {
  id: string;
  corridorId: string;
  recordDate: string;
  recordType: 'normal' | 'abnormal' | 'temporary';
  title: string;
  description: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'modified';
  isOverlapping: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface MaterialVersion {
  id: string;
  recordId: string;
  version: number;
  materialType: 'photo' | 'document' | 'note' | 'screenshot';
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  remark?: string;
  isCaliberModified: boolean;
  modifiedDescription?: string;
  createdAt: string;
  createdBy: string;
}

export interface ManualNote {
  id: string;
  recordId: string;
  content: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface HistoryChange {
  id: string;
  recordId: string;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  changeType: 'create' | 'update' | 'confirm' | 'reject' | 'status_change';
  changedBy: string;
  changedAt: string;
  remark?: string;
}

export interface FilterCriteria {
  corridorId?: string;
  startDate?: string;
  endDate?: string;
  recordType?: InspectionRecord['recordType'][];
  status?: InspectionRecord['status'][];
  isOverlapping?: boolean;
  searchKeyword?: string;
}

export interface ScreenshotExport {
  id: string;
  recordId?: string;
  filterCriteria: FilterCriteria;
  imageUrl: string;
  annotation?: string;
  remark?: string;
  createdAt: string;
  createdBy: string;
}

export interface User {
  id: string;
  name: string;
  role: 'manager' | 'inspector' | 'viewer';
  avatar?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
