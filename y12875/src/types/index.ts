export type DataQuality = "available" | "pending" | "recollect";

export type ReviewStatus = "pending" | "approved";

export type BuoyField =
  | "plasticConcentration"
  | "turbidity"
  | "salinity"
  | "temperature";

export interface BuoyRecord {
  id: string;
  buoyId: string;
  timestamp: string;
  location: string;
  plasticConcentration: number | null;
  turbidity: number | null;
  salinity: number | null;
  temperature: number | null;
  rawRemark?: string;
  extractedRemark?: string;
  quality: DataQuality;
  qualityReasons: string[];
  reviewStatus: ReviewStatus;
  isDuplicate: boolean;
  duplicateOf?: string;
  hasNullValue: boolean;
  nullFields: string[];
}

export interface CorrectionLog {
  id: string;
  buoyRecordId: string;
  fieldName: BuoyField | "remark";
  fieldLabel: string;
  oldValue: number | string | null;
  newValue: number | string | null;
  operator: string;
  timestamp: string;
  remark: string;
  sourceMaterial?: string;
}

export interface WaterQualityWarning {
  id: string;
  indicatorName: string;
  indicatorCode: string;
  currentValue: number;
  unit: string;
  threshold: number;
  formula: string;
  formulaDescription: string;
  applicableScope: string;
  failureReason: string;
  isTriggered: boolean;
  severity: "low" | "medium" | "high";
  variables: { name: string; label: string; value: number | null; unit: string }[];
}

export interface QualityStat {
  available: number;
  pending: number;
  recollect: number;
  total: number;
}

export type DisplayClassification = "direct_use" | "needs_review";

export const FIELD_LABELS: Record<BuoyField | "remark", string> = {
  plasticConcentration: "塑料浓度",
  turbidity: "浊度",
  salinity: "盐度",
  temperature: "水温",
  remark: "备注",
};

export const FIELD_UNITS: Record<BuoyField, string> = {
  plasticConcentration: "个/m³",
  turbidity: "NTU",
  salinity: "PSU",
  temperature: "°C",
};
