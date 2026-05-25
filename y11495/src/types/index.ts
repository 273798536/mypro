export const BatchStatus = {
  DRAFT: 'DRAFT',
  PROCESSING: 'PROCESSING',
  REVIEWING: 'REVIEWING',
  FROZEN: 'FROZEN',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ARCHIVED: 'ARCHIVED',
  WITHDRAWN: 'WITHDRAWN',
} as const;

export type BatchStatusType = typeof BatchStatus[keyof typeof BatchStatus];

export const ExceptionType = {
  DUPLICATE_INVOICE: 'DUPLICATE_INVOICE',
  DUPLICATE_ACCOMMODATION: 'DUPLICATE_ACCOMMODATION',
  DUPLICATE_TRANSPORTATION: 'DUPLICATE_TRANSPORTATION',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  DATE_OVERLAP: 'DATE_OVERLAP',
  MULTIPLE_PERSON_SHARE: 'MULTIPLE_PERSON_SHARE',
  MISSING_DOCUMENT: 'MISSING_DOCUMENT',
  SUSPICIOUS_ROUNDING: 'SUSPICIOUS_ROUNDING',
} as const;

export type ExceptionTypeType = typeof ExceptionType[keyof typeof ExceptionType];

export const ExceptionStatus = {
  DETECTED: 'DETECTED',
  CONFIRMED: 'CONFIRMED',
  DISPUTED: 'DISPUTED',
  OVERRULED: 'OVERRULED',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
} as const;

export type ExceptionStatusType = typeof ExceptionStatus[keyof typeof ExceptionStatus];

export const SourceFileType = {
  INVOICE_PDF: 'INVOICE_PDF',
  TRAVEL_APPLICATION: 'TRAVEL_APPLICATION',
  PAYMENT_RECORD: 'PAYMENT_RECORD',
  STORE_HANDOVER: 'STORE_HANDOVER',
  CUSTOMER_SERVICE_NOTE: 'CUSTOMER_SERVICE_NOTE',
} as const;

export type SourceFileTypeType = typeof SourceFileType[keyof typeof SourceFileType];

