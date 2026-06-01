import type { CalculationVersion, VersionComparison } from '../../shared/types.js';
import { VersionStorage } from './FileStorage.js';
import { TariffService } from './TariffService.js';
import { UsageRecordService } from './UsageRecordService.js';
import { ReverseCalculationEngine } from './ReverseCalculationEngine.js';
import type { CalculateRequest } from '../../shared/types.js';

function generateId(): string {
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export class VersionService {
  private storage: VersionStorage;
  private tariffService: TariffService;
  private usageRecordService: UsageRecordService;
  private calculationEngine: ReverseCalculationEngine;

  constructor() {
    this.storage = new VersionStorage();
    this.tariffService = new TariffService();
    this.usageRecordService = new UsageRecordService();
    this.calculationEngine = new ReverseCalculationEngine();
  }

  getAll(): CalculationVersion[] {
    return this.storage.listVersions() as CalculationVersion[];
  }

  getById(id: string): CalculationVersion | undefined {
    return this.storage.getVersion(id) as CalculationVersion | undefined;
  }

  create(request: CalculateRequest): CalculationVersion | { error: string } {
    const tariff = this.tariffService.getById(request.tariffTableId);
    const usageRecord = this.usageRecordService.getById(request.usageRecordId);

    if (!tariff) {
      return { error: `未找到电价表: ${request.tariffTableId}` };
    }

    if (!usageRecord) {
      return { error: `未找到用电记录: ${request.usageRecordId}` };
    }

    const result = this.calculationEngine.calculate(tariff, usageRecord);

    const version: CalculationVersion = {
      id: generateId(),
      name: request.versionName || `核算版本 ${new Date().toLocaleDateString('zh-CN')}`,
      tariffTableId: request.tariffTableId,
      usageRecordId: request.usageRecordId,
      totalBill: usageRecord.totalBill,
      calculatedTotal: result.calculatedTotal,
      discrepancy: result.discrepancy,
      totalCalculatedKwh: result.totalCalculatedKwh,
      tierResults: result.tierResults,
      warnings: result.warnings,
      createdAt: new Date().toISOString(),
      createdBy: 'analyst',
      note: request.note || '',
    };

    this.storage.saveVersion(version);
    return version;
  }

  delete(id: string): boolean {
    const filePath = this.getVersionFilePath(id);
    try {
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  compareVersions(idA: string, idB: string): VersionComparison | { error: string } {
    const versionA = this.getById(idA);
    const versionB = this.getById(idB);

    if (!versionA) {
      return { error: `未找到版本: ${idA}` };
    }

    if (!versionB) {
      return { error: `未找到版本: ${idB}` };
    }

    const differences: VersionComparison['differences'] = [];
    const tierDifferences: VersionComparison['tierDifferences'] = [];

    const compareFields: Array<keyof CalculationVersion> = [
      'totalBill',
      'calculatedTotal',
      'discrepancy',
      'totalCalculatedKwh',
      'tariffTableId',
      'usageRecordId',
    ];

    for (const field of compareFields) {
      const valueA = versionA[field];
      const valueB = versionB[field];
      if (valueA !== valueB) {
        differences.push({
          field: field as string,
          valueA,
          valueB,
        });
      }
    }

    const allTierIds = new Set([
      ...versionA.tierResults.map(t => t.tierId),
      ...versionB.tierResults.map(t => t.tierId),
    ]);

    for (const tierId of allTierIds) {
      const tierA = versionA.tierResults.find(t => t.tierId === tierId);
      const tierB = versionB.tierResults.find(t => t.tierId === tierId);

      if (!tierA || !tierB) {
        tierDifferences.push({
          tierId,
          field: 'exists',
          valueA: tierA ? true : false,
          valueB: tierB ? true : false,
        });
        continue;
      }

      const tierCompareFields: Array<keyof typeof tierA> = ['billedKwh', 'billedAmount', 'pricePerKwh'];
      for (const field of tierCompareFields) {
        const valueA = tierA[field];
        const valueB = tierB[field];
        if (Math.abs(Number(valueA) - Number(valueB)) > 0.0001) {
          tierDifferences.push({
            tierId,
            field: field as string,
            valueA,
            valueB,
          });
        }
      }
    }

    return {
      versionA,
      versionB,
      differences,
      tierDifferences,
    };
  }

  getVersionsByTariff(tariffId: string): CalculationVersion[] {
    return this.getAll().filter(v => v.tariffTableId === tariffId);
  }

  getVersionsByUsageRecord(usageId: string): CalculationVersion[] {
    return this.getAll().filter(v => v.usageRecordId === usageId);
  }

  private getVersionFilePath(id: string): string {
    const path = require('path');
    return path.resolve(__dirname, '../../data/versions', `${id}.json`);
  }
}
