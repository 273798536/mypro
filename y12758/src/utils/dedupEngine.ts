import type { ExperimentBatch } from '@/types';
import { computeSourceHash } from './hash';

export function findDuplicateBatch(
  newBatch: Partial<ExperimentBatch>,
  existingBatches: ExperimentBatch[]
): {
  exists: boolean;
  batch?: ExperimentBatch;
  isExact?: boolean;
  isSameBatchId?: boolean;
} {
  if (!newBatch.batchId) {
    return { exists: false };
  }

  const sameBatchId = existingBatches.find(
    (b) => b.batchId === newBatch.batchId
  );

  if (!sameBatchId) {
    return { exists: false };
  }

  const isExact = newBatch.sourceHash
    ? sameBatchId.sourceHash === newBatch.sourceHash
    : false;

  return {
    exists: true,
    batch: sameBatchId,
    isExact,
    isSameBatchId: true,
  };
}

export async function mergeBatchPatch(
  existing: ExperimentBatch,
  patch: Partial<ExperimentBatch>
): Promise<ExperimentBatch> {
  const merged: ExperimentBatch = {
    ...existing,
    batchId: patch.batchId ?? existing.batchId,
    sampleName: patch.sampleName ?? existing.sampleName,
    recordDate: patch.recordDate ?? existing.recordDate,
    reactionConditions: {
      ...existing.reactionConditions,
      ...(patch.reactionConditions || {}),
    },
    impurities: mergeImpurities(existing.impurities, patch.impurities || []),
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
    sourceHash: '',
  };

  const hashData = {
    batchId: merged.batchId,
    sampleName: merged.sampleName,
    recordDate: merged.recordDate,
    reactionConditions: merged.reactionConditions,
    impurities: merged.impurities.map((i) => ({
      name: i.name,
      measuredValue: i.measuredValue,
      limitValue: i.limitValue,
      standard: i.standard,
    })),
  };

  merged.sourceHash = await computeSourceHash(hashData);

  return merged;
}

function mergeImpurities(
  existing: ExperimentBatch['impurities'],
  patch: Partial<ExperimentBatch>['impurities']
): ExperimentBatch['impurities'] {
  if (!patch || patch.length === 0) {
    return existing;
  }

  const result = [...existing];

  for (const patchImp of patch) {
    const existingIndex = result.findIndex(
      (e) =>
        e.name === patchImp.name &&
        e.standard === patchImp.standard
    );

    if (existingIndex >= 0) {
      result[existingIndex] = {
        ...result[existingIndex],
        ...patchImp,
        id: result[existingIndex].id,
      };
    } else {
      result.push({
        id: patchImp.id || `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: patchImp.name,
        measuredValue: patchImp.measuredValue,
        limitValue: patchImp.limitValue,
        standard: patchImp.standard || '',
      });
    }
  }

  return result;
}
