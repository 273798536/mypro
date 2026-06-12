import { BuoyRecord, DataQuality, BuoyField } from "@/types";
import { hasMixedContent } from "./remarkParser";

const NUMERIC_FIELDS: BuoyField[] = [
  "plasticConcentration",
  "turbidity",
  "salinity",
  "temperature",
];

export interface QualityDetectionResult {
  quality: DataQuality;
  reasons: string[];
  nullFields: string[];
  hasNullValue: boolean;
}

export function detectNullFields(record: Partial<BuoyRecord>): string[] {
  const nullFields: string[] = [];
  for (const field of NUMERIC_FIELDS) {
    if (record[field] === null || record[field] === undefined) {
      nullFields.push(field);
    }
  }
  return nullFields;
}

export function detectDuplicates(records: BuoyRecord[]): Map<string, string> {
  const seen = new Map<string, string>();
  const duplicates = new Map<string, string>();

  for (const record of records) {
    const key = `${record.buoyId}-${record.timestamp}`;
    if (seen.has(key)) {
      duplicates.set(record.id, seen.get(key)!);
    } else {
      seen.set(key, record.id);
    }
  }

  return duplicates;
}

export function detectDataQuality(
  record: Partial<BuoyRecord>,
  isDuplicate: boolean = false
): QualityDetectionResult {
  const reasons: string[] = [];
  const nullFields = detectNullFields(record);
  const hasNullValue = nullFields.length > 0;

  if (isDuplicate) {
    reasons.push("与其他记录重复（相同浮标+时间戳）");
  }

  if (hasNullValue) {
    const fieldNames = nullFields.map((f) => {
      const map: Record<string, string> = {
        plasticConcentration: "塑料浓度",
        turbidity: "浊度",
        salinity: "盐度",
        temperature: "水温",
      };
      return map[f] || f;
    });
    reasons.push(`存在空值字段：${fieldNames.join("、")}`);
  }

  if (record.rawRemark && hasMixedContent(record.rawRemark)) {
    reasons.push("备注中混有数值，需人工分离确认");
  }

  const nullCount = nullFields.length;

  let quality: DataQuality;

  if (isDuplicate || nullCount >= 3) {
    quality = "recollect";
    if (nullCount >= 3 && !isDuplicate) {
      reasons.push("超过半数字段为空，建议重新采集");
    }
  } else if (hasNullValue || (record.rawRemark && hasMixedContent(record.rawRemark))) {
    quality = "pending";
  } else {
    quality = "available";
  }

  return {
    quality,
    reasons,
    nullFields,
    hasNullValue,
  };
}

export function classifyForDisplay(
  record: BuoyRecord
): "direct_use" | "needs_review" {
  if (record.quality === "available" && record.reviewStatus === "approved") {
    return "direct_use";
  }
  return "needs_review";
}

export function getQualityLabel(quality: DataQuality): string {
  const labels: Record<DataQuality, string> = {
    available: "可用",
    pending: "暂缓",
    recollect: "重采",
  };
  return labels[quality];
}
