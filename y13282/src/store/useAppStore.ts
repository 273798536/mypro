import { create } from "zustand";
import {
  generateFingerprint,
  similarityScore,
} from "../utils/fingerprint";
import {
  haversineDistance,
  levenshteinDistance,
  isOnlyDirectionDiff,
  extractParkName,
} from "../utils/geoDistance";
import { buildCSV, downloadCSV } from "../utils/csvExport";
import { saveToStorage, loadFromStorage } from "../utils/storage";
import type {
  ComplaintRecord,
  ImportBatch,
  MergeHistory,
  BadDataFlag,
  DuplicateLink,
  IntersectionError,
  ChangeLog,
  FilterOptions,
  ImportResult,
  ChangeSummary,
  BadDataType,
  RecordStatus,
  ComplaintSource,
} from "../types";

const STORAGE_KEYS = {
  records: "records",
  batches: "batches",
  mergeHistories: "mergeHistories",
  badDataFlags: "badDataFlags",
  duplicateLinks: "duplicateLinks",
  intersectionErrors: "intersectionErrors",
  changeLogs: "changeLogs",
};

const uid = (prefix = "") =>
  prefix +
  Date.now().toString(36) +
  Math.random().toString(36).slice(2, 8);

interface AppState {
  records: ComplaintRecord[];
  batches: ImportBatch[];
  mergeHistories: MergeHistory[];
  badDataFlags: BadDataFlag[];
  duplicateLinks: DuplicateLink[];
  intersectionErrors: IntersectionError[];
  changeLogs: ChangeLog[];
  selectedRecordId: string | null;
  filterOptions: FilterOptions;
  expandedQueue: boolean;
  lastFlashRecordId: string | null;

  selectRecord: (id: string | null) => void;
  setFilter: (options: Partial<FilterOptions>) => void;
  toggleQueue: () => void;
  setQueueExpanded: (v: boolean) => void;
  clearFlash: () => void;

  importBatch: (
    inputRecords: Array<{
      id?: string;
      title: string;
      description: string;
      location_name: string;
      lat: number;
      lng: number;
      intersection: string;
      reporter: string;
      report_time: string;
      complaint_source: ComplaintSource;
      photo_url: string;
      original_row_ref: string;
    }>,
    batchName: string
  ) => ImportResult;

  addManualRecord: (
    data: Partial<ComplaintRecord>
  ) => { success: boolean; record?: ComplaintRecord; isDuplicate?: boolean; message: string };

  markIntersectionError: (
    recordAId: string,
    recordBId: string,
    description?: string
  ) => void;

  clearIntersectionError: (errorId: string) => void;

  mergeRecords: (
    sourceIds: string[],
    targetData: Partial<ComplaintRecord>
  ) => ComplaintRecord | null;

  validateBadDataForRecord: (record: ComplaintRecord) => BadDataFlag[];

  detectIntersectionForAll: (
    candidates?: ComplaintRecord[]
  ) => IntersectionError[];

  getFilteredRecords: () => ComplaintRecord[];

  getRecordById: (id: string) => ComplaintRecord | undefined;
  getBadDataForRecord: (recordId: string) => BadDataFlag[];
  getDuplicateLinkFor: (recordId: string) => DuplicateLink | undefined;
  getIntersectionErrorsFor: (recordId: string) => IntersectionError[];
  getMergeHistoryForTarget: (recordId: string) => MergeHistory | undefined;
  getMergeHistoryForSource: (recordId: string) => MergeHistory | undefined;

  getBatchChangeSummary: (batchId: string) => ChangeSummary;

  exportFilteredCSV: () => void;

  resetAll: () => void;
}

const defaultFilter: FilterOptions = {
  status: "all",
  intersection_error: null,
  bad_data: null,
  batch_id: null,
  keyword: "",
};

