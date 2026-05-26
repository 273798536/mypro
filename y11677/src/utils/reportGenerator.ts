import type { GyroFrame, Anomaly, CorrectionRecord, FlightReport } from '../types';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const generateFlightReport = (
  frames: GyroFrame[],
  anomalies: Anomaly[],
  corrections: CorrectionRecord[],
  dataSource: string
): FlightReport => {
  const anomalyCount = {
    warning: anomalies.filter(a => a.severity === 'warning').length,
    error: anomalies.filter(a => a.severity === 'error').length,
    critical: anomalies.filter(a => a.severity === 'critical').length,
  };

  const totalAnomalies = anomalyCount.warning + anomalyCount.error + anomalyCount.critical;
  const qualityScore = calculateQualityScore(frames.length, totalAnomalies, anomalyCount.critical);

  const summary = generateSummary(frames.length, anomalyCount, corrections.length);

  return {
    id: generateId(),
    startTime: frames[0]?.timestamp || 0,
    endTime: frames[frames.length - 1]?.timestamp || 0,
    totalFrames: frames.length,
    anomalyCount,
    calibrationRecords: corrections,
    summary,
    dataSource,
    exportTime: Date.now(),
    qualityScore,
  };
};

const calculateQualityScore = (
  totalFrames: number,
  totalAnomalies: number,
  criticalCount: number
): number => {
  if (totalFrames === 0) return 0;

  const anomalyRate = totalAnomalies / totalFrames;
  let score = 100;

  score -= anomalyRate * 50;
  score -= criticalCount * 10;

  return Math.max(0, Math.min(100, Math.round(score)));
};

const generateSummary = (
  totalFrames: number,
  anomalyCount: { warning: number; error: number; critical: number },
  correctionsCount: number
): string => {
  const totalAnomalies = anomalyCount.warning + anomalyCount.error + anomalyCount.critical;
  const parts: string[] = [];

  parts.push(`本次分析共处理 ${totalFrames} 帧数据。`);

  if (totalAnomalies > 0) {
    parts.push(`检测到 ${totalAnomalies} 处异常：`);
    if (anomalyCount.critical > 0) parts.push(`${anomalyCount.critical} 处严重异常，`);
    if (anomalyCount.error > 0) parts.push(`${anomalyCount.error} 处错误，`);
    if (anomalyCount.warning > 0) parts.push(`${anomalyCount.warning} 处警告。`);
  } else {
    parts.push('未检测到数据异常，数据质量良好。');
  }

  if (correctionsCount > 0) {
    parts.push(`已应用 ${correctionsCount} 项校准修正。`);
  }

  return parts.join('');
};

export const exportReportAsJSON = (report: FlightReport): string => {
  return JSON.stringify(report, null, 2);
};

export const exportReportAsText = (report: FlightReport): string => {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('航天器姿态分析报告');
  lines.push('='.repeat(60));
  lines.push('');

  lines.push(`报告ID: ${report.id}`);
  lines.push(`导出时间: ${new Date(report.exportTime).toLocaleString()}`);
  lines.push(`数据来源: ${report.dataSource}`);
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('概览');
  lines.push('-'.repeat(60));
  lines.push(`总帧数: ${report.totalFrames}`);
  lines.push(`开始时间: ${new Date(report.startTime).toLocaleString()}`);
  lines.push(`结束时间: ${new Date(report.endTime).toLocaleString()}`);
  lines.push(`时长: ${((report.endTime - report.startTime) / 1000).toFixed(2)} 秒`);
  lines.push(`数据质量评分: ${report.qualityScore}/100`);
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('异常统计');
  lines.push('-'.repeat(60));
  lines.push(`警告: ${report.anomalyCount.warning}`);
  lines.push(`错误: ${report.anomalyCount.error}`);
  lines.push(`严重: ${report.anomalyCount.critical}`);
  lines.push(`总计: ${report.anomalyCount.warning + report.anomalyCount.error + report.anomalyCount.critical}`);
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('摘要');
  lines.push('-'.repeat(60));
  lines.push(report.summary);
  lines.push('');

  if (report.calibrationRecords.length > 0) {
    lines.push('-'.repeat(60));
    lines.push(`校准记录 (${report.calibrationRecords.length} 项)`);
    lines.push('-'.repeat(60));
    report.calibrationRecords.forEach((record, index) => {
      lines.push(`${index + 1}. ${record.type}`);
      lines.push(`   时间: ${new Date(record.timestamp).toLocaleString()}`);
      lines.push(`   操作人: ${record.operator}`);
      if (record.note) {
        lines.push(`   备注: ${record.note}`);
      }
      lines.push('');
    });
  }

  return lines.join('\n');
};

export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
