import { CalculationResult, ResponseData, OvershootData } from '../types';
import { getDampingTypeColor } from '../engine/dampingAnalyzer';

export interface ChartOptions {
  width: number;
  height: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  showGrid: boolean;
  showLegend: boolean;
  animationProgress: number;
}

const defaultOptions: ChartOptions = {
  width: 800,
  height: 400,
  padding: { top: 40, right: 40, bottom: 50, left: 60 },
  showGrid: true,
  showLegend: true,
  animationProgress: 1,
};

const formatTime = (seconds: number): string => {
  if (seconds >= 1) return `${seconds.toFixed(2)}s`;
  if (seconds >= 0.001) return `${(seconds * 1000).toFixed(2)}ms`;
  if (seconds >= 0.000001) return `${(seconds * 1000000).toFixed(2)}μs`;
  return `${(seconds * 1000000000).toFixed(2)}ns`;
};

const formatVoltage = (volts: number): string => {
  if (Math.abs(volts) >= 1) return `${volts.toFixed(2)}V`;
  if (Math.abs(volts) >= 0.001) return `${(volts * 1000).toFixed(2)}mV`;
  return `${(volts * 1000000).toFixed(2)}μV`;
};

export const drawChart = (
  canvas: HTMLCanvasElement,
  result: CalculationResult,
  options: Partial<ChartOptions> = {}
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const opts = { ...defaultOptions, ...options };
  const { width, height, padding, animationProgress } = opts;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, width, height);

  drawGrid(ctx, result.response, chartWidth, chartHeight, padding);

  const visiblePoints = Math.floor(result.response.timePoints.length * animationProgress);
  
  drawCurve(
    ctx,
    result.response.timePoints.slice(0, visiblePoints),
    result.response.voltagePoints.slice(0, visiblePoints),
    result.response,
    chartWidth,
    chartHeight,
    padding,
    '#3B82F6',
    '电容电压'
  );

  if (result.overshoot.exists) {
    drawOvershootMarker(ctx, result.overshoot, result.response, chartWidth, chartHeight, padding);
  }

  drawAxes(ctx, result.response, chartWidth, chartHeight, padding, height);
  drawLegend(ctx, result, padding);
};

const drawGrid = (
  ctx: CanvasRenderingContext2D,
  response: ResponseData,
  chartWidth: number,
  chartHeight: number,
  padding: ChartOptions['padding']
) => {
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1;

  const xTicks = 10;
  const yTicks = 8;

  for (let i = 0; i <= xTicks; i++) {
    const x = padding.left + (i / xTicks) * chartWidth;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + chartHeight);
    ctx.stroke();
  }

  for (let i = 0; i <= yTicks; i++) {
    const y = padding.top + (i / yTicks) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.stroke();
  }
};

const drawAxes = (
  ctx: CanvasRenderingContext2D,
  response: ResponseData,
  chartWidth: number,
  chartHeight: number,
  padding: ChartOptions['padding'],
  height: number
) => {
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartHeight);
  ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'center';

  const xTicks = 10;
  const maxTime = response.totalTime;
  
  for (let i = 0; i <= xTicks; i++) {
    const x = padding.left + (i / xTicks) * chartWidth;
    const time = (i / xTicks) * maxTime;
    ctx.fillText(formatTime(time), x, padding.top + chartHeight + 20);
  }

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const yTicks = 8;
  const maxVoltage = Math.max(...response.voltagePoints) * 1.1;
  const minVoltage = Math.min(...response.voltagePoints, 0);
  const voltageRange = maxVoltage - minVoltage;

  for (let i = 0; i <= yTicks; i++) {
    const y = padding.top + (i / yTicks) * chartHeight;
    const voltage = maxVoltage - (i / yTicks) * voltageRange;
    ctx.fillText(formatVoltage(voltage), padding.left - 10, y);
  }

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '14px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('时间 t', padding.left + chartWidth / 2, height - 10);

  ctx.save();
  ctx.translate(15, padding.top + chartHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('电压 Vc', 0, 0);
  ctx.restore();
};

