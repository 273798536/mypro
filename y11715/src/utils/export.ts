import html2canvas from 'html2canvas';
import { LensState } from '../types';
import { formatNumber, getImageTypeDescription } from '../physics/lensCalculator';

export async function exportScreenshot(elementId: string, state: LensState): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found for export');
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0a1628',
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = canvas.width;
    overlayCanvas.height = canvas.height;
    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(canvas, 0, 0);

    ctx.fillStyle = 'rgba(10, 22, 40, 0.9)';
    ctx.fillRect(20, canvas.height - 140, canvas.width - 40, 120);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, canvas.height - 140, canvas.width - 40, 120);

    ctx.font = 'bold 24px "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('光学薄透镜成像器 - 实验记录', 40, canvas.height - 100);

    ctx.font = '16px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    const params = [
      `焦距 f = ${formatNumber(state.focalLength)} cm`,
      `物距 u = ${formatNumber(state.objectDistance)} cm`,
      `像距 v = ${formatNumber(state.imageDistance)} cm`,
      `放大率 m = ${formatNumber(state.magnification, 3)}`,
    ];
    params.forEach((param, i) => {
      ctx.fillText(param, 40, canvas.height - 65 + i * 20);
    });

    ctx.font = '16px "Noto Sans SC", sans-serif';
    ctx.fillStyle = state.isRealImage ? '#22c55e' : '#f97316';
    ctx.fillText(
      getImageTypeDescription(state.isRealImage, state.magnification),
      canvas.width - 200,
      canvas.height - 75
    );

    ctx.font = '12px "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(new Date().toLocaleString('zh-CN'), canvas.width - 200, canvas.height - 45);

    const link = document.createElement('a');
    link.download = `透镜成像_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
    link.href = overlayCanvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}
