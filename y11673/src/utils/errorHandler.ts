import {
  SimulationParams,
  SimulationError,
  ErrorType,
  ErrorSeverity,
  PARAM_CONSTRAINTS,
  IntegrationResult,
} from '../types';

export class ErrorHandler {
  private errors: SimulationError[] = [];
  private maxErrors = 50;

  validateParams(params: SimulationParams): SimulationError[] {
    const errors: SimulationError[] = [];
    const constraints = PARAM_CONSTRAINTS;

    type ParamKey = keyof typeof PARAM_CONSTRAINTS;

    for (const key of Object.keys(constraints) as ParamKey[]) {
      const value = params[key as keyof SimulationParams] as number;
      const constraint = constraints[key];
      const error = this.checkParamRange(key, value, constraint);
      if (error) errors.push(error);
    }

    if (params.blackHoleMass > 0 && params.rayImpactParameter < 2 * params.blackHoleMass * 1.5) {
      errors.push({
        id: this.generateId(),
        type: 'parameter',
        severity: 'warning',
        message: '碰撞参数接近光子球，部分光线可能直接被吞噬',
        timestamp: Date.now(),
        recoverable: true,
      });
    }

    return errors;
  }

  private checkParamRange(
    paramName: string,
    value: number,
    constraint: { min: number; max: number; warning: number; critical: number }
  ): SimulationError | null {
    if (value < constraint.min || value > constraint.max) {
      return {
        id: this.generateId(),
        type: 'parameter',
        severity: 'critical',
        message: `${this.getParamDisplayName(paramName)} ${value} 超出允许范围 [${constraint.min}, ${constraint.max}]`,
        timestamp: Date.now(),
        recoverable: false,
        details: { paramName, value, min: constraint.min, max: constraint.max },
      };
    }

    if (value > constraint.critical) {
      return {
        id: this.generateId(),
        type: 'parameter',
        severity: 'critical',
        message: `${this.getParamDisplayName(paramName)} ${value} 超过临界值，可能导致系统不稳定`,
        timestamp: Date.now(),
        recoverable: false,
      };
    }

    if (value > constraint.warning) {
      return {
        id: this.generateId(),
        type: 'parameter',
        severity: 'warning',
        message: `${this.getParamDisplayName(paramName)} ${value} 较高，建议降低以获得更好性能`,
        timestamp: Date.now(),
        recoverable: true,
      };
    }

    return null;
  }

  private getParamDisplayName(paramName: string): string {
    const names: Record<string, string> = {
      blackHoleMass: '黑洞质量',
      rayCount: '光线数量',
      integrationSteps: '积分步数',
      stepSize: '步长',
      rayAngleRange: '光线角度范围',
      rayImpactParameter: '碰撞参数',
      observationAngle: '观察角度',
    };
    return names[paramName] || paramName;
  }

  handleIntegrationError(error: Error | string): SimulationError {
    const message = error instanceof Error ? error.message : error;
    return {
      id: this.generateId(),
      type: 'integration',
      severity: 'error',
      message: `积分错误: ${message}`,
      timestamp: Date.now(),
      recoverable: true,
    };
  }

  checkRayResult(result: IntegrationResult): SimulationError | null {
    if (result.status === 'error') {
      return {
        id: this.generateId(),
        type: 'integration',
        severity: 'error',
        message: `光线${result.id}积分失败: ${result.errorMessage || '未知错误'}`,
        timestamp: Date.now(),
        recoverable: false,
      };
    }

    if (result.discontinuities > 0) {
      return {
        id: this.generateId(),
        type: 'integration',
        severity: 'warning',
        message: `光线${result.id}检测到${result.discontinuities}处轨迹不连续`,
        timestamp: Date.now(),
        recoverable: true,
        details: { rayId: result.id, discontinuities: result.discontinuities },
      };
    }

    return null;
  }

  checkPerformance(fps: number): SimulationError | null {
    if (fps < 15) {
      return {
        id: this.generateId(),
        type: 'performance',
        severity: 'critical',
        message: `帧率过低 (${fps.toFixed(1)} FPS)，请减少光线数量或积分步数`,
        timestamp: Date.now(),
        recoverable: true,
      };
    }

    if (fps < 30) {
      return {
        id: this.generateId(),
        type: 'performance',
        severity: 'warning',
        message: `帧率下降 (${fps.toFixed(1)} FPS)`,
        timestamp: Date.now(),
        recoverable: true,
      };
    }

    return null;
  }

  checkRenderError(error: Error): SimulationError {
    return {
      id: this.generateId(),
      type: 'render',
      severity: 'error',
      message: `渲染错误: ${error.message}`,
      timestamp: Date.now(),
      recoverable: false,
    };
  }

  addError(error: SimulationError): void {
    this.errors.unshift(error);
    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }
  }

  getErrors(): SimulationError[] {
    return [...this.errors];
  }

  getErrorsByType(type: ErrorType): SimulationError[] {
    return this.errors.filter((e) => e.type === type);
  }

  getErrorsBySeverity(severity: ErrorSeverity): SimulationError[] {
    return this.errors.filter((e) => e.severity === severity);
  }

  clearErrors(): void {
    this.errors = [];
  }

  hasCriticalErrors(): boolean {
    return this.errors.some((e) => e.severity === 'critical' && !e.recoverable);
  }

  dismissError(id: string): void {
    this.errors = this.errors.filter((e) => e.id !== id);
  }

  private generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const errorHandler = new ErrorHandler();
