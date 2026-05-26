export enum TicketStatus {
  CREATED = 'created',
  ASSIGNED = 'assigned',
  PROCESSING = 'processing',
  ESCALATED = 'escalated',
  COMPENSATION_APPROVING = 'compensation_approving',
  COMPENSATION_APPROVED = 'compensation_approved',
  COMPENSATION_REJECTED = 'compensation_rejected',
  FROZEN = 'frozen',
  SETTLED = 'settled',
  ARCHIVED = 'archived',
  CLOSED = 'closed'
}

export enum AssignmentType {
  AUTO = 'auto',
  MANUAL = 'manual',
  ESCALATION = 'escalation'
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum FrozenType {
  REVIEW = 'review',
  DISPUTE = 'dispute',
  RISK = 'risk'
}

export enum BatchStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  REVIEWING = 'reviewing',
  PROCESSED = 'processed',
  FROZEN = 'frozen',
  ARCHIVED = 'archived'
}

export interface SLARule {
  id: string;
  ticketType: string;
  priority: string;
  firstResponseTime: number;
  resolutionTime: number;
  escalationThreshold: number;
  createdAt: Date;
}

export interface CompensationRule {
  id: string;
  issueType: string;
  baseAmount: number;
  maxAmount: number;
  multiplier: number;
  createdAt: Date;
}

export interface SessionSummary {
  ticketId: string;
  customerId: string;
  issueType: string;
  severity: string;
  description: string;
  initialContactTime: Date;
  expectedResolutionTime: Date;
  agentId?: string;
}

export interface CompensationApproval {
  id: string;
  ticketId: string;
  requestedAmount: number;
  approvedAmount?: number;
  status: ApprovalStatus;
  reason: string;
  approverId?: string;
  approvedAt?: Date;
  createdAt: Date;
}

export interface InventoryDifference {
  id: string;
  ticketId: string;
  productId: string;
  expectedQuantity: number;
  actualQuantity: number;
  difference: number;
  reason?: string;
  createdAt: Date;
}

export interface AssignmentRecord {
  id: string;
  ticketId: string;
  fromAgentId?: string;
  toAgentId: string;
  assignmentType: AssignmentType;
  reason?: string;
  assignedBy?: string;
  assignedAt: Date;
  expectedCompleteTime?: Date;
}

export interface TimeoutRecord {
  id: string;
  ticketId: string;
  assignmentId: string;
  agentId: string;
  timeoutType: 'response' | 'resolution' | 'escalation';
  duration: number;
  blameLevel: number;
  createdAt: Date;
}

export interface Ticket {
  id: string;
  batchId?: string;
  status: TicketStatus;
  sessionSummary: SessionSummary;
  slaRuleId: string;
  currentAgentId?: string;
  assignmentHistory: AssignmentRecord[];
  compensationApprovals: CompensationApproval[];
  inventoryDifferences: InventoryDifference[];
  timeoutRecords: TimeoutRecord[];
  totalCompensation: number;
  statusBeforeFrozen?: TicketStatus;
  frozenReason?: string;
  frozenType?: FrozenType;
  frozenBy?: string;
  frozenAt?: Date;
  settledAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface Batch {
  id: string;
  name: string;
  status: BatchStatus;
  ticketCount: number;
  totalAmount: number;
  frozenCount: number;
  settledCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface StateTransition {
  id: string;
  ticketId: string;
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  reason: string;
  operatorId: string;
  operatorName?: string;
  manual: boolean;
  metadata?: Record<string, any>;
  reviewResult?: string;
  reviewComments?: string;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  entityType: 'ticket' | 'batch' | 'approval';
  entityId: string;
  action: string;
  oldValue?: any;
  newValue?: any;
  operatorId: string;
  operatorName?: string;
  ipAddress?: string;
  createdAt: Date;
}

export interface FailedRecord {
  id: string;
  batchId?: string;
  ticketId?: string;
  recordType: 'ticket' | 'batch' | 'export';
  rawData: string;
  errorCode: string;
  errorMessage: string;
  failedAt: Date;
  retried?: boolean;
  retriedAt?: Date;
}

export interface ExportRequest {
  id: string;
  batchId?: string;
  filters?: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  totalRecords: number;
  successCount: number;
  failedCount: number;
  requestedBy: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface CreateTicketRequest {
  sessionSummary: Omit<SessionSummary, 'ticketId'>;
  slaRuleId: string;
  batchId?: string;
  createdBy: string;
}

export interface ReassignTicketRequest {
  ticketId: string;
  toAgentId: string;
  assignmentType: AssignmentType;
  reason?: string;
  operatorId: string;
}

export interface CompensationRequest {
  ticketId: string;
  requestedAmount: number;
  reason: string;
  operatorId: string;
}

export interface FreezeTicketRequest {
  ticketId: string;
  frozenType: FrozenType;
  reason: string;
  operatorId: string;
}

export interface ReviewDecision {
  ticketId: string;
  approved: boolean;
  approvedAmount?: number;
  reason: string;
  operatorId: string;
}
