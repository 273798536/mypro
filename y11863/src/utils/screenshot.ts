import html2canvas from 'html2canvas';
import type { EnergyType } from '../types';

export const captureScreenshot = async (elementId: string): Promise<string> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id ${elementId} not found`);
  }

  const canvas = await html2canvas(element, {
    backgroundColor: '#0f172a',
    scale: 2,
    useCORS: true,
    allowTaint: true,
  });

  return canvas.toDataURL('image/png');
};

export const downloadScreenshot = (
  dataUrl: string,
  filename?: string
): void => {
  const link = document.createElement('a');
  link.download = filename || `energy-heatmap-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = dataUrl;
  link.click();
};

export const getEnergyTypeLabel = (type: EnergyType): string => {
  const labels: Record<EnergyType, string> = {
    electricity: '电力',
    water: '用水',
    gas: '燃气',
  };
  return labels[type];
};

export const createWatermarkCanvas = (
  originalCanvas: HTMLCanvasElement,
  options: {
    buildingName: string;
    energyType: EnergyType;
    timeRange: { start: string; end: string };
    timestamp: string;
  }
): HTMLCanvasElement => {
  const watermarkedCanvas = document.createElement('canvas');
  watermarkedCanvas.width = originalCanvas.width;
  watermarkedCanvas.height = originalCanvas.height;
  
  const ctx = watermarkedCanvas.getContext('2d');
  if (!ctx) return originalCanvas;

  ctx.drawImage(originalCanvas, 0, 0);

  const padding = 20;
  const barHeight = 60;
  const y = originalCanvas.height - barHeight - padding;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.beginPath();
  ctx.roundRect(padding, y, originalCanvas.width - padding * 2, barHeight, 8);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(options.buildingName, padding + 16, y + 28);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(
    `能耗类型: ${getEnergyTypeLabel(options.energyType)}`,
    padding + 16,
    y + 48
  );

  const timeText = `统计周期: ${new Date(options.timeRange.start).toLocaleDateString('zh-CN')} - ${new Date(options.timeRange.end).toLocaleDateString('zh-CN')}`;
  const timeTextWidth = ctx.measureText(timeText).width;
  ctx.fillText(timeText, originalCanvas.width - padding - 16 - timeTextWidth, y + 28);

  const exportText = `导出时间: ${new Date(options.timestamp).toLocaleString('zh-CN')}`;
  const exportTextWidth = ctx.measureText(exportText).width;
  ctx.fillText(exportText, originalCanvas.width - padding - 16 - exportTextWidth, y + 48);

  return watermarkedCanvas;
};

export const captureWithWatermark = async (
  elementId: string,
  options: {
    buildingName: string;
    energyType: EnergyType;
    timeRange: { start: string; end: string };
  }
): Promise<string> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id ${elementId} not found`);
  }

  const canvas = await html2canvas(element, {
    backgroundColor: '#0f172a',
    scale: 2,
    useCORS: true,
    allowTaint: true,
  });

  const watermarkedCanvas = createWatermarkCanvas(canvas, {
    ...options,
    timestamp: new Date().toISOString(),
  });

  return watermarkedCanvas.toDataURL('image/png');
};
