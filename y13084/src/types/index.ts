export type RecordType = "normal" | "old_version" | "withdrawn" | "verbal";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type WarehouseZone = "A" | "B" | "C";
export type ReviewStatus = "processed" | "evidence_needed";
export type EvidenceType =
  | "现场照片"
  | "传感器校准证书"
  | "安全距离实测报告"
  | "官方批文"
  | "造价明细单"
  | "环评报告";

export interface SensorRecord {
  id: string;
  sourceRow: number;
  recordType: RecordType;
  timestamp: string;
  zone: WarehouseZone;
  riskLevel: RiskLevel;
  temperature?: number;
  humidity?: number;
  gasConcentration?: number;
  description: string;
  replacedBy?: string;
  withdrawReason?: string;
  affectsConclusions: string[];
}

export interface WarehouseScheme {
  id: string;
  name: string;
  zone: WarehouseZone;
  position: { x: number; y: number; z: number };
  area: number;
  distanceToDock: number;
  distanceToOffice: number;
  riskLevel: RiskLevel;
  cost: number;
  capacity: number;
}

export interface ReviewItem {
  id: string;
  relatedRecordId: string;
  status: ReviewStatus;
  evidenceType?: EvidenceType;
  note?: string;
  updatedAt: string;
}

export interface FilterCondition {
  timeStart: string | null;
  timeEnd: string | null;
  zones: WarehouseZone[];
  riskLevels: RiskLevel[];
  recordTypes: RecordType[];
  searchKeyword: string;
}

export interface TimelineSegment {
  id: string;
  label: string;
  start: string;
  end: string;
  highlight?: boolean;
}

export interface UnifiedResult {
  statistics: {
    totalRecords: number;
    byType: Record<RecordType, number>;
    byRiskLevel: Record<RiskLevel, number>;
    byZone: Record<WarehouseZone, number>;
    schemeComparison: Array<{
      schemeId: string;
      schemeName: string;
      indicators: Record<string, number | string>;
    }>;
  };
  detailTable: SensorRecord[];
  markdownReport: string;
  traceMap: Record<
    string,
    { affectedConclusionIds: string[]; sourceRows: number[] }
  >;
}

export const RECORD_TYPE_LABEL: Record<RecordType, string> = {
  normal: "正式记录",
  old_version: "旧版记录",
  withdrawn: "撤回记录",
  verbal: "口头备注",
};

export const RECORD_TYPE_COLOR: Record<RecordType, string> = {
  normal: "bg-passgreen-400",
  old_version: "bg-deepsea-300",
  withdrawn: "bg-alertyellow-400",
  verbal: "bg-warnorange-400",
};

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  critical: "极高风险",
};

export const RISK_LEVEL_COLOR: Record<RiskLevel, string> = {
  low: "bg-passgreen-400",
  medium: "bg-alertyellow-400",
  high: "bg-warnorange-400",
  critical: "bg-red-500",
};

export const ZONE_LABEL: Record<WarehouseZone, string> = {
  A: "A区-近码头前沿",
  B: "B区-中部堆场",
  C: "C区-远岸后方",
};

export const EVIDENCE_TYPES: EvidenceType[] = [
  "现场照片",
  "传感器校准证书",
  "安全距离实测报告",
  "官方批文",
  "造价明细单",
  "环评报告",
];
