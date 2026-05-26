import html2canvas from 'html2canvas';
import type { ProcessedDataPoint, Annotation } from '@/types';

export const captureScreenshot = async (
  elementId: string,
  filename: string = 'volatility-surface'
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }
  
  const canvas = await html2canvas(element, {
    backgroundColor: '#0A1628',
    scale: 2,
    logging: false,
    useCORS: true,
  });
  
  const link = document.createElement('a');
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

export const exportAnomalyReport = (
  dataPoints: ProcessedDataPoint[],
  annotations: Annotation[],
  format: 'csv' | 'json' = 'csv'
): void => {
  const anomalyPoints = dataPoints.filter(p => p.anomalies.length > 0);
  
  if (format === 'json') {
    const report = {
      generatedAt: new Date().toISOString(),
      totalPoints: dataPoints.length,
      anomalyCount: anomalyPoints.length,
      anomalies: anomalyPoints.map(p => ({
        id: p.id,
        sourceRow: p.sourceRow,
        sourceFile: p.sourceFile,
        expirationDate: p.expirationDate,
        strikePrice: p.strikePrice,
        impliedVolatility: p.impliedVolatility,
        anomalies: p.anomalies.map(a => ({
          type: a.type,
          severity: a.severity,
          message: a.message,
          details: a.details,
        })),
        annotations: annotations.filter(a => a.dataPointId === p.id),
      })),
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `anomaly-report-${new Date().toISOString().slice(0, 10)}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  } else {
    const headers = [
      'ID', '原始行号', '来源文件', '到期日', '执行价', '波动率',
      '异常类型', '严重程度', '异常信息', '详情',
    ];
    
    const rows = anomalyPoints.flatMap(point =>
      point.anomalies.map(anomaly => [
        point.id,
        point.sourceRow,
        point.sourceFile,
        point.expirationDate,
        point.strikePrice,
        (point.impliedVolatility * 100).toFixed(2) + '%',
        anomaly.type,
        anomaly.severity,
        anomaly.message,
        JSON.stringify(anomaly.details),
      ])
    );
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `anomaly-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }
};

export const exportFullData = (
  dataPoints: ProcessedDataPoint[],
  format: 'csv' | 'json' = 'csv'
): void => {
  if (format === 'json') {
    const blob = new Blob([JSON.stringify(dataPoints, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `volatility-data-${new Date().toISOString().slice(0, 10)}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  } else {
    const headers = [
      'ID', '原始行号', '来源文件', '到期日', '执行价', '波动率',
      '成交量', '持仓量', '买价', '卖价', '最新价', '异常数',
    ];
    
    const rows = dataPoints.map(point => [
      point.id,
      point.sourceRow,
      point.sourceFile,
      point.expirationDate,
      point.strikePrice,
      (point.impliedVolatility * 100).toFixed(2) + '%',
      point.volume,
      point.openInterest,
      point.bid ?? 'N/A',
      point.ask ?? 'N/A',
      point.lastPrice ?? 'N/A',
      point.anomalies.length,
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `volatility-data-${new Date().toISOString().slice(0, 10)}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }
};
