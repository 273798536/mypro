import { SimulationParams, SimulationStats } from '../types';

export class ScreenshotExporter {
  private canvas: HTMLCanvasElement | null = null;

  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
  }

  captureScreenshot(
    params: SimulationParams,
    stats: SimulationStats
  ): { dataUrl: string; filename: string } | null {
    if (!this.canvas) {
      console.error('Canvas not set');
      return null;
    }

    try {
      const timestamp = this.getTimestamp();
      const filename = `blackhole_${timestamp}.png`;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.canvas.width;
      tempCanvas.height = this.canvas.height;
      const ctx = tempCanvas.getContext('2d');

      if (!ctx) {
        return null;
      }

      ctx.drawImage(this.canvas, 0, 0);

      this.addWatermark(ctx, params, stats, tempCanvas.width, tempCanvas.height);

      const dataUrl = tempCanvas.toDataURL('image/png');

      return { dataUrl, filename };
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      return null;
    }
  }

  downloadScreenshot(dataUrl: string, filename: string): void {
    try {
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download screenshot:', error);
    }
  }

  private addWatermark(
    ctx: CanvasRenderingContext2D,
    params: SimulationParams,
    stats: SimulationStats,
    width: number,
    height: number
  ): void {
    const padding = 15;
    const fontSize = 12;
    const lineHeight = 18;

    ctx.font = `${fontSize}px 'Roboto Mono', monospace`;
    ctx.fillStyle = 'rgba(10, 10, 26, 0.8)';

    const infoLines = [
      `黑洞质量: ${params.blackHoleMass} M☉`,
      `光线数量: ${params.rayCount}`,
      `积分步数: ${params.integrationSteps}`,
      `帧率: ${stats.fps.toFixed(1)} FPS`,
    ];

    let maxWidth = 0;
    for (const line of infoLines) {
      const textWidth = ctx.measureText(line).width;
      maxWidth = Math.max(maxWidth, textWidth);
    }

    const boxWidth = maxWidth + padding * 2;
    const boxHeight = infoLines.length * lineHeight + padding * 2;
    const boxX = width - boxWidth - padding;
    const boxY = height - boxHeight - padding;

    ctx.fillStyle = 'rgba(26, 26, 58, 0.85)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 5);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 107, 53, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ff6b35';
    ctx.font = `bold ${fontSize}px 'Roboto Mono', monospace`;
    ctx.fillText('黑洞光线弯曲演示', boxX + padding, boxY + padding + fontSize);

    ctx.fillStyle = '#e0e0e0';
    ctx.font = `${fontSize - 1}px 'Roboto Mono', monospace`;
    let y = boxY + padding + fontSize + lineHeight;
    for (const line of infoLines) {
      ctx.fillText(line, boxX + padding, y);
      y += lineHeight - 4;
    }

    ctx.fillStyle = 'rgba(128, 128, 128, 0.7)';
    ctx.font = `${fontSize - 2}px 'Roboto Mono', monospace`;
    ctx.fillText(
      `导出时间: ${new Date().toLocaleString('zh-CN')}`,
      boxX + padding,
      boxY + boxHeight - padding / 2
    );
  }

  private getTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
      now.getFullYear().toString() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      '_' +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds())
    );
  }
}

export const screenshotExporter = new ScreenshotExporter();
