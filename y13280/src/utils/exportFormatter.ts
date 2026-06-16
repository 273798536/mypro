import {
  NoisePointGroup,
  NameVariant,
  Evidence,
  HistoryRecord,
  ResidentFeedback,
  STATUS_LABEL,
} from "@/types";

interface ExportRow {
  groupId: string;
  canonicalName: string;
  status: string;
  confidence: string;
  latitude: string;
  longitude: string;
  variantTexts: string;
  variantCount: number;
  evidenceCount: number;
  riskLevel: string;
  evidenceDescriptions?: string;
  historySummaries?: string;
}

function toCSV(rows: ExportRow[]): string {
  const headers = Object.keys(rows[0] ?? {}) as (keyof ExportRow)[];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ].join("\n");
}

export function buildExportData(
  groups: NoisePointGroup[],
  variantsMap: Record<string, NameVariant[]>,
  evidencesMap: Record<string, Evidence[]>,
  historyMap: Record<string, HistoryRecord[]>,
  feedbacksMap: Record<string, ResidentFeedback>,
  options: { includeEvidence: boolean; includeHistory: boolean }
): ExportRow[] {
  return groups.map((g) => {
    const variants = variantsMap[g.groupId] ?? [];
    const evidences = evidencesMap[g.groupId] ?? [];
    const histories = historyMap[g.groupId] ?? [];
    const row: ExportRow = {
      groupId: g.groupId,
      canonicalName: g.canonicalName,
      status: STATUS_LABEL[g.status],
      confidence: `${Math.round(g.confidence * 100)}%`,
      latitude: g.latitude.toFixed(6),
      longitude: g.longitude.toFixed(6),
      variantTexts: variants.map((v) => v.variantText).join(" | "),
      variantCount: g.variantCount,
      evidenceCount: g.evidenceCount,
      riskLevel: g.riskLevel === "none" ? "无" : g.riskLevel === "low" ? "低" : "高",
    };
    if (options.includeEvidence) {
      row.evidenceDescriptions = evidences
        .map((e) => `[${e.evidenceType}]${e.description}(${feedbacksMap[e.feedbackId]?.rawLocationText ?? ""})`)
        .join(" ; ");
    }
    if (options.includeHistory) {
      row.historySummaries = histories
        .map(
          (h) =>
            `${h.operateTime} ${h.operator}→${h.action}:${h.remark}`
        )
        .join(" || ");
    }
    return row;
  });
}

export function triggerDownload(
  content: string,
  filename: string,
  format: "csv" | "json"
) {
  const mime = format === "csv" ? "text/csv;charset=utf-8;" : "application/json";
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAsCSV(rows: ExportRow[], filename: string) {
  triggerDownload(toCSV(rows), filename, "csv");
}

export function exportAsJSON(rows: ExportRow[], filename: string) {
  triggerDownload(JSON.stringify(rows, null, 2), filename, "json");
}
