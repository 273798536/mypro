import type { BatchInfo } from '../../shared/types';
import { dataStore } from '../repositories/store';
import { buildBatchTimeline } from './trace.service';

export function getAllBatches(): BatchInfo[] {
  return dataStore.getBatches().map((b) => enrichBatch(b));
}

export function getBatchDetail(batchNo: string): BatchInfo | undefined {
  const batch = dataStore.getBatchByNo(batchNo);
  if (!batch) return undefined;
  return enrichBatch(batch);
}

function enrichBatch(batch: BatchInfo): BatchInfo {
  const reagents = dataStore
    .getReagents()
    .filter((r) => r.batchNo === batch.batchNo);
  const calculations = dataStore
    .getCalculations()
    .filter((c) => c.reagentBatchNo === batch.batchNo);

  const timeline = buildBatchTimeline(batch.batchNo);
  const latestActivityAt =
    timeline.length > 0 ? timeline[0].timestamp : batch.latestActivityAt;

  const hasAnomaly = calculations.some(
    (c) => c.status === 'error' || Math.abs(c.deviation) > 30
  );
  const hasAttention =
    !hasAnomaly &&
    calculations.some((c) => c.status === 'pending' || Math.abs(c.deviation) > 10);

  let status: BatchInfo['status'] = 'normal';
  if (hasAnomaly) status = 'anomaly';
  else if (hasAttention) status = 'attention';

  return {
    ...batch,
    reagentCount: reagents.length,
    calculationCount: calculations.length,
    latestActivityAt,
    status,
    timeline,
  };
}
