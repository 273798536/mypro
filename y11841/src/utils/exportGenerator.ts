import type { ExportReport, GameState, Level, CargoBox, Compartment, PlacementRecord } from '../data/types';
import { getZoneLabel } from '../data/levels';

export const generateExportReport = (
  level: Level,
  gameState: GameState,
  playerName: string = '培训学员'
): ExportReport => {
  const zoneMismatchFailures = gameState.failureReasons.filter(f => f.type === 'zone_mismatch');
  const orderFailures = gameState.failureReasons.filter(f => f.type === 'delivery_order_blocked');
  const timeoutFailures = gameState.failureReasons.filter(f => f.type === 'timeout');

  const getCargoBoxById = (id: string): CargoBox | undefined =>
    level.cargoBoxes.find(c => c.id === id);

  const getCompartmentById = (id: string): Compartment | undefined =>
    level.compartments.find(c => c.id === id);

  const zoneMismatchDetails = zoneMismatchFailures.map(failure => {
    const cargoBox = getCargoBoxById(failure.cargoBoxId);
    const compartment = failure.compartmentId ? getCompartmentById(failure.compartmentId) : undefined;
    return {
      cargoBoxOriginalName: cargoBox?.originalName || failure.originalNames.cargoBox,
      compartmentOriginalName: compartment?.originalName || failure.originalNames.compartment || '未知格位',
      expectedZone: cargoBox ? getZoneLabel(cargoBox.temperatureZone) : '未知',
      actualZone: compartment ? getZoneLabel(compartment.temperatureZone) : '未知',
    };
  });

  const maxTemp = gameState.temperatureHistory.length > 0
    ? Math.max(...gameState.temperatureHistory.map(t => t.temp))
    : gameState.currentTemperature;

  const operationHistoryStrings = gameState.operationHistory.map(op => {
    const time = new Date(op.timestamp).toLocaleTimeString('zh-CN');
    return `[${time}] ${op.action}: ${op.details}`;
  });

  return {
    levelOriginalName: level.originalName,
    playerName,
    completionTime: new Date().toLocaleString('zh-CN'),
    totalTimeUsed: level.timeLimitSeconds - gameState.remainingTime,
    zoneMismatchDetected: zoneMismatchFailures.length > 0,
    zoneMismatchCount: zoneMismatchFailures.length,
    zoneMismatchDetails,
    deliveryOrderIssues: orderFailures,
    timeoutOccurred: timeoutFailures.length > 0 || gameState.remainingTime < 0,
    temperatureMax: maxTemp,
    operationHistory: operationHistoryStrings,
  };
};

export const exportToCSV = (report: ExportReport): string => {
  const headers = [
    '关卡名称',
    '学员姓名',
    '完成时间',
    '总用时(秒)',
    '温层混放是否被拦住',
    '温层混放次数',
    '卸货顺序问题数',
    '是否超时',
    '最高温度(°C)',
  ];

  const values = [
    report.levelOriginalName,
    report.playerName,
    report.completionTime,
    report.totalTimeUsed.toString(),
    report.zoneMismatchDetected ? '否（存在混放）' : '是（无混放）',
    report.zoneMismatchCount.toString(),
    report.deliveryOrderIssues.length.toString(),
    report.timeoutOccurred ? '是' : '否',
    report.temperatureMax.toFixed(1),
  ];

  let csv = headers.join(',') + '\n';
  csv += values.map(v => `"${v}"`).join(',') + '\n\n';

  csv += '温层混放明细\n';
  csv += '货箱名称,格位名称,期望温层,实际温层\n';
  if (report.zoneMismatchDetails.length > 0) {
    report.zoneMismatchDetails.forEach(detail => {
      csv += `"${detail.cargoBoxOriginalName}","${detail.compartmentOriginalName}","${detail.expectedZone}","${detail.actualZone}"\n`;
    });
  } else {
    csv += '无温层混放问题\n';
  }

  csv += '\n操作历史记录\n';
  report.operationHistory.forEach(op => {
    csv += `"${op}"\n`;
  });

  return csv;
};

export const exportToJSON = (report: ExportReport): string => {
  return JSON.stringify(report, null, 2);
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
