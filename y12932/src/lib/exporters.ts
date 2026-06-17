// 面向非技术人员的可读导出：原因用普通话，避免字段名/缩写
import type { LeakageRecord, QuestionBank, TrainingSample } from "@/data/types";
import type { ReportData } from "@/store/selectors";

export function download(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ruleToPlain(rule: string): string {
  const map: Record<string, string> = {
    interception: "安全拦截",
    correction: "人工修正",
    leakage: "泄漏检测",
  };
  return map[rule] ?? rule;
}

export function buildLeakageReadable(
  lr: LeakageRecord,
  qb: QuestionBank | undefined,
  training: TrainingSample[],
  versionId: string,
): string {
  const lines: string[] = [];
  lines.push(`训练验证泄漏 · 可读说明（版本 ${versionId}）`);
  lines.push("=".repeat(40));
  lines.push("");
  lines.push(`题库名称：${qb?.name ?? "—"}`);
  lines.push(`导入次数：${qb?.importCount ?? 0} 次（同一内容哈希，二次导入会自动复用结论，不会出现两份互相打架的结论）`);
  lines.push("");
  lines.push("一句话结论：");
  lines.push(lr.unifiedConclusion);
  lines.push("");
  lines.push("给业务方的解释：");
  lines.push(lr.reasonPlain);
  lines.push("");
  const affected = training.filter((t) => lr.affectedTrainingSampleIds.includes(t.id));
  if (affected.length) {
    lines.push("受影响的训练样本处理：");
    affected.forEach((t) => {
      lines.push(`- ${t.id}：${t.opinion}`);
    });
    lines.push("");
  }
  lines.push("导入记录（说明每次导入如何处理）：");
  lr.importRuns.forEach((r) => {
    const tag = r.isReimport ? "二次导入，复用既有结论" : "首次导入，建立结论";
    lines.push(`- 版本 ${r.versionId}（${r.timestamp}）：${tag}。${r.deltaNote}`);
  });
  lines.push("");
  lines.push("（本说明由拒答边界样本看板生成，界面与报告同源。）");
  return lines.join("\n");
}

export function buildReportReadable(report: ReportData): string {
  const lines: string[] = [];
  lines.push(`拒答边界样本看板 · 评测报告（${report.versionName}）`);
  lines.push("=".repeat(48));
  lines.push("");
  lines.push(`模型版本：${report.modelVersion}`);
  lines.push(`数据集版本：${report.datasetVersion}`);
  lines.push(`生成日期：${report.createdAt}`);
  lines.push("");
  lines.push("一、关键指标");
  lines.push(`- 样本总数：${report.kpi.total}`);
  lines.push(`- 拒答率：${Math.round(report.kpi.refusalRate * 100)}%`);
  lines.push(`- 边界样本数：${report.kpi.boundaryCount}`);
  lines.push(`- 人工修正率：${Math.round(report.kpi.correctionRate * 100)}%`);
  lines.push(`- 泄漏样本数：${report.kpi.leakageCount}`);
  lines.push(`- 异常条目：${report.anomalyCount}`);
  lines.push("");
  lines.push("二、分组指标");
  report.groupRows.forEach((g) => {
    lines.push(
      `- ${g.group}：样本 ${g.total}，拒答率 ${Math.round(g.refusalRate * 100)}%，修正率 ${Math.round(g.correctionRate * 100)}%，边界 ${g.boundaryCount}，泄漏 ${g.leakageCount}`,
    );
  });
  lines.push("");
  lines.push("三、给业务方的说明（可直接复制）");
  lines.push(report.plainSummary);
  lines.push("");
  lines.push("四、处理记录明细（安全拦截 / 人工修正 / 泄漏检测 同源）");
  report.processingRecords.forEach((r) => {
    lines.push(`- [${ruleToPlain(r.type)}] ${r.result}（${r.timestamp}）`);
    lines.push(`  说明：${r.reasonPlain}`);
    if (r.reviewer) lines.push(`  评审人：${r.reviewer}`);
  });
  lines.push("");
  if (report.leakageRecords.length) {
    lines.push("五、训练验证泄漏");
    report.leakageRecords.forEach((lr) => {
      lines.push(`- ${lr.unifiedConclusion}`);
      lines.push(`  解释：${lr.reasonPlain}`);
    });
    lines.push("");
  }
  lines.push("（本报告由拒答边界样本看板生成，界面与报告同源派生。）");
  return lines.join("\n");
}

export function buildReportHtml(report: ReportData): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rows = report.groupRows
    .map(
      (g) =>
        `<tr><td>${esc(g.group)}</td><td>${g.total}</td><td>${Math.round(g.refusalRate * 100)}%</td><td>${Math.round(g.correctionRate * 100)}%</td><td>${g.boundaryCount}</td><td>${g.leakageCount}</td></tr>`,
    )
    .join("");
  const recs = report.processingRecords
    .map(
      (r) =>
        `<li><b>[${ruleToPlain(r.type)}] ${esc(r.result)}</b> <span class="t">(${esc(r.timestamp)})</span><br/>${esc(r.reasonPlain)}${r.reviewer ? ` — @${esc(r.reviewer)}` : ""}</li>`,
    )
    .join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/><title>评测报告 ${esc(report.versionName)}</title>
<style>
body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#1a1a1a;line-height:1.7}
h1{font-size:22px;border-bottom:2px solid #f5a524;padding-bottom:8px}
h2{font-size:16px;margin-top:28px;color:#b45309}
.quote{background:#fff7ed;border-left:3px solid #f5a524;padding:14px 16px;border-radius:6px}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:14px}
th,td{border:1px solid #e5e0d8;padding:7px 10px;text-align:left}
th{background:#faf7f2}
ul{padding-left:18px}
.t{color:#888;font-size:12px}
.meta{color:#666;font-size:13px}
</style></head><body>
<h1>拒答边界样本看板 · 评测报告</h1>
<p class="meta">${esc(report.versionName)} · 模型 ${esc(report.modelVersion)} · 数据集 ${esc(report.datasetVersion)} · ${esc(report.createdAt)}</p>
<h2>一、关键指标</h2>
<ul>
<li>样本总数：<b>${report.kpi.total}</b></li>
<li>拒答率：<b>${Math.round(report.kpi.refusalRate * 100)}%</b></li>
<li>边界样本数：<b>${report.kpi.boundaryCount}</b></li>
<li>人工修正率：<b>${Math.round(report.kpi.correctionRate * 100)}%</b></li>
<li>泄漏样本数：<b>${report.kpi.leakageCount}</b></li>
<li>异常条目：<b>${report.anomalyCount}</b></li>
</ul>
<h2>二、分组指标</h2>
<table><tr><th>分组</th><th>样本</th><th>拒答率</th><th>修正率</th><th>边界</th><th>泄漏</th></tr>${rows}</table>
<h2>三、给业务方的说明（可直接复制）</h2>
<div class="quote">${esc(report.plainSummary)}</div>
<h2>四、处理记录明细（安全拦截 / 人工修正 / 泄漏检测 同源）</h2>
<ul>${recs}</ul>
<p class="meta">本报告由拒答边界样本看板生成，界面与报告同源派生。</p>
</body></html>`;
}
