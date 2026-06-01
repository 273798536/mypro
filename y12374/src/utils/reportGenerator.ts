import type { Project, Case, MaterialTrace, Report } from "@/types";

export function generateReport(
  project: Project,
  cases: Case[],
  materialTraces: MaterialTrace[]
): Report {
  return {
    id: `report-${project.id}-${Date.now()}`,
    projectId: project.id,
    generatedAt: Date.now(),
  };
}

export function generateReportHTML(
  project: Project,
  cases: Case[],
  materialTraces: MaterialTrace[],
  analyses: Array<{ partName: string; issues: Case["issues"] }>
): string {
  const issueStats = {
    part_misalignment: 0,
    unmarked_modulation: 0,
    audio_gap: 0,
  };
  for (const c of cases) {
    for (const issue of c.issues) {
      issueStats[issue.type]++;
    }
  }

  const formatDate = (ts: number) => new Date(ts).toLocaleString("zh-CN");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>合唱音准复盘报告 - ${project.name}</title>
<style>
  body { font-family: "Noto Sans SC", sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1B2A4A; }
  h1 { font-family: "Noto Serif SC", serif; font-size: 28px; border-bottom: 2px solid #D4A843; padding-bottom: 12px; }
  h2 { font-size: 20px; color: #1B2A4A; margin-top: 32px; }
  h3 { font-size: 16px; color: #3a4a6a; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { border: 1px solid #d0d0d0; padding: 8px 12px; text-align: left; font-size: 14px; }
  th { background: #1B2A4A; color: #fff; }
  .issue-error { color: #C44E52; font-weight: bold; }
  .issue-warning { color: #D4A843; font-weight: bold; }
  .stats { display: flex; gap: 24px; margin: 16px 0; }
  .stat-card { flex: 1; padding: 16px; border: 1px solid #d0d0d0; border-radius: 8px; text-align: center; }
  .stat-card .num { font-size: 32px; font-weight: bold; }
  .trace-link { color: #6b7280; font-size: 13px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<h1>合唱音准复盘报告</h1>
<p><strong>项目：</strong>${project.name}</p>
<p><strong>生成时间：</strong>${formatDate(Date.now())}</p>
<p><strong>案例总数：</strong>${cases.length}</p>

<h2>问题统计</h2>
<div class="stats">
  <div class="stat-card"><div class="num" style="color:#C44E52">${issueStats.part_misalignment}</div><div>声部错位</div></div>
  <div class="stat-card"><div class="num" style="color:#D4A843">${issueStats.unmarked_modulation}</div><div>转调漏标</div></div>
  <div class="stat-card"><div class="num" style="color:#6b7280">${issueStats.audio_gap}</div><div>音频缺段</div></div>
</div>

<h2>案例详情</h2>
${cases
  .map(
    (c) => `
<h3>${c.title}（${c.status === "open" ? "待处理" : "已解决"}）</h3>
<p>关联录音：${c.linkedRecordings.join("、")}</p>
<p>关联小节：${c.linkedMeasures.join("、")}</p>
<table>
  <tr><th>问题类型</th><th>时段</th><th>严重度</th><th>触发材料</th><th>卡点</th><th>下一步</th></tr>
  ${c.issues
    .map(
      (i) => `<tr>
    <td class="issue-${i.severity}">${i.type === "part_misalignment" ? "声部错位" : i.type === "unmarked_modulation" ? "转调漏标" : "音频缺段"}</td>
    <td>${i.startTime.toFixed(1)}s - ${i.endTime.toFixed(1)}s</td>
    <td class="issue-${i.severity}">${i.severity === "error" ? "错误" : "警告"}</td>
    <td>${i.triggerMaterial}</td>
    <td>${i.stuckAt}</td>
    <td>${i.nextStep}</td>
  </tr>`
    )
    .join("")}
</table>
${
  c.annotations.length > 0
    ? `<p><strong>批注：</strong></p><ul>${c.annotations.map((a) => `<li>${a.author}：${a.content}（${formatDate(a.createdAt)}）</li>`).join("")}</ul>`
    : ""
}
`
  )
  .join("")}

<h2>材料对应关系</h2>
<table>
  <tr><th>排练录音</th><th>声部分轨</th><th>声部名称</th><th>报告生成时间</th></tr>
  ${materialTraces
    .map(
      (t) =>
        `<tr><td>${t.recordingFileName}</td><td>${t.trackFileName}</td><td>${t.trackPartName}</td><td>${formatDate(t.reportGeneratedAt)}</td></tr>`
    )
    .join("")}
</table>

<p class="trace-link">本报告由合唱音准复盘板自动生成，材料对应关系可用于后续复核。</p>
</body>
</html>`;
}
