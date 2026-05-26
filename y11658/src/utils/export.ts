import type { Report } from "@/types";

export function reportToMarkdown(r: Report): string {
  const lines: string[] = [];
  lines.push(`# 钢卷吊运平衡局 — 吊运报告`);
  lines.push("");
  lines.push(`- 任务: ${r.taskName} (${r.taskId})`);
  lines.push(`- 报告编号: ${r.id}`);
  lines.push(`- 完成时间: ${r.finishedAt}`);
  lines.push(`- 总分: ${r.totalScore}`);
  lines.push(`- 等级: ${r.finalGrade}`);
  lines.push("");
  lines.push(`## 事故摘要`);
  if (r.accidents.length === 0) {
    lines.push("本次作业未触发严重事故。");
  } else {
    for (const a of r.accidents) {
      lines.push(
        `- 步骤 ${a.t} [${a.action}] 位置 (${a.position.x.toFixed(2)}, ${a.position.z.toFixed(2)}, ${a.position.y.toFixed(2)}) 扣分 ${a.penalty?.amount ?? 0}：${a.penalty?.message}`,
      );
    }
  }
  lines.push("");
  lines.push(`## 事件时间线`);
  lines.push("");
  lines.push("| 步 | 动作 | 位置 (x,z,y,rot) | 重心偏移 | 轨道 | 区域 | 穿越 | 得分 | 备注 |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const e of r.events) {
    lines.push(
      `| ${e.t} | ${e.action} | (${e.position.x.toFixed(2)}, ${e.position.z.toFixed(2)}, ${e.position.y.toFixed(2)}, ${e.position.rot}°) | ${e.cogOffset.toFixed(2)} | ${e.onRail ? "是" : "否"} | ${e.inZone ?? "-"} | ${e.crossing ? "是" : "否"} | ${e.score} | ${e.penalty?.message ?? "-"} |`,
    );
  }
  return lines.join("\n");
}

export function downloadFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportReport(report: Report, format: "json" | "md") {
  const ts = report.finishedAt.replace(/[:.]/g, "-");
  if (format === "json") {
    downloadFile(
      `report_${report.taskId}_${ts}.json`,
      JSON.stringify(report, null, 2),
      "application/json",
    );
  } else {
    downloadFile(
      `report_${report.taskId}_${ts}.md`,
      reportToMarkdown(report),
      "text/markdown",
    );
  }
}
