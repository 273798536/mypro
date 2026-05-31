export type UUID = string;

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'WAITLIST'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type ResourceType = 'ROOM' | 'TEACHER' | 'EQUIPMENT';

export type ConflictType =
  | 'ROOM_OVERLAP'
  | 'TEACHER_OVERLAP'
  | 'TEACHER_ON_LEAVE'
  | 'EQUIPMENT_OVERLAP'
  | 'EQUIPMENT_NOT_RETURNED'
  | 'CROSS_DAY_OVERLAP'
  | 'TIME_SLOT_INVALID';

export type ConflictSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface TimeRange {
  startTime: Date;
  endTime: Date;
}

export interface Room {
  id: UUID;
  name: string;
  capacity: number;
  facilities: string[];
  hourlyRate: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Teacher {
  id: UUID;
  name: string;
  instrument: string;
  phone: string;
  email: string;
  hourlyRate: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Equipment {
  id: UUID;
  name: string;
  category: string;
  brand: string;
  serialNumber: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'LOST';
  purchaseDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherLeave {
  id: UUID;
  teacherId: UUID;
  startDate: Date;
  endDate: Date;
  reason: string;
  isHalfDay: boolean;
  halfDayPeriod?: 'AM' | 'PM';
  createdAt: Date;
  updatedAt: Date;
}

export interface EquipmentLoan {
  id: UUID;
  bookingId: UUID;
  equipmentId: UUID;
  borrowerName: string;
  borrowerPhone: string;
  checkoutTime: Date;
  expectedReturnTime: Date;
  actualReturnTime?: Date;
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingResource {
  resourceType: ResourceType;
  resourceId: UUID;
}

export interface Booking {
  id: UUID;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  startTime: Date;
  endTime: Date;
  isCrossDay: boolean;
  status: BookingStatus;
  roomId: UUID;
  teacherId?: UUID;
  equipmentIds: UUID[];
  purpose: string;
  numberOfPeople: number;
  remarks?: string;
  sourceSystem?: 'ROOM_SYSTEM' | 'TEACHER_SYSTEM' | 'MANUAL';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaitlistEntry {
  id: UUID;
  bookingId: UUID;
  roomId: UUID;
  preferredStartTime: Date;
  preferredEndTime: Date;
  priority: number;
  expiresAt: Date;
  createdAt: Date;
}

export interface ConflictDetail {
  type: ConflictType;
  severity: ConflictSeverity;
  resourceType: ResourceType;
  resourceId: UUID;
  resourceName: string;
  message: string;
  humanReadableMessage: string;
  overlappingBookingId?: UUID;
  overlappingBookingInfo?: string;
  leaveRecordId?: UUID;
  loanRecordId?: UUID;
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: ConflictDetail[];
  warnings: ConflictDetail[];
  bookingId?: UUID;
  checkedAt: Date;
}

export interface BookingWithConflicts extends Booking {
  conflictCheck: ConflictCheckResult;
  equipmentLoans: EquipmentLoan[];
}

export interface DailyStats {
  date: string;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  waitlistCount: number;
  conflictCount: number;
  roomUtilization: Record<UUID, number>;
  teacherUtilization: Record<UUID, number>;
}

export interface MonthlyReport {
  month: string;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  noShowCount: number;
  totalRevenue: number;
  topRooms: { roomId: UUID; roomName: string; count: number }[];
  topTeachers: { teacherId: UUID; teacherName: string; count: number }[];
  conflictSummary: { type: ConflictType; count: number }[];
  equipmentLoanStats: { equipmentId: UUID; name: string; loanCount: number; overdueCount: number }[];
  dailyBreakdown: DailyStats[];
}

export interface CreateBookingRequest {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  startTime: string;
  endTime: string;
  roomId: UUID;
  teacherId?: UUID;
  equipmentIds?: UUID[];
  purpose: string;
  numberOfPeople: number;
  remarks?: string;
  sourceSystem?: 'ROOM_SYSTEM' | 'TEACHER_SYSTEM' | 'MANUAL';
  createdBy: string;
}

export interface UpdateBookingRequest {
  startTime?: string;
  endTime?: string;
  roomId?: UUID;
  teacherId?: UUID;
  equipmentIds?: UUID[];
  purpose?: string;
  numberOfPeople?: number;
  remarks?: string;
  status?: BookingStatus;
  updatedBy: string;
}