function detectSingleBadData(
  record: ComplaintRecord
): Array<Omit<BadDataFlag, "id" | "record_id">> {
  const flags: Array<Omit<BadDataFlag, "id" | "record_id">> = [];
  const required: Array<keyof ComplaintRecord> = [
    "reporter",
    "report_time",
    "location_name",
  ];
  for (const f of required) {
    const v = record[f];
    if (!v || (typeof v === "string" && !v.trim())) {
      flags.push({
        field_name: f as string,
        issue_type: "missing" as BadDataType,
        description: `必填字段「${f}」为空`,
        raw_value: String(v ?? ""),
        original_ref: record.original_row_ref,
      });
    }
  }
  if (
    !isNaN(record.lat) &&
    (record.lat < 18 || record.lat > 54 || record.lat === 0)
  ) {
    flags.push({
      field_name: "lat",
      issue_type: "invalid" as BadDataType,
      description: `纬度超出中国范围[18,54]`,
      raw_value: String(record.lat),
      original_ref: record.original_row_ref,
    });
  }
  if (
    !isNaN(record.lng) &&
    (record.lng < 73 || record.lng > 135 || record.lng === 0)
  ) {
    flags.push({
      field_name: "lng",
      issue_type: "invalid" as BadDataType,
      description: `经度超出中国范围[73,135]`,
      raw_value: String(record.lng),
      original_ref: record.original_row_ref,
    });
  }
  if (record.report_time) {
    const t = new Date(record.report_time).getTime();
    if (!isNaN(t) && t > Date.now() + 3600000) {
      flags.push({
        field_name: "report_time",
        issue_type: "outlier" as BadDataType,
        description: "投诉时间为未来时间，疑似穿越",
        raw_value: record.report_time,
        original_ref: record.original_row_ref,
      });
    }
  }
  if (
    typeof record.description === "string" &&
    record.description.trim().length < 5
  ) {
    flags.push({
      field_name: "description",
      issue_type: "outlier" as BadDataType,
      description: "描述过短（小于5字），不足以还原现场",
      raw_value: record.description,
      original_ref: record.original_row_ref,
    });
  }
  return flags;
}

function detectIntersectionPair(
  a: ComplaintRecord,
  b: ComplaintRecord
): { error: boolean; distance: number; desc: string } | null {
  if (a.id === b.id) return null;

  const dist = haversineDistance(a.lat, a.lng, b.lat, b.lng);
  const parkA = extractParkName(a.location_name);
  const parkB = extractParkName(b.location_name);
  const samePark = parkA && parkB && parkA === parkA && parkA === parkB;
  const intersectionLv = levenshteinDistance(a.intersection, b.intersection);
  const dirDiff = isOnlyDirectionDiff(a.intersection, b.intersection);

  let matched = false;
  let desc = "";

  if (dist < 150 && dist !== Infinity && intersectionLv < 3 && samePark) {
    matched = true;
    desc = `坐标距离${Math.round(dist)}米，且同属${parkA}，路口名相似度高（编辑距离${intersectionLv}），疑似同一点位被拆成两条`;
  } else if (samePark && dirDiff) {
    matched = true;
    desc = `同属${parkA}且路口名仅存在东/南/西/北方向词差异，疑似相邻路口合错`;
  }

  if (matched) {
    return { error: true, distance: isFinite(dist) ? dist : 0, desc };
  }
  return null;
}

