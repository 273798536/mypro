import type { UnifiedException, CaliberRecord, SettlementDetail, TempGapException, BatchCrossException } from '../types'

export function buildUnifiedExceptions(
  tempGaps: TempGapException[],
  crossBatches: BatchCrossException[],
  details: SettlementDetail[]
): UnifiedException[] {
  const tempGapUnified: UnifiedException[] = tempGaps.map((tg) => {
    const detail = details.find((d) => d.batchNo === tg.batchNo)
    return {
      id: tg.id,
      type: 'temp_gap' as const,
      batchNo: tg.batchNo,
      productName: detail?.productName ?? '',
      source: 'original' as const,
      sourceLabel: '原始材料',
      sourceType: tg.sourceType,
      sourceId: tg.sourceId,
      description: tg.description,
      occurredAt: tg.occurredAt,
      lossImpact: detail?.tempGapLoss ?? 0,
      settlementDetailId: detail?.id,
    }
  })

  const crossBatchUnified: UnifiedException[] = crossBatches.map((cb) => {
    const detail = details.find((d) => d.batchNo === cb.batchNo)
    return {
      id: cb.id,
      type: 'cross_batch' as const,
      batchNo: cb.batchNo,
      productName: detail?.productName ?? '',
      source: 'supplement' as const,
      sourceLabel: '补录',
      sourceType: cb.sourceType,
      sourceId: cb.sourceId,
      description: cb.description,
      occurredAt: cb.recordedAt,
      lossImpact: detail?.crossBatchLoss ?? 0,
      settlementDetailId: detail?.id,
    }
  })

  return [...tempGapUnified, ...crossBatchUnified]
}

export function buildCaliberRecords(details: SettlementDetail[]): CaliberRecord[] {
  return details.map((d) => {
    const dailyLoss = d.actualLoss
    const reviewLoss = d.standardLoss + d.tempGapLoss + d.crossBatchLoss
    const diff = Math.abs(dailyLoss - reviewLoss)
    return {
      batchNo: d.batchNo,
      productName: d.productName,
      dailyLoss: Math.round(dailyLoss * 100) / 100,
      reviewLoss: Math.round(reviewLoss * 100) / 100,
      isConsistent: diff < 0.01,
      diff: Math.round(diff * 100) / 100,
    }
  })
}
