import type {
  BatchRecord,
  Anomaly,
  CalculationResult,
} from '../../types';
import { generateReportFileName, formatDateTime } from './fileNaming';

const ANOMALY_TYPE_LABELS: Record<string, string> = {
  ph_out_of_range: 'pH值越界',
  concentration_error: '浓度异常',
  temperature_abnormal: '温度异常',
  formula_error: '化学式错误',
};

const ANOMALY_SEVERITY_LABELS: Record<string, string> = {
  warning: '警告',
  error: '错误',
  critical: '严重',
};

const CONC_UNIT_LABELS: Record<string, string> = {
  'mol/L': '摩尔浓度(mol/L)',
  'g/L': '质量浓度(g/L)',
  mass_fraction: '质量分数(%)',
};

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportHtmlReport(
  batch: BatchRecord,
  anomalies: Anomaly[],
  results: CalculationResult[],
  usePlainLanguage: boolean = true
): void {
  const filename = generateReportFileName(batch.id, 'html');

  const anomaliesHtml = anomalies.length > 0
    ? anomalies
      .map((a) => `
            <div class="anomaly-card anomaly-${a.severity}">
              <h3>${usePlainLanguage ? ANOMALY_TYPE_LABELS[a.type] : a.type} — ${usePlainLanguage ? ANOMALY_SEVERITY_LABELS[a.severity] : a.severity}</h3>
              <p class="anomaly-message">${usePlainLanguage ? a.userFriendlyMessage : a.description}</p>
              <p class="anomaly-detail">实际值：${a.actualValue}${a.expectedMin !== undefined || a.expectedMax !== undefined ? `，期望范围：[${a.expectedMin ?? '-∞'}, ${a.expectedMax ?? '+∞'}]` : ''}</p>
              ${a.handlingOpinion ? `
                <div class="opinion-box">
                  <p><strong>处理意见：</strong>${a.handlingOpinion.content}</p>
                  <p class="opinion-meta">处理人：${a.handlingOpinion.handler} | 时间：${formatDateTime(a.handlingOpinion.handledAt)}</p>
                </div>
              ` : ''}
              ${a.reagentId ? `
                <p class="trace-info">
                  <strong>关联试剂：</strong>${batch.reagents.find((r) => r.id === a.reagentId)?.name || '未知'}
                  ${batch.reagents.find((r) => r.id === a.reagentId)?.weighingRecord ? `
                    | <strong>称量单号：</strong>${batch.reagents.find((r) => r.id === a.reagentId)?.weighingRecord?.recordNumber}
                  ` : ''}
                </p>
              ` : ''}
            </div>
          `)
      .join('')
    : '<p class="no-anomaly">本批次未检测到数据异常。</p>';

  const resultsHtml = results.length > 0
    ? results
      .map((r) => `
            <div class="result-card">
              <h3>${r.type === 'solubility_curve' ? '溶解度曲线分析' : r.type === 'balancing' ? '化学方程式配平' : '浓度单位换算'}</h3>
              <p class="result-explanation">${r.explanation}</p>
              ${r.detailedExplanation ? `<pre class="result-detailed">${r.detailedExplanation}</pre>` : ''}
            </div>
          `)
      .join('')
    : '<p class="no-result">暂无计算结果。</p>';

  const reagentsHtml = batch.reagents
    .map((r) => `
        <tr>
          <td>${r.name}${r.formula ? ` (${r.formula})` : ''}</td>
          <td>${r.concentration} ${CONC_UNIT_LABELS[r.concentrationUnit]}</td>
          <td>${r.temperature}°C</td>
          <td>${r.phValue}</td>
          <td>${r.weighingRecord ? r.weighingRecord.recordNumber : '-'}</td>
        </tr>
      `)
    .join('');

  const notesHtml = batch.safetyNotes.length > 0
    ? batch.safetyNotes
      .map((n) => `
            <div class="note-card">
              <p>${n.content}</p>
              <p class="note-meta">记录人：${n.author} | 时间：${formatDateTime(n.createdAt)}</p>
            </div>
          `)
      .join('')
    : '<p class="no-note">暂无安全备注。</p>';

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>溶解度分析报告 - ${batch.name}</title>
  <style>
    body { font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; background: #f8fafc; color: #1e293b; }
    h1 { color: #1e3a5f; border-bottom: 3px solid #0d9488; padding-bottom: 12px; }
    h2 { color: #0d9488; margin-top: 32px; border-left: 4px solid #0d9488; padding-left: 12px; }
    h3 { color: #334155; margin-bottom: 8px; }
    .meta { background: #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
    .meta p { margin: 4px 0; }
    .meta strong { color: #1e3a5f; display: inline-block; width: 100px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #1e3a5f; color: white; }
    .anomaly-card { background: white; border-left: 4px solid; padding: 16px; margin: 12px 0; border-radius: 0 8px 8px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .anomaly-warning { border-left-color: #f59e0b; }
    .anomaly-error { border-left-color: #dc2626; }
    .anomaly-critical { border-left-color: #7f1d1d; background: #fef2f2; }
    .anomaly-message { font-size: 15px; color: #334155; }
    .anomaly-detail { font-size: 13px; color: #64748b; }
    .opinion-box { margin-top: 12px; padding: 12px; background: #f0fdfa; border-radius: 6px; }
    .opinion-meta { font-size: 12px; color: #64748b; margin-top: 4px; }
    .trace-info { font-size: 13px; color: #0d9488; margin-top: 8px; }
    .result-card { background: white; padding: 16px; margin: 12px 0; border-radius: 8px; border: 1px solid #e2e8f0; }
    .result-explanation { font-size: 15px; color: #334155; }
    .result-detailed { background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 13px; white-space: pre-wrap; font-family: inherit; }
    .note-card { background: #fefce8; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 3px solid #eab308; }
    .note-meta { font-size: 12px; color: #64748b; margin-top: 6px; }
    .no-anomaly, .no-result, .no-note { color: #64748b; font-style: italic; padding: 12px; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
  <h1>溶解度分析报告</h1>
  <div class="meta">
    <p><strong>批次名称：</strong>${batch.name}</p>
    <p><strong>批次编号：</strong>${batch.id}</p>
    <p><strong>操作人员：</strong>${batch.operator}</p>
    <p><strong>创建时间：</strong>${formatDateTime(batch.createdAt)}</p>
    <p><strong>最后更新：</strong>${formatDateTime(batch.updatedAt)}</p>
    <p><strong>报告生成：</strong>${formatDateTime(Date.now())}</p>
  </div>

  <h2>一、试剂清单</h2>
  <table>
    <thead><tr><th>试剂名称</th><th>浓度</th><th>温度</th><th>pH值</th><th>称量单号</th></tr></thead>
    <tbody>${reagentsHtml}</tbody>
  </table>

  <h2>二、异常检测结果 (共${anomalies.length}条)</h2>
  ${anomaliesHtml}

  <h2>三、计算分析结果</h2>
  ${resultsHtml}

  <h2>四、安全备注</h2>
  ${notesHtml}

  <div class="footer">
    本报告由溶解度曲线教学器自动生成 | 生成时间：${formatDateTime(Date.now())}
  </div>
</body>
</html>`;

  downloadFile(html, filename, 'text/html;charset=utf-8');
}

export function exportCsvReport(
  batch: BatchRecord,
  anomalies: Anomaly[]
): void {
  const filename = generateReportFileName(batch.id, 'csv');

  const headers = [
    '批次名称', '批次编号', '试剂名称', '浓度值', '浓度单位',
    '温度(°C)', 'pH值', '异常类型', '严重程度',
    '异常描述(通俗语言)', '实际值', '期望值范围', '称量单号',
  ];

  const rows = batch.reagents.map((r) => {
    const reagentAnomalies = anomalies.filter((a) => a.reagentId === r.id);
    if (reagentAnomalies.length === 0) {
      return [
        batch.name, batch.id, r.name, r.concentration, r.concentrationUnit,
        r.temperature, r.phValue, '无', '无', '无', '无', '无',
        r.weighingRecord?.recordNumber || '-',
      ].join(',');
    }
    return reagentAnomalies.map((a) => [
      batch.name, batch.id, r.name, r.concentration, r.concentrationUnit,
      r.temperature, r.phValue,
      ANOMALY_TYPE_LABELS[a.type],
      ANOMALY_SEVERITY_LABELS[a.severity],
      `"${a.userFriendlyMessage.replace(/"/g, '""')}"`,
      a.actualValue,
      `[${a.expectedMin ?? '-'}, ${a.expectedMax ?? '-'}]`,
      r.weighingRecord?.recordNumber || '-',
    ].join(',')).join('\n');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const bom = '\uFEFF';
  downloadFile(bom + csv, filename, 'text/csv;charset=utf-8');
}

export function exportJsonReport(
  batch: BatchRecord,
  anomalies: Anomaly[],
  results: CalculationResult[]
): void {
  const filename = generateReportFileName(batch.id, 'json');
  const data = {
    reportMetadata: {
      generatedAt: new Date().toISOString(),
      version: '1.0',
    },
    batch,
    anomalies,
    calculationResults: results,
  };
  downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');
}
