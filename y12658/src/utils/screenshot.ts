import type { Resolution } from '@/types';

export const RESOLUTION_MAP: Record<Resolution, { w: number; h: number }> = {
  '1080p': { w: 1920, h: 1080 },
  '2K': { w: 2560, h: 1440 },
  '4K': { w: 3840, h: 2160 },
};

export function canvasToDataUrl(canvas: HTMLCanvasElement, type = 'image/png'): string {
  return canvas.toDataURL(type);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function drawWatermark(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  meta: { viewpoint?: string; timestamp?: string; batch?: string }
) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 22, 40, 0.72)';
  ctx.fillRect(12, h - 64, Math.min(520, w - 24), 52);
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(12, h - 64, Math.min(520, w - 24), 52);
  ctx.fillStyle = '#E2E8F0';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.textBaseline = 'top';
  const lines = [
    `海洋涡旋三维流场 · 评审截图`,
    `视角: ${meta.viewpoint ?? '未命名'}  |  批次: ${meta.batch ?? '-'}`,
    `时间: ${meta.timestamp ?? new Date().toISOString()}`,
  ];
  lines.forEach((line, i) => {
    ctx.fillText(line, 24, h - 56 + i * 16);
  });
  ctx.restore();
}

export function drawColorLegend(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  min: number,
  max: number
) {
  const stops = [
    '#440A54', '#482375', '#41437A', '#355F7E', '#2A788E',
    '#21918C', '#22AA84', '#46C16E', '#7CCF52', '#B8DE29', '#FCE724',
  ];
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = '#E2E8F0';
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.textBaseline = 'top';
  ctx.fillText(max.toFixed(3), x + w + 8, y - 2);
  ctx.textBaseline = 'bottom';
  ctx.fillText(min.toFixed(3), x + w + 8, y + h + 2);
  ctx.textBaseline = 'middle';
  ctx.fillText('流场值', x + w + 8, y + h / 2);
}
