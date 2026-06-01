import type { CaliberConfig, CaliberCategory, ConflictInfo } from '@/types';

export class CaliberConsistencyEngine {
  private activeCalibers: Map<string, CaliberConfig> = new Map();

  loadActiveCalibers(configs: CaliberConfig[]): void {
    this.activeCalibers.clear();
    configs.forEach(config => {
      this.activeCalibers.set(config.type, config);
    });
  }

  getCaliber(type: CaliberCategory): CaliberConfig | undefined {
    return this.activeCalibers.get(type);
  }

  getAllCalibers(): CaliberConfig[] {
    return Array.from(this.activeCalibers.values());
  }

  calculate(type: CaliberCategory, inputs: Record<string, number>): number {
    const config = this.activeCalibers.get(type);
    if (!config) {
      throw new Error(`口径配置不存在: ${type}`);
    }

    let result: number;
    
    switch (type) {
      case 'voltage':
        result = inputs.voltage ?? 0;
        break;
      case 'current':
        result = inputs.current ?? 0;
        break;
      case 'power':
        result = (inputs.voltage ?? 0) * (inputs.current ?? 0) * (inputs.powerFactor ?? 1) / 1000;
        break;
      case 'temperature':
        const temps = Object.values(inputs).filter(v => typeof v === 'number');
        result = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
        break;
      case 'efficiency':
        const inputPower = inputs.inputPower ?? 0;
        const outputPower = inputs.outputPower ?? 0;
        result = inputPower > 0 ? (outputPower / inputPower) * 100 : 0;
        break;
      default:
        result = 0;
    }

    return Number(result.toFixed(config.precision));
  }

  detectConflict(dataSources: { name: string; data: Record<string, number>; type: CaliberCategory }[]): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    
    for (let i = 0; i < dataSources.length; i++) {
      for (let j = i + 1; j < dataSources.length; j++) {
        const source1 = dataSources[i];
        const source2 = dataSources[j];
        
        if (source1.type !== source2.type) continue;
        
        const val1 = this.calculate(source1.type, source1.data);
        const val2 = this.calculate(source2.type, source2.data);
        const config = this.activeCalibers.get(source1.type);
        const tolerance = Math.pow(10, -(config?.precision ?? 2));
        
        if (Math.abs(val1 - val2) > tolerance) {
          conflicts.push({
            type: source1.type,
            field: source1.type,
            source1: { name: source1.name, value: val1 },
            source2: { name: source2.name, value: val2 },
            description: `口径不一致: ${source1.name}计算值${val1}与${source2.name}计算值${val2}差异超过容差`,
          });
        }
      }
    }
    
    return conflicts;
  }

  markConflict(data: any, conflict: ConflictInfo): void {
    if (!data._conflicts) {
      data._conflicts = [];
    }
    data._conflicts.push(conflict);
    data._hasConflict = true;
  }

  getCaliberDescription(type: CaliberCategory): string {
    const config = this.activeCalibers.get(type);
    if (!config) return '';
    return `${config.name}: ${config.description}，公式: ${config.formula}，单位: ${config.unit}`;
  }

  formatValue(type: CaliberCategory, value: number): string {
    const config = this.activeCalibers.get(type);
    const precision = config?.precision ?? 2;
    const unit = config?.unit ?? '';
    return `${value.toFixed(precision)} ${unit}`;
  }

  canModifyCaliber(type: CaliberCategory): boolean {
    const config = this.activeCalibers.get(type);
    if (!config) return false;
    return !config.isSystemDefault;
  }

  validateCaliberChange(oldConfig: CaliberConfig, newConfig: CaliberConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (oldConfig.isSystemDefault && newConfig.formula !== oldConfig.formula) {
      errors.push('系统默认口径不允许修改公式');
    }
    
    if (newConfig.precision < 0 || newConfig.precision > 10) {
      errors.push('精度必须在0-10之间');
    }
    
    if (!newConfig.name.trim()) {
      errors.push('口径名称不能为空');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const caliberEngine = new CaliberConsistencyEngine();
