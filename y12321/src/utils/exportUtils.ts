import { AnalysisRecord, AuditLogEntry, ExportOptions, STATUS_LABELS, PENDING_REASON_LABELS, ABNORMAL_REASON_LABELS } from '../types';

export function exportToCSV(
  records: AnalysisRecord[],
  auditLogs: AuditLogEntry[],
  options: ExportOptions
): string {
  let csvContent = '';
  
  const filteredRecords = records.filter(r => {
    if (r.status === 'normal' && !options.includeNormal) return false;
    if (r.status === 'pending' && !options.includePending) return false;
    if (r.status === 'abnormal' && !options.includeAbnormal) return false;
    return true;
  });
  
  csvContent += '\uFEFF';
  
  const headers = [
    '记录ID',
    '指标A',
    '指标B',
    '样本量',
    '状态',
    '相关系数',
    'P值',
    '滞后天数',
    '是否人工修改滞后',
    '待确认原因',
    '异常原因',
    '判断结论',
    '分组字段',
    '事件备注',
    '数据来源',
    '创建时间',
    '更新时间',
  ];
  
  if (options.includeEvidence) {
    headers.push('证据链');
  }
  
  csvContent += headers.join(',') + '\n';
  
  for (const record of filteredRecords) {
    const modifiedMark = record.lagModified ? ' *' : '';
    const row = [
      record.id + modifiedMark,
      record.metricA,
      record.metricB,
      record.sampleSize,
      STATUS_LABELS[record.status],
      record.correlationCoeff.toFixed(4),
      record.pValue.toFixed(4),
      record.lagValue,
      record.lagModified ? '是' : '否',
      record.pendingReason ? PENDING_REASON_LABELS[record.pendingReason] : '',
      record.abnormalReason ? ABNORMAL_REASON_LABELS[record.abnormalReason] : '',
      `"${record.judgment.replace(/"/g, '""')}"`,
      record.groupField || '',
      record.eventNote || '',
      record.dataSource,
      record.createdAt,
      record.updatedAt,
    ];
    
    if (options.includeEvidence) {
      const evidenceStr = record.evidenceChain
        .map(e => `[${e.type}] ${e.content}`)
        .join('; ');
      row.push(`"${evidenceStr.replace(/"/g, '""')}"`);
    }
    
    csvContent += row.join(',') + '\n';
  }
  
  if (options.includeAudit && auditLogs.length > 0) {
    csvContent += '\n--- 改动审计日志 ---\n';
    csvContent += ['日志ID', '关联记录', '修改字段', '旧值', '新值', '修改原因', '修改时间', '操作人', '影响范围'].join(',') + '\n';
    
    const filteredLogs = auditLogs.filter(log => 
      filteredRecords.some(r => r.id === log.recordId)
    );
    
    for (const log of filteredLogs) {
      csvContent += [
        log.id,
        log.recordId,
        log.fieldName,
        `"${log.oldValue}"`,
        `"${log.newValue}"`,
        `"${log.reason}"`,
        log.modifiedAt,
        log.operator,
        log.impactScope.join('; '),
      ].join(',') + '\n';
    }
  }
  
  return csvContent;
}

export function exportToJSON(
  records: AnalysisRecord[],
  auditLogs: AuditLogEntry[],
  options: ExportOptions
): string {
  const filteredRecords = records.filter(r => {
    if (r.status === 'normal' && !options.includeNormal) return false;
    if (r.status === 'pending' && !options.includePending) return false;
    if (r.status === 'abnormal' && !options.includeAbnormal) return false;
    return true;
  });
  
  const filteredLogs = options.includeAudit 
    ? auditLogs.filter(log => filteredRecords.some(r => r.id === log.recordId))
    : [];
  
  const exportData = {
    exportTime: new Date().toISOString(),
    options,
    summary: {
      totalRecords: filteredRecords.length,
      normalCount: filteredRecords.filter(r => r.status === 'normal').length,
      pendingCount: filteredRecords.filter(r => r.status === 'pending').length,
      abnormalCount: filteredRecords.filter(r => r.status === 'abnormal').length,
      modifiedCount: filteredRecords.filter(r => r.lagModified).length,
    },
    records: filteredRecords,
    auditLogs: filteredLogs,
  };
  
  return JSON.stringify(exportData, null, 2);
}