export const useAppStore = create<AppState>((set, get) => ({
  records: loadFromStorage<ComplaintRecord[]>(STORAGE_KEYS.records, []),
  batches: loadFromStorage<ImportBatch[]>(STORAGE_KEYS.batches, []),
  mergeHistories: loadFromStorage<MergeHistory[]>(
    STORAGE_KEYS.mergeHistories,
    []
  ),
  badDataFlags: loadFromStorage<BadDataFlag[]>(STORAGE_KEYS.badDataFlags, []),
  duplicateLinks: loadFromStorage<DuplicateLink[]>(
    STORAGE_KEYS.duplicateLinks,
    []
  ),
  intersectionErrors: loadFromStorage<IntersectionError[]>(
    STORAGE_KEYS.intersectionErrors,
    []
  ),
  changeLogs: loadFromStorage<ChangeLog[]>(STORAGE_KEYS.changeLogs, []),
  selectedRecordId: null,
  filterOptions: defaultFilter,
  expandedQueue: false,
  lastFlashRecordId: null,

  selectRecord: (id) =>
    set({ selectedRecordId: id, lastFlashRecordId: id ?? null }),
  setFilter: (options) =>
    set({ filterOptions: { ...get().filterOptions, ...options } }),
  toggleQueue: () => set({ expandedQueue: !get().expandedQueue }),
  setQueueExpanded: (v) => set({ expandedQueue: v }),
  clearFlash: () => set({ lastFlashRecordId: null }),

  validateBadDataForRecord: (record) => {
    const raw = detectSingleBadData(record);
    return raw.map((f) => ({
      id: uid("bd_"),
      record_id: record.id,
      ...f,
    }));
  },

  detectIntersectionForAll: (candidates) => {
    const pool = candidates ?? get().records;
    const results: IntersectionError[] = [];
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const hit = detectIntersectionPair(pool[i], pool[j]);
        if (hit) {
          results.push({
            id: uid("ie_"),
            record_a_id: pool[i].id,
            record_b_id: pool[j].id,
            error_type: "split_should_merge",
            distance_meters: hit.distance,
            description: hit.desc,
          });
        }
      }
    }
    return results;
  },

  importBatch: (inputRecords, batchName) => {
    const now = new Date().toISOString();
    const batchId = uid("B");
    const state = get();
    const existing = state.records;

    let added = 0;
    let dupCount = 0;
    let badCount = 0;
    let ieCount = 0;

    const newRecords: ComplaintRecord[] = [];
    const newDuplicateLinks: DuplicateLink[] = [];
    const newBadFlags: BadDataFlag[] = [];
    const newChanges: ChangeLog[] = [];

    for (const input of inputRecords) {
      const id = input.id || uid("R");
      const partial: Partial<ComplaintRecord> = {
        reporter: input.reporter,
        report_time: input.report_time,
        location_name: input.location_name,
        description: input.description,
      };
      const fingerprint = generateFingerprint(partial);

      const dupIdx = existing.findIndex(
        (r) => r.fingerprint === fingerprint && r.status !== "duplicate"
      );
      let status: RecordStatus = "normal";

      if (dupIdx !== -1) {
        status = "duplicate";
        dupCount++;
        const orig = existing[dupIdx];
        const matchedFields = [];
        if (orig.reporter === input.reporter) matchedFields.push("reporter");
        if (orig.report_time?.slice(0, 16) === input.report_time?.slice(0, 16))
          matchedFields.push("report_time");
        if (orig.location_name === input.location_name)
          matchedFields.push("location_name");
        const score = similarityScore(orig, input);

        newDuplicateLinks.push({
          id: uid("dl_"),
          new_record_id: id,
          original_record_id: orig.id,
          match_score: score,
          matched_fields_json: JSON.stringify(matchedFields),
        });
        newChanges.push({
          id: uid("cl_"),
          batch_id: batchId,
          record_id: id,
          change_type: "duplicate",
          description: `与已有记录「${orig.title}」指纹完全一致，未计入有效统计`,
          created_at: now,
        });
      } else {
        added++;
        newChanges.push({
          id: uid("cl_"),
          batch_id: batchId,
          record_id: id,
          change_type: "add",
          description: `新增投诉记录：${input.title}`,
          created_at: now,
        });
      }

      const record: ComplaintRecord = {
        id,
        fingerprint,
        title: input.title,
        description: input.description,
        location_name: input.location_name,
        lat: input.lat,
        lng: input.lng,
        intersection: input.intersection,
        reporter: input.reporter,
        report_time: input.report_time,
        complaint_source: input.complaint_source,
        photo_url: input.photo_url,
        source_batch_id: batchId,
        status,
        is_intersection_error: false,
        original_row_ref: input.original_row_ref,
        created_at: now,
        updated_at: now,
      };
      newRecords.push(record);

      const badFlags = detectSingleBadData(record);
      if (badFlags.length > 0) {
        badCount += badFlags.length;
        badFlags.forEach((f) => {
          newBadFlags.push({
            id: uid("bd_"),
            record_id: id,
            ...f,
          });
        });
        newChanges.push({
          id: uid("cl_"),
          batch_id: batchId,
          record_id: id,
          change_type: "bad_data",
          description: `检测到${badFlags.length}条坏数据标记，已关联原始引用${record.original_row_ref}`,
          created_at: now,
        });
      }
    }

    const batch: ImportBatch = {
      id: batchId,
      name: batchName,
      type: "import",
      record_count: inputRecords.length,
      duplicate_count: dupCount,
      intersection_error_count: 0,
      bad_data_count: badCount,
      created_at: now,
    };

    const mergedRecords = [...existing, ...newRecords];
    const mergedFlags = [...state.badDataFlags, ...newBadFlags];
    const mergedDuplicates = [...state.duplicateLinks, ...newDuplicateLinks];
    const mergedBatches = [...state.batches, batch];
    const mergedChanges = [...state.changeLogs, ...newChanges];

    const ieDetectPool = newRecords.filter((r) => r.status !== "duplicate");
    const compareBase = mergedRecords.filter((r) => r.status !== "duplicate");
    const newIEs: IntersectionError[] = [];
    for (let i = 0; i < ieDetectPool.length; i++) {
      for (let j = 0; j < compareBase.length; j++) {
        if (ieDetectPool[i].id === compareBase[j].id) continue;
        const hit = detectIntersectionPair(ieDetectPool[i], compareBase[j]);
        if (hit) {
          const existingIds = new Set(
            state.intersectionErrors
              .concat(newIEs)
              .map(
                (e) =>
                  `${e.record_a_id}|${e.record_b_id}|${e.record_b_id}|${e.record_a_id}`
              )
          );
          const key1 = `${ieDetectPool[i].id}|${compareBase[j].id}`;
          const key2 = `${compareBase[j].id}|${ieDetectPool[i].id}`;
          if (!existingIds.has(key1) && !existingIds.has(key2)) {
            newIEs.push({
              id: uid("ie_"),
              record_a_id: ieDetectPool[i].id,
              record_b_id: compareBase[j].id,
              error_type: "split_should_merge",
              distance_meters: hit.distance,
              description: hit.desc,
            });
            ieCount++;
            const ieChangeDesc = hit.desc;
            mergedChanges.push({
              id: uid("cl_"),
              batch_id: batchId,
              record_id: ieDetectPool[i].id,
              change_type: "intersection_error",
              description: `相邻路口合错提示：${ieChangeDesc}。涉及记录：${ieDetectPool[i].id} & ${compareBase[j].id}`,
              created_at: now,
            });
          }
        }
      }
    }

    batch.intersection_error_count = ieCount;

    const updatedRecords = mergedRecords.map((r) => {
      const hasIE = state.intersectionErrors
        .concat(newIEs)
        .some((e) => e.record_a_id === r.id || e.record_b_id === r.id);
      if (r.is_intersection_error !== hasIE) {
        return { ...r, is_intersection_error: hasIE, updated_at: now };
      }
      return r;
    });

    const finalIntersectionErrors = [...state.intersectionErrors, ...newIEs];

    set({
      records: updatedRecords,
      batches: mergedBatches,
      badDataFlags: mergedFlags,
      duplicateLinks: mergedDuplicates,
      intersectionErrors: finalIntersectionErrors,
      changeLogs: mergedChanges,
      expandedQueue: true,
    });

    saveToStorage(STORAGE_KEYS.records, updatedRecords);
    saveToStorage(STORAGE_KEYS.batches, mergedBatches);
    saveToStorage(STORAGE_KEYS.badDataFlags, mergedFlags);
    saveToStorage(STORAGE_KEYS.duplicateLinks, mergedDuplicates);
    saveToStorage(STORAGE_KEYS.intersectionErrors, finalIntersectionErrors);
    saveToStorage(STORAGE_KEYS.changeLogs, mergedChanges);

    return {
      batch,
      added_count: added,
      duplicate_count: dupCount,
      intersection_error_count: ieCount,
      bad_data_count: badCount,
    };
  },

  addManualRecord: (data) => {
    const now = new Date().toISOString();
    const batchId = uid("B");

    const source = data.complaint_source || "手动补录";
    const title = data.title || "手动补录投诉记录";
    const description = data.description || "";
    const location_name = data.location_name || "";
    const intersection = data.intersection || "";
    const reporter = data.reporter || "";
    const report_time = data.report_time || now.slice(0, 16);
    const lat = typeof data.lat === "number" ? data.lat : 0;
    const lng = typeof data.lng === "number" ? data.lng : 0;
    const photo_url = data.photo_url || "";
    const original_row_ref =
      data.original_row_ref || `手动补录-${new Date().toLocaleString("zh-CN")}`;

    const partial: Partial<ComplaintRecord> = {
      reporter,
      report_time,
      location_name,
      description,
    };
    const fingerprint = generateFingerprint(partial);
    const state = get();

    const dup = state.records.find(
      (r) => r.fingerprint === fingerprint && r.status !== "duplicate"
    );
    let status: RecordStatus = "normal";
    if (dup) {
      status = "duplicate";
    }

    const id = uid("R");
    const record: ComplaintRecord = {
      id,
      fingerprint,
      title,
      description,
      location_name,
      lat,
      lng,
      intersection,
      reporter,
      report_time,
      complaint_source: source,
      photo_url,
      source_batch_id: batchId,
      status,
      is_intersection_error: false,
      original_row_ref,
      created_at: now,
      updated_at: now,
    };

    const batch: ImportBatch = {
      id: batchId,
      name: `手动补录 - ${new Date().toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`,
      type: "manual",
      record_count: 1,
      duplicate_count: status === "duplicate" ? 1 : 0,
      intersection_error_count: 0,
      bad_data_count: 0,
      created_at: now,
    };

    const mergedRecords = [...state.records, record];
    const mergedBatches = [...state.batches, batch];
    const mergedDuplicates = [...state.duplicateLinks];
    const mergedBadFlags = [...state.badDataFlags];
    const mergedChanges = [...state.changeLogs];
    const mergedIEs = [...state.intersectionErrors];

    if (status === "duplicate" && dup) {
      mergedDuplicates.push({
        id: uid("dl_"),
        new_record_id: id,
        original_record_id: dup.id,
        match_score: 1.0,
        matched_fields_json: JSON.stringify(["指纹完全匹配"]),
      });
      mergedChanges.push({
        id: uid("cl_"),
        batch_id: batchId,
        record_id: id,
        change_type: "duplicate",
        description: `手动补录与已有记录「${dup.title}」指纹一致，已标记为重复，不重复统计`,
        created_at: now,
      });
    } else {
      mergedChanges.push({
        id: uid("cl_"),
        batch_id: batchId,
        record_id: id,
        change_type: "add",
        description: `手动补录：${title}`,
        created_at: now,
      });
    }

    const badFlags = detectSingleBadData(record);
    if (badFlags.length > 0) {
      batch.bad_data_count = badFlags.length;
      badFlags.forEach((f) =>
        mergedBadFlags.push({ id: uid("bd_"), record_id: id, ...f })
      );
      mergedChanges.push({
        id: uid("cl_"),
        batch_id: batchId,
        record_id: id,
        change_type: "bad_data",
        description: `手动补录检测到${badFlags.length}条坏数据标记`,
        created_at: now,
      });
    }

    if (status !== "duplicate") {
      for (const other of state.records.filter(
        (r) => r.status !== "duplicate"
      )) {
        const hit = detectIntersectionPair(record, other);
        if (hit) {
          const existingSet = new Set(
            mergedIEs.map((e) => `${e.record_a_id}|${e.record_b_id}`)
          );
          const k1 = `${record.id}|${other.id}`;
          const k2 = `${other.id}|${record.id}`;
          if (!existingSet.has(k1) && !existingSet.has(k2)) {
            mergedIEs.push({
              id: uid("ie_"),
              record_a_id: record.id,
              record_b_id: other.id,
              error_type: "split_should_merge",
              distance_meters: hit.distance,
              description: hit.desc,
            });
            batch.intersection_error_count++;
            mergedChanges.push({
              id: uid("cl_"),
              batch_id: batchId,
              record_id: record.id,
              change_type: "intersection_error",
              description: `手动补录触发合错检测：${hit.desc}`,
              created_at: now,
            });
          }
        }
      }
    }

    const finalRecords = mergedRecords.map((r) => {
      const hasIE = mergedIEs.some(
        (e) => e.record_a_id === r.id || e.record_b_id === r.id
      );
      if (r.is_intersection_error !== hasIE) {
        return { ...r, is_intersection_error: hasIE, updated_at: now };
      }
      return r;
    });

    set({
      records: finalRecords,
      batches: mergedBatches,
      duplicateLinks: mergedDuplicates,
      badDataFlags: mergedBadFlags,
      intersectionErrors: mergedIEs,
      changeLogs: mergedChanges,
      selectedRecordId: id,
      lastFlashRecordId: id,
      expandedQueue: true,
    });

    saveToStorage(STORAGE_KEYS.records, finalRecords);
    saveToStorage(STORAGE_KEYS.batches, mergedBatches);
    saveToStorage(STORAGE_KEYS.duplicateLinks, mergedDuplicates);
    saveToStorage(STORAGE_KEYS.badDataFlags, mergedBadFlags);
    saveToStorage(STORAGE_KEYS.intersectionErrors, mergedIEs);
    saveToStorage(STORAGE_KEYS.changeLogs, mergedChanges);

    return {
      success: true,
      record,
      isDuplicate: status === "duplicate",
      message:
        status === "duplicate"
          ? "该记录与已有数据重复，未计入有效统计。"
          : "手动补录成功，已加入正常记录池。",
    };
  },

  markIntersectionError: (aId, bId, description) => {
    const state = get();
    const ra = state.records.find((r) => r.id === aId);
    const rb = state.records.find((r) => r.id === bId);
    if (!ra || !rb) return;
    const ie: IntersectionError = {
      id: uid("ie_"),
      record_a_id: aId,
      record_b_id: bId,
      error_type: "merged_should_split",
      distance_meters: haversineDistance(ra.lat, ra.lng, rb.lat, rb.lng),
      description:
        description ||
        `人工标记：${ra.title} 与 ${rb.title} 疑似应拆分/关联的相邻路口合错`,
    };
    const newIEs = [...state.intersectionErrors, ie];
    const updated = state.records.map((r) => {
      const hit =
        r.id === aId ||
        r.id === bId ||
        newIEs.some((e) => e.record_a_id === r.id || e.record_b_id === r.id);
      return { ...r, is_intersection_error: hit, updated_at: new Date().toISOString() };
    });
    set({ intersectionErrors: newIEs, records: updated });
    saveToStorage(STORAGE_KEYS.intersectionErrors, newIEs);
    saveToStorage(STORAGE_KEYS.records, updated);
  },

  clearIntersectionError: (errorId) => {
    const state = get();
    const newIEs = state.intersectionErrors.filter((e) => e.id !== errorId);
    const updated = state.records.map((r) => {
      const hit = newIEs.some(
        (e) => e.record_a_id === r.id || e.record_b_id === r.id
      );
      return { ...r, is_intersection_error: hit, updated_at: new Date().toISOString() };
    });
    set({ intersectionErrors: newIEs, records: updated });
    saveToStorage(STORAGE_KEYS.intersectionErrors, newIEs);
    saveToStorage(STORAGE_KEYS.records, updated);
  },

  mergeRecords: (sourceIds, targetData) => {
    if (sourceIds.length < 2) return null;
    const state = get();
    const sources = sourceIds
      .map((id) => state.records.find((r) => r.id === id))
      .filter(Boolean) as ComplaintRecord[];
    if (sources.length < 2) return null;
    const now = new Date().toISOString();
    const batchId = uid("B");
    const targetId = uid("R");
    const reporter = targetData.reporter || sources[0].reporter;
    const title = targetData.title || sources[0].title;
    const description =
      targetData.description ||
      sources.map((s, i) => `【合并来源${i + 1}】${s.description}`).join("\n");
    const partial: Partial<ComplaintRecord> = {
      reporter,
      report_time: sources[0].report_time,
      location_name: targetData.location_name || sources[0].location_name,
      description,
    };
    const fingerprint = generateFingerprint(partial);
    const merged: ComplaintRecord = {
      id: targetId,
      fingerprint,
      title,
      description,
      location_name: targetData.location_name || sources[0].location_name,
      lat: typeof targetData.lat === "number" ? targetData.lat : sources[0].lat,
      lng: typeof targetData.lng === "number" ? targetData.lng : sources[0].lng,
      intersection: targetData.intersection || sources[0].intersection,
      reporter,
      report_time: sources[0].report_time,
      complaint_source: "合并记录",
      photo_url: targetData.photo_url || sources[0].photo_url,
      source_batch_id: batchId,
      status: "merged",
      is_intersection_error: false,
      original_row_ref: `合并自${sourceIds.length}条原始记录: ${sourceIds.join(",")}`,
      created_at: now,
      updated_at: now,
    };
    const originalSourcesJson = JSON.stringify(
      sources.map((s) => ({
        id: s.id,
        reporter: s.reporter,
        title: s.title,
        description: s.description,
        original_row_ref: s.original_row_ref,
      }))
    );
    const mhs: MergeHistory[] = sources.map((s) => ({
      id: uid("mh_"),
      source_record_id: s.id,
      target_record_id: targetId,
      merged_content: description,
      original_sources_json: originalSourcesJson,
      created_at: now,
    }));
    const batch: ImportBatch = {
      id: batchId,
      name: `合并操作 - ${new Date().toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`,
      type: "manual",
      record_count: 1,
      duplicate_count: 0,
      intersection_error_count: 0,
      bad_data_count: 0,
      created_at: now,
    };
    const sourceSet = new Set(sourceIds);
    const updatedRecords = [
      ...state.records.map((r) =>
        sourceSet.has(r.id) ? { ...r, status: "merged" as RecordStatus, updated_at: now } : r
      ),
      merged,
    ];
    const change: ChangeLog = {
      id: uid("cl_"),
      batch_id: batchId,
      record_id: targetId,
      change_type: "update",
      description: `合并${sourceIds.length}条记录为新记录「${title}」，原始说法已保留可溯源`,
      created_at: now,
    };
    set({
      records: updatedRecords,
      batches: [...state.batches, batch],
      mergeHistories: [...state.mergeHistories, ...mhs],
      changeLogs: [...state.changeLogs, change],
      selectedRecordId: targetId,
    });
    saveToStorage(STORAGE_KEYS.records, updatedRecords);
    saveToStorage(STORAGE_KEYS.batches, [...state.batches, batch]);
    saveToStorage(STORAGE_KEYS.mergeHistories, [...state.mergeHistories, ...mhs]);
    saveToStorage(STORAGE_KEYS.changeLogs, [...state.changeLogs, change]);
    return merged;
  },

  getFilteredRecords: () => {
    const state = get();
    const { records, badDataFlags, filterOptions } = state;
    const f = filterOptions;
    let r = [...records];
    if (f.status !== "all") r = r.filter((x) => x.status === f.status);
    if (f.intersection_error !== null)
      r = r.filter((x) => x.is_intersection_error === f.intersection_error);
    if (f.bad_data !== null)
      r = r.filter((x) => {
        const hasBad = badDataFlags.some((bf) => bf.record_id === x.id);
        return f.bad_data ? hasBad : !hasBad;
      });
    if (f.batch_id) r = r.filter((x) => x.source_batch_id === f.batch_id);
    if (f.keyword) {
      const kw = f.keyword.toLowerCase();
      r = r.filter(
        (x) =>
          x.title.toLowerCase().includes(kw) ||
          x.description.toLowerCase().includes(kw) ||
          x.location_name.toLowerCase().includes(kw) ||
          x.reporter.toLowerCase().includes(kw)
      );
    }
    return r;
  },

  getRecordById: (id) => get().records.find((r) => r.id === id),
  getBadDataForRecord: (recordId) =>
    get().badDataFlags.filter((f) => f.record_id === recordId),
  getDuplicateLinkFor: (recordId) =>
    get().duplicateLinks.find(
      (d) => d.new_record_id === recordId || d.original_record_id === recordId
    ),
  getIntersectionErrorsFor: (recordId) =>
    get().intersectionErrors.filter(
      (e) => e.record_a_id === recordId || e.record_b_id === recordId
    ),
  getMergeHistoryForTarget: (recordId) =>
    get().mergeHistories.find((m) => m.target_record_id === recordId),
  getMergeHistoryForSource: (recordId) =>
    get().mergeHistories.find((m) => m.source_record_id === recordId),

  getBatchChangeSummary: (batchId) => {
    const state = get();
    const batch = state.batches.find((b) => b.id === batchId);
    const logs = state.changeLogs.filter((c) => c.batch_id === batchId);
    return {
      batch: batch!,
      adds: logs.filter((l) => l.change_type === "add"),
      duplicates: logs.filter((l) => l.change_type === "duplicate"),
      intersection_errors: logs.filter(
        (l) => l.change_type === "intersection_error"
      ),
      bad_data: logs.filter((l) => l.change_type === "bad_data"),
    };
  },

  exportFilteredCSV: () => {
    const state = get();
    const ctx = {
      records: state.records,
      badDataFlags: state.badDataFlags,
      intersectionErrors: state.intersectionErrors,
      duplicateLinks: state.duplicateLinks,
      mergeHistories: state.mergeHistories,
      getRecordById: (id) => state.records.find((r) => r.id === id),
    };
    const csv = buildCSV(ctx, state.filterOptions);
    const ts = new Date()
      .toISOString()
      .slice(0, 16)
      .replace(/[T:]/g, "-");
    downloadCSV(csv, `公园噪声投诉回放_${ts}.csv`);
  },

  resetAll: () => {
    set({
      records: [],
      batches: [],
      mergeHistories: [],
      badDataFlags: [],
      duplicateLinks: [],
      intersectionErrors: [],
      changeLogs: [],
      selectedRecordId: null,
      filterOptions: defaultFilter,
      expandedQueue: false,
      lastFlashRecordId: null,
    });
    Object.values(STORAGE_KEYS).forEach((k) => saveToStorage(k, undefined as unknown as never));
    saveToStorage(STORAGE_KEYS.records, []);
    saveToStorage(STORAGE_KEYS.batches, []);
    saveToStorage(STORAGE_KEYS.mergeHistories, []);
    saveToStorage(STORAGE_KEYS.badDataFlags, []);
    saveToStorage(STORAGE_KEYS.duplicateLinks, []);
    saveToStorage(STORAGE_KEYS.intersectionErrors, []);
    saveToStorage(STORAGE_KEYS.changeLogs, []);
  },
}));