const drawCurve = (
  ctx: CanvasRenderingContext2D,
  xData: number[],
  yData: number[],
  response: ResponseData,
  chartWidth: number,
  chartHeight: number,
  padding: ChartOptions['padding'],
  color: string,
  label: string
) => {
  if (xData.length < 2) return;

  const maxTime = response.totalTime;
  const maxVoltage = Math.max(...response.voltagePoints) * 1.1;
  const minVoltage = Math.min(...response.voltagePoints, 0);
  const voltageRange = maxVoltage - minVoltage;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  
  for (let i = 0; i < xData.length; i++) {
    const x = padding.left + (xData[i] / maxTime) * chartWidth;
    const y = padding.top + ((maxVoltage - yData[i]) / voltageRange) * chartHeight;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.stroke();

  ctx.strokeStyle = color + '40';
  ctx.lineWidth = 6;
  ctx.beginPath();
  
  for (let i = 0; i < xData.length; i++) {
    const x = padding.left + (xData[i] / maxTime) * chartWidth;
    const y = padding.top + ((maxVoltage - yData[i]) / voltageRange) * chartHeight;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.stroke();
};

const drawOvershootMarker = (
  ctx: CanvasRenderingContext2D,
  overshoot: OvershootData,
  response: ResponseData,
  chartWidth: number,
  chartHeight: number,
  padding: ChartOptions['padding']
) => {
  const maxTime = response.totalTime;
  const maxVoltage = Math.max(...response.voltagePoints) * 1.1;
  const minVoltage = Math.min(...response.voltagePoints, 0);
  const voltageRange = maxVoltage - minVoltage;

  const x = padding.left + (overshoot.time / maxTime) * chartWidth;
  const y = padding.top + ((maxVoltage - overshoot.value) / voltageRange) * chartHeight;

  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#EF4444';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  ctx.fillStyle = '#EF4444';
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`过冲: ${overshoot.percentage.toFixed(1)}%`, x + 15, y - 5);
  
  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText(`峰值: ${overshoot.value.toFixed(3)}V @ ${formatTime(overshoot.time)}`, x + 15, y + 12);
};

const drawLegend = (
  ctx: CanvasRenderingContext2D,
  result: CalculationResult,
  padding: ChartOptions['padding']
) => {
  const dampingColor = getDampingTypeColor(result.dampingType);
  const dampingLabels: Record<string, string> = {
    undamped: '无阻尼',
    underdamped: '欠阻尼',
    critically_damped: '临界阻尼',
    overdamped: '过阻尼',
  };

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(padding.left + 10, padding.top + 10, 200, 70, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('响应类型', padding.left + 20, padding.top + 30);

  ctx.fillStyle = dampingColor;
  ctx.font = '14px Inter, sans-serif';
  ctx.fillText(dampingLabels[result.dampingType], padding.left + 20, padding.top + 52);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText(`ζ = ${result.dampingRatio.toFixed(4)}`, padding.left + 20, padding.top + 70);
};

export const drawCurrentChart = (
  canvas: HTMLCanvasElement,
  result: CalculationResult,
  options: Partial<ChartOptions> = {}
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const opts = { ...defaultOptions, ...options };
  const { width, height, padding, animationProgress } = opts;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, width, height);

  const visiblePoints = Math.floor(result.response.timePoints.length * animationProgress);
  
  drawGrid(ctx, result.response, chartWidth, chartHeight, padding);

  const maxTime = result.response.totalTime;
  const maxCurrent = Math.max(...result.response.currentPoints) * 1.2;
  const minCurrent = Math.min(...result.response.currentPoints) * 1.2;
  const currentRange = maxCurrent - minCurrent || 1;

  const xData = result.response.timePoints.slice(0, visiblePoints);
  const yData = result.response.currentPoints.slice(0, visiblePoints);

  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  for (let i = 0; i < xData.length; i++) {
    const x = padding.left + (xData[i] / maxTime) * chartWidth;
    const y = padding.top + ((maxCurrent - yData[i]) / currentRange) * chartHeight;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  ctx.strokeStyle = '#10B98140';
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (let i = 0; i < xData.length; i++) {
    const x = padding.left + (xData[i] / maxTime) * chartWidth;
    const y = padding.top + ((maxCurrent - yData[i]) / currentRange) * chartHeight;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartHeight);
  ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'center';

  const xTicks = 10;
  for (let i = 0; i <= xTicks; i++) {
    const x = padding.left + (i / xTicks) * chartWidth;
    const time = (i / xTicks) * maxTime;
    ctx.fillText(formatTime(time), x, padding.top + chartHeight + 20);
  }

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const yTicks = 8;
  for (let i = 0; i <= yTicks; i++) {
    const y = padding.top + (i / yTicks) * chartHeight;
    const current = maxCurrent - (i / yTicks) * currentRange;
    ctx.fillText(`${(current * 1000).toFixed(2)}mA`, padding.left - 10, y);
  }

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '14px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('时间 t', padding.left + chartWidth / 2, height - 10);

  ctx.save();
  ctx.translate(15, padding.top + chartHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('电流 I', 0, 0);
  ctx.restore();

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(padding.left + 10, padding.top + 10, 120, 35, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('电感电流', padding.left + 20, padding.top + 32);
};
