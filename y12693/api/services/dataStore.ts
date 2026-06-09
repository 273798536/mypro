import type {
  LightRecord,
  HistoryEntry,
  RecordFilter,
  UnitType,
} from "../../shared/types";
import { mockRecords } from "../data/mockData.js";
import { convertUnit, generateId } from "../../src/lib/utils.js";

let records: LightRecord[] = JSON.parse(JSON.stringify(mockRecords));
const historyMap = new Map<string, HistoryEntry[]>();

export function getAllRecords(filter: RecordFilter = {}): LightRecord[] {
  let result = [...records];
  if (filter.hasUnitErrors !== undefined) {
    result = result.filter(
      (r) =>
        filter.hasUnitErrors ? r.unitErrors.length > 0 : r.unitErrors.length === 0
    );
  }
  if (filter.hasRiskNotes !== undefined) {
    result = result.filter(
      (r) =>
        filter.hasRiskNotes ? r.riskNotes.length > 0 : r.riskNotes.length === 0
    );
  }
  if (filter.hasDuplicate !== undefined) {
    result = result.filter((r) => r.hasDuplicate === filter.hasDuplicate);
  }
  if (filter.isTransparentOcclusionMisread !== undefined) {
    result = result.filter(
      (r) => r.isTransparentOcclusionMisread === filter.isTransparentOcclusionMisread
    );
  }
  if (filter.status) {
    result = result.filter((r) => r.status === filter.status);
  }
  if (filter.batchNo) {
    result = result.filter((r) => r.batchNo.includes(filter.batchNo!));
  }
  return result;
}

export function getRecordById(id: string): LightRecord | undefined {
  return records.find((r) => r.id === id);
}

export function updateRecord(
  id: string,
  updates: Partial<LightRecord>,
  operator: string
): LightRecord | undefined {
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;

  const original = records[idx];
  const updated: LightRecord = {
    ...original,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const version = (historyMap.get(id)?.length ?? 0) + 1;
  const historyEntry: HistoryEntry = {
    version,
    timestamp: new Date().toISOString(),
    operator,
    changes: updates,
    diff: JSON.stringify(updates),
  };
  const existingHistory = historyMap.get(id) ?? [];
  historyMap.set(id, [...existingHistory, historyEntry]);

  records[idx] = updated;
  return updated;
}

export function getRecordHistory(id: string): HistoryEntry[] {
  if (!historyMap.has(id)) {
    const rec = getRecordById(id);
    if (rec) {
      historyMap.set(id, [
        {
          version: 1,
          timestamp: rec.createdAt,
          operator: rec.operator,
          changes: rec as any,
          diff: "初始创建",
        },
      ]);
    }
  }
  return historyMap.get(id) ?? [];
}

export function findDuplicateByFixtureId(fixtureId: string, batchNo: string): LightRecord | undefined {
  return records.find(
    (r) => r.coords.fixtureId === fixtureId && r.batchNo === batchNo
  );
}

export function importRecord(
  record: Omit<LightRecord, "id" | "createdAt" | "updatedAt">
): { record: LightRecord; isDuplicate: boolean; existingId?: string } {
  const existing = findDuplicateByFixtureId(record.coords.fixtureId, record.batchNo);
  if (existing) {
    return { record: existing, isDuplicate: true, existingId: existing.id };
  }
  const newRec: LightRecord = {
    ...record,
    id: `rec-${generateId()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  records.unshift(newRec);
  return { record: newRec, isDuplicate: false };
}

export function exportRecords(format: "csv" | "json", ids?: string[]): string {
  const data = ids ? records.filter((r) => ids.includes(r.id)) : records;
  if (format === "json") {
    return JSON.stringify(data, null, 2);
  }
  const headers = [
    "ID",
    "批次号",
    "灯具名称",
    "灯具编号",
    "X坐标",
    "Y坐标",
    "Z坐标",
    "单位",
    "状态",
    "单位换算错误数",
    "风险备注数",
    "结论数",
    "是否重复",
    "透明遮挡误读",
    "创建时间",
    "更新时间",
  ];
  const rows = data.map((r) => [
    r.id,
    r.batchNo,
    r.fixtureName,
    r.coords.fixtureId,
    r.coords.x,
    r.coords.y,
    r.coords.z,
    r.coords.unit,
    r.status,
    r.unitErrors.length,
    r.riskNotes.length,
    r.conclusions.length,
    r.hasDuplicate ? "是" : "否",
    r.isTransparentOcclusionMisread ? "是" : "否",
    r.createdAt,
    r.updatedAt,
  ]);
  return [headers, ...rows].map((r) => r.join(",")).join("\n");
}

export function getTraceChain(id: string) {
  const rec = getRecordById(id);
  if (!rec) return null;
  return rec.traceChain;
}

export function autoConvertUnit(
  value: number,
  from: UnitType,
  to: UnitType
): number {
  return convertUnit(value, from, to);
}
