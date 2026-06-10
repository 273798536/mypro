import type {
  Sample,
  QcResult,
  Anomaly,
  RunBatch,
  Cage,
  ReagentBatch,
  ExportOptions,
} from '@/types';
import { generateExportFileName, formatDateTime } from './common';

export function exportToCSV(
  samples: Sample[],
  qcResults: QcResult[],
  anomalies: Anomaly[],
  runBatch: RunBatch,
  cages: Cage[],
  reagents: ReagentBatch[],
  options: ExportOptions
): string {
  const lines: string[] = [];

  lines.push('# 小鼠笼位健康台账 - 导出报告');
  lines.push(`# 运行批次: ${runBatch.batchNumber}`);
  lines.push(`# 批次名称: ${runBatch.name}`);
  lines.push(`# 运行时间: ${formatDateTime(runBatch.runAt)}`);
  lines.push(`# 操作人: ${runBatch.operator}`);
  lines.push(`# 导出时间: ${formatDateTime(new Date())}`);
  lines.push(`# 样本总数: ${runBatch.sampleCount}`);
  lines.push(`# 异常数: ${runBatch.anomalyCount}`);
  lines.push('');

  if (anomalies.length > 0) {
    lines.push('## 异常拦截说明');
    lines.push(
      '以下为本次运行中检测到的异常记录，质控组可据此判断数据质量及处理方向。'
    );
    lines.push('');
    lines.push('异常类型,严重程度,处理分类,异常描述,建议操作,关联样本数,状态');
    for (const anomaly of anomalies) {
      lines.push(
        [
          anomaly.type,
          getSeverityLabel(anomaly.severity),
          getCategoryLabel(anomaly.category),
          `"${anomaly.description.replace(/"/g, '""')}"`,
          `"${anomaly.suggestion.replace(/"/g, '""')}"`,
          anomaly.affectedSamples.length,
          getStatusLabel(anomaly.status),
        ].join(',')
      );
    }
    lines.push('');

    const duplicateAnomalies = anomalies.filter((a) =>
      a.type.includes('条码重复')
    );
    if (duplicateAnomalies.length > 0) {
      lines.push('## 条码重复拦截明细');
      lines.push(
        '样本条码重复可能导致检测结果混淆，已被自动拦截。请核实条码后重新录入。'
      );
      for (const anomaly of duplicateAnomalies) {
        lines.push(`- 拦截原因: ${anomaly.description}`);
        lines.push(`- 影响样本: ${anomaly.affectedSamples.length} 条`);
        lines.push(`- 处理建议: ${anomaly.suggestion}`);
      }
      lines.push('');
    }
  }

  if (options.includeSamples && samples.length > 0) {
    lines.push('## 样本明细');
    lines.push(
      '样本ID,条码,笼位,样本类型,采集日期,采集人,状态,备注'
    );
    for (const sample of samples) {
      const cage = cages.find((c) => c.id === sample.cageId);
      lines.push(
        [
          sample.id,
          sample.barcode,
          cage ? cage.cageNumber : '未知',
          sample.sampleType,
          sample.collectionDate,
          sample.collector,
          getSampleStatusLabel(sample.status),
          `"${sample.remark.replace(/"/g, '""')}"`,
        ].join(',')
      );
    }
    lines.push('');
  }

  if (options.includeQcResults && qcResults.length > 0) {
    lines.push('## 质控结果');
    lines.push(
      '质控ID,样本条码,检测项目,结果值,单位,状态,试剂批号,检测时间,计算公式,失败原因'
    );
    for (const qc of qcResults) {
      const sample = samples.find((s) => s.id === qc.sampleId);
      const reagent = reagents.find((r) => r.id === qc.reagentBatchId);
      lines.push(
        [
          qc.id,
          sample ? sample.barcode : '未知',
          qc.testItem,
          qc.resultValue ?? '未测定',
          qc.unit,
          getQcStatusLabel(qc.resultStatus),
          reagent ? reagent.batchNumber : '未指定',
          formatDateTime(qc.testedAt),
          qc.formula,
          `"${(qc.failureReason || '').replace(/"/g, '""')}"`,
        ].join(',')
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function exportToHTML(
  samples: Sample[],
  qcResults: QcResult[],
  anomalies: Anomaly[],
  runBatch: RunBatch,
  cages: Cage[],
  reagents: ReagentBatch[],
  options: ExportOptions
): string {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>小鼠笼位健康台账 - ${runBatch.batchNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 20px; color: #333; }
    h1 { color: #334e68; font-size: 20px; border-bottom: 2px solid #bcccdc; padding-bottom: 8px; }
    h2 { color: #486581; font-size: 16px; margin-top: 24px; }
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
    .info-item { background: #f0f4f8; padding: 10px 12px; border-radius: 4px; }
    .info-label { font-size: 12px; color: #627d98; margin-bottom: 4px; }
    .info-value { font-size: 14px; font-weight: 500; color: #102a43; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
    th { background: #334e68; color: white; padding: 8px 10px; text-align: left; font-weight: 500; }
    td { padding: 6px 10px; border-bottom: 1px solid #d9e2ec; }
    tr:nth-child(even) { background: #f8f9fa; }
    .anomaly-card { border-left: 4px solid; padding: 12px; margin: 8px 0; background: #fff; }
    .anomaly-supplement { border-color: #e68a00; background: #fff4e6; }
    .anomaly-recalibration { border-color: #7a00e6; background: #f3e8ff; }
    .anomaly-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
    .anomaly-meta { font-size: 12px; color: #627d98; margin-bottom: 8px; }
    .anomaly-desc { font-size: 13px; color: #334e68; margin-bottom: 6px; }
    .anomaly-suggestion { font-size: 12px; color: #486581; background: rgba(255,255,255,0.7); padding: 6px 8px; border-radius: 3px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; }
    .badge-supplement { background: #ffe0b3; color: #804d00; }
    .badge-recalibration { background: #dcb8ff; color: #3d0080; }
    .badge-normal { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-abnormal { background: #fee2e2; color: #991b1b; }
    .section-note { background: #e6f6ff; border-left: 3px solid #0080e6; padding: 10px 12px; margin: 10px 0; font-size: 13px; color: #004d80; }
    .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #d9e2ec; font-size: 12px; color: #829ab1; text-align: center; }
  </style>
</head>
<body>
  <h1>🐭 小鼠笼位健康台账 - 质控报告</h1>

  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">运行批次</div>
      <div class="info-value">${runBatch.batchNumber}</div>
    </div>
    <div class="info-item">
      <div class="info-label">批次名称</div>
      <div class="info-value">${runBatch.name}</div>
    </div>
    <div class="info-item">
      <div class="info-label">操作人</div>
      <div class="info-value">${runBatch.operator}</div>
    </div>
    <div class="info-item">
      <div class="info-label">运行时间</div>
      <div class="info-value">${formatDateTime(runBatch.runAt)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">样本总数</div>
      <div class="info-value">${runBatch.sampleCount}</div>
    </div>
    <div class="info-item">
      <div class="info-label">异常数</div>
      <div class="info-value">${runBatch.anomalyCount}</div>
    </div>
  </div>

  ${anomalies.length > 0 ? `
  <h2>⚠️ 异常记录与拦截说明</h2>
  <div class="section-note">
    以下为本次运行中检测到的异常记录。质控组可根据"处理分类"判断是需要补材料还是改口径。
    条码重复等异常已自动拦截，具体原因请查看下方明细。
  </div>
  ${anomalies
    .map(
      (a) => `
  <div class="anomaly-card anomaly-${a.category}">
    <div class="anomaly-title">
      ${a.type}
      <span class="badge badge-${a.category}">${getCategoryLabel(a.category)}</span>
      <span class="badge" style="background:#fee2e2;color:#991b1b;">${getSeverityLabel(a.severity)}</span>
    </div>
    <div class="anomaly-meta">
      状态: ${getStatusLabel(a.status)} | 影响样本: ${a.affectedSamples.length} 条 | 创建时间: ${formatDateTime(a.createdAt)}
    </div>
    <div class="anomaly-desc">${a.description}</div>
    <div class="anomaly-suggestion">💡 建议操作: ${a.suggestion}</div>
  </div>
  `
    )
    .join('')}
  ` : ''}

  ${options.includeSamples && samples.length > 0 ? `
  <h2>📋 样本明细</h2>
  <table>
    <thead>
      <tr>
        <th>样本条码</th>
        <th>笼位号</th>
        <th>样本类型</th>
        <th>采集日期</th>
        <th>采集人</th>
        <th>状态</th>
        <th>备注</th>
      </tr>
    </thead>
    <tbody>
      ${samples
        .map((s) => {
          const cage = cages.find((c) => c.id === s.cageId);
          return `
      <tr>
        <td>${s.barcode}</td>
        <td>${cage ? cage.cageNumber : '-'}</td>
        <td>${s.sampleType}</td>
        <td>${s.collectionDate}</td>
        <td>${s.collector}</td>
        <td>${getSampleStatusLabel(s.status)}</td>
        <td>${s.remark || '-'}</td>
      </tr>`;
        })
        .join('')}
    </tbody>
  </table>
  ` : ''}

  ${options.includeQcResults && qcResults.length > 0 ? `
  <h2>🔬 质控结果</h2>
  <table>
    <thead>
      <tr>
        <th>检测项目</th>
        <th>样本条码</th>
        <th>结果值</th>
        <th>单位</th>
        <th>状态</th>
        <th>试剂批号</th>
        <th>检测时间</th>
        <th>失败原因</th>
      </tr>
    </thead>
    <tbody>
      ${qcResults
        .map((q) => {
          const sample = samples.find((s) => s.id === q.sampleId);
          const reagent = reagents.find((r) => r.id === q.reagentBatchId);
          return `
      <tr>
        <td>${q.testItem}</td>
        <td>${sample ? sample.barcode : '-'}</td>
        <td>${q.resultValue ?? '未测定'}</td>
        <td>${q.unit}</td>
        <td><span class="badge badge-${q.resultStatus === 'normal' ? 'normal' : q.resultStatus === 'warning' ? 'warning' : q.resultStatus === 'abnormal' ? 'abnormal' : 'recalibration'}">${getQcStatusLabel(q.resultStatus)}</span></td>
        <td>${reagent ? reagent.batchNumber : '未指定'}</td>
        <td>${formatDateTime(q.testedAt)}</td>
        <td>${q.failureReason || '-'}</td>
      </tr>`;
        })
        .join('')}
    </tbody>
  </table>
  ` : ''}

  <div class="footer">
    本报告由小鼠笼位健康台账系统自动生成 | 导出时间: ${formatDateTime(new Date())}
  </div>
</body>
</html>`;

  return html;
}

function getSeverityLabel(severity: string): string {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '紧急',
  };
  return map[severity] || severity;
}

function getCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    supplement: '补材料',
    recalibration: '改口径',
  };
  return map[category] || category;
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
  };
  return map[status] || status;
}

function getSampleStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待检测',
    testing: '检测中',
    completed: '已完成',
    failed: '失败',
  };
  return map[status] || status;
}

function getQcStatusLabel(status: string): string {
  const map: Record<string, string> = {
    normal: '正常',
    warning: '警告',
    abnormal: '异常',
    pending: '待检测',
    failed: '失败',
  };
  return map[status] || status;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export { generateExportFileName };
