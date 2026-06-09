import { Batch } from "@/types";

function toCSVRow(values: (string | number | null | undefined)[]): string {
  return values.map((v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
      return `"${s.replace(/"/g, "\"\"")}"`;
    }
    return s;
  }).join(",");
}

export function batchToCSV(batch: Batch): string {
  const header = [
    "材料ID", "材料名称", "长(cm)", "宽(cm)", "高(cm)", "数量",
    "真实体积(cm³)", "近似体积(cm³)", "误差率(%)", "是否边界样例",
    "边界类型", "草稿缺失字段", "异常标签",
  ];
  const rows = batch.materials.map((m) => [
    m.id, m.name, m.length, m.width, m.height, m.quantity,
    m.realVolume, m.approxVolume ?? "", m.errorRate ?? "",
    m.isBoundary ? "是" : "否",
    m.boundaryType ?? "",
    m.gapField ?? "",
    m.hasDraftGap ? "草稿缺失" : (m.isBoundary ? "边界样例" : ""),
  ]);
  return [header, ...rows].map(toCSVRow).join("\n");
}

export function batchToJSON(batch: Batch): string {
  return JSON.stringify({
    batch: {
      id: batch.id,
      name: batch.name,
      createdAt: batch.createdAt,
      params: batch.params,
      totalApproxVolume: batch.totalApproxVolume,
    },
    materials: batch.materials,
    anomalies: batch.anomalies ?? [],
    draftGaps: batch.draftGaps ?? [],
    constraints: batch.constraints ?? [],
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

export function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
