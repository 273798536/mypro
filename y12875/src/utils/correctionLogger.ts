import { BuoyField, CorrectionLog, FIELD_LABELS } from "@/types";

export interface CreateCorrectionParams {
  buoyRecordId: string;
  fieldName: BuoyField | "remark";
  oldValue: number | string | null;
  newValue: number | string | null;
  operator: string;
  remark: string;
  sourceMaterial?: string;
}

export function createCorrectionLog(
  params: CreateCorrectionParams
): CorrectionLog {
  return {
    id: `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    buoyRecordId: params.buoyRecordId,
    fieldName: params.fieldName,
    fieldLabel: FIELD_LABELS[params.fieldName],
    oldValue: params.oldValue,
    newValue: params.newValue,
    operator: params.operator,
    timestamp: new Date().toISOString(),
    remark: params.remark,
    sourceMaterial: params.sourceMaterial,
  };
}

export function formatValue(
  value: number | string | null,
  fieldName: BuoyField | "remark"
): string {
  if (value === null || value === undefined) return "—（空值）";
  if (fieldName === "remark") return String(value);
  return String(value);
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}