export function exportToMarkdown(
  records: AnalysisRecord[],
  auditLogs: AuditLogEntry[],
  options: ExportOptions
): string {
  let md = '# 相关性误判分析报告\n\n';
  md += `导出时间：${new Date().toLocaleString('zh-CN')}\n\n`;
  
  const filteredRecords = records.filter(r => {
    if (r.status === 'normal' && !options.includeNormal) return false;
    if (r.status === 'pending' && !options.includePending) return false;
    if (r.status === 'abnormal' && !options.includeAbnormal) return false;
    return true;
  });
  
  md += '## 概览统计\n\n';
  md += `| 指标 | 数值 |\n|------|------|\n`;
  md += `| 总记录数 | ${filteredRecords.length} |\n`;
  md += `| 正常明细 | ${filteredRecords.filter(r => r.status === 'normal').length} |\n`;
  md += `| 待确认 | ${filteredRecords.filter(r => r.status === 'pending').length} |\n`;
  md += `| 异常 | ${filteredRecords.filter(r => r.status === 'abnormal').length} |\n`;
  md += `| 人工修改过滞后检查 | ${filteredRecords.filter(r => r.lagModified).length} |\n\n`;
  
  if (options.includeAbnormal && filteredRecords.some(r => r.status === 'abnormal')) {
    md += '## 异常清单（无法计算的原因）\n\n';
    const abnormalRecords = filteredRecords.filter(r => r.status === 'abnormal');
    for (const record of abnormalRecords) {
      const modifiedMark = record.lagModified ? ' ⚠️（滞后检查已人工修改）' : '';
      md += `### ${record.id}${modifiedMark}\n\n`;
      md += `- **指标对**：${record.metricA} → ${record.metricB}\n`;
      md += `- **样本量**：${record.sampleSize}\n`;
      md += `- **异常原因**：${record.abnormalReason ? ABNORMAL_REASON_LABELS[record.abnormalReason] : '未知'}\n`;
      md += `- **判断结论**：${record.judgment}\n`;
      if (record.groupField) md += `- **分组字段**：${record.groupField}\n`;
      if (record.eventNote) md += `- **事件备注**：${record.eventNote}\n`;
      md += '\n';
    }
  }
  
  if (options.includePending && filteredRecords.some(r => r.status === 'pending')) {
    md += '## 待确认清单\n\n';
    const pendingRecords = filteredRecords.filter(r => r.status === 'pending');
    for (const record of pendingRecords) {
      const modifiedMark = record.lagModified ? ' ⚠️（滞后检查已人工修改）' : '';
      md += `### ${record.id}${modifiedMark}\n\n`;
      md += `- **指标对**：${record.metricA} → ${record.metricB}\n`;
      md += `- **样本量**：${record.sampleSize}\n`;
      md += `- **相关系数**：r = ${record.correlationCoeff.toFixed(4)}\n`;
      md += `- **P值**：p = ${record.pValue.toFixed(4)}\n`;
      md += `- **滞后天数**：${record.lagValue}天\n`;
      md += `- **待确认原因**：${record.pendingReason ? PENDING_REASON_LABELS[record.pendingReason] : '未知'}\n`;
      md += `- **判断结论**：${record.judgment}\n`;
      if (record.groupField) md += `- **分组字段**：${record.groupField}\n`;
      if (record.eventNote) md += `- **事件备注**：${record.eventNote}\n`;
      md += '\n';
    }
  }
  
  if (options.includeNormal && filteredRecords.some(r => r.status === 'normal')) {
    md += '## 正常明细清单\n\n';
    const normalRecords = filteredRecords.filter(r => r.status === 'normal');
    for (const record of normalRecords) {
      const modifiedMark = record.lagModified ? ' ⚠️（滞后检查已人工修改）' : '';
      md += `### ${record.id}${modifiedMark}\n\n`;
      md += `- **指标对**：${record.metricA} → ${record.metricB}\n`;
      md += `- **样本量**：${record.sampleSize}\n`;
      md += `- **相关系数**：r = ${record.correlationCoeff.toFixed(4)}\n`;
      md += `- **P值**：p = ${record.pValue.toFixed(4)}\n`;
      md += `- **滞后天数**：${record.lagValue}天\n`;
      md += `- **判断结论**：${record.judgment}\n`;
      if (record.groupField) md += `- **分组字段**：${record.groupField}\n`;
      if (record.eventNote) md += `- **事件备注**：${record.eventNote}\n`;
      md += '\n';
    }
  }
  
  if (options.includeEvidence) {
    md += '## 证据链详情\n\n';
    for (const record of filteredRecords) {
      md += `### ${record.id}\n\n`;
      for (const ev of record.evidenceChain) {
        const typeLabel = ev.type === 'source' ? '来源' : ev.type === 'judgment' ? '判断' : '结果';
        const operatorLabel = ev.operator === 'system' ? '系统' : '人工';
        md += `- **[${typeLabel}]** ${ev.content}  \n`;
        md += `  *${operatorLabel} · ${new Date(ev.timestamp).toLocaleString('zh-CN')}*\n`;
      }
      md += '\n';
    }
  }
  
  if (options.includeAudit && auditLogs.length > 0) {
    const filteredLogs = auditLogs.filter(log => 
      filteredRecords.some(r => r.id === log.recordId)
    );
    
    if (filteredLogs.length > 0) {
      md += '## 改动审计日志\n\n';
      md += '| 日志ID | 关联记录 | 修改字段 | 旧值 → 新值 | 修改原因 | 操作人 | 时间 |\n';
      md += '|--------|----------|----------|-------------|----------|--------|------|\n';
      
      for (const log of filteredLogs) {
        md += `| ${log.id} | ${log.recordId} | ${log.fieldName} | ${log.oldValue} → ${log.newValue} | ${log.reason} | ${log.operator} | ${new Date(log.modifiedAt).toLocaleString('zh-CN')} |\n`;
      }
      md += '\n';
      
      md += '### 改动影响说明\n\n';
      md += '标注 `⚠️（滞后检查已人工修改）` 的记录表示其滞后检查参数经过人工调整。\n';
      md += '在分组对比分析时，请特别注意这些记录的判断结论可能与系统原始判断不同。\n';
    }
  }
  
  return md;
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

export function generateExportFilename(format: string): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const extMap: Record<string, string> = {
    csv: 'csv',
    json: 'json',
    markdown: 'md',
  };
  return `相关性误判分析报告_${dateStr}.${extMap[format] || format}`;
}
