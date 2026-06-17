import type {
  BatterySample,
  ParameterSet,
  AttributionResult,
  HistoryRecord,
  ReportSnapshot
} from '../types';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function timestampForFilename(): string {
  const d = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function exportSamplesJson(
  samples: BatterySample[],
  parameterSets?: ParameterSet[],
  filename?: string
): string {
  const payload = {
    formatVersion: '1.0',
    exportedAt: new Date().toLocaleString('zh-CN'),
    parameterSets: parameterSets ?? [],
    samples
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const fn = filename ?? `电池样本-${timestampForFilename()}.json`;
  downloadBlob(blob, fn);
  return fn;
}

export function exportHistoryJson(history: HistoryRecord[], filename?: string): string {
  const payload = {
    formatVersion: '1.0',
    exportedAt: new Date().toLocaleString('zh-CN'),
    history
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const fn = filename ?? `归因历史-${timestampForFilename()}.json`;
  downloadBlob(blob, fn);
  return fn;
}

function buildSummary(
  samples: BatterySample[],
  result: AttributionResult | null,
  selectedSample: BatterySample | null,
  gapCount: number,
  boundaryCount: number
): string {
  const parts: string[] = [];
  parts.push(`共 ${samples.length} 组样本，其中正常 ${samples.length - gapCount - boundaryCount} 组、边界 ${boundaryCount} 组、采样缺口 ${gapCount} 组。`);
  if (selectedSample && result) {
    parts.push(`当前样本【${selectedSample.name}】总误差 ${result.totalError.toFixed(3)} mΩ（${result.totalErrorPercentage.toFixed(2)}%），${result.isWithinTolerance ? '在容许范围内' : '超出容许范围'}。`);
    parts.push(result.conclusion);
  }
  return parts.join(' ');
}

export function buildReportSnapshot(params: {
  samples: BatterySample[];
  parameterSets: ParameterSet[];
  activeParamSetId: string;
  compareParamSetId: string | null;
  compareMode: boolean;
  selectedSampleId: string | null;
  result: AttributionResult | null;
  compareResult: AttributionResult | null;
  history: HistoryRecord[];
  operator: string;
}): ReportSnapshot {
  const activeParamSet = params.parameterSets.find(p => p.id === params.activeParamSetId) ?? params.parameterSets[0];
  const compareParamSet = params.compareParamSetId
    ? params.parameterSets.find(p => p.id === params.compareParamSetId) ?? null
    : null;
  const selectedSample = params.selectedSampleId
    ? params.samples.find(s => s.id === params.selectedSampleId) ?? null
    : null;
  const gapCount = params.samples.filter(s => s.type === 'gap').length;
  const boundaryCount = params.samples.filter(s => s.type === 'boundary').length;

  return {
    generatedAt: new Date().toLocaleString('zh-CN'),
    operator: params.operator,
    samples: params.samples,
    parameterSets: params.parameterSets,
    activeParamSet,
    compareParamSet,
    compareMode: params.compareMode,
    selectedSample,
    result: params.result,
    compareResult: params.compareResult,
    history: params.history,
    gapCount,
    boundaryCount,
    summary: buildSummary(params.samples, params.result, selectedSample, gapCount, boundaryCount)
  };
}

function renderResultBlock(title: string, r: AttributionResult | null, pset: ParameterSet | null): string {
  if (!r || !pset) return '';
  const statusColor = r.isWithinTolerance ? '#10b981' : '#f43f5e';
  const rows = r.components.map(c => `
    <tr>
      <td>${c.name}</td>
      <td class="mono">${c.value >= 0 ? '+' : ''}${c.value.toFixed(3)} mΩ</td>
      <td class="mono">${c.percentage.toFixed(1)}%</td>
      <td class="mono formula">${c.formula}</td>
      <td class="calculation">${c.calculation}</td>
    </tr>`).join('');
  return `
  <div class="block">
    <h3>${title}</h3>
    <div class="big-num" style="color:${statusColor}">
      ${r.totalError >= 0 ? '+' : ''}${r.totalError.toFixed(3)} mΩ
      <span class="pct">(${r.totalErrorPercentage >= 0 ? '+' : ''}${r.totalErrorPercentage.toFixed(2)}%)</span>
    </div>
    <div class="status" style="background:${statusColor}1a;color:${statusColor};border-color:${statusColor}4d">
      ${r.isWithinTolerance ? '✓ 在容许范围内（±' + pset.tolerance + ' mΩ）' : '✗ 超出容许范围（±' + pset.tolerance + ' mΩ）'}
    </div>
    <table>
      <thead>
        <tr><th>误差来源</th><th>数值</th><th>占比</th><th>公式</th><th>计算过程</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="conclusion">结论：${r.conclusion}</div>
    ${r.boundaryImpact ? `<div class="boundary-note">边界影响说明：${r.boundaryImpact}</div>` : ''}
  </div>`;
}

export function exportReportHtml(snapshot: ReportSnapshot, filename?: string): string {
  const now = timestampForFilename();
  const sampleRows = snapshot.samples.map(s => {
    const typeColor = s.type === 'boundary' ? '#f97316' : s.type === 'gap' ? '#eab308' : '#10b981';
    const typeLabel = s.type === 'boundary' ? '边界' : s.type === 'gap' ? '缺口' : '正常';
    return `
    <tr>
      <td>
        ${s.photoUrl ? `<img src="${s.photoUrl}" alt="${s.name}" onerror="this.style.display='none'"/>` : ''}
        <div class="sample-name">${s.name}</div>
      </td>
      <td><span class="tag" style="background:${typeColor}1a;color:${typeColor};border-color:${typeColor}4d">${typeLabel}</span></td>
      <td class="mono">${s.internalResistance.toFixed(3)} mΩ</td>
      <td class="mono">${s.temperature}°C</td>
      <td class="mono">${s.soc}%</td>
      <td>${s.testTime}</td>
      <td>${s.notes || ''}${s.gapReason ? `<div class="gap-reason">缺口原因：${s.gapReason}</div>` : ''}</td>
    </tr>`;
  }).join('');

  const historyRows = snapshot.history.slice().reverse().slice(0, 20).map(h => {
    const colors: Record<string, string> = {
      import: '#3b82f6', add_sample: '#f97316', param_change: '#06b6d4',
      confirm: '#10b981', revert: '#f59e0b', compare: '#8b5cf6', export: '#ec4899'
    };
    const labels: Record<string, string> = {
      import: '导入', add_sample: '新增', param_change: '参数切换',
      confirm: '确认', revert: '回退', compare: '对照', export: '导出'
    };
    const c = colors[h.type] || '#64748b';
    return `
    <tr>
      <td><span class="tag" style="background:${c}1a;color:${c};border-color:${c}4d">${labels[h.type] || h.type}</span></td>
      <td>${h.description}</td>
      <td>${h.timestamp}</td>
      <td>${h.operator}</td>
      <td class="mono">${h.afterSnapshot ? (h.afterSnapshot.totalError >= 0 ? '+' : '') + h.afterSnapshot.totalError.toFixed(3) + ' mΩ' : '—'}</td>
    </tr>`;
  }).join('');

  const activeBlock = renderResultBlock(
    `当前参数组：${snapshot.activeParamSet.name} (v${snapshot.activeParamSet.version})`,
    snapshot.result,
    snapshot.activeParamSet
  );
  const compareBlock = snapshot.compareMode && snapshot.compareResult && snapshot.compareParamSet
    ? renderResultBlock(
        `对照参数组：${snapshot.compareParamSet.name} (v${snapshot.compareParamSet.version})`,
        snapshot.compareResult,
        snapshot.compareParamSet
      )
    : '';

  const paramRows = snapshot.parameterSets.map(p => `
    <tr class="${p.id === snapshot.activeParamSet.id ? 'active-row' : ''}${snapshot.compareParamSet?.id === p.id ? ' compare-row' : ''}">
      <td>${p.id === snapshot.activeParamSet.id ? '★ ' : ''}${snapshot.compareParamSet?.id === p.id ? '◆ ' : ''}${p.name}</td>
      <td class="mono">v${p.version}</td>
      <td class="mono">${p.baseResistance} mΩ</td>
      <td class="mono">${p.baseTemperature}°C</td>
      <td class="mono">${p.baseSoc}%</td>
      <td class="mono">${p.temperatureCoefficient}</td>
      <td class="mono">±${p.tolerance} mΩ</td>
      <td>${p.updatedAt}</td>
    </tr>`).join('');

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<title>电池内阻误差归因报告 - ${snapshot.generatedAt}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif;
    background: #0f172a;
    color: #e2e8f0;
    padding: 48px 64px;
    line-height: 1.6;
  }
  .mono { font-family: "JetBrains Mono", "SF Mono", Consolas, monospace; }
  h1 { font-size: 28px; margin: 0 0 8px; color: #f1f5f9; }
  h2 { font-size: 18px; margin: 32px 0 16px; color: #e2e8f0; border-left: 4px solid #06b6d4; padding-left: 12px; }
  h3 { font-size: 15px; margin: 0 0 12px; color: #cbd5e1; }
  .header {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding-bottom: 24px; border-bottom: 1px solid #334155; margin-bottom: 24px;
  }
  .meta { font-size: 13px; color: #94a3b8; }
  .summary-box {
    background: #1e293b; border: 1px solid #334155; border-radius: 12px;
    padding: 16px 20px; font-size: 14px; line-height: 1.8;
  }
  table {
    width: 100%; border-collapse: collapse; margin: 12px 0;
    background: #1e293b; border-radius: 8px; overflow: hidden;
    font-size: 13px;
  }
  th, td {
    padding: 10px 14px; text-align: left; border-bottom: 1px solid #334155; vertical-align: middle;
  }
  th { background: #0f172a; color: #94a3b8; font-weight: 600; font-size: 12px; }
  tr:last-child td { border-bottom: none; }
  tr.active-row { background: rgba(6, 182, 212, 0.08); }
  tr.compare-row { background: rgba(139, 92, 246, 0.08); }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; border: 1px solid; }
  .block {
    background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin-bottom: 16px;
  }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } }
  .big-num { font-size: 32px; font-weight: 700; font-family: "JetBrains Mono", monospace; margin: 8px 0; }
  .pct { font-size: 16px; color: #94a3b8; margin-left: 8px; font-weight: 500; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; border: 1px solid; }
  .formula { color: #67e8f9; }
  .calculation { color: #86efac; font-size: 12px; }
  .conclusion { margin-top: 12px; padding: 12px; background: #0f172a; border-left: 3px solid #06b6d4; border-radius: 4px; font-size: 13px; }
  .boundary-note { margin-top: 8px; padding: 12px; background: rgba(249, 115, 22, 0.08); border-left: 3px solid #f97316; border-radius: 4px; font-size: 13px; color: #fdba74; }
  .sample-name { display: inline-block; margin-left: 10px; vertical-align: middle; }
  td img { width: 44px; height: 44px; object-fit: cover; border-radius: 6px; vertical-align: middle; display: inline-block; }
  .gap-reason { font-size: 11px; color: #eab308; margin-top: 4px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #334155; font-size: 11px; color: #64748b; text-align: center; }
  @media print {
    body { background: #fff; color: #111; padding: 24px; }
    table { background: #fff; border: 1px solid #ddd; }
    th, td { border-bottom: 1px solid #ddd; }
    th { background: #f8fafc; color: #334155; }
    .summary-box, .block { background: #fafafa; color: #111; border: 1px solid #e5e7eb; }
    .conclusion { background: #f0f9ff; color: #0c4a6e; }
    .boundary-note { background: #fff7ed; color: #9a3412; }
    h1, h2, h3 { color: #111; }
    h2 { border-left-color: #0891b2; }
    tr.active-row { background: #ecfeff; }
    tr.compare-row { background: #f5f3ff; }
  }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>电池内阻误差归因报告</h1>
      <div class="meta">
        生成时间：${snapshot.generatedAt} · 操作人：${snapshot.operator} · 样本总数：${snapshot.samples.length}
      </div>
    </div>
    <div class="meta" style="text-align:right">
      <div>边界样本：${snapshot.boundaryCount} · 采样缺口：${snapshot.gapCount}</div>
      <div>对照模式：${snapshot.compareMode ? '已开启' : '未开启'}</div>
    </div>
  </div>

  <h2>总体概览</h2>
  <div class="summary-box">${snapshot.summary}</div>

  <h2>归因结果详情</h2>
  <div class="${snapshot.compareMode ? 'grid-2' : ''}">
    ${activeBlock}
    ${compareBlock}
  </div>

  <h2>样本清单</h2>
  <table>
    <thead>
      <tr><th>样本</th><th>类型</th><th>内阻</th><th>温度</th><th>SOC</th><th>测试时间</th><th>备注</th></tr>
    </thead>
    <tbody>${sampleRows}</tbody>
  </table>

  <h2>参数组配置（★ 当前 / ◆ 对照）</h2>
  <table>
    <thead>
      <tr><th>参数组</th><th>版本</th><th>基准内阻</th><th>基准温度</th><th>基准SOC</th><th>温度系数</th><th>容许误差</th><th>更新日期</th></tr>
    </thead>
    <tbody>${paramRows}</tbody>
  </table>

  <h2>变更历史（最近 20 条）</h2>
  <table>
    <thead>
      <tr><th>类型</th><th>操作说明</th><th>时间</th><th>操作人</th><th>结果快照</th></tr>
    </thead>
    <tbody>${historyRows || '<tr><td colspan="5" style="text-align:center;color:#64748b">无历史记录</td></tr>'}</tbody>
  </table>

  <div class="footer">
    电池内阻误差归因工具 · 本报告由系统自动生成 · 如需回退版本请在工具历史时间线中操作
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const fn = filename ?? `归因报告-${now}.html`;
  downloadBlob(blob, fn);
  return fn;
}

export function exportReportJson(snapshot: ReportSnapshot, filename?: string): string {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' });
  const fn = filename ?? `归因报告快照-${timestampForFilename()}.json`;
  downloadBlob(blob, fn);
  return fn;
}

export async function captureElementScreenshot(element: HTMLElement, filename?: string): Promise<string> {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(element, {
    backgroundColor: '#0f172a',
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false
  });
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('截图失败：生成 Blob 为空')); return; }
      const fn = filename ?? `归因截图-${timestampForFilename()}.png`;
      downloadBlob(blob, fn);
      resolve(fn);
    }, 'image/png');
  });
}

export function triggerWindowPrint(): void {
  window.print();
}
