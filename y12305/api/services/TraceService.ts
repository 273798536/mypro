import type { TraceNode, CalculationVersion, TariffTable, UsageRecord } from '../../shared/types.js';
import { VersionStorage } from './FileStorage.js';
import { TariffService } from './TariffService.js';
import { UsageRecordService } from './UsageRecordService.js';
import { ReverseCalculationEngine } from './ReverseCalculationEngine.js';

export class TraceService {
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

  getTraceTree(versionId: string): TraceNode | { error: string } {
    const version = this.storage.getVersion(versionId) as CalculationVersion | undefined;

    if (!version) {
      return { error: `未找到版本: ${versionId}` };
    }

    const tariff = this.tariffService.getById(version.tariffTableId);
    const usageRecord = this.usageRecordService.getById(version.usageRecordId);

    if (!tariff || !usageRecord) {
      return { error: '关联的电价表或用电记录不存在' };
    }

    return this.calculationEngine.generateTraceTree(
      tariff,
      usageRecord,
      version.tierResults,
      version.warnings
    );
  }

  getVersionWithSources(versionId: string): {
    version: CalculationVersion;
    tariff: TariffTable;
    usageRecord: UsageRecord;
  } | { error: string } {
    const version = this.storage.getVersion(versionId) as CalculationVersion | undefined;

    if (!version) {
      return { error: `未找到版本: ${versionId}` };
    }

    const tariff = this.tariffService.getById(version.tariffTableId);
    const usageRecord = this.usageRecordService.getById(version.usageRecordId);

    if (!tariff) {
      return { error: `未找到关联电价表: ${version.tariffTableId}` };
    }

    if (!usageRecord) {
      return { error: `未找到关联用电记录: ${version.usageRecordId}` };
    }

    return {
      version,
      tariff,
      usageRecord,
    };
  }

  findTraceNode(root: TraceNode, nodeId: string): TraceNode | null {
    if (root.id === nodeId) {
      return root;
    }

    for (const child of root.children) {
      const found = this.findTraceNode(child, nodeId);
      if (found) {
        return found;
      }
    }

    return null;
  }

  getTracePath(root: TraceNode, nodeId: string): TraceNode[] | null {
    const path: TraceNode[] = [];

    const dfs = (node: TraceNode): boolean => {
      path.push(node);

      if (node.id === nodeId) {
        return true;
      }

      for (const child of node.children) {
        if (dfs(child)) {
          return true;
        }
      }

      path.pop();
      return false;
    };

    if (dfs(root)) {
      return path;
    }

    return null;
  }

  getWarningsByVersion(versionId: string) {
    const version = this.storage.getVersion(versionId) as CalculationVersion | undefined;
    if (!version) {
      return { error: `未找到版本: ${versionId}` };
    }
    return {
      warnings: version.warnings,
      tariffTableId: version.tariffTableId,
      usageRecordId: version.usageRecordId,
    };
  }

  getSourceDataForWarning(versionId: string, traceId: string) {
    const result = this.getVersionWithSources(versionId);
    if ('error' in result) {
      return result;
    }

    const { version, tariff, usageRecord } = result;

    const warning = version.warnings.find(w => w.traceId === traceId);
    if (!warning) {
      return { error: `未找到警告: ${traceId}` };
    }

    let sourceData: unknown = null;

    if (warning.sourceField.startsWith('tariff.')) {
      const field = warning.sourceField.replace('tariff.', '');
      sourceData = {
        type: 'tariff',
        tariffId: tariff.id,
        tariffName: tariff.name,
        field,
        value: (tariff as unknown as Record<string, unknown>)[field],
        effectiveFrom: tariff.effectiveFrom,
        effectiveTo: tariff.effectiveTo,
      };
    } else {
      const field = warning.sourceField as keyof UsageRecord;
      sourceData = {
        type: 'usage',
        recordId: usageRecord.id,
        recordDate: usageRecord.recordDate,
        sourceFile: usageRecord.sourceFile,
        field: warning.sourceField,
        value: usageRecord[field],
        customerNote: usageRecord.customerNote,
      };
    }

    return {
      warning,
      sourceData,
      versionInfo: {
        id: version.id,
        name: version.name,
        createdAt: version.createdAt,
      },
    };
  }
}
