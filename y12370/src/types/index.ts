export type DataSourceType = 'room' | 'band' | 'course';

export type ConflictType = 'equipment' | 'teacher_leave' | 'overday' | 'overlap';

export type BookingStatus = 'normal' | 'conflict' | 'resolved';

export type DataChainStep = 'import' | 'conflict_detect' | 'adjust' | 'export';

export type ActionType = 'create' | 'change_room' | 'adjust_time' | 'resolve_conflict' | 'export';

export interface DataChainNode {
  step: DataChainStep;
  timestamp: string;
  source: string;
  version: string;
  dataSnapshot: unknown;
  operator?: string;
  remark?: string;
}

export interface DataSource {
  id: string;
  type: DataSourceType;
  name: string;
  source: string;
  version: string;
  importedAt: string;
  snapshot: unknown;
  recordCount: number;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  equipment: string[];
  sourceId: string;
  version: string;
}

export interface BandMember {
  name: string;
  role: string;
}

export interface Band {
  id: string;
  name: string;
  members: BandMember[];
  requiredEquipment: string[];
  equipmentNeeds: string[];
  sourceId: string;
  version: string;
}

export interface Course {
  id: string;
  name: string;
  teacher: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  sourceId: string;
  version: string;
}

export interface TeacherLeave {
  id: string;
  teacher: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface Booking {
  id: string;
  roomId: string;
  bandId: string;
  courseId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  dataChain: DataChainNode[];
  version: string;
}

export interface Conflict {
  id: string;
  bookingId: string;
  roomId: string;
  courseId: string;
  type: ConflictType;
  description: string;
  affectedBookings: string[];
  affectedBookingIds: string[];
  resolved: boolean;
  detectedAt: string;
  createdAt: string;
  bookingStartTime: string;
  bookingEndTime: string;
  impactAnalysis?: string;
  suggestions?: string[];
}

export interface ChangeHistory {
  id: string;
  bookingId: string;
  actionType: ActionType;
  beforeValue: unknown;
  afterValue: unknown;
  fromValue?: string;
  toValue?: string;
  field?: string;
  operator?: string;
  operatedAt: string;
  timestamp: string;
  remark?: string;
}

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  sourceId: string;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  required: boolean;
}

export interface DiffResult {
  added: unknown[];
  removed: unknown[];
  modified: {
    id: string;
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
}

export interface ExportOptions {
  format: 'xlsx' | 'csv' | 'pdf';
  includeChain: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface HeatmapData {
  roomId: string;
  roomName: string;
  hour: number;
  dayOfWeek: number;
  count: number;
}

export interface TimelineBooking {
  id: string;
  bandName: string;
  roomName: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  conflicts: ConflictType[];
}

export type ViewMode = 'day' | 'week';

export interface BookingExportOptions {
  includeDataChain?: boolean;
}
