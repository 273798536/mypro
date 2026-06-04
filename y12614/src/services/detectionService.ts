import type { Point, DetectionResult } from '@/types';

export interface Polygon {
  points: Point[];
}

export class DetectionService {
  static checkColorBoundary(
    selectionPoints: Point[],
    validColorBounds: { minX: number; maxX: number; minY: number; maxY: number }
  ): { isOutOfBounds: boolean; outOfBoundsPoints: Point[] } {
    const outOfBoundsPoints: Point[] = [];
    
    for (const point of selectionPoints) {
      const isOutOfBounds = 
        point.x < validColorBounds.minX ||
        point.x > validColorBounds.maxX ||
        point.y < validColorBounds.minY ||
        point.y > validColorBounds.maxY;
      
      if (isOutOfBounds) {
        outOfBoundsPoints.push(point);
      }
    }

    const threshold = 0.1;
    const isOutOfBounds = outOfBoundsPoints.length / selectionPoints.length > threshold;
    
    return { isOutOfBounds, outOfBoundsPoints };
  }

  static checkEdgeCollision(
    selectionPoints: Point[],
    leafBoundary: Polygon
  ): { isColliding: boolean; collisionPoints: Point[] } {
    const collisionPoints: Point[] = [];
    
    for (const point of selectionPoints) {
      if (this.isPointNearEdge(point, leafBoundary, 5)) {
        collisionPoints.push(point);
      }
    }

    const threshold = 0.05;
    const isColliding = collisionPoints.length / selectionPoints.length > threshold;
    
    return { isColliding, collisionPoints };
  }

  private static isPointNearEdge(point: Point, polygon: Polygon, threshold: number): boolean {
    for (let i = 0; i < polygon.points.length; i++) {
      const p1 = polygon.points[i];
      const p2 = polygon.points[(i + 1) % polygon.points.length];
      
      const distance = this.pointToLineDistance(point, p1, p2);
      if (distance < threshold) {
        return true;
      }
    }
    return false;
  }

  private static pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static isPointInPolygon(point: Point, polygon: Polygon): boolean {
    let inside = false;
    for (let i = 0, j = polygon.points.length - 1; i < polygon.points.length; j = i++) {
      const xi = polygon.points[i].x, yi = polygon.points[i].y;
      const xj = polygon.points[j].x, yj = polygon.points[j].y;

      const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  static generateDetectionResult(
    isOutOfBounds: boolean,
    isColliding: boolean
  ): DetectionResult {
    if (isOutOfBounds && isColliding) {
      return {
        id: `det-${Date.now()}`,
        type: 'color-boundary',
        passed: false,
        description: '颜色越界且边界碰撞',
        explanation: '圈选区域同时存在颜色越界和边界碰撞问题，请重新调整圈选范围。'
      };
    } else if (isOutOfBounds) {
      return {
        id: `det-${Date.now()}`,
        type: 'color-boundary',
        passed: false,
        description: '颜色越界检测未通过',
        explanation: '圈选区域包含过多异常颜色像素。病斑区域应该有一致的颜色特征，超出正常范围可能意味着圈选了非病斑区域。请仔细检查圈选范围，确保只包含病斑部分。'
      };
    } else if (isColliding) {
      return {
        id: `det-${Date.now()}`,
        type: 'collision',
        passed: false,
        description: '边界碰撞检测未通过',
        explanation: '圈选区域与叶片边缘过于接近或发生碰撞。病斑圈选应该与叶片边缘保持一定距离，避免将正常叶缘组织误判为病斑。请向内调整圈选边界。'
      };
    } else {
      return {
        id: `det-${Date.now()}`,
        type: 'success',
        passed: true,
        description: '检测通过',
        explanation: '圈选区域颜色正常，未与边界碰撞。本次圈选符合规范要求。'
      };
    }
  }

  static getMandarinExplanation(
    results: { isOutOfBounds: boolean; isColliding: boolean }[],
    sampleName: string
  ): string {
    const total = results.length;
    const outOfBoundsCount = results.filter(r => r.isOutOfBounds).length;
    const collidingCount = results.filter(r => r.isColliding).length;
    const passedCount = results.filter(r => !r.isOutOfBounds && !r.isColliding).length;

    let explanation = `【植物叶片病斑圈选检测报告】\n\n`;
    explanation += `检测样例：${sampleName}\n`;
    explanation += `检测时间：${new Date().toLocaleString('zh-CN')}\n\n`;
    explanation += `本次共完成 ${total} 处病斑圈选检测：\n`;
    explanation += `✅ 通过：${passedCount} 处\n`;
    if (outOfBoundsCount > 0) {
      explanation += `❌ 颜色越界：${outOfBoundsCount} 处\n`;
    }
    if (collidingCount > 0) {
      explanation += `❌ 边界碰撞：${collidingCount} 处\n`;
    }

    explanation += `\n【检测说明】\n`;
    
    if (outOfBoundsCount > 0) {
      explanation += `\n关于「颜色越界」被拦截的原因：\n`;
      explanation += `颜色越界检测是为了确保圈选的病斑区域颜色特征一致。系统通过分析圈选区域内的像素颜色分布，判断是否包含了过多与病斑特征不符的像素。如果圈选区域中正常叶片组织占比过高，或者混入了背景、污渍等非病斑元素，就会触发颜色越界警告。建议重新框选，确保只包含病斑本身。\n`;
    }

    if (collidingCount > 0) {
      explanation += `\n关于「边界碰撞」被拦截的原因：\n`;
      explanation += `边界碰撞检测用于防止圈选范围过于靠近或超出叶片边缘。叶片边缘的颜色和纹理与病斑可能存在相似性，容易造成误判。保持圈选与叶缘的安全距离（建议至少5像素），可以有效排除边缘效应带来的干扰，提高检测准确度。\n`;
    }

    if (passedCount === total) {
      explanation += `\n所有圈选均通过检测，标注质量良好，可用于后续分析。\n`;
    }

    explanation += `\n【操作建议】\n`;
    explanation += `1. 圈选时适当放大图像，便于精确判断病斑边界\n`;
    explanation += `2. 使用多边形工具可以更精确地贴合病斑形状\n`;
    explanation += `3. 对于边界不清晰的病斑，可以标记为「待确认」交由资深人员复核\n`;

    return explanation;
  }
}
