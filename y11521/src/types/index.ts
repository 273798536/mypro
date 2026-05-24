export type Role = 'entry' | 'review' | 'supervisor' | 'readonly';

export type SourceType = 'appointment' | 'location' | 'review' | 'price_adjustment';

export type DirtyType = 
  | 'missing_field'
  | 'cross_day'
  | 'name_changed'
  | 'amount_conflict'
  | 'quantity_conflict'
  | 'duplicate'
  | 'merge_conflict';

export type RecordStatus = 
  | 'pending'
  | 'dirty'
  | 'fixed'
  | 'approved'
  | 'rejected'
  | 'merged';

export interface AppointmentRecord {
  id: string;
  orderNo: string;
  customerName: string;
  phone: string;
  address: string;
  applianceType: string;
  appointmentDate: string;
  appointmentTime: string;
  technicianId?: string;
  technicianName?: string;
  status: string;
  source: SourceType;
  rawRow?: number;
  sourceFile?: string;
}

export interface LocationRecord {
  id: string;
  orderNo: string;
  technicianId: string;
  technicianName: string;
  checkinTime: string;
  checkoutTime?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  source: SourceType;
  rawRow?: number;
  sourceFile?: string;
}

export interface ReviewRecord {
  id: string;
  orderNo: string;
  customerName: string;
  rating: number;
  reviewContent: string;
  reviewDate: string;
  badReason?: string;
  technicianId?: string;
  technicianName?: string;
  source: SourceType;
  rawRow?: number;
  sourceFile?: string;
}

export interface PriceAdjustmentRecord {
  id: string;
  orderNo: string;
  originalAmount: number;
  adjustedAmount: number;
  adjustmentReason: string;
  operator: string;
  adjustmentDate: string;
  source: SourceType;
  rawRow?: number;
  sourceFile?: string;
}

export type DataRecord = AppointmentRecord | LocationRecord | ReviewRecord | PriceAdjustmentRecord;

export interface DirtyRecord {
  id: string;
  recordId: string;
  sourceType: SourceType;
  dirtyType: DirtyType;
  description: string;
  missingFields?: string[];
  originalData: Record<string, any>;
  suggestedFix?: Record<string, any>;
  status: RecordStatus;
  fixNote?: string;
  fixedBy?: string;
  fixedAt?: string;
  createdAt: string;
  rawRow?: number;
  sourceFile?: string;
}

export interface ImportHistory {
  id: string;
  fileName: string;
  sourceType: SourceType;
  importedBy: string;
  importedAt: string;
  totalRecords: number;
  successCount: number;
  dirtyCount: number;
  batchId: string;
  isArchive: boolean;
}

export interface OperationLog {
  id: string;
  operation: string;
  recordId?: string;
  userId: string;
  userName: string;
  role: Role;
  beforeData?: Record<string, any>;
  afterData?: Record<string, any>;
  timestamp: string;
  batchId?: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: Role;
  name: string;
  department?: string;
  createdAt: string;
}

export interface DatabaseSchema {
  users: User[];
  appointments: AppointmentRecord[];
  locations: LocationRecord[];
  reviews: ReviewRecord[];
  priceAdjustments: PriceAdjustmentRecord[];
  dirtyRecords: DirtyRecord[];
  importHistory: ImportHistory[];
  operationLogs: OperationLog[];
  currentUser?: User;
  initialized: boolean;
  initializedAt: string;
}

export interface FieldPermission {
  visible: boolean;
  editable: boolean;
}

export interface PermissionConfig {
  [role: string]: {
    fields: {
      [key: string]: FieldPermission;
    };
    actions: string[];
  };
}

export interface DiffResult {
  field: string;
  oldValue: any;
  newValue: any;
  type: 'added' | 'removed' | 'changed';
}

export interface CheckReport {
  totalRecords: number;
  dirtyRecords: number;
  byDirtyType: {
    [key in DirtyType]?: number;
  };
  bySourceType: {
    [key in SourceType]?: number;
  };
  dirtyList: DirtyRecord[];
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  includeDirty: boolean;
  includeRaw: boolean;
  sourceTypes?: SourceType[];
  dateRange?: {
    start: string;
    end: string;
  };
}
