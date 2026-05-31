export interface StorageRecord {
  id: string;
  containerId: string;
  recordDate: string;
  days: number;
  type: 'normal' | 'inspection' | 'holiday';
  dailyRate: number;
  amount: number;
  remark?: string;
  isCrossDay?: boolean;
}

export interface InspectionRecord {
  id: string;
  containerId: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  inspectionType: 'customs' | 'quarantine' | 'security';
  status: 'pending' | 'in_progress' | 'completed';
  remark?: string;
  isCrossDay: boolean;
}

export interface AuditEntry {
  timestamp: string;
  actor: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  remark?: string;
}

export interface WaiverApplication {
  id: string;
  containerId: string;
  waiverType: 'inspection' | 'delay' | 'special' | 'holiday';
  waiverAmount: number;
  waiverPercent: number;
  applyDate: string;
  expireDate: string;
  reason: string;
  applicant: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  ruleVersion: string;
  auditTrail: AuditEntry[];
}

export interface RuleChangeLog {
  id: string;
  ruleId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  changeReason: string;
  changedBy: string;
  changedAt: string;
  affectedContainerIds: string[];
}

export interface WaiverRule {
  id: string;
  ruleName: string;
  ruleType: 'percent' | 'fixed' | 'days';
  value: number;
  condition: string;
  effectiveDate: string;
  version: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  changeLogs: RuleChangeLog[];
}

export interface OperationLog {
  id: string;
  containerId?: string;
  operationType: 'create' | 'update' | 'confirm' | 'export' | 'rule_change' | 'note';
  operator: string;
  detail: string;
  operatedAt: string;
  note?: string;
}

export interface Container {
  id: string;
  containerNo: string;
  containerType: '20GP' | '40GP' | '40HC' | '20RF' | '40RF';
  arrivalDate: string;
  departureDate: string;
  storageDays: number;
  inspectionStatus: 'none' | 'pending' | 'in_progress' | 'completed';
  waiverStatus: 'none' | 'applied' | 'approved' | 'rejected' | 'expired';
  sourceRef: string;
  originalFee: number;
  waivedFee: number;
  finalFee: number;
  status: 'pending' | 'confirmed' | 'exported';
  createdAt: string;
  updatedAt: string;
  storageRecords: StorageRecord[];
  inspectionRecords: InspectionRecord[];
  waiverApplications: WaiverApplication[];
  affectedByRuleChange?: string;
}

export interface AppFilters {
  containerNo?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  waiverStatus?: string;
  inspectionStatus?: string;
}

export interface ExportOptions {
  format: 'xlsx' | 'csv';
  includeRuleChanges: boolean;
  includeAuditTrail: boolean;
  dateFrom?: string;
  dateTo?: string;
}
