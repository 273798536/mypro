export enum LedgerStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  REJECTED = 'rejected',
  CONFIRMED = 'confirmed',
  AUDIT_ONLY = 'audit_only'
}

export enum DataSource {
  CALENDAR = 'calendar',
  ACCESS_CARD = 'access_card',
  CANCEL_MESSAGE = 'cancel_message',
  HANDOVER_PAPER = 'handover_paper',
  CUSTOMER_SERVICE = 'customer_service'
}

export enum ImportStrategy {
  IGNORE = 'ignore',
  OVERWRITE = 'overwrite',
  APPEND = 'append'
}

export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  WAIT_RETRY = 'wait_retry',
  WAIT_MANUAL = 'wait_manual',
  PERMANENT_FAILED = 'permanent_failed',
  COMPLETED = 'completed'
}

export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  OPERATOR = 'operator',
  AUDITOR = 'auditor',
  GUEST = 'guest'
}

export interface MeetingLedger {
  id: string;
  meetingId: string;
  meetingTitle: string;
  roomName: string;
  startTime: string;
  endTime: string;
  organizer: string;
  participants: string[];
  status: LedgerStatus;
  hasTeaBreak: boolean;
  hasEquipment: boolean;
  teaBreakCost: number;
  equipmentCost: number;
  isCanceled: boolean;
  cancelTime?: string;
  cancelReason?: string;
  dataSources: DataSource[];
  customerServiceNotes: string[];
  accessRecords: AccessRecord[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  version: number;
}

export interface AccessRecord {
  cardNumber: string;
  personName: string;
  swipeTime: string;
  room: string;
}

export interface ChangeRecord {
  id: string;
  ledgerId: string;
  version: number;
  action: string;
  operatorId: string;
  operatorName: string;
  changeReason: string;
  beforeData: Partial<MeetingLedger>;
  afterData: Partial<MeetingLedger>;
  diffSummary: string;
  changedFields: string[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: Role;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  denyReason?: string;
  requestData?: string;
  createdAt: string;
}

export interface AsyncTask {
  id: string;
  type: string;
  status: TaskStatus;
  payload: string;
  result?: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
