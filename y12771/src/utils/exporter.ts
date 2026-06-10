import type { BatchReport, FunctionalGroup, DataQualityIssue, ConcentrationPoint } from '../../shared/types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function severityLabel(s: string): string {
  return s === 'error' ? '需处理' : s === 'warning' ? '请关注' : '说明';
}

export function buildHtmlReport(batch: BatchReport): string {
  const dq: DataQualityIssue[] = batch.dataQuality;
  const ann: FunctionalGroup[] = batch.annotations;
  const comps: ConcentrationPoint[] = batch.concentrationComparisons;
  const confCount = ann.filter((a) => a.confirmed).length;
  const totalCount = ann.length;

  const warnRows = dq
    .map(
      (d) => `
    <div style="margin:8px 0;padding:12px 16px;background:${
      d.severity === 'error' ? '#fff5f5' : d.severity === 'warning' ? '#fff8ed' : '#f7f9fc'
    };border-left:3px solid ${d.severity === 'error' ? '#e11d48' : d.severity === 'warning' ? '#f59e0b' : '#1e3a5f'};border-radius:4px;">
      <div style="font-weight:600;color:#1e3a5f;margin-bottom:4px;">
        [${severityLabel(d.severity)}] ${d.friendlyMessage}
      </div>
      <div style="font-size:13px;color:#4a648c;line-height:1.6;">影响：${d.impact}</div>
      <div style="font-size:13px;color:#458450;line-height:1.6;margin-top:4px;">建议：${d.suggestion}</div>
    </div>`
    )
    .join('');

  const annRows = ann
    .map(
      (a, i) => `
    <tr style="${a.confirmed ? 'background:#f3f8f4;' : ''}${a.isManualAdd ? 'font-style:italic;' : ''}">
      <td style="padding:8px 12px;border:1px solid #d9e1ee;">${i + 1}</td>
      <td style="padding:8px 12px;border:1px solid #d9e1ee;">${a.nameCn}<br><span style="color:#6f87ad;font-size:12px;">${a.name}</span></td>
      <td style="padding:8px 12px;border:1px solid #d9e1ee;">${a.peakWavenumber} cm⁻¹<br><span style="color:#6f87ad;font-size:12px;">${a.wavenumberStart}–${a.wavenumberEnd}</span></td>
      <td style="padding:8px 12px;border:1px solid #d9e1ee;">${(a.confidence * 100).toFixed(0)}%</td>
      <td style="padding:8px 12px;border:1px solid #d9e1ee;">${a.confirmed ? `<span style="color:#458450;">✓ 已确认（${a.confirmedBy || ''}）</span>` : '<span style="color:#f59e0b;">待确认</span>'}${a.isManualAdd ? '<br><span style="color:#6f87ad;font-size:12px;">人工添加</span>' : ''}</td>
      <td style="padding:8px 12px;border:1px solid #d9e1ee;font-size:12px;color:#4a648c;">${a.remark || '-'}</td>
    </tr>`
    )
    .join('');

  const compRows = comps
    .map(
      (c) => `
    <tr>
      <td style="padding:8px 12px;border:1px solid #d9e1ee;">${c.label}</td>
      <td style="padding:8px 12px;border:1px solid #d9e1ee;">${c.before.value ?? '未检出'} ${c.before.unit}<br><span style="font-size:12px;color:#6f87ad;">判断：${c.before.judgment}</span></td>
      <td style="padding:8px 12px;border:1px solid #d9e1ee;${c.changed ? 'background:#fff8ed;' : ''}">${c.after.value ?? '未检出'} ${c.after.unit}<br><span style="font-size:12px;color:${c.changed ? '#d97706' : '#6f87ad'};">判断：${c.after.judgment}${c.changed ? '（有变化）' : ''}</span></td>
    </tr>`
    )
    .join('');

  const runRows = batch.runHistory
    .map(
      (r) => `
    <tr>
      <td style="padding:8px 12px;border:1px solid #d9e1ee;">#${r.runId}</td>
      <td style="padding:8px 12px;border:1px solid #d9e1ee;">${formatDate(r.runAt)}</td>
      <td style="padding:8px 12px;border:1px solid #d9e1ee;">${r.parameters}</td>
      <td style="padding:8px 12px;border:1px solid #d9e1ee;">${r.triggeredBy}</td>
      <td style="padding:8px 12px;border:1px solid #d9e1ee;">${r.status === 'success' ? '成功' : r.status === 'warning' ? '有告警' : '失败'}${r.note ? `<br><span style="color:#6f87ad;font-size:12px;">${r.note}</span>` : ''}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${batch.batchName} - 红外谱图官能团标注报告</title>
<style>
  body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;max-width:960px;margin:24px auto;padding:0 20px;color:#162b47;line-height:1.6;}
  h1{font-family:"Source Serif 4",Georgia,serif;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:8px;}
  h2{font-family:"Source Serif 4",Georgia,serif;color:#1e3a5f;margin-top:28px;border-left:4px solid #f59e0b;padding-left:10px;}
  h3{color:#344d72;}
  table{width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;}
  th{background:#eef2f8;padding:8px 12px;border:1px solid #d9e1ee;text-align:left;color:#1e3a5f;}
  .meta{background:#f7f9fc;padding:14px 18px;border-radius:6px;margin:12px 0;}
  .meta-row{display:flex;gap:24px;flex-wrap:wrap;}
  .meta-item{flex:1;min-width:200px;}
  .meta-label{color:#6f87ad;font-size:12px;}
  .meta-val{font-weight:600;color:#1e3a5f;}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #d9e1ee;color:#6f87ad;font-size:12px;text-align:center;}
</style></head><body>
<h1>${batch.batchName}</h1>
<div class="meta">
  <div class="meta-row">
    <div class="meta-item"><div class="meta-label">批次编号</div><div class="meta-val">${batch.id}</div></div>
    <div class="meta-item"><div class="meta-label">创建时间</div><div class="meta-val">${formatDate(batch.createdAt)}</div></div>
    <div class="meta-item"><div class="meta-label">最后更新</div><div class="meta-val">${formatDate(batch.updatedAt)}</div></div>
    <div class="meta-item"><div class="meta-label">标注进度</div><div class="meta-val">${confCount} / ${totalCount} 条已确认</div></div>
  </div>
</div>

<h2>一、数据质量说明</h2>
<p style="color:#4a648c;">以下内容用通俗语言说明本批次数据存在的情况，便于非技术人员理解。</p>
${warnRows}

<h2>二、补录的实验信息</h2>
<div class="meta">
  <div class="meta-row">
    <div class="meta-item"><div class="meta-label">反应条件</div><div class="meta-val">${batch.supplementaryInfo.reactionConditions || '未填写'}</div></div>
    <div class="meta-item"><div class="meta-label">反应时长</div><div class="meta-val">${batch.supplementaryInfo.reactionTime ? batch.supplementaryInfo.reactionTime + ' ' + batch.supplementaryInfo.reactionTimeUnit : '未记录（已在"数据质量说明"中标注）'}</div></div>
    <div class="meta-item"><div class="meta-label">空白对照</div><div class="meta-val">${batch.supplementaryInfo.blankControlNote || '未做（详见"数据质量说明"）'}</div></div>
    <div class="meta-item"><div class="meta-label">操作人员</div><div class="meta-val">${batch.supplementaryInfo.operator}</div></div>
    <div class="meta-item"><div class="meta-label">样品来源</div><div class="meta-val">${batch.supplementaryInfo.sampleSource}</div></div>
  </div>
</div>

<h2>三、官能团标注结果</h2>
<table>
  <thead><tr><th style="width:40px;">#</th><th>官能团</th><th>特征波数</th><th>置信度</th><th>确认状态</th><th>备注</th></tr></thead>
  <tbody>${annRows}</tbody>
</table>

<h2>四、浓度换算前后对比</h2>
<p style="color:#4a648c;">黄色背景项表示换算前后判断发生了变化。</p>
<table>
  <thead><tr><th>指标</th><th>换算前</th><th>换算后</th></tr></thead>
  <tbody>${compRows}</tbody>
</table>

<h2>五、分析运行历史</h2>
<table>
  <thead><tr><th>编号</th><th>运行时间</th><th>参数</th><th>触发者</th><th>状态</th></tr></thead>
  <tbody>${runRows}</tbody>
</table>

<div class="footer">本报告由「红外谱图官能团标注系统」自动生成 · 导出时间 ${formatDate(new Date().toISOString())}</div>
</body></html>`;
}

export function buildCsvAnnotations(batch: BatchReport): string {
  const header = '序号,官能团(中),官能团(英),特征波数(cm-1),波数范围(cm-1),置信度(%),是否已确认,确认人,是否人工添加,备注';
  const rows = batch.annotations.map((a, i) =>
    [
      i + 1,
      a.nameCn,
      a.name,
      a.peakWavenumber,
      `${a.wavenumberStart}-${a.wavenumberEnd}`,
      (a.confidence * 100).toFixed(0),
      a.confirmed ? '是' : '否',
      a.confirmedBy || '',
      a.isManualAdd ? '是' : '否',
      (a.remark || '').replace(/,/g, '，'),
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

export function downloadFile(content: string, fileName: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function triggerHtmlExport(batch: BatchReport): string {
  const html = buildHtmlReport(batch);
  const safe = batch.batchName.replace(/[^\w\u4e00-\u9fa5-]/g, '_');
  const fileName = `${safe}_报告.html`;
  downloadFile(html, fileName, 'text/html;charset=utf-8');
  return fileName;
}

export function triggerCsvExport(batch: BatchReport): string {
  const csv = buildCsvAnnotations(batch);
  const safe = batch.batchName.replace(/[^\w\u4e00-\u9fa5-]/g, '_');
  const fileName = `${safe}_标注表.csv`;
  downloadFile(csv, fileName, 'text/csv;charset=utf-8');
  return fileName;
}

export function triggerPdfExportHint(batch: BatchReport): string {
  const safe = batch.batchName.replace(/[^\w\u4e00-\u9fa5-]/g, '_');
  return `${safe}_报告.pdf`;
}
