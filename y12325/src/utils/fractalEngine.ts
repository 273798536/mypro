import { Point, ExperimentConfig, IterationResult, ValidationResult, ErrorType } from '@/types';

export class FractalEngine {
  private validateRuleSyntax(rule: string): boolean {
    const validPatterns = [
      /^koch$/,
      /^sierpinski$/,
      /^cantor$/,
      /^scale\s*:\s*[\d.]+$/,
      /^rotate\s*:\s*[\d.-]+$/,
      /^translate\s*:\s*[\d.-]+\s*,\s*[\d.-]+$/,
      /^custom\s*:\s*.+$/,
    ];
    return validPatterns.some(pattern => pattern.test(rule.trim().toLowerCase()));
  }

  public validateRule(rule: string): ValidationResult {
    if (!rule || rule.trim() === '') {
      return {
        valid: false,
        errorType: 'invalid_rule',
        message: '迭代规则不能为空'
      };
    }

    const trimmedRule = rule.trim().toLowerCase();
    
    if (trimmedRule.includes('explode') || trimmedRule.includes('爆炸') || 
        trimmedRule.includes('infinity') || trimmedRule.includes('inf')) {
      return {
        valid: false,
        errorType: 'invalid_rule',
        message: '检测到可能导致迭代爆炸的关键字'
      };
    }

    if (trimmedRule.includes('error') || trimmedRule.includes('错误')) {
      return {
        valid: false,
        errorType: 'invalid_rule',
        message: '规则包含非法语法'
      };
    }

    if (!this.validateRuleSyntax(rule)) {
      return {
        valid: false,
        errorType: 'invalid_rule',
        message: `规则语法错误："${rule}" 不是有效的迭代规则格式`
      };
    }

    return { valid: true };
  }

  public checkExplosion(points: Point[]): boolean {
    if (points.length === 0) return false;
    
    const bounds = this.getBounds(points);
    const area = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
    
    return area > 10000000 || points.length > 100000;
  }

  public checkColorOverlap(colors: { stroke: string; fill: string }): boolean {
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    const strokeRgb = hexToRgb(colors.stroke);
    const fillRgb = hexToRgb(colors.fill);
    
    if (!strokeRgb || !fillRgb) return false;

    const distance = Math.sqrt(
      Math.pow(strokeRgb.r - fillRgb.r, 2) +
      Math.pow(strokeRgb.g - fillRgb.g, 2) +
      Math.pow(strokeRgb.b - fillRgb.b, 2)
    );

    return distance < 50;
  }

  private getBounds(points: Point[]): { minX: number; maxX: number; minY: number; maxY: number } {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    points.forEach(p => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
    
    return { minX, maxX, minY, maxY };
  }

  public calculateDimension(points: Point[]): number {
    if (points.length < 3) return 1.0;
    
    const bounds = this.getBounds(points);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    
    const boxSize = Math.max(width, height);
    if (boxSize === 0) return 1.0;
    
    const logN = Math.log(points.length);
    const logS = Math.log(boxSize);
    
    const dimension = logS > 0 ? (logN / logS) * 1.5 : 1.0;
    
    return Math.min(Math.max(dimension, 1.0), 2.0);
  }

  private getInitialPoints(shape: string, width: number, height: number): Point[] {
    const centerX = width / 2;
    const centerY = height / 2;
    const size = Math.min(width, height) * 0.4;

    switch (shape) {
      case 'triangle':
        return [
          { x: centerX, y: centerY - size * 0.8 },
          { x: centerX - size * 0.7, y: centerY + size * 0.5 },
          { x: centerX + size * 0.7, y: centerY + size * 0.5 },
          { x: centerX, y: centerY - size * 0.8 },
        ];
      case 'square':
        return [
          { x: centerX - size, y: centerY - size },
          { x: centerX + size, y: centerY - size },
          { x: centerX + size, y: centerY + size },
          { x: centerX - size, y: centerY + size },
          { x: centerX - size, y: centerY - size },
        ];
      case 'koch':
        return [
          { x: centerX - size * 1.2, y: centerY + size * 0.3 },
          { x: centerX + size * 1.2, y: centerY + size * 0.3 },
        ];
      case 'cantor':
        return [
          { x: centerX - size, y: centerY },
          { x: centerX + size, y: centerY },
        ];
      case 'sierpinski':
        return [
          { x: centerX, y: centerY - size * 0.8 },
          { x: centerX - size * 0.7, y: centerY + size * 0.5 },
          { x: centerX + size * 0.7, y: centerY + size * 0.5 },
        ];
      case 'line':
      default:
        return [
          { x: centerX - size, y: centerY },
          { x: centerX + size, y: centerY },
        ];
    }
  }

  private kochIterate(points: Point[]): Point[] {
    const result: Point[] = [];
    
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      
      const a = { x: p1.x + dx / 3, y: p1.y + dy / 3 };
      const c = { x: p1.x + 2 * dx / 3, y: p1.y + 2 * dy / 3 };
      
      const angle = -Math.PI / 3;
      const bx = a.x + (dx / 3) * Math.cos(angle) - (dy / 3) * Math.sin(angle);
      const by = a.y + (dx / 3) * Math.sin(angle) + (dy / 3) * Math.cos(angle);
      const b = { x: bx, y: by };
      
      result.push(p1, a, b, c);
    }
    
    result.push(points[points.length - 1]);
    return result;
  }

