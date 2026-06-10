export type Role = "monitor" | "teacher" | "student";

export type BatchStatus = "draft" | "review" | "published" | "retest";

export type SolventType = "ETOH" | "ACE" | "MEOH" | "HEX" | "DCM";

export interface SolventMeta {
  code: SolventType;
  name: string;
  abbreviation: string;
  boilingPoint: number;
  standardPurity: number;
}

export const SOLVENT_META: Record<SolventType, SolventMeta> = {
  ETOH: { code: "ETOH", name: "乙醇", abbreviation: "ETOH", boilingPoint: 78.4, standardPurity: 95.0 },
  ACE: { code: "ACE", name: "丙酮", abbreviation: "ACE", boilingPoint: 56.1, standardPurity: 99.0 },
  MEOH: { code: "MEOH", name: "甲醇", abbreviation: "MEOH", boilingPoint: 64.7, standardPurity: 98.5 },
  HEX: { code: "HEX", name: "正己烷", abbreviation: "HEX", boilingPoint: 68.7, standardPurity: 97.0 },
  DCM: { code: "DCM", name: "二氯甲烷", abbreviation: "DCM", boilingPoint: 39.6, standardPurity: 99.5 },
};

export interface ReactionCondition {
  id: string;
  name: string;
  value: string;
  unit: string;
  category: "temperature" | "time" | "pressure" | "catalyst" | "other";
}

export interface Version {
  versionId: string;
  batchId: string;
  versionNum: number;
  purityResult: number;
  explanation: string;
  modifiedBy: Role;
  modifiedAt: string;
  changeNote: string;
  isPublished: boolean;
}

export interface TempPoint {
  tempId: string;
  batchId: string;
  timeMin: number;
  tempC: number;
}

export interface PhPoint {
  phId: string;
  batchId: string;
  timeMin: number;
  phValue: number;
  isOutOfRange: boolean;
}

export interface RecordStep {
  recordId: string;
  batchId: string;
  stepName: string;
  value: number;
  unit: string;
  note: string;
}

export type RetestReason = "purity_low" | "ph_out" | "temp_curve" | "data_missing" | "other";

export interface RetestAdvice {
  retestId: string;
  batchId: string;
  reason: RetestReason;
  description: string;
  action: string;
  priority: "high" | "medium" | "low";
  resolved: boolean;
}

export interface Batch {
  batchId: string;
  solventType: SolventType;
  initialAmount: number;
  targetPurity: number;
  recoveredAmount: number;
  status: BatchStatus;
  createdBy: Role;
  createdAt: string;
  reactionConditions: ReactionCondition[];
  versions: Version[];
  tempCurve: TempPoint[];
  phLogs: PhPoint[];
  steps: RecordStep[];
  retestAdvices: RetestAdvice[];
}

export interface BalanceResult {
  theoreticalRecovery: number;
  theoreticalAmount: number;
  energyEstimateKwh: number;
  timeEstimateMin: number;
  phRange: [number, number];
  warnings: string[];
}

export const STATUS_LABEL: Record<BatchStatus, string> = {
  draft: "草稿",
  review: "复核中",
  published: "已发布",
  retest: "待复测",
};

export const STATUS_BADGE: Record<BatchStatus, string> = {
  draft: "bg-ink-100 text-ink-700",
  review: "bg-lab-50 text-lab-700",
  published: "bg-chem-50 text-chem-700",
  retest: "bg-warn-50 text-warn-700",
};

export const RETEST_REASON_LABEL: Record<RetestReason, string> = {
  purity_low: "纯度未达标",
  ph_out: "pH越界",
  temp_curve: "温度曲线异常",
  data_missing: "关键数据缺失",
  other: "其他原因",
};

export const ROLE_LABEL: Record<Role, string> = {
  monitor: "环境监测员",
  teacher: "老师/工程师",
  student: "学生",
};

export const purityColor = (p: number): string => {
  if (p >= 95) return "text-chem-600";
  if (p >= 90) return "text-warn-600";
  return "text-alert-600";
};

export const purityBg = (p: number): string => {
  if (p >= 95) return "bg-chem-500";
  if (p >= 90) return "bg-warn-500";
  return "bg-alert-500";
};
