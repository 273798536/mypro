import type { Scheme, Material, ExportPerspective } from "@/types";
import { EXPORT_PERSPECTIVE_LABELS } from "@/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function getLinkedNotes(scheme: Scheme, material: Material): Material[] {
  return scheme.materials.filter((m) => material.relatedMaterialIds.includes(m.id) || m.relatedMaterialIds.includes(material.id));
}

export function generateExportContent(scheme: Scheme, perspective: ExportPerspective): string {
  const materials = [...scheme.materials].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const conclusion = scheme.materials.find((m) => m.type === "conclusion");
  const supplementaryNotes = scheme.materials.filter((m) => m.type === "supplementary_note");
  const points = scheme.locationPoints;
  const mergeRecords = scheme.mergeRecords;

  switch (perspective) {
    case "scene_annotation": {
      let text = `【${scheme.name} — 场景标注】\n\n`;
      text += `一、点位场景\n`;
      points.forEach((p) => {
        const merged = mergeRecords.find((r) => r.pointIds.includes(p.id));
        if (merged) {
          text += `● ${p.canonicalName}（归并自：${merged.evidenceSnapshot.originalA} / ${merged.evidenceSnapshot.originalB}）\n`;
        } else {
          text += `● ${p.rawName}\n`;
        }
      });
      text += `\n二、时间线关键节点\n`;
      materials.forEach((m) => {
        text += `  ${formatDate(m.createdAt)} [${m.type === "meeting_minutes" ? "纪要" : m.type === "opinion_form" ? "意见" : m.type === "supplementary_note" ? "备注" : "结论"}] ${m.content}\n`;
      });
      if (conclusion) {
        const linked = getLinkedNotes(scheme, conclusion);
        if (linked.length > 0) {
          text += `\n三、结论与后补备注联动\n`;
          text += `  结论：${conclusion.content}\n`;
          linked.forEach((n) => {
            text += `  ↳ 后补备注：${n.content}（来源：${n.source}）\n`;
          });
        }
      }
      return text;
    }

    case "sidebar_note": {
      let text = `【${scheme.name} — 侧边说明】\n\n`;
      text += `项目：${scheme.name}\n`;
      text += `材料总数：${materials.length}\n`;
      text += `归并记录：${mergeRecords.length} 条\n`;
      text += `结论：${scheme.conclusion ?? "暂无"}\n\n`;
      text += `── 归并证据链 ──\n`;
      mergeRecords.forEach((r) => {
        text += `  [${formatDate(r.timestamp)}] ${r.evidenceSnapshot.originalA} + ${r.evidenceSnapshot.originalB} → ${points.find((p) => p.id === r.pointIds[0])?.canonicalName ?? ""}\n`;
        text += `    原因：${r.reason}  操作人：${r.operator}\n`;
      });
      text += `\n── 后补备注关联 ──\n`;
      supplementaryNotes.forEach((n) => {
        const linked = getLinkedNotes(scheme, n);
        text += `  ${n.content}\n`;
        linked.forEach((l) => {
          text += `    → 关联：${l.content}\n`;
        });
      });
      return text;
    }

    case "page_summary": {
      let text = `【${scheme.name} — 页面摘要】\n\n`;
      text += `${scheme.conclusion ?? "暂无结论"}\n\n`;
      text += `依据材料：\n`;
      materials.forEach((m) => {
        text += `  • ${m.content}\n`;
      });
      if (conclusion) {
        const linked = getLinkedNotes(scheme, conclusion);
        if (linked.length > 0) {
          text += `\n关联后补备注：\n`;
          linked.forEach((n) => {
            text += `  • ${n.content}（${n.source}，${formatDate(n.createdAt)}）\n`;
          });
        }
      }
      if (mergeRecords.length > 0) {
        text += `\n归并记录：\n`;
        mergeRecords.forEach((r) => {
          text += `  • ${r.evidenceSnapshot.originalA} 与 ${r.evidenceSnapshot.originalB} 合并为 ${points.find((p) => p.id === r.pointIds[0])?.canonicalName ?? ""}（${r.reason}）\n`;
        });
      }
      return text;
    }
  }
}

export function exportAsText(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
