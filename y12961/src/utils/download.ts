import type { Batch } from "@/data/types";
import { KIND_LABEL, materialById } from "@/data/selectors";

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvCell(v: string): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportRoutesCsv(batch: Batch) {
  const header = [
    "批次ID",
    "生成时间",
    "路由ID",
    "逻辑表",
    "分片键",
    "路由规则",
    "目标库",
    "目标表",
    "状态",
    "严重度",
    "依据材料",
    "材料类型",
    "证据行",
    "问题说明",
  ];
  const rows = batch.routes.map((r) => {
    const m = materialById(batch, r.materialId);
    return [
      batch.id,
      batch.generatedAt,
      r.id,
      r.logicTable,
      r.shardKey,
      r.rule,
      r.targetDb,
      r.targetTable,
      r.status,
      r.severity,
      m?.name ?? "",
      m ? KIND_LABEL[m.kind] : "",
      r.evidenceLine ?? "",
      r.issue,
    ].map(csvCell).join(",");
  });
  const csv = "\uFEFF" + [header.map(csvCell).join(","), ...rows].join("\n");
  triggerDownload(csv, `${batch.id}_路由明细.csv`, "text/csv;charset=utf-8");
}

export function exportRoutesJson(batch: Batch) {
  const payload = {
    batchId: batch.id,
    label: batch.label,
    generatedAt: batch.generatedAt,
    cluster: batch.cluster,
    source: "分库分表路由检查看板 · 同一批数据导出",
    routes: batch.routes.map((r) => {
      const m = materialById(batch, r.materialId);
      return { ...r, material: m?.name, materialKind: m?.kind };
    }),
  };
  triggerDownload(JSON.stringify(payload, null, 2), `${batch.id}_路由明细.json`, "application/json;charset=utf-8");
}
