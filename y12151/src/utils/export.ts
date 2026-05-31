import { RangingRecord, CalibrationSummary, ExportFormat } from '../types';
import Papa from 'papaparse';

export const generateSummary = (
  records: RangingRecord[],
  phase: 'phase1' | 'phase2'
): CalibrationSummary => {
  const calibratedRecords = records.filter(r => r.status === 'calibrated');
  const anomalyRecords = records.filter(r => r.status === 'anomaly');
  const warningRecords = records.filter(r => 
    r.anomalies.some(a => a.severity === 'warning' && !a.isResolved)
  );
  const errorRecords = records.filter(r => 
    r.anomalies.some(a => a.severity === 'error' && !a.isResolved)
  );
  
  const validRecords = calibratedRecords.filter(r => r.calibratedDistance !== undefined);
  const errors = validRecords.map(r => {
    const rawInMeters = r.standardizedDistance ?? r.rawDistance;
    return Math.abs((r.calibratedDistance! - rawInMeters) / rawInMeters * 100);
  });
  
  const averageError = errors.length > 0 
    ? errors.reduce((a, b) => a + b, 0) / errors.length 
    : 0;
  const maxError = errors.length > 0 ? Math.max(...errors) : 0;
  
  const tempCorrections = calibratedRecords
    .map(r => r.temperatureCorrection ?? 0);
  const materialCorrections = calibratedRecords
    .filter(r => r.materialCorrection !== undefined)
    .map(r => r.materialCorrection!);
  
  const temperatureImpact = tempCorrections.length > 0
    ? Math.abs(tempCorrections.reduce((a, b) => a + b, 0)) / tempCorrections.length
    : 0;
  const materialImpact = materialCorrections.length > 0
    ? Math.abs(materialCorrections.reduce((a, b) => a + b, 0)) / materialCorrections.length
    : 0;
  
  const affectedByMaterialCount = records.filter(r => r.affectedByMaterial).length;
  
  return {
    totalRecords: records.length,
    calibratedCount: calibratedRecords.length,
    anomalyCount: anomalyRecords.length,
    warningCount: warningRecords.length,
    errorCount: errorRecords.length,
    averageError,
    maxError,
    temperatureImpact,
    materialImpact,
    phase,
    recordsAffectedByMaterial: affectedByMaterialCount,
  };
};

export const exportToCSV = (records: RangingRecord[]): string => {
  const csvData = records.map(record => ({
    '记录ID': record.id.slice(0, 8),
    '原始测距值': record.rawDistance,
    '原始单位': record.rawDistanceUnit,
    '环境温度': record.temperature,
    '温度单位': record.temperatureUnit,
    '发射频率(kHz)': record.frequency,
    '反射面材质': record.reflectiveMaterial || '-',
    '标准距离(m)': record.standardizedDistance?.toFixed(6) || '-',
    '校准后距离(m)': record.calibratedDistance?.toFixed(6) || '-',
    '温度校正量(m)': record.temperatureCorrection?.toFixed(6) || '-',
    '材质校正量(m)': record.materialCorrection?.toFixed(6) || '-',
    '受材质影响': record.affectedByMaterial ? '是' : '否',
    '状态': record.status === 'calibrated' ? '已校准' : record.status === 'anomaly' ? '异常' : '待处理',
    '异常类型': record.anomalies.map(a => a.type).join('; ') || '-',
    '校准步骤': record.anomalies.length,
    '记录时间': record.timestamp.toISOString(),
  }));

  return Papa.unparse(csvData, {
    header: true,
  });
};

export const exportToJSON = (records: RangingRecord[], summary: CalibrationSummary): string => {
  return JSON.stringify({
    exportTime: new Date().toISOString(),
    summary,
    records: records.map(r => ({
      ...r,
      timestamp: r.timestamp.toISOString(),
      calibrationSteps: r.calibrationSteps.map(s => ({
        ...s,
        timestamp: s.timestamp.toISOString(),
      })),
    })),
  }, null, 2);
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
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

export const exportResults = (
  records: RangingRecord[],
  format: ExportFormat,
  phase: 'phase1' | 'phase2'
) => {
  const summary = generateSummary(records, phase);
  
  if (format === 'csv') {
    const csvContent = exportToCSV(records);
    const filename = `声波测距校准报告_${phase}_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  } else {
    const jsonContent = exportToJSON(records, summary);
    const filename = `声波测距校准报告_${phase}_${new Date().toISOString().slice(0, 10)}.json`;
    downloadFile(jsonContent, filename, 'application/json');
  }
  
  return summary;
};
