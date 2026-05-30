import type { ScanParams, Level } from '@/types';

const ANATOMY_TEMPLATES: Record<string, number[][]> = {};

function initTemplate(levelId: string, width: number, height: number): number[][] {
  if (ANATOMY_TEMPLATES[levelId]) return ANATOMY_TEMPLATES[levelId];

  const template: number[][] = [];
  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxR = Math.min(cx, cy) * 0.85;

      if (dist > maxR) {
        row.push(0);
      } else if (dist > maxR * 0.92) {
        row.push(60);
      } else if (dist > maxR * 0.75) {
        const isSpine = levelId.includes('spine') && Math.abs(dx) < maxR * 0.15;
        row.push(isSpine ? 200 : 120);
      } else if (dist > maxR * 0.5) {
        const angle = Math.atan2(dy, dx);
        const sulcus = Math.sin(angle * 6) * 0.3;
        row.push(Math.round(160 + sulcus * 40));
      } else if (dist > maxR * 0.25) {
        row.push(100);
      } else {
        row.push(80);
      }
    }
    template.push(row);
  }

  ANATOMY_TEMPLATES[levelId] = template;
  return template;
}

function gaussianNoise(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function renderMriImage(
  canvas: HTMLCanvasElement,
  params: ScanParams,
  level: Level,
  conflicts: number
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  const pixelSize = Math.max(1, Math.round(512 / params.matrix));
  const template = initTemplate(level.id, width, height);

  const nexFactor = Math.sqrt(params.NEX);
  const noiseLevel = Math.max(0, 30 / nexFactor);

  const teFactor = level.optimalParams.TE > 50
    ? 1 + (params.TE - level.optimalParams.TE) / 200
    : 1 - (params.TE - level.optimalParams.TE) / 200;
  const contrastMul = clamp01(teFactor);

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = Math.min(width - 1, Math.floor(x / pixelSize) * pixelSize);
      const srcY = Math.min(height - 1, Math.floor(y / pixelSize) * pixelSize);

      let value = template[srcY]?.[srcX] ?? 0;

      value = Math.round(value * contrastMul);

      const noise = gaussianNoise() * noiseLevel;
      value = Math.round(value + noise);

      if (params.sliceThickness > 6) {
        const blurVal = template[Math.min(height - 1, srcY + 1)]?.[srcX] ?? 0;
        value = Math.round((value + blurVal) / 2);
      }

      value = Math.max(0, Math.min(255, value));

      const idx = (y * width + x) * 4;
      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
      data[idx + 3] = 255;
    }
  }

  if (conflicts > 0) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const stripe = Math.sin((x + y * 2) * 0.05) * 20 * conflicts;
        data[idx] = Math.max(0, Math.min(255, data[idx] + stripe));
        data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + stripe * 0.5));
      }
    }
  }

  if (params.FOV < 16 && params.matrix > 256) {
    for (let y = 0; y < height; y++) {
      for (let x = width - 30; x < width; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = Math.min(255, data[idx] + 40);
        data[idx + 1] = Math.min(255, data[idx + 1] + 20);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  drawGrid(ctx, width, height);
  drawCrosshair(ctx, width, height);
  drawOverlayInfo(ctx, params, level, width);
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.strokeStyle = 'rgba(0, 212, 170, 0.08)';
  ctx.lineWidth = 0.5;
  const step = 40;
  for (let x = step; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = step; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function drawCrosshair(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cx = w / 2;
  const cy = h / 2;
  ctx.strokeStyle = 'rgba(0, 212, 170, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 20, cy);
  ctx.lineTo(cx + 20, cy);
  ctx.moveTo(cx, cy - 20);
  ctx.lineTo(cx, cy + 20);
  ctx.stroke();
}

function drawOverlayInfo(
  ctx: CanvasRenderingContext2D,
  params: ScanParams,
  level: Level,
  w: number
): void {
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(0, 212, 170, 0.6)';
  ctx.fillText(`TR: ${params.TR}  TE: ${params.TE}`, 10, 16);
  ctx.fillText(`FOV: ${params.FOV}  Mat: ${params.matrix}  NEX: ${params.NEX}`, 10, 30);
  ctx.fillText(`${level.name}`, w - ctx.measureText(level.name).width - 10, 16);
}

function clamp01(v: number): number {
  return Math.max(0.2, Math.min(2, v));
}
