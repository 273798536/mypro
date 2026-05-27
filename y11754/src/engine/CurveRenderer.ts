import type { Point, MathFunction, SpecialPoint, JudgementPoint } from '../types';

export interface CanvasConfig {
  width: number;
  height: number;
  padding: number;
}

export class CurveRenderer {
  private ctx: CanvasRenderingContext2D;
  private config: CanvasConfig;
  private mathFunc: MathFunction | null = null;
  private curvePoints: Point[] = [];
  private characterPosition: Point | null = null;
  private judgementPoints: JudgementPoint[] = [];
  private currentJudgementIndex: number = -1;
  private animationProgress: number = 0;
  private isAnimating: boolean = false;

  constructor(ctx: CanvasRenderingContext2D, config: CanvasConfig) {
    this.ctx = ctx;
    this.config = config;
  }

  setMathFunction(func: MathFunction): void {
    this.mathFunc = func;
  }

  setCurvePoints(points: Point[]): void {
    this.curvePoints = points;
  }

  setCharacterPosition(pos: Point): void {
    this.characterPosition = pos;
  }

  setJudgementPoints(points: JudgementPoint[]): void {
    this.judgementPoints = points;
  }

  setCurrentJudgementIndex(index: number): void {
    this.currentJudgementIndex = index;
  }

  setAnimationProgress(progress: number): void {
    this.animationProgress = progress;
  }

  setIsAnimating(animating: boolean): void {
    this.isAnimating = animating;
  }

  private mathToCanvas(point: Point): Point {
    if (!this.mathFunc) return { x: 0, y: 0 };

    const { width, height, padding } = this.config;
    const [xMin, xMax] = this.mathFunc.domain;
    const [yMin, yMax] = this.mathFunc.range;

    const xScale = (width - 2 * padding) / (xMax - xMin);
    const yScale = (height - 2 * padding) / (yMax - yMin);

    const canvasX = padding + (point.x - xMin) * xScale;
    const canvasY = height - padding - (point.y - yMin) * yScale;

    return { x: canvasX, y: canvasY };
  }

  clear(): void {
    const { width, height } = this.config;
    this.ctx.clearRect(0, 0, width, height);
  }

  drawBackground(): void {
    const { width, height } = this.config;
    const gradient = this.ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
  }

  drawGrid(): void {
    if (!this.mathFunc) return;

    const { width, height, padding } = this.config;
    const [xMin, xMax] = this.mathFunc.domain;
    const [yMin, yMax] = this.mathFunc.range;

    this.ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
    this.ctx.lineWidth = 1;

    const xStep = (xMax - xMin) / 10;
    for (let x = xMin; x <= xMax; x += xStep) {
      const canvasPos = this.mathToCanvas({ x, y: yMin });
      this.ctx.beginPath();
      this.ctx.moveTo(canvasPos.x, padding);
      this.ctx.lineTo(canvasPos.x, height - padding);
      this.ctx.stroke();
    }

    const yStep = (yMax - yMin) / 8;
    for (let y = yMin; y <= yMax; y += yStep) {
      const canvasPos = this.mathToCanvas({ x: xMin, y });
      this.ctx.beginPath();
      this.ctx.moveTo(padding, canvasPos.y);
      this.ctx.lineTo(width - padding, canvasPos.y);
      this.ctx.stroke();
    }
  }

