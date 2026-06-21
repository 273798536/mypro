import { CONCLUSION_STATUS, EVENT_TYPE, POLLUTION_STATUS, DECISION_CATEGORY } from "./constants";
import type { DashboardFilters, Sample, TimelineEvent } from "./types";
import { formatDate, formatScore } from "./formatters";

function buildFilterDescription(filters: DashboardFilters): string {
  const parts: string[] = [];
  if (filters.versionId) parts.push(`版本=${filters.versionId}`);
  if (filters.grayConfigId) parts.push(`灰度策略=${filters.grayConfigId}`);
  if (filters.pollutionStatuses.length) {
    parts.push(`污染状态=${filters.pollutionStatuses.map((k) => POLLUTION_STATUS[k]).join("|")}`);
  }
  if (filters.conclusionStatuses.length) {
    parts.push(`结论状态=${filters.conclusionStatuses.map((k) => CONCLUSION_STATUS[k]).join("|")}`);
  }
  if (filters.isBoundaryOnly) parts.push("仅边界样本=是");
  if (filters.isCoveredByMeanOnly) parts.push("仅被均值盖住=是");
  if (filters.dateRange) parts.push(`时间=${filters.dateRange[0]}~${filters.dateRange[1]}`);
  if (filters.keyword) parts.push(`关键词=${filters.keyword}`);
  return parts.length ? parts.join(", ") : "无（全量）";
}

function enumBlock(): string[] {
  const lines: string[] = [];
  lines.push("# 状态枚举说明：");
  lines.push(
    "#   CONCLUSION_STATUS: " +
      Object.entries(CONCLUSION_STATUS)
        .map(([k, v]) => `${k}=${v}`)
        .join(" | ")
  );
  lines.push(
    "#   POLLUTION_STATUS: " +
      Object.entries(POLLUTION_STATUS)
        .map(([k, v]) => `${k}=${v}`)
        .join(" | ")
  );
  lines.push(
    "#   EVENT_TYPE: " +
      Object.entries(EVENT_TYPE)
        .map(([k, v]) => `${k}=${v}`)
        .join(" | ")
  );
  lines.push(
    "#   DECISION_CATEGORY: " +
      Object.entries(DECISION_CATEGORY)
        .map(([k, v]) => `${k}=${v}`)
        .join(" | ")
  );
  return lines;
}

function csvEscape(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportSamplesCSV(samples: Sample[], filters: DashboardFilters, versionMap: Record<string, string>, grayMap: Record<string, string>): string {
  const header = [
    "sample_id",
    "version_id",
    "version_label",
    "gray_config",
    "gray_config_label",
    "algo_score_current",
    "is_boundary",
    "covered_by_mean",
    "pollution_status",
    "pollution_status_label",
    "conclusion",
    "conclusion_label",
    "conclusion_reason",
    "source",
    "sampled_at",
    "operator",
  ];
  const rows: string[] = [];
  rows.push(`# 导出时间: ${formatDate(new Date().toISOString())}`);
  rows.push(`# 筛选条件: ${buildFilterDescription(filters)}`);
  rows.push(...enumBlock());
  rows.push(header.join(","));
  for (const s of samples) {
    const latest = s.algoScores[s.algoScores.length - 1];
    rows.push(
      [
        s.id,
        s.versionId,
        versionMap[s.versionId] ?? "",
        s.grayConfigId,
        grayMap[s.grayConfigId] ?? "",
        latest ? formatScore(latest.score) : "",
        s.isBoundary,
        s.coveredByMean,
        s.pollutionStatus,
        POLLUTION_STATUS[s.pollutionStatus],
        s.conclusion,
        CONCLUSION_STATUS[s.conclusion],
        s.conclusionReason,
        s.source,
        s.sampledAt,
        s.correctionHistory[0]?.operator ?? "—",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return rows.join("\n");
}

export function exportSamplesJSON(samples: Sample[], filters: DashboardFilters): string {
  const payload = {
    exportedAt: new Date().toISOString(),
    filters: {
      versionId: filters.versionId,
      grayConfigId: filters.grayConfigId,
      pollutionStatuses: filters.pollutionStatuses,
      conclusionStatuses: filters.conclusionStatuses,
      isBoundaryOnly: filters.isBoundaryOnly,
      isCoveredByMeanOnly: filters.isCoveredByMeanOnly,
      dateRange: filters.dateRange,
      keyword: filters.keyword,
    },
    filterDescription: buildFilterDescription(filters),
    enumDescriptions: {
      CONCLUSION_STATUS,
      POLLUTION_STATUS,
      EVENT_TYPE,
      DECISION_CATEGORY,
    },
    records: samples.map((s) => ({
      sampleId: s.id,
      versionId: s.versionId,
      grayConfigId: s.grayConfigId,
      algoScores: s.algoScores,
      isBoundary: s.isBoundary,
      coveredByMean: s.coveredByMean,
      pollutionStatus: s.pollutionStatus,
      pollutionStatusLabel: POLLUTION_STATUS[s.pollutionStatus],
      conclusion: s.conclusion,
      conclusionLabel: CONCLUSION_STATUS[s.conclusion],
      conclusionReason: s.conclusionReason,
      source: s.source,
      sampledAt: s.sampledAt,
      correctionHistory: s.correctionHistory,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

export function exportTimelineCSV(events: TimelineEvent[]): string {
  const header = ["event_id", "event_type", "event_type_label", "timestamp", "operator", "sample_id", "version_id", "gray_config_id", "display_label", "payload_json"];
  const rows: string[] = [];
  rows.push(`# 导出时间: ${formatDate(new Date().toISOString())}`);
  rows.push(...enumBlock());
  rows.push("# 注意：display_label 字段与页面展示完全一致，可直接用于离线阅读");
  rows.push(header.join(","));
  for (const e of events) {
    rows.push(
      [
        e.id,
        e.type,
        EVENT_TYPE[e.type],
        e.timestamp,
        e.operator ?? "—",
        e.sampleId ?? "",
        e.versionId ?? "",
        e.grayConfigId ?? "",
        e.displayLabel,
        JSON.stringify(e.payload),
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return rows.join("\n");
}

export function exportTimelineJSON(events: TimelineEvent[]): string {
  const payload = {
    exportedAt: new Date().toISOString(),
    enumDescriptions: {
      EVENT_TYPE,
      CONCLUSION_STATUS,
      POLLUTION_STATUS,
      DECISION_CATEGORY,
    },
    records: events.map((e) => ({
      eventId: e.id,
      type: e.type,
      typeLabel: EVENT_TYPE[e.type],
      timestamp: e.timestamp,
      operator: e.operator,
      sampleId: e.sampleId,
      versionId: e.versionId,
      grayConfigId: e.grayConfigId,
      displayLabel: e.displayLabel,
      payload: e.payload,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

export function triggerDownload(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob(["\ufeff" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