export const UserRole = {
  CLERK: 'CLERK',
  REVIEWER: 'REVIEWER',
  FINANCE_MANAGER: 'FINANCE_MANAGER',
  ADMIN: 'ADMIN',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export const AuditAction = {
  BATCH_CREATE: 'BATCH_CREATE',
  BATCH_SUBMIT: 'BATCH_SUBMIT',
  BATCH_VIEW: 'BATCH_VIEW',
  BATCH_WITHDRAW: 'BATCH_WITHDRAW',
  BATCH_FREEZE: 'BATCH_FREEZE',
  BATCH_UNFREEZE: 'BATCH_UNFREEZE',
  BATCH_APPROVE: 'BATCH_APPROVE',
  BATCH_REJECT: 'BATCH_REJECT',
  BATCH_ARCHIVE: 'BATCH_ARCHIVE',
  FILE_UPLOAD: 'FILE_UPLOAD',
  FILE_DELETE: 'FILE_DELETE',
  EXCEPTION_DETECT: 'EXCEPTION_DETECT',
  EXCEPTION_CONFIRM: 'EXCEPTION_CONFIRM',
  EXCEPTION_OVERRULE: 'EXCEPTION_OVERRULE',
  EXCEPTION_DISMISS: 'EXCEPTION_DISMISS',
  EXCEPTION_DISPUTE: 'EXCEPTION_DISPUTE',
  EXPORT_REQUEST: 'EXPORT_REQUEST',
  BATCH_EXPORT: 'BATCH_EXPORT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const;

export type AuditActionType = typeof AuditAction[keyof typeof AuditAction];

export interface UserContext {
  userId: string;
  username: string;
  role: UserRoleType;
  ipAddress?: string;
}

export interface BatchCreateRequest {
  title: string;
  description?: string;
  periodStart?: Date;
  periodEnd?: Date;
}

export interface StateTransition {
  from: BatchStatusType[];
  to: BatchStatusType;
  allowedRoles: UserRoleType[];
  action: AuditActionType;
}

export interface ParsedInvoice {
  invoiceNo: string;
  invoiceDate: Date;
  amount: number;
  taxAmount?: number;
  totalAmount: number;
  sellerName?: string;
  sellerTaxNo?: string;
  buyerName?: string;
  buyerTaxNo?: string;
  invoiceType?: string;
  travelDateStart?: Date;
  travelDateEnd?: Date;
  hotelName?: string;
  checkInDate?: Date;
  checkOutDate?: Date;
  guestNames?: string;
  rawData: Record<string, any>;
}

export interface ParsedTravelApp {
  appNo: string;
  applicant: string;
  department: string;
  travelStart: Date;
  travelEnd: Date;
  destination: string;
  purpose?: string;
  travelers?: string;
  estimatedAccommodation?: number;
  estimatedTransport?: number;
  estimatedOther?: number;
  estimatedTotal?: number;
  rawData: Record<string, any>;
}

export interface ParsedPayment {
  paymentNo: string;
  paymentDate: Date;
  payee?: string;
  amount: number;
  paymentMethod?: string;
  remark?: string;
  relatedInvoiceNo?: string;
  relatedAppNo?: string;
  rawData: Record<string, any>;
}

export interface DetectedException {
  type: ExceptionTypeType;
  severity: number;
  description: string;
  invoiceIds: string[];
  details?: Record<string, any>;
}

export interface ReviewDecision {
  exceptionId: string;
  status: ExceptionStatusType;
  note?: string;
  reason?: string;
}

export const STATE_TRANSITIONS: StateTransition[] = [
  {
    from: [BatchStatus.DRAFT],
    to: BatchStatus.PROCESSING,
    allowedRoles: [UserRole.CLERK, UserRole.REVIEWER, UserRole.FINANCE_MANAGER, UserRole.ADMIN],
    action: AuditAction.BATCH_SUBMIT
  },
  {
    from: [BatchStatus.PROCESSING],
    to: BatchStatus.REVIEWING,
    allowedRoles: [UserRole.REVIEWER, UserRole.FINANCE_MANAGER, UserRole.ADMIN],
    action: AuditAction.BATCH_SUBMIT
  },
  {
    from: [BatchStatus.DRAFT, BatchStatus.PROCESSING, BatchStatus.REVIEWING],
    to: BatchStatus.FROZEN,
    allowedRoles: [UserRole.FINANCE_MANAGER, UserRole.ADMIN],
    action: AuditAction.BATCH_FREEZE
  },
  {
    from: [BatchStatus.FROZEN],
    to: BatchStatus.REVIEWING,
    allowedRoles: [UserRole.FINANCE_MANAGER, UserRole.ADMIN],
    action: AuditAction.BATCH_UNFREEZE
  },
  {
    from: [BatchStatus.REVIEWING, BatchStatus.FROZEN],
    to: BatchStatus.APPROVED,
    allowedRoles: [UserRole.FINANCE_MANAGER, UserRole.ADMIN],
    action: AuditAction.BATCH_APPROVE
  },
  {
    from: [BatchStatus.REVIEWING, BatchStatus.FROZEN],
    to: BatchStatus.REJECTED,
    allowedRoles: [UserRole.FINANCE_MANAGER, UserRole.ADMIN],
    action: AuditAction.BATCH_REJECT
  },
  {
    from: [BatchStatus.DRAFT, BatchStatus.PROCESSING, BatchStatus.REVIEWING],
    to: BatchStatus.WITHDRAWN,
    allowedRoles: [UserRole.CLERK, UserRole.REVIEWER, UserRole.FINANCE_MANAGER, UserRole.ADMIN],
    action: AuditAction.BATCH_WITHDRAW
  },
  {
    from: [BatchStatus.WITHDRAWN],
    to: BatchStatus.DRAFT,
    allowedRoles: [UserRole.CLERK, UserRole.REVIEWER, UserRole.FINANCE_MANAGER, UserRole.ADMIN],
    action: AuditAction.BATCH_SUBMIT
  },
  {
    from: [BatchStatus.APPROVED, BatchStatus.REJECTED, BatchStatus.WITHDRAWN],
    to: BatchStatus.ARCHIVED,
    allowedRoles: [UserRole.FINANCE_MANAGER, UserRole.ADMIN],
    action: AuditAction.BATCH_ARCHIVE
  }
];

export const ROLE_PERMISSIONS: Record<UserRoleType, AuditActionType[]> = {
  [UserRole.CLERK]: [
    AuditAction.BATCH_CREATE,
    AuditAction.BATCH_VIEW,
    AuditAction.BATCH_SUBMIT,
    AuditAction.BATCH_WITHDRAW,
    AuditAction.FILE_UPLOAD,
    AuditAction.FILE_DELETE,
    AuditAction.EXPORT_REQUEST,
  ],
  [UserRole.REVIEWER]: [
    AuditAction.BATCH_CREATE,
    AuditAction.BATCH_VIEW,
    AuditAction.BATCH_SUBMIT,
    AuditAction.BATCH_WITHDRAW,
    AuditAction.FILE_UPLOAD,
    AuditAction.EXCEPTION_DETECT,
    AuditAction.EXCEPTION_CONFIRM,
    AuditAction.EXCEPTION_DISMISS,
    AuditAction.EXCEPTION_DISPUTE,
    AuditAction.EXPORT_REQUEST,
  ],
  [UserRole.FINANCE_MANAGER]: [
    AuditAction.BATCH_CREATE,
    AuditAction.BATCH_VIEW,
    AuditAction.BATCH_SUBMIT,
    AuditAction.BATCH_WITHDRAW,
    AuditAction.BATCH_FREEZE,
    AuditAction.BATCH_UNFREEZE,
    AuditAction.BATCH_APPROVE,
    AuditAction.BATCH_REJECT,
    AuditAction.BATCH_ARCHIVE,
    AuditAction.FILE_UPLOAD,
    AuditAction.FILE_DELETE,
    AuditAction.EXCEPTION_DETECT,
    AuditAction.EXCEPTION_CONFIRM,
    AuditAction.EXCEPTION_OVERRULE,
    AuditAction.EXCEPTION_DISMISS,
    AuditAction.EXPORT_REQUEST,
    AuditAction.BATCH_EXPORT,
  ],
  [UserRole.ADMIN]: Object.values(AuditAction)
};
