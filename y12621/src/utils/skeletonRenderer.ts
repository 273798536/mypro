import type { SkeletonNode, BoneConnection, CollisionPoint, BodyPart, LayerMode } from '@/types';

const PART_COLORS: Record<BodyPart, string> = {
  head: '#FF4D4F',
  torso: '#165DFF',
  arm: '#00B42A',
  leg: '#722ED1',
};

const PART_GLOW_COLORS: Record<BodyPart, string> = {
  head: 'rgba(255, 77, 79, 0.3)',
  torso: 'rgba(22, 93, 255, 0.3)',
  arm: 'rgba(0, 180, 42, 0.3)',
  leg: 'rgba(114, 46, 209, 0.3)',
};

interface RenderOptions {
  scale: number;
  offsetX: number;
  offsetY: number;
  showGrid: boolean;
  showLabels: boolean;
  highlightCollisions: boolean;
  opacity: number;
}

interface HitTestResult {
  node: SkeletonNode;
  distance: number;
}

export class SkeletonRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private animationId: number | null = null;
  private collisionAnimationTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(dpr, dpr);
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawGrid(width: number, height: number, options: RenderOptions): void {
    if (!options.showGrid) return;

    const { scale, offsetX, offsetY } = options;
    const gridSize = 20 * scale;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;

    const startX = -(offsetX % gridSize);
    const startY = -(offsetY % gridSize);

    for (let x = startX; x < width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }

    for (let y = startY; y < height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(-offsetX, 0);
    this.ctx.lineTo(-offsetX, height);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(0, -offsetY);
    this.ctx.lineTo(width, -offsetY);
    this.ctx.stroke();
  }

  private worldToScreen(x: number, y: number, options: RenderOptions): { x: number; y: number } {
    return {
      x: x * options.scale + options.offsetX,
      y: y * options.scale + options.offsetY,
    };
  }

  screenToWorld(screenX: number, screenY: number, options: RenderOptions): { x: number; y: number } {
    return {
      x: (screenX - options.offsetX) / options.scale,
      y: (screenY - options.offsetY) / options.scale,
    };
  }

  private drawBone(
    from: SkeletonNode,
    to: SkeletonNode,
    options: RenderOptions,
    isSelected: boolean
  ): void {
    const fromPos = this.worldToScreen(from.x, from.y, options);
    const toPos = this.worldToScreen(to.x, to.y, options);

    const gradient = this.ctx.createLinearGradient(fromPos.x, fromPos.y, toPos.x, toPos.y);
    const fromColor = PART_COLORS[from.part];
    const toColor = PART_COLORS[to.part];
    gradient.addColorStop(0, fromColor);
    gradient.addColorStop(1, toColor);

    this.ctx.globalAlpha = options.opacity;
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = isSelected ? 4 : 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(fromPos.x, fromPos.y);
    this.ctx.lineTo(toPos.x, toPos.y);
    this.ctx.stroke();

    if (isSelected) {
      this.ctx.shadowColor = fromColor;
      this.ctx.shadowBlur = 10;
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }

    this.ctx.globalAlpha = 1;
  }

  private drawNode(node: SkeletonNode, options: RenderOptions, isSelected: boolean): void {
    if (node.isBadData) {
      const pos = this.worldToScreen(520, 340, options);
      this.ctx.globalAlpha = options.opacity * 0.5;
      this.ctx.fillStyle = '#F53F3F';
      this.ctx.font = 'bold 12px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`⚠ ${node.name}: 数据异常`, pos.x, pos.y - 20);
      this.ctx.globalAlpha = 1;
      return;
    }

    const pos = this.worldToScreen(node.x, node.y, options);
    const color = PART_COLORS[node.part];
    const glowColor = PART_GLOW_COLORS[node.part];
    const baseRadius = isSelected ? 10 : 7;
    const radius = baseRadius * (options.scale < 1 ? 1 : options.scale > 2 ? 0.7 : 1);

    this.ctx.globalAlpha = options.opacity;

    if (isSelected) {
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, radius + 8, 0, Math.PI * 2);
      this.ctx.fillStyle = glowColor;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, radius + 4, 0, Math.PI * 2);
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    if (node.isBoundary) {
      const pulse = Math.sin(this.collisionAnimationTime * 0.05) * 0.3 + 0.7;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, radius + 12, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 125, 0, ${pulse * 0.3})`;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, radius + 6, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#FF7D00';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([4, 4]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(pos.x - radius * 0.3, pos.y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.fill();

    if (options.showLabels && options.scale >= 0.8) {
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '11px "Noto Sans SC", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(node.name, pos.x, pos.y + radius + 4);

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.font = '10px monospace';
      this.ctx.fillText(`${(node.confidence * 100).toFixed(0)}%`, pos.x, pos.y + radius + 18);
    }

    this.ctx.globalAlpha = 1;
  }

  private drawCollision(
    collision: CollisionPoint,
    nodes: SkeletonNode[],
    options: RenderOptions
  ): void {
    if (!options.highlightCollisions) return;

    const node1 = nodes.find((n) => n.name === collision.nodes[0]);
    const node2 = nodes.find((n) => n.name === collision.nodes[1]);
    if (!node1 || !node2 || node1.isBadData || node2.isBadData) return;

    const pos1 = this.worldToScreen(node1.x, node1.y, options);
    const pos2 = this.worldToScreen(node2.x, node2.y, options);

    const pulse = Math.sin(this.collisionAnimationTime * 0.08) * 0.4 + 0.6;
    const alpha = collision.isFalsePositive ? pulse * 0.3 : pulse * 0.6;

    const color = collision.severity === 'danger' ? '#F53F3F' :
                  collision.severity === 'boundary' ? '#FF7D00' : '#FFAA00';

    this.ctx.globalAlpha = alpha * options.opacity;

    this.ctx.beginPath();
    this.ctx.moveTo(pos1.x, pos1.y);
    this.ctx.lineTo(pos2.x, pos2.y);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([8, 4]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    const midX = (pos1.x + pos2.x) / 2;
    const midY = (pos1.y + pos2.y) / 2;

    this.ctx.beginPath();
    this.ctx.arc(midX, midY, 12, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 12px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('!', midX, midY);

    if (options.showLabels) {
      this.ctx.fillStyle = color;
      this.ctx.font = '11px "Noto Sans SC", sans-serif';
      this.ctx.textAlign = collision.isFalsePositive ? 'left' : 'right';
      this.ctx.fillText(
        `${collision.distance}cm / ${collision.threshold}cm`,
        midX + (collision.isFalsePositive ? 18 : -18),
        midY
      );
    }

    this.ctx.globalAlpha = 1;
  }

  render(
    nodes: SkeletonNode[],
    bones: BoneConnection[],
    collisions: CollisionPoint[],
    options: RenderOptions,
    selectedNodeId: string | null,
    layerMode: LayerMode,
    beforeNodes?: SkeletonNode[]
  ): void {
    const { width, height } = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = width / dpr;
    const displayHeight = height / dpr;

    this.clear();

    this.ctx.fillStyle = '#1D2129';
    this.ctx.fillRect(0, 0, displayWidth, displayHeight);

    this.drawGrid(displayWidth, displayHeight, options);

    if (layerMode === 'split' && beforeNodes) {
      const splitX = displayWidth / 2;

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(0, 0, splitX, displayHeight);
      this.ctx.clip();

      const beforeOptions = { ...options, opacity: 0.6 };
      bones.forEach((bone) => {
        const from = beforeNodes.find((n) => n.name === bone.from);
        const to = beforeNodes.find((n) => n.name === bone.to);
        if (from && to && !from.isBadData && !to.isBadData) {
          this.drawBone(from, to, beforeOptions, false);
        }
      });

      beforeNodes.forEach((node) => {
        this.drawNode(node, beforeOptions, false);
      });

      this.ctx.restore();

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(splitX, 0, splitX, displayHeight);
      this.ctx.clip();

      bones.forEach((bone) => {
        const from = nodes.find((n) => n.name === bone.from);
        const to = nodes.find((n) => n.name === bone.to);
        if (from && to && !from.isBadData && !to.isBadData) {
          this.drawBone(from, to, options, selectedNodeId === from.id || selectedNodeId === to.id);
        }
      });

      nodes.forEach((node) => {
        this.drawNode(node, options, selectedNodeId === node.id);
      });

      collisions.forEach((collision) => {
        this.drawCollision(collision, nodes, options);
      });

      this.ctx.restore();

      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(splitX, 0);
      this.ctx.lineTo(splitX, displayHeight);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      this.ctx.font = '12px "Noto Sans SC", sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('原始标注', 8, 20);
      this.ctx.textAlign = 'right';
      this.ctx.fillText('人工调整后', displayWidth - 8, 20);
    } else {
      bones.forEach((bone) => {
        const from = nodes.find((n) => n.name === bone.from);
        const to = nodes.find((n) => n.name === bone.to);
        if (from && to && !from.isBadData && !to.isBadData) {
          this.drawBone(from, to, options, selectedNodeId === from.id || selectedNodeId === to.id);
        }
      });

      nodes.forEach((node) => {
        this.drawNode(node, options, selectedNodeId === node.id);
      });

      collisions.forEach((collision) => {
        this.drawCollision(collision, nodes, options);
      });
    }

    this.collisionAnimationTime++;
  }

  startAnimation(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  hitTest(
    screenX: number,
    screenY: number,
    nodes: SkeletonNode[],
    options: RenderOptions
  ): HitTestResult | null {
    const hitRadius = 15;
    let closest: HitTestResult | null = null;

    for (const node of nodes) {
      if (node.isBadData) continue;

      const pos = this.worldToScreen(node.x, node.y, options);
      const dx = screenX - pos.x;
      const dy = screenY - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < hitRadius && (!closest || distance < closest.distance)) {
        closest = { node, distance };
      }
    }

    return closest;
  }

  getNodeScreenPosition(node: SkeletonNode, options: RenderOptions): { x: number; y: number } {
    return this.worldToScreen(node.x, node.y, options);
  }
}
