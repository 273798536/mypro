import type { Batch, HistoryRecord, Material } from '@shared/types';

export class HistoryService {
  buildRecord(params: {
    operator: string;
    oldMaterials: Material[];
    newRemark: string;
    reviseReason: string;
    oldConclusion: string;
    newConclusion: string;
  }): HistoryRecord {
    return {
      id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      operator: params.operator,
      oldMaterials: params.oldMaterials,
      newRemark: params.newRemark,
      reviseReason: params.reviseReason,
      oldConclusion: params.oldConclusion,
      newConclusion: params.newConclusion,
    };
  }

  appendHistory(batch: Batch, record: HistoryRecord): Batch {
    return {
      ...batch,
      status: 'revised',
      conclusion: record.newConclusion,
      conclusionSummary: `已改判 · 经历${batch.history.length + 1}次变更`,
      history: [...batch.history, record],
    };
  }
}

export const historyService = new HistoryService();
