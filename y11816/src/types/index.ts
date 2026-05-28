export type TicketType = "group_buy" | "membership" | "channel";
export type ImportSource = "ticket_code" | "redemption_record" | "channel_contract";
export type BatchStatus = "imported" | "processing" | "reviewing" | "exported";
export type AnomalyType = "duplicate_redemption" | "cross_cinema" | "fee_version_mismatch";
export type AnomalySeverity = "high" | "medium" | "low";
export type AnomalyStatus = "pending" | "confirmed" | "released";
export type ReviewAction = "confirm" | "release";

export interface TicketCode {
  id: string;
  code: string;
  type: TicketType;
  cinemaId: string;
  cinemaName: string;
  faceValue: number;
  createdAt: number;
  updatedAt: number;
}

export interface RedemptionRecord {
  id: string;
  ticketCode: string;
  cinemaId: string;
  cinemaName: string;
  redemptionTime: number;
  channelId: string;
  channelName: string;
  importBatchId: string;
  sequenceOrder: number;
  amount: number;
}

export interface ChannelContract {
  id: string;
  channelId: string;
  channelName: string;
  serviceFeeRate: number;
  feeVersion: string;
  validFrom: number;
  validTo: number;
  importBatchId: string;
  sequenceOrder: number;
  isSupplementary: boolean;
  importTime: number;
}

export interface ImportBatch {
  id: string;
  source: ImportSource;
  sourceLabel: string;
  importTime: number;
  recordCount: number;
  isSupplementary: boolean;
  sequenceOrder: number;
  fileName?: string;
}

export interface ProcessBatch {
  id: string;
  status: BatchStatus;
  statusLabel: string;
  createdAt: number;
  processedAt: number | null;
  previousBatchId: string | null;
  importBatchIds: string[];
  name: string;
}

export interface AnomalyRecord {
  id: string;
  batchId: string;
  type: AnomalyType;
  typeLabel: string;
  ticketCode: string;
  cinemaId: string;
  cinemaName: string;
  details: string;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  statusLabel: string;
  reviewReason?: string;
  reviewedAt?: number;
  channelId?: string;
  channelName?: string;
  redemptionIds?: string[];
  expectedFeeVersion?: string;
  actualFeeVersion?: string;
}

export interface DuplicateRecord {
  ticketCode: string;
  records: RedemptionRecord[];
  keptRecord: RedemptionRecord;
  discardedRecords: RedemptionRecord[];
  reason: string;
}

export interface DeduplicationResult {
  totalCodes: number;
  uniqueCodes: number;
  duplicateCount: number;
  duplicates: DuplicateRecord[];
}

export interface AnomalyDetectionResult {
  anomalies: AnomalyRecord[];
  byType: Record<AnomalyType, number>;
  totalCount: number;
  pendingCount: number;
}

export interface AffectedRecord {
  id: string;
  ticketCode: string;
  changeType: "added" | "removed" | "modified";
  changedFields: string[];
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  impact: string;
}

export interface ChangeTrackingResult {
  affectedRecords: AffectedRecord[];
  summary: { added: number; removed: number; modified: number };
  totalImpact: number;
}

export interface ChannelAllocation {
  id: string;
  batchId: string;
  channelId: string;
  channelName: string;
  totalAmount: number;
  serviceFeeRate: number;
  serviceFee: number;
  netAmount: number;
  feeVersion: string;
  ticketCount: number;
  calculationFormula: string;
}

export interface AllocationResult {
  channelAllocations: ChannelAllocation[];
  totalAmount: number;
  totalServiceFee: number;
  totalNetAmount: number;
  totalTicketCount: number;
}

export interface InconsistencyRecord {
  id: string;
  batchId: string;
  type: "fee_mismatch" | "amount_mismatch" | "version_mismatch";
  channelId: string;
  channelName: string;
  allocationValue: number;
  reportValue: number;
  difference: number;
  rootCause: string;
}

export interface ConsistencyCheckResult {
  isConsistent: boolean;
  inconsistencies: InconsistencyRecord[];
  checkTime: number;
}

export interface TraceStep {
  step: string;
  value: number;
  expected: number;
  source: string;
  timestamp: number;
}

export interface InconsistencyTrace {
  recordId: string;
  chain: TraceStep[];
  rootCause: string;
  affectedContracts: string[];
}

export interface SettlementSheet {
  id: string;
  channelId: string;
  channelName: string;
  batchId: string;
  period: string;
  totalAmount: number;
  serviceFee: number;
  netAmount: number;
  feeVersion: string;
  serviceFeeRate: number;
  details: RedemptionRecord[];
  generatedAt: number;
}

export interface ExportRecord {
  id: string;
  batchId: string;
  exportTime: number;
  fileHash: string;
  validated: boolean;
  fileName: string;
  fileSize: number;
}

export interface ExportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  checkTime: number;
}

export interface ExportDiff {
  exportIdA: string;
  exportIdB: string;
  diffRecords: Array<{
    rowIndex: number;
    field: string;
    valueA: unknown;
    valueB: unknown;
  }>;
  summary: {
    totalDifferences: number;
    addedRows: number;
    removedRows: number;
    modifiedRows: number;
  };
}

export interface AnomalyFilter {
  types?: AnomalyType[];
  cinemaId?: string;
  dateRange?: [number, number];
  status?: AnomalyStatus;
  severity?: AnomalySeverity;
}

export interface DeduplicationReview {
  ticketCode: string;
  allRedemptions: RedemptionRecord[];
  dedupDecision: string;
  keptRecord: RedemptionRecord;
  discardedRecords: RedemptionRecord[];
  decisionTime: number;
}

export interface ReviewActionLog {
  id: string;
  anomalyId: string;
  action: ReviewAction;
  reason: string;
  operator: string;
  timestamp: number;
}

export interface ChangeLog {
  id: string;
  batchId: string;
  ticketCode: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedAt: number;
  operator: string;
}

export interface ParsedFile {
  name: string;
  size: number;
  type: string;
  data: Record<string, unknown>[];
}

export interface ImportResult {
  batchId: string;
  successCount: number;
  failCount: number;
  errors: Array<{ row: number; message: string }>;
}
