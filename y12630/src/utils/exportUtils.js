import Papa from 'papaparse';

const getStatusText = (status) => {
  const statusMap = {
    success: '顺利通过（可直接使用）',
    pending: '待确认（需康复训练师复核）',
    error: '数据异常（不可用）'
  };
  return statusMap[status] || status;
};

const getConflictTypeText = (type) => {
  const typeMap = {
    none: '无冲突',
    minor_deviation: '轻微偏差',
    major_mismatch: '严重不匹配',
    invalid_data: '无效数据'
  };
  return typeMap[type] || type;
};

const formatCoord = (coord) => {
  if (!coord || !Array.isArray(coord)) return '-';
  return `[${coord[0]}, ${coord[1]}]`;
};

const downloadFile = (blob, filename) => {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToCSV = (records, filename = 'boundary_records', filters = {}) => {
  const headers = [
    '原始行号', '地块名称', '来源文件', '图片文件名', '来源备注',
    '底图坐标(左下)', '底图坐标(右下)', '底图坐标(左上)', '底图坐标(右上)',
    '标注坐标(左下)', '标注坐标(右下)', '标注坐标(左上)', '标注坐标(右上)',
    '匹配率(%)', '最大偏差', '冲突类型', '检测状态', '检测说明',
    '面积(亩)', '操作人', '检测时间', '备注'
  ];

  const rows = records.map(record => [
    record.rowNumber,
    record.fieldName,
    record.sourceFile,
    record.imageName || '-',
    record.sourceNote || '-',
    formatCoord(record.coordinates?.bottomLeft),
    formatCoord(record.coordinates?.bottomRight),
    formatCoord(record.coordinates?.topLeft),
    formatCoord(record.coordinates?.topRight),
    formatCoord(record.labelCoordinates?.bottomLeft),
    formatCoord(record.labelCoordinates?.bottomRight),
    formatCoord(record.labelCoordinates?.topLeft),
    formatCoord(record.labelCoordinates?.topRight),
    record.hitDetection?.matchRate ?? '-',
    record.hitDetection?.deviation ?? '-',
    getConflictTypeText(record.hitDetection?.conflictType),
    getStatusText(record.status),
    record.hitDetection?.message || '-',
    record.area,
    record.operator,
    record.createdAt,
    record.remarks
  ]);

  const filterNote = Object.keys(filters).length > 0
    ? `\n# 筛选条件: ${JSON.stringify(filters)}\n`
    : '';

  const csv = Papa.unparse({ fields: headers, data: rows });
  const finalContent = filterNote + csv;
  const blob = new Blob([`\uFEFF${finalContent}`], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
};

export const exportPassedRecords = (records, filename = 'passed_records') => {
  const passed = records.filter(r => r.status === 'success');
  exportToCSV(passed, filename, { status: 'success' });
};

export const exportPendingRecords = (records, filename = 'pending_records') => {
  const pending = records.filter(r => r.status === 'pending');
  exportToCSV(pending, filename, { status: 'pending' });
};

export const exportFailedRecords = (records, filename = 'failed_records') => {
  const failed = records.filter(r => r.status === 'error');
  exportToCSV(failed, filename, { status: 'error' });
};

export const generateReport = (records) => {
  const total = records.length;
  const success = records.filter(r => r.status === 'success').length;
  const pending = records.filter(r => r.status === 'pending').length;
  const error = records.filter(r => r.status === 'error').length;
  const avgMatchRate = total > 0
    ? parseFloat((records.reduce((sum, r) => sum + (r.hitDetection?.matchRate || 0), 0) / total).toFixed(1))
    : 0;
  const totalArea = parseFloat(records.reduce((sum, r) => sum + (r.area || 0), 0).toFixed(2));
  const passRate = total > 0 ? parseFloat(((success / total) * 100).toFixed(1)) : 0;

  return {
    generatedAt: new Date().toLocaleString('zh-CN'),
    summary: {
      total,
      success,
      pending,
      error,
      passRate,
      avgMatchRate,
      totalArea,
      totalAreaUnit: '亩'
    },
    legend: {
      success: '顺利通过 - 可直接使用',
      pending: '待确认 - 需康复训练师复核',
      error: '数据异常 - 不可用，需重新采集'
    },
    pendingDetails: records
      .filter(r => r.status === 'pending')
      .map(r => ({
        rowNumber: r.rowNumber,
        fieldName: r.fieldName,
        sourceFile: r.sourceFile,
        imageName: r.imageName,
        sourceNote: r.sourceNote,
        matchRate: r.hitDetection?.matchRate,
        deviation: r.hitDetection?.deviation,
        message: r.hitDetection?.message,
        operator: r.operator
      })),
    errorDetails: records
      .filter(r => r.status === 'error')
      .map(r => ({
        rowNumber: r.rowNumber,
        fieldName: r.fieldName,
        sourceFile: r.sourceFile,
        imageName: r.imageName,
        sourceNote: r.sourceNote,
        matchRate: r.hitDetection?.matchRate,
        deviation: r.hitDetection?.deviation,
        message: r.hitDetection?.message,
        validationErrors: r.hitDetection?.validationErrors || r.validation?.issues || [],
        operator: r.operator
      })),
    fullDetails: records.map(r => ({
      rowNumber: r.rowNumber,
      fieldName: r.fieldName,
      sourceFile: r.sourceFile,
      imageName: r.imageName,
      sourceNote: r.sourceNote,
      matchRate: r.hitDetection?.matchRate,
      deviation: r.hitDetection?.deviation,
      status: getStatusText(r.status),
      conflictType: getConflictTypeText(r.hitDetection?.conflictType),
      message: r.hitDetection?.message,
      area: r.area,
      operator: r.operator,
      createdAt: r.createdAt
    }))
  };
};

export const exportReport = (records, filename = 'boundary_review_report') => {
  const report = generateReport(records);
  const jsonString = JSON.stringify(report, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  downloadFile(blob, `${filename}_${new Date().toISOString().split('T')[0]}.json`);
};

export const exportSummaryText = (records, filename = 'summary') => {
  const report = generateReport(records);
  const lines = [
    '========================================',
    '  农田地块边界修补 - 复盘报告',
    '========================================',
    '',
    `生成时间: ${report.generatedAt}`,
    '',
    '--- 统计摘要 ---',
    `总记录数: ${report.summary.total}`,
    `顺利通过: ${report.summary.success} 条 (${report.summary.passRate}%)`,
    `待确认: ${report.summary.pending} 条`,
    `数据异常: ${report.summary.error} 条`,
    `平均匹配率: ${report.summary.avgMatchRate}%`,
    `总面积: ${report.summary.totalArea} ${report.summary.totalAreaUnit}`,
    '',
    '--- 状态说明 ---',
    `✓ 顺利通过: ${report.legend.success}`,
    `? 待确认: ${report.legend.pending}`,
    `✗ 数据异常: ${report.legend.error}`,
    '',
    '--- 待确认记录明细（需康复训练师复核）---',
  ];

  if (report.pendingDetails.length === 0) {
    lines.push('(无待确认记录)');
  } else {
    report.pendingDetails.forEach(r => {
      lines.push(`  行号${r.rowNumber} | ${r.fieldName} | 匹配率:${r.matchRate}% | 偏差:${r.deviation}`);
      lines.push(`    来源: ${r.sourceFile} (${r.imageName || '无图片'})`);
      lines.push(`    说明: ${r.message}`);
      lines.push('');
    });
  }

  lines.push('--- 数据异常记录明细（不可用）---');
  if (report.errorDetails.length === 0) {
    lines.push('(无异常记录)');
  } else {
    report.errorDetails.forEach(r => {
      lines.push(`  行号${r.rowNumber} | ${r.fieldName} | 匹配率:${r.matchRate}%`);
      lines.push(`    来源: ${r.sourceFile} (${r.imageName || '无图片'})`);
      lines.push(`    问题: ${r.message}`);
      if (r.validationErrors && r.validationErrors.length > 0) {
        lines.push(`    校验错误: ${r.validationErrors.join('; ')}`);
      }
      lines.push('');
    });
  }

  lines.push('========================================');
  lines.push('报告结束');
  lines.push('========================================');

  const text = lines.join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  downloadFile(blob, `${filename}_${new Date().toISOString().split('T')[0]}.txt`);
};