  private sierpinskiIterate(points: Point[]): Point[] {
    if (points.length < 3) return points;
    
    const result: Point[] = [];
    
    for (let i = 0; i < points.length; i += 3) {
      if (i + 2 >= points.length) break;
      
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2];
      
      const mid1 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const mid2 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };
      const mid3 = { x: (p3.x + p1.x) / 2, y: (p3.y + p1.y) / 2 };
      
      result.push(p1, mid1, mid3);
      result.push(mid1, p2, mid2);
      result.push(mid3, mid2, p3);
    }
    
    return result.length > 0 ? result : points;
  }

  private cantorIterate(points: Point[]): Point[] {
    const result: Point[] = [];
    const yOffset = 30;
    
    for (let i = 0; i < points.length; i += 2) {
      if (i + 1 >= points.length) break;
      
      const p1 = points[i];
      const p2 = points[i + 1];
      const length = p2.x - p1.x;
      const third = length / 3;
      
      result.push(
        { x: p1.x, y: p1.y + yOffset },
        { x: p1.x + third, y: p1.y + yOffset },
        { x: p2.x - third, y: p2.y + yOffset },
        { x: p2.x, y: p2.y + yOffset }
      );
    }
    
    return result;
  }

  private explosionIterate(points: Point[], factor: number = 2): Point[] {
    const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    
    return points.map(p => ({
      x: centerX + (p.x - centerX) * factor,
      y: centerY + (p.y - centerY) * factor
    }));
  }

  public async iterate(
    config: ExperimentConfig,
    canvasWidth: number,
    canvasHeight: number,
    onStep: (result: IterationResult) => void
  ): Promise<{ success: boolean; errorType?: ErrorType; errorMessage?: string }> {
    const ruleValidation = this.validateRule(config.iterationRule);
    if (!ruleValidation.valid) {
      return {
        success: false,
        errorType: ruleValidation.errorType,
        errorMessage: ruleValidation.message
      };
    }

    if (this.checkColorOverlap(config.colorScheme)) {
      return {
        success: false,
        errorType: 'color_overlap',
        errorMessage: '描边色和填充色过于接近，可能导致视觉效果不清晰'
      };
    }

    let points = this.getInitialPoints(config.initialShape, canvasWidth, canvasHeight);
    
    const rule = config.iterationRule.toLowerCase().trim();
    
    for (let step = 0; step <= config.maxIterations; step++) {
      const dimension = this.calculateDimension(points);
      
      onStep({
        step,
        points: [...points],
        dimension,
      });

      if (step === config.maxIterations) break;

      await new Promise(resolve => setTimeout(resolve, 100));

      if (rule === 'koch') {
        points = this.kochIterate(points);
      } else if (rule === 'sierpinski') {
        points = this.sierpinskiIterate(points);
      } else if (rule === 'cantor') {
        points = this.cantorIterate(points);
      } else if (rule.startsWith('scale:')) {
        const factor = parseFloat(rule.split(':')[1]) || 1.1;
        points = this.explosionIterate(points, factor);
      } else {
        points = this.kochIterate(points);
      }

      if (this.checkExplosion(points)) {
        return {
          success: false,
          errorType: 'explosion',
          errorMessage: `迭代在第 ${step + 1} 步发生爆炸：图形范围超出限制 (点数: ${points.length})`
        };
      }
    }

    return { success: true };
  }
}

export const fractalEngine = new FractalEngine();
