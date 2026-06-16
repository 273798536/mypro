import type {
  ComplaintRecord,
  FilterOptions,
  BadDataFlag,
  IntersectionError,
  DuplicateLink,
  MergeHistory,
} from "../types";

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

interface ExportContext {
  records: ComplaintRecord[];
  badDataFlags: BadDataFlag[];
  intersectionErrors: IntersectionError[];
  duplicateLinks: DuplicateLink[];
  mergeHistories: MergeHistory[];
  getRecordById: (id: string) => ComplaintRecord | undefined;
}

export function buildCSV(
  ctx: ExportContext,
  filterOptions?: FilterOptions
): string {
  const {
    records,
    badDataFlags,
    intersectionErrors,
    duplicateLinks,
    mergeHistories,
    getRecordById,
  } = ctx;

  let filtered = [...records];
  if (filterOptions) {
    if (filterOptions.status !== "all") {
      filtered = filtered.filter((r) => r.status === filterOptions.status);
    }
    if (filterOptions.intersection_error !== null) {
      filtered = filtered.filter(
        (r) => r.is_intersection_error === filterOptions.intersection_error
      );
    }
    if (filterOptions.bad_data !== null) {
      filtered = filtered.filter((r) => {
        const hasBad = badDataFlags.some((f) => f.record_id === r.id);
        return filterOptions.bad_data ? hasBad : !hasBad;
      });
    }
    if (filterOptions.batch_id) {
      filtered = filtered.filter(
        (r) => r.source_batch_id === filterOptions.batch_id
      );
    }
    if (filterOptions.keyword) {
      const kw = filterOptions.keyword.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(kw) ||
          r.description.toLowerCase().includes(kw) ||
          r.location_name.toLowerCase().includes(kw) ||
          r.reporter.toLowerCase().includes(kw)
      );
    }
  }

  const headers = [
    "记录ID",
    "去重指纹",
    "标题",
    "描述",
    "地点名称",
    "纬度",
    "经度",
    "路口",
    "投诉人",
    "投诉时间",
    "来源渠道",
    "照片URL",
    "导入批次ID",
    "状态(normal/duplicate/merged)",
    "是否路口合错标记",
    "原始行/对象引用",
    "创建时间",
    "更新时间",
    "是否为重复记录",
    "重复原始记录ID",
    "合错关联记录ID",
    "合错说明",
    "坏数据字段数",
    "坏数据详情",
    "是否合并记录",
    "合并来源原始说法摘要",
  ];

  const rows = filtered.map((r) => {
    const dup = duplicateLinks.find((d) => d.new_record_id === r.id);
    const dupOriginalId = dup ? dup.original_record_id : "";

    const relatedErrors = intersectionErrors.filter(
      (e) => e.record_a_id === r.id || e.record_b_id === r.id
    );
    const relatedIds = relatedErrors
      .map((e) => (e.record_a_id === r.id ? e.record_b_id : e.record_a_id))
      .join("|");
    const errorDescs = relatedErrors.map((e) => e.description).join("；");

    const badFlags = badDataFlags.filter((f) => f.record_id === r.id);
    const badDetail = badFlags
      .map(
        (f) =>
          `[${f.issue_type}]字段${f.field_name}:${f.description}(${f.original_ref},原始值:${f.raw_value})`
      )
      .join("；");

    const mergeH = mergeHistories.filter((m) => m.target_record_id === r.id);
    const isMerged = mergeH.length > 0;
    let mergedSources = "";
    if (isMerged) {
      try {
        const sources = JSON.parse(mergeH[0].original_sources_json) as Array<{
          reporter: string;
          description: string;
        }>;
        mergedSources = sources
          .map((s, i) => `来源${i + 1}-${s.reporter}:${s.description.slice(0, 30)}`)
          .join("|");
      } catch {
        mergedSources = mergeH[0].original_sources_json;
      }
    }

    return [
      r.id,
      r.fingerprint,
      r.title,
      r.description,
      r.location_name,
      r.lat,
      r.lng,
      r.intersection,
      r.reporter,
      r.report_time,
      r.complaint_source,
      r.photo_url,
      r.source_batch_id,
      r.status,
      r.is_intersection_error ? "是" : "否",
      r.original_row_ref,
      r.created_at,
      r.updated_at,
      dup ? "是" : "否",
      dupOriginalId,
      relatedIds,
      errorDescs,
      badFlags.length,
      badDetail,
      isMerged ? "是" : "否",
      mergedSources,
    ];
  });

  const headerLine = headers.map(escapeCSV).join(",");
  const bodyLines = rows.map((r) => r.map(escapeCSV).join(","));
  return "\uFEFF" + [headerLine, ...bodyLines].join("\n");
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
