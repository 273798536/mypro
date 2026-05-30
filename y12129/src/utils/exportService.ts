import { AnalysisSnapshot, CorrectedPoint } from '../types';

export function exportToCSV(snapshot: AnalysisSnapshot): string {
  const headers = [
    '测量点',
    '设计尺寸',
    '测量值',
    '校正值',
    '残差',
    '公差',
    '是否合格',
    '是否缺失',
    '是否混批',
    '夹具ID',
    '数据引用',
  ];

  const rows = snapshot.correctedPoints.map((p) => [
    p.pointName,
    p.designSize.toFixed(4),
    p.measuredValue.toFixed(4),
    p.correctedValue.toFixed(4),
    p.residual.toFixed(6),
    `±${p.tolerance}`,
    p.isPass ? '是' : '否',
    p.isMissing ? '是' : '否',
    p.isContaminated ? '是' : '否',
    p.fixtureId,
    p.rawDataRef,
  ]);

  const csvContent = [
    `# 批次号: ${snapshot.batchNo}`,
    `# 数据源文件: ${snapshot.sourceFileName}`,
    `# 数据哈希: ${snapshot.dataHash}`,
    `# 分析时间: ${new Date(snapshot.timestamp).toISOString()}`,
    `# 夹具偏移量: ${snapshot.fittingParams.systematicOffset.toFixed(6)}`,
    `# 拟合R²: ${snapshot.fittingParams.rSquared.toFixed(6)}`,
    '',
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

export function exportToJSON(snapshot: AnalysisSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
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

export function downloadCSV(snapshot: AnalysisSnapshot): void {
  const csvContent = exportToCSV(snapshot);
  const filename = `measurement_analysis_${snapshot.batchNo}_${Date.now()}.csv`;
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function downloadJSON(snapshot: AnalysisSnapshot): void {
  const jsonContent = exportToJSON(snapshot);
  const filename = `measurement_analysis_${snapshot.batchNo}_${Date.now()}.json`;
  downloadFile(jsonContent, filename, 'application/json');
}

export function validateDataConsistency(
  snapshot: AnalysisSnapshot,
  currentPoints: CorrectedPoint[]
): boolean {
  if (snapshot.correctedPoints.length !== currentPoints.length) {
    return false;
  }

  for (let i = 0; i < snapshot.correctedPoints.length; i++) {
    const saved = snapshot.correctedPoints[i];
    const current = currentPoints[i];
    if (
      saved.pointId !== current.pointId ||
      saved.correctedValue !== current.correctedValue ||
      saved.isPass !== current.isPass
    ) {
      return false;
    }
  }

  return true;
}
