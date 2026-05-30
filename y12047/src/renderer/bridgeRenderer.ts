import type { Node, Member, SimulationResult, RenderOptions } from '../types';
import { matrixSolver } from '../engine/matrixSolver';
import { getMemberColor, getStressRatio } from './colorMapper';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface HoverInfo {
  type: 'node' | 'member';
  id: string;
  x: number;
  y: number;
}

export class BridgeRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number = 0;
  private height: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private scale: number = 1;
  private hoverInfo: HoverInfo | null = null;
  private animationTime: number = 0;

  constructor(canvas?: HTMLCanvasElement) {
    if (canvas) {
      this.canvas = canvas;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法获取Canvas上下文');
      this.ctx = ctx;
    }
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  setTransform(offsetX: number, offsetY: number, scale: number): void {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.scale = scale;
  }

  private worldToScreen(x: number, y: number): { x: number; y: number } {
    const centerX = this.width / 2 + this.offsetX;
    const centerY = this.height / 2 + this.offsetY;
    return {
      x: centerX + x * this.scale,
      y: centerY - y * this.scale,
    };
  }

  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const centerX = this.width / 2 + this.offsetX;
    const centerY = this.height / 2 + this.offsetY;
    return {
      x: (sx - centerX) / this.scale,
      y: (centerY - sy) / this.scale,
    };
  }

  private drawGrid(): void {
    const { ctx, width, height } = this;
    const gridSize = 50 * this.scale;
    const startX = (this.offsetX % gridSize + gridSize) % gridSize;
    const startY = (this.offsetY % gridSize + gridSize) % gridSize;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let x = startX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = startY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const centerX = this.worldToScreen(0, 0);
    ctx.strokeStyle = 'rgba(22, 93, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, centerX.y);
    ctx.lineTo(width, centerX.y);
    ctx.stroke();
  }

  private drawMember(
    member: Member,
    nodes: Node[],
    stress: number,
    options: RenderOptions,
    displacements?: Record<string, { x: number; y: number }>,
    isHighlighted: boolean = false
  ): void {
    const { ctx } = this;
    const startNode = nodes.find(n => n.id === member.startNodeId)!;
    const endNode = nodes.find(n => n.id === member.endNodeId)!;

    let startPos = this.worldToScreen(startNode.x, startNode.y);
    let endPos = this.worldToScreen(endNode.x, endNode.y);

    if (options.showDeformation && displacements) {
      const startDisp = displacements[startNode.id] || { x: 0, y: 0 };
      const endDisp = displacements[endNode.id] || { x: 0, y: 0 };
      const scale = options.deformationScale;
      
      startPos = this.worldToScreen(
        startNode.x + startDisp.x * scale,
        startNode.y + startDisp.y * scale
      );
      endPos = this.worldToScreen(
        endNode.x + endDisp.x * scale,
        endNode.y + endDisp.y * scale
      );
    }

    const color = getMemberColor(member, stress, options.showStressColors);

    const lineWidth = isHighlighted ? 6 : Math.max(2, Math.sqrt(member.area) / 5 * this.scale);

    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / length;
    const ny = dx / length;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    
    if (options.showStressColors) {
      const ratio = getStressRatio(stress, member.yieldStrength);
      if (ratio > 1.0) {
        const flash = Math.sin(this.animationTime * 5) * 0.5 + 0.5;
        ctx.globalAlpha = 0.5 + flash * 0.5;
        ctx.shadowColor = '#F53F3F';
        ctx.shadowBlur = 10 + flash * 10;
      }
    }

    ctx.beginPath();
    ctx.moveTo(startPos.x + nx * 2, startPos.y + ny * 2);
    ctx.lineTo(endPos.x + nx * 2, endPos.y + ny * 2);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (options.showLabels && this.hoverInfo?.type === 'member' && this.hoverInfo.id === member.id) {
      const midX = (startPos.x + endPos.x) / 2;
      const midY = (startPos.y + endPos.y) / 2;
      const forceMPa = stress / 1e6;
      const ratio = getStressRatio(stress, member.yieldStrength);
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(midX - 60, midY - 30, 120, 55);
      ctx.fillStyle = '#fff';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`杆件#${member.id.slice(1)}`, midX, midY - 12);
      ctx.fillText(`应力: ${forceMPa.toFixed(1)}MPa`, midX, midY + 5);
      ctx.fillText(`比值: ${(ratio * 100).toFixed(0)}%`, midX, midY + 22);
    }
  }

  private drawNode(
    node: Node,
    options: RenderOptions,
    displacement?: { x: number; y: number },
    isLoadPoint: boolean = false,
    reaction?: { x: number; y: number }
  ): void {
    const { ctx } = this;

    let pos = this.worldToScreen(node.x, node.y);

    if (options.showDeformation && displacement) {
      pos = this.worldToScreen(
        node.x + displacement.x * options.deformationScale,
        node.y + displacement.y * options.deformationScale
      );
    }

    const radius = isLoadPoint ? 8 : 6;
    const isHovered = this.hoverInfo?.type === 'node' && this.hoverInfo.id === node.id;

    ctx.fillStyle = '#1D2129';
    ctx.strokeStyle = node.constraintType === 'free' ? '#86909C' : '#165DFF';
    ctx.lineWidth = 2;

    if (node.constraintType === 'pin') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y - radius);
      ctx.lineTo(pos.x - radius, pos.y + radius);
      ctx.lineTo(pos.x + radius, pos.y + radius);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (node.constraintType === 'roller') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y - radius);
      ctx.lineTo(pos.x - radius, pos.y + radius);
      ctx.lineTo(pos.x + radius, pos.y + radius);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = '#4E5969';
      ctx.beginPath();
      ctx.arc(pos.x - radius / 4, pos.y + radius + 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pos.x + radius / 4, pos.y + radius + 4, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (node.constraintType === 'fixed') {
      ctx.fillStyle = '#722ED1';
      ctx.fillRect(pos.x - radius - 2, pos.y - radius, 4, radius * 2);
      ctx.strokeRect(pos.x - radius - 2, pos.y - radius, 4, radius * 2);
    } else {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (node.isLoadPoint || isLoadPoint) {
      ctx.strokeStyle = '#F53F3F';
      ctx.lineWidth = 2;
      const arrowSize = 12;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y + radius + 5);
      ctx.lineTo(pos.x, pos.y + radius + 5 + arrowSize);
      ctx.moveTo(pos.x - 5, pos.y + radius + arrowSize - 5);
      ctx.lineTo(pos.x, pos.y + radius + 5 + arrowSize);
      ctx.lineTo(pos.x + 5, pos.y + radius + arrowSize - 5);
      ctx.stroke();
    }

    if (reaction && options.showLabels) {
      const scale = 0.001;
      const arrowLen = Math.sqrt(reaction.x ** 2 + reaction.y ** 2) * scale;
      if (arrowLen > 0.5) {
        ctx.strokeStyle = '#00B42A';
        ctx.lineWidth = 2;
        const endX = pos.x + reaction.x * scale;
        const endY = pos.y - reaction.y * scale;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    }

    if (isHovered && options.showLabels) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(pos.x + 15, pos.y - 35, 100, 35);
      ctx.fillStyle = '#fff';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`节点#${node.id.slice(1)}`, pos.x + 20, pos.y - 20);
      ctx.fillText(`(${node.x.toFixed(0)}, ${node.y.toFixed(0)})`, pos.x + 20, pos.y - 5);
      const constraintNames: Record<string, string> = {
        free: '自由',
        pin: '铰支',
        roller: '滚动',
        fixed: '固定',
      };
      ctx.fillText(constraintNames[node.constraintType], pos.x + 20, pos.y + 10);
    }
  }

  getHoverInfo(screenX: number, screenY: number, nodes: Node[], members: Member[]): HoverInfo | null {
    const worldPos = this.screenToWorld(screenX, screenY);

    for (const node of nodes) {
      const dx = worldPos.x - node.x;
      const dy = worldPos.y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 15 / this.scale) {
        return { type: 'node', id: node.id, x: screenX, y: screenY };
      }
    }

    for (const member of members) {
      const startNode = nodes.find(n => n.id === member.startNodeId)!;
      const endNode = nodes.find(n => n.id === member.endNodeId)!;
      
      const lineLen = matrixSolver.getMemberLength(member, nodes);
      const dotProduct = 
        (worldPos.x - startNode.x) * (endNode.x - startNode.x) +
        (worldPos.y - startNode.y) * (endNode.y - startNode.y);
      const t = Math.max(0, Math.min(1, dotProduct / (lineLen * lineLen)));
      
      const closestX = startNode.x + t * (endNode.x - startNode.x);
      const closestY = startNode.y + t * (endNode.y - startNode.y);
      const dx = worldPos.x - closestX;
      const dy = worldPos.y - closestY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 10 / this.scale) {
        return { type: 'member', id: member.id, x: screenX, y: screenY };
      }
    }

    return null;
  }

  setHoverInfo(info: HoverInfo | null): void {
    this.hoverInfo = info;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  hitTestMember(
    screenX: number,
    screenY: number,
    nodes: Node[],
    members: Member[],
    result?: SimulationResult | null,
    options?: { width: number; height: number }
  ): { id: string } | null {
    if (options) {
      this.width = options.width;
      this.height = options.height;
    }
    const info = this.getHoverInfo(screenX, screenY, nodes, members);
    return info?.type === 'member' ? { id: info.id } : null;
  }

  hitTestNode(
    screenX: number,
    screenY: number,
    nodes: Node[],
    result?: SimulationResult | null,
    options?: { width: number; height: number }
  ): { id: string } | null {
    if (options) {
      this.width = options.width;
      this.height = options.height;
    }
    const info = this.getHoverInfo(screenX, screenY, nodes, []);
    return info?.type === 'node' ? { id: info.id } : null;
  }

  render(
    ctx: CanvasRenderingContext2D,
    nodes: Node[],
    members: Member[],
    result: SimulationResult | null,
    options: RenderOptions,
    loadPosition?: number,
    extra?: { width: number; height: number; selectedMemberId?: string | null; selectedNodeId?: string | null }
  ): void;
  render(
    nodes: Node[],
    members: Member[],
    options: RenderOptions,
    result?: SimulationResult,
    loadPosition?: number
  ): void;
  render(
    ctxOrNodes: CanvasRenderingContext2D | Node[],
    nodesOrMembers: Node[] | Member[],
    membersOrResult: Member[] | RenderOptions | SimulationResult | null,
    resultOrOptions?: RenderOptions | SimulationResult | null,
    optionsOrLoadPosition?: RenderOptions | number,
    loadPosition?: number,
    extra?: { width: number; height: number; selectedMemberId?: string | null; selectedNodeId?: string | null }
  ): void {
    if (ctxOrNodes instanceof CanvasRenderingContext2D) {
      const ctx = ctxOrNodes;
      const nodes = nodesOrMembers as Node[];
      const members = membersOrResult as Member[];
      const result = resultOrOptions as SimulationResult | null;
      const options = optionsOrLoadPosition as RenderOptions;
      const pos = loadPosition;

      if (extra) {
        this.width = extra.width;
        this.height = extra.height;
        if (extra.selectedMemberId) {
          this.hoverInfo = { type: 'member', id: extra.selectedMemberId, x: 0, y: 0 };
        } else if (extra.selectedNodeId) {
          this.hoverInfo = { type: 'node', id: extra.selectedNodeId, x: 0, y: 0 };
        }
      }

      const originalCtx = this.ctx;
      const originalWidth = this.width;
      const originalHeight = this.height;

      this.ctx = ctx;

      this.render(nodes, members, options, result || undefined, pos);

      this.ctx = originalCtx;
      this.width = originalWidth;
      this.height = originalHeight;
    } else {
      const nodes = ctxOrNodes as Node[];
      const members = nodesOrMembers as Member[];
      const options = membersOrResult as RenderOptions;
      const result = resultOrOptions as SimulationResult | undefined;
      const pos = optionsOrLoadPosition as number | undefined;

      const { ctx, width, height } = this;
      if (!ctx) return;

      ctx.fillStyle = '#1D2129';
      ctx.fillRect(0, 0, width, height);

      this.drawGrid();

      this.animationTime += 0.016;

      const sortedMembers = [...members].sort((a, b) => a.id.localeCompare(b.id));

      const displacements: Record<string, { x: number; y: number }> = {};
      if (result && options.showDeformation) {
        nodes.forEach((node, idx) => {
          if (result.reactions && result.reactions[node.id]) {
          }
        });
      }

      for (const member of sortedMembers) {
        const stress = result?.memberStresses[member.id] || 0;
        const isHighlighted = this.hoverInfo?.type === 'member' && this.hoverInfo.id === member.id;
        this.drawMember(member, nodes, stress, options, displacements, isHighlighted);
      }

      const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
      for (const node of sortedNodes) {
        const reaction = result?.reactions[node.id];
        const displacement = displacements[node.id];
        const isActiveLoad = pos !== undefined && node.isLoadPoint;
        this.drawNode(node, options, displacement, isActiveLoad, reaction);
      }

      if (pos !== undefined) {
        const loadNodes = nodes.filter(n => n.isLoadPoint).sort((a, b) => a.x - b.x);
        if (loadNodes.length > 0) {
          const totalLength = loadNodes[loadNodes.length - 1].x - loadNodes[0].x;
          const targetX = loadNodes[0].x + (pos / 100) * totalLength;
          
          let closestNode = loadNodes[0];
          let minDist = Math.abs(closestNode.x - targetX);
          for (const node of loadNodes) {
            const dist = Math.abs(node.x - targetX);
            if (dist < minDist) {
              minDist = dist;
              closestNode = node;
            }
          }

          const pos2 = this.worldToScreen(closestNode.x, closestNode.y);
          
          ctx.fillStyle = 'rgba(245, 63, 63, 0.8)';
          ctx.beginPath();
          ctx.arc(pos2.x, pos2.y - 30, 15, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('↓', pos2.x, pos2.y - 26);
        }
      }
    }
  }
}

export const bridgeRenderer = new BridgeRenderer();
