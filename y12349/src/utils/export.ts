import { BatteryBatch, FittingParams, Filters } from '../types';

export const exportToCSV = (
  batch: BatteryBatch,
  fittingParams: FittingParams | null,
  summary?: string
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
  
  csvContent += '\n\n========== 报告说明 ==========\n';
  csvContent += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
  csvContent += `数据范围: ${batch.cycles.length} 条循环记录\n`;
  
  if (summary) {
    csvContent += '\n' + summary + '\n';
  }
  
  if (fittingParams) {
    csvContent += '\n衰减拟合参数\n';
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

export const exportChartAsPNG = (
  chartRef: React.RefObject<HTMLDivElement>,
  fittingParams: FittingParams | null,
  filters: Filters
): void => {
  if (!chartRef.current) return;
  
  const rect = chartRef.current.getBoundingClientRect();
  const width = Math.max(800, rect.width * 2);
  const height = Math.max(400, rect.height * 2);
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, width, height);
  
  const svgElement = chartRef.current.querySelector('svg');
  if (svgElement) {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      const padding = 60;
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2;
      
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, width, height);
      
      ctx.drawImage(img, padding, padding, chartWidth, chartHeight);
      
      ctx.fillStyle = '#E2E8F0';
      ctx.font = 'bold 20px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('电池容量衰减曲线图', width / 2, 35);
      
      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(`生成时间: ${new Date().toLocaleString('zh-CN')}`, padding, height - 25);
      
      const filterText = `筛选条件: 充电倍率 ${filters.chargeRateRange[0]}C-${filters.chargeRateRange[1]}C, 温度 ${filters.temperatureRange[0]}°C-${filters.temperatureRange[1]}°C`;
      ctx.fillText(filterText, padding, height - 8);
      
      if (fittingParams) {
        ctx.textAlign = 'right';
        ctx.fillText(`R² = ${fittingParams.rSquared.toFixed(4)}`, width - padding, height - 8);
      }
      
      const link = document.createElement('a');
      link.download = `容量衰减曲线_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      drawFallbackChart(ctx, width, height, fittingParams, filters);
      const link = document.createElement('a');
      link.download = `容量衰减曲线_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  } else {
    drawFallbackChart(ctx, width, height, fittingParams, filters);
    const link = document.createElement('a');
    link.download = `容量衰减曲线_${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
};

const drawFallbackChart = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fittingParams: FittingParams | null,
  filters: Filters
) => {
  const padding = 60;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 20px Inter';
  ctx.textAlign = 'center';
  ctx.fillText('电池容量衰减曲线图', width / 2, 35);
  
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    
    ctx.fillStyle = '#64748B';
    ctx.font = '11px Inter';
    ctx.textAlign = 'right';
    const value = 100 - i * 10;
    ctx.fillText(`${value}%`, padding - 8, y + 4);
  }
  
  ctx.fillStyle = '#94A3B8';
  ctx.font = '12px Inter';
  ctx.textAlign = 'left';
  ctx.fillText(`生成时间: ${new Date().toLocaleString('zh-CN')}`, padding, height - 25);
  
  const filterText = `筛选条件: 充电倍率 ${filters.chargeRateRange[0]}C-${filters.chargeRateRange[1]}C, 温度 ${filters.temperatureRange[0]}°C-${filters.temperatureRange[1]}°C`;
  ctx.fillText(filterText, padding, height - 8);
  
  if (fittingParams) {
    ctx.textAlign = 'right';
    ctx.fillText(`R² = ${fittingParams.rSquared.toFixed(4)}`, width - padding, height - 8);
    
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const cycle = (i / 100) * 500;
      const retention = fittingParams.a * Math.exp(-fittingParams.b * cycle) + fittingParams.c;
      const x = padding + (i / 100) * chartWidth;
      const y = padding + chartHeight - ((Math.max(60, Math.min(100, retention)) - 60) / 40) * chartHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  ctx.fillStyle = '#06B6D4';
  ctx.font = '14px Inter';
  ctx.textAlign = 'center';
  ctx.fillText('(完整图表请在应用中查看或下载CSV数据)', width / 2, height / 2);
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
