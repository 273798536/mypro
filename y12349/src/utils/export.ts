import { BatteryBatch, FittingParams } from '../types';

export const exportToCSV = (
  batch: BatteryBatch,
  fittingParams: FittingParams | null
): void => {
  const headers = [
    '循环次数',
    '时间戳',
    '容量(mAh)',
    '容量保持率(%)',
    '充电倍率(C)',
    '放电倍率(C)',
    '平均温度(°C)',
    '最高温度(°C)',
    '能量效率(%)',
    '异常事件'
  ];
  
  const rows = batch.cycles.map(cycle => [
    cycle.cycleNumber,
    cycle.timestamp.toISOString(),
    cycle.capacity.toFixed(2),
    cycle.capacityRetention.toFixed(2),
    cycle.chargeRate,
    cycle.dischargeRate,
    cycle.avgTemperature.toFixed(2),
    cycle.maxTemperature.toFixed(2),
    cycle.energyEfficiency.toFixed(2),
    cycle.anomalies.map(a => `${a.type}:${a.description}`).join('; ')
  ]);
  
  let csvContent = headers.join(',') + '\n';
  csvContent += rows.map(row => row.join(',')).join('\n');
  
  if (fittingParams) {
    csvContent += '\n\n衰减拟合参数\n';
    csvContent += `模型: f(x) = ${fittingParams.a.toFixed(4)} * exp(-${fittingParams.b.toFixed(6)} * x) + ${fittingParams.c.toFixed(4)}\n`;
    csvContent += `R²: ${fittingParams.rSquared.toFixed(4)}\n`;
  }
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${batch.name}_循环数据_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportChartAsPNG = (chartRef: React.RefObject<HTMLDivElement>): void => {
  if (!chartRef.current) return;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const element = chartRef.current;
  const rect = element.getBoundingClientRect();
  
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  ctx.scale(2, 2);
  
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, rect.width, rect.height);
  
  const link = document.createElement('a');
  link.download = `容量衰减曲线_${new Date().toISOString().split('T')[0]}.png`;
  
  html2canvasFallback(element, canvas, () => {
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
};

const html2canvasFallback = (
  _element: HTMLElement,
  canvas: HTMLCanvasElement,
  callback: () => void
) => {
  setTimeout(() => {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = '14px Inter';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('容量衰减曲线图 (详细数据请下载CSV)', 10, 25);
    }
    callback();
  }, 100);
};

export const generateReportSummary = (
  batch: BatteryBatch,
  fittingParams: FittingParams | null
): string => {
  const totalCycles = batch.cycles.length;
  const finalRetention = batch.cycles[batch.cycles.length - 1].capacityRetention;
  const anomalies = batch.cycles.flatMap(c => c.anomalies);
  
  const summary = [];
  summary.push('='.repeat(50));
  summary.push('电池循环测试分析报告');
  summary.push('='.repeat(50));
  summary.push(`电池批次: ${batch.name}`);
  summary.push(`化学体系: ${batch.chemistry}`);
  summary.push(`标称容量: ${batch.nominalCapacity} mAh`);
  summary.push(`测试开始: ${batch.testStartDate.toLocaleDateString()}`);
  summary.push('');
  summary.push(`总循环次数: ${totalCycles}`);
  summary.push(`最终容量保持率: ${finalRetention.toFixed(2)}%`);
  summary.push(`平均衰减速率: ${((100 - finalRetention) / totalCycles * 100).toFixed(4)}%/百次循环`);
  summary.push('');
  summary.push(`异常事件总数: ${anomalies.length}`);
  summary.push('- 中断重启: ' + anomalies.filter(a => a.type === 'interruption').length + ' 次');
  summary.push('- 倍率切换: ' + anomalies.filter(a => a.type === 'rate_change').length + ' 次');
  summary.push('- 温度漂移: ' + anomalies.filter(a => a.type === 'temperature_drift').length + ' 次');
  summary.push('');
  
  if (fittingParams) {
    summary.push('衰减拟合模型:');
    summary.push(`  f(x) = ${fittingParams.a.toFixed(4)} * exp(-${fittingParams.b.toFixed(6)} * x) + ${fittingParams.c.toFixed(4)}`);
    summary.push(`  拟合优度 (R²): ${fittingParams.rSquared.toFixed(4)}`);
  }
  
  return summary.join('\n');
};