  drawAxes(): void {
    if (!this.mathFunc) return;

    const { width, height, padding } = this.config;
    const [xMin, xMax] = this.mathFunc.domain;
    const [yMin, yMax] = this.mathFunc.range;

    this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    this.ctx.lineWidth = 2;

    if (yMin <= 0 && yMax >= 0) {
      const origin = this.mathToCanvas({ x: xMin, y: 0 });
      this.ctx.beginPath();
      this.ctx.moveTo(padding, origin.y);
      this.ctx.lineTo(width - padding, origin.y);
      this.ctx.stroke();
    }

    if (xMin <= 0 && xMax >= 0) {
      const origin = this.mathToCanvas({ x: 0, y: yMin });
      this.ctx.beginPath();
      this.ctx.moveTo(origin.x, height - padding);
      this.ctx.lineTo(origin.x, padding);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    this.ctx.font = '12px JetBrains Mono, monospace';
    this.ctx.textAlign = 'center';

    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x += 2) {
      const pos = this.mathToCanvas({ x, y: yMin });
      this.ctx.fillText(x.toString(), pos.x, height - padding + 18);
    }

    this.ctx.textAlign = 'right';
    for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y += Math.ceil((yMax - yMin) / 4)) {
      const pos = this.mathToCanvas({ x: xMin, y });
      this.ctx.fillText(y.toString(), padding - 8, pos.y + 4);
    }
  }

  drawCurve(): void {
    if (this.curvePoints.length < 2) return;

    const visiblePoints = this.isAnimating
      ? this.curvePoints.slice(0, Math.floor(this.curvePoints.length * this.animationProgress))
      : this.curvePoints;

    if (visiblePoints.length < 2) return;

    this.ctx.beginPath();
    this.ctx.strokeStyle = '#00d4ff';
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    const firstPoint = this.mathToCanvas(visiblePoints[0]);
    this.ctx.moveTo(firstPoint.x, firstPoint.y);

    for (let i = 1; i < visiblePoints.length; i++) {
      const point = this.mathToCanvas(visiblePoints[i]);
      this.ctx.lineTo(point.x, point.y);
    }

    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
    this.ctx.lineWidth = 8;
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
    this.ctx.lineWidth = 16;
    this.ctx.stroke();
  }

  drawSpecialPoints(): void {
    if (!this.mathFunc) return;

    for (const point of this.mathFunc.specialPoints) {
      const canvasPos = this.mathToCanvas({ x: point.x, y: point.y });

      this.ctx.save();

      if (point.type === 'extremum_max' || point.type === 'extremum_min') {
        this.ctx.fillStyle = '#ffd43b';
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;

        this.drawStar(canvasPos.x, canvasPos.y, 5, 12, 6);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(point.type === 'extremum_max' ? '极大' : '极小', canvasPos.x, canvasPos.y - 18);
      } else if (point.type === 'non_differentiable') {
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.beginPath();
        this.ctx.moveTo(canvasPos.x, canvasPos.y - 10);
        this.ctx.lineTo(canvasPos.x - 8, canvasPos.y + 8);
        this.ctx.lineTo(canvasPos.x + 8, canvasPos.y + 8);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('!', canvasPos.x, canvasPos.y + 5);

        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.font = '10px sans-serif';
        this.ctx.fillText('不可导', canvasPos.x, canvasPos.y - 18);
      } else if (point.type === 'discontinuity') {
        this.ctx.strokeStyle = '#ff6b6b';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(canvasPos.x - 10, canvasPos.y - 10);
        this.ctx.lineTo(canvasPos.x + 10, canvasPos.y + 10);
        this.ctx.moveTo(canvasPos.x + 10, canvasPos.y - 10);
        this.ctx.lineTo(canvasPos.x - 10, canvasPos.y + 10);
        this.ctx.stroke();

        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.font = '10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('间断', canvasPos.x, canvasPos.y - 18);
      }

      this.ctx.restore();
    }
  }

  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      this.ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      this.ctx.lineTo(x, y);
      rot += step;
    }

    this.ctx.lineTo(cx, cy - outerRadius);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }

  drawJudgementPoints(): void {
    for (let i = 0; i < this.judgementPoints.length; i++) {
      const point = this.judgementPoints[i];
      const canvasPos = this.mathToCanvas({ x: point.x, y: point.y });
      const isCurrent = i === this.currentJudgementIndex;
      const isPast = i < this.currentJudgementIndex;
      const isCorrect = point.isCorrect;

      this.ctx.save();

      if (isCurrent) {
        this.ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(canvasPos.x, canvasPos.y, 12, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(canvasPos.x, canvasPos.y, 8, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#00d4ff';
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(String(i + 1), canvasPos.x, canvasPos.y + 4);
      } else if (isPast) {
        if (isCorrect) {
          this.ctx.fillStyle = 'rgba(81, 207, 102, 0.8)';
        } else {
          this.ctx.fillStyle = 'rgba(255, 107, 107, 0.8)';
        }
        this.ctx.beginPath();
        this.ctx.arc(canvasPos.x, canvasPos.y, 8, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 8px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(String(i + 1), canvasPos.x, canvasPos.y + 3);
      } else {
        this.ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        this.ctx.beginPath();
        this.ctx.arc(canvasPos.x, canvasPos.y, 6, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  drawCharacter(): void {
    if (!this.characterPosition) return;

    const canvasPos = this.mathToCanvas(this.characterPosition);
    const time = Date.now() / 200;
    const bounceOffset = Math.sin(time) * 3;

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.beginPath();
    this.ctx.ellipse(canvasPos.x, canvasPos.y + 20, 15, 5, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#00d4ff';
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.arc(canvasPos.x, canvasPos.y - 8 + bounceOffset, 10, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(canvasPos.x - 3, canvasPos.y - 10 + bounceOffset, 2, 0, Math.PI * 2);
    this.ctx.arc(canvasPos.x + 3, canvasPos.y - 10 + bounceOffset, 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#00d4ff';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(canvasPos.x, canvasPos.y + 2 + bounceOffset);
    this.ctx.lineTo(canvasPos.x, canvasPos.y + 15 + bounceOffset);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(canvasPos.x, canvasPos.y + 5 + bounceOffset);
    this.ctx.lineTo(canvasPos.x - 8, canvasPos.y + 12 + bounceOffset);
    this.ctx.moveTo(canvasPos.x, canvasPos.y + 5 + bounceOffset);
    this.ctx.lineTo(canvasPos.x + 8, canvasPos.y + 12 + bounceOffset);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(canvasPos.x, canvasPos.y + 15 + bounceOffset);
    this.ctx.lineTo(canvasPos.x - 6, canvasPos.y + 22 + bounceOffset);
    this.ctx.moveTo(canvasPos.x, canvasPos.y + 15 + bounceOffset);
    this.ctx.lineTo(canvasPos.x + 6, canvasPos.y + 22 + bounceOffset);
    this.ctx.stroke();

    this.ctx.restore();
  }

  render(): void {
    this.clear();
    this.drawBackground();
    this.drawGrid();
    this.drawAxes();
    this.drawCurve();
    this.drawSpecialPoints();
    this.drawJudgementPoints();
    this.drawCharacter();
  }
}
