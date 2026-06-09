import type { BatchRecord } from "@/types";
import jsPDF from "jspdf";

export function buildFileName(batch: BatchRecord, ext: string): string {
  const d = new Date(batch.runTimestamp);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  const safeName = batch.materialName.replace(/[^\w\u4e00-\u9fa5-]+/g, "_");
  return `${batch.batchId}_${safeName}_${stamp}.${ext}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportJson(batch: BatchRecord): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    batch,
    note: "界面展示与本文件共用同一批处理记录，保证数据一致。",
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  downloadBlob(blob, buildFileName(batch, "json"));
}

export function exportPdf(batch: BatchRecord): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`化学晶胞堆叠课堂 — 复核结果`, margin, y);
  y += 20;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`批次号: ${batch.batchId}`, margin, y);
  y += 14;
  doc.text(`材料: ${batch.materialName}`, margin, y);
  y += 14;
  doc.text(`运行时间: ${new Date(batch.runTimestamp).toLocaleString("zh-CN")}`, margin, y);
  y += 14;
  doc.text(`复核状态: ${batch.reviewStatus === "approved" ? "已通过" : batch.reviewStatus === "rejected" ? "已驳回" : "待复核"}`, margin, y);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("参数快照", margin, y);
  y += 16;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const p = batch.parameters;
  const paramRows = [
    `晶格常数 a/b/c: ${p.a} / ${p.b} / ${p.c} Å`,
    `夹角 α/β/γ: ${p.alpha}° / ${p.beta}° / ${p.gamma}°`,
    `堆叠层数 X/Y/Z: ${p.layersX} × ${p.layersY} × ${p.layersZ}`,
    `偏移量 X/Y/Z: ${p.offsetX} / ${p.offsetY} / ${p.offsetZ} Å`,
  ];
  paramRows.forEach((r) => {
    doc.text(r, margin, y);
    y += 12;
  });
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("碰撞检测 (与界面共用同批记录)", margin, y);
  y += 16;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (batch.collisions.length === 0) {
    doc.text("未检测到碰撞异常。", margin, y);
    y += 12;
  } else {
    batch.collisions.forEach((c) => {
      doc.text(
        `• ${c.collisionId} @(${c.position.x},${c.position.y},${c.position.z})  ${c.volume}Å³  ${c.atomPair[0]}-${c.atomPair[1]}`,
        margin,
        y,
      );
      y += 12;
      const lines = doc.splitTextToSize(`  说明: ${c.explanation}`, 500);
      lines.forEach((l: string) => {
        doc.text(l, margin, y);
        y += 11;
      });
      if (c.approved) {
        doc.text(
          `  复核: ${c.approver ?? "匿名"} 于 ${new Date(c.approvedAt ?? Date.now()).toLocaleString("zh-CN")} 通过 — ${c.approveReason ?? ""}`,
          margin,
          y,
        );
        y += 11;
      }
      y += 4;
    });
  }
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("本轮复核说明", margin, y);
  y += 16;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const reviewLines = doc.splitTextToSize(
    batch.reviewerNote?.trim() || "（未填写处理意见）",
    500,
  );
  reviewLines.forEach((l: string) => {
    doc.text(l, margin, y);
    y += 12;
  });
  y += 12;

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("本文件由化学晶胞堆叠课堂生成，文件名已包含批次号与时间戳以区分各次运行。", margin, 800);

  doc.save(buildFileName(batch, "pdf"));
}
