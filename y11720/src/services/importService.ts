import Papa from 'papaparse';
import type { CalculationParams, ImportResult, ConflictStrategy, ValveItem } from '../types';
import { getFluidById } from '../data/fluids';

export class ImportService {
  static async parseCSV(file: File): Promise<ImportResult> {
    return new Promise((resolve) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const data: CalculationParams[] = [];

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as Record<string, any>[];
          
          rows.forEach((row, index) => {
            try {
              const params = this.parseRow(row, index + 2);
              data.push(params);
            } catch (e) {
              errors.push(`第 ${index + 2} 行: ${(e as Error).message}`);
            }
          });

          if (results.errors.length > 0) {
            warnings.push(...results.errors.map((e) => e.message));
          }

          resolve({
            success: errors.length === 0,
            data,
            errors,
            warnings,
          });
        },
        error: (error) => {
          resolve({
            success: false,
            data: [],
            errors: [error.message],
            warnings: [],
          });
        },
      });
    });
  }

  private static parseRow(row: Record<string, any>, lineNum: number): CalculationParams {
    const requiredFields = ['diameter', 'flowRate', 'pipeLength', 'roughness'];
    for (const field of requiredFields) {
      if (row[field] === undefined || row[field] === '') {
        throw new Error(`缺少必填字段: ${field}`);
      }
    }

    const fluidId = row.fluidId || 'water-20';
    const fluid = getFluidById(fluidId);
    if (!fluid) {
      throw new Error(`未知的流体ID: ${fluidId}`);
    }

    const valves: ValveItem[] = [];
    if (row.valves) {
      try {
        const valveData = JSON.parse(row.valves);
        if (Array.isArray(valveData)) {
          valveData.forEach((v: any, i: number) => {
            if (!v.type || v.count === undefined || !v.kValue) {
              throw new Error(`阀门配置第 ${i + 1} 项格式错误`);
            }
            valves.push({
              id: crypto.randomUUID(),
              type: v.type,
              count: Number(v.count),
              diameter: Number(v.diameter) || Number(row.diameter),
              kValue: Number(v.kValue),
            });
          });
        }
      } catch {
        throw new Error('阀门配置JSON格式错误');
      }
    }

    return {
      id: row.id || crypto.randomUUID(),
      name: row.name || `导入方案 ${lineNum}`,
      diameter: Number(row.diameter),
      diameterUnit: (row.diameterUnit as any) || 'mm',
      flowRate: Number(row.flowRate),
      flowRateUnit: (row.flowRateUnit as any) || 'm3_h',
      pipeLength: Number(row.pipeLength),
      pipeLengthUnit: (row.pipeLengthUnit as any) || 'm',
      roughness: Number(row.roughness),
      roughnessUnit: (row.roughnessUnit as any) || 'mm',
      fluid: fluid,
      valves,
      source: row.source || 'CSV导入',
      createdAt: row.createdAt ? Number(row.createdAt) : Date.now(),
      updatedAt: Date.now(),
      version: Number(row.version) || 1,
      editHistory: [],
    };
  }

  static resolveConflicts(
    existing: CalculationParams[],
    imported: CalculationParams[],
    strategy: ConflictStrategy
  ): CalculationParams[] {
    const existingMap = new Map(existing.map((c) => [c.id, c]));

    switch (strategy) {
      case 'skip': {
        const newItems = imported.filter((c) => !existingMap.has(c.id));
        return [...existing, ...newItems];
      }
      case 'overwrite': {
        const result = [...existing];
        imported.forEach((c) => {
          const index = result.findIndex((e) => e.id === c.id);
          if (index >= 0) {
            result[index] = {
              ...c,
              version: result[index].version + 1,
              updatedAt: Date.now(),
            };
          } else {
            result.push(c);
          }
        });
        return result;
      }
      case 'append': {
        const renamedImported = imported.map((c) => {
          if (existingMap.has(c.id)) {
            return {
              ...c,
              id: crypto.randomUUID(),
              name: `${c.name} (导入)`,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
          }
          return c;
        });
        return [...existing, ...renamedImported];
      }
      default:
        return existing;
    }
  }

  static getConflictCount(existing: CalculationParams[], imported: CalculationParams[]): number {
    const existingIds = new Set(existing.map((c) => c.id));
    return imported.filter((c) => existingIds.has(c.id)).length;
  }

  static generateCSVTemplate(): string {
    const headers = [
      'id',
      'name',
      'diameter',
      'diameterUnit',
      'flowRate',
      'flowRateUnit',
      'pipeLength',
      'pipeLengthUnit',
      'roughness',
      'roughnessUnit',
      'fluidId',
      'valves',
      'source',
    ];

    const example = [
      '',
      '示例方案1',
      '100',
      'mm',
      '50',
      'm3_h',
      '100',
      'm',
      '0.15',
      'mm',
      'water-20',
      '[{"type":"闸阀","count":2,"kValue":0.17},{"type":"90°弯头","count":4,"kValue":0.75}]',
      'CSV导入示例',
    ];

    return `${headers.join(',')}\n${example.join(',')}`;
  }

  static downloadTemplate(): void {
    const template = this.generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '压降计算导入模板.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
