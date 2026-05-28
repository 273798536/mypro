import type { RefundOrder, ReservePool, Batch, AnomalyInfo } from '@/types';
import { formatCurrency } from './formatters';

export function generateOverdraftPrompt(refund: RefundOrder, pool: ReservePool): string {
  const shortage = refund.amount - pool.availableBalance;
  return `【备付金透支提示】
商户：${refund.merchantOriginalName}
退款金额：${formatCurrency(refund.amount)}
备付金可用余额：${formatCurrency(pool.availableBalance)}
缺口：${formatCurrency(shortage)}
建议话术："您好，由于近期促销退款集中，您的备付金账户余额暂时不足以覆盖该笔退款。请补充 ${formatCurrency(shortage)} 后，我们将立即为您处理。"`;
}

export function generateCrossBatchPrompt(refund: RefundOrder, batches: Batch[]): string {
  const currentBatch = batches.find(b => b.id === refund.batchId);
  return `【跨批次冻结提示】
该退款单关联活动「${currentBatch?.activityName}」跨批次冻结
当前批次：${currentBatch?.originalName}
冻结原因：该订单同时参与多个批次活动，需等待所有批次结算完成
建议话术："您好，您的退款订单涉及多期活动，我们需要完成跨批次对账后才能处理，请您耐心等待1-3个工作日。"`;
}

export function generateDuplicatePrompt(refund: RefundOrder, duplicateOrder: RefundOrder | undefined): string {
  return `【重复退款告警】
当前退款单：${refund.id}
关联重复单：${duplicateOrder?.id || '未知'}
原始订单：${refund.originalOrderNo}
重复金额：${formatCurrency(refund.amount)}
检测依据：同一原始订单号 ${refund.originalOrderNo} 下存在多笔退款申请
强制要求：必须填写重复退款解释后方可继续处理`;
}

export function recalculateFrozenAmount(
  batchId: string,
  batches: Batch[],
  refundOrders: RefundOrder[],
  reservePools: ReservePool[]
): void {
  const batch = batches.find(b => b.id === batchId);
  if (!batch) return;

  const batchRefunds = refundOrders.filter(r => r.batchId === batchId);
  
  let shouldFrozen = 0;
  
  for (const refund of batchRefunds) {
    if (refund.status !== 'processed' && refund.status !== 'rejected') {
      shouldFrozen += refund.amount;
    }
  }

  const crossBatchRefunds = batchRefunds.filter(r => r.isCrossBatch);
  for (const refund of crossBatchRefunds) {
    shouldFrozen += refund.amount * 0.5;
  }

  const duplicateRefunds = batchRefunds.filter(r => r.isDuplicate);
  for (const refund of duplicateRefunds) {
    shouldFrozen += refund.amount;
  }

  batch.totalFrozenAmount = shouldFrozen;
  
  const pool = reservePools.find(p => p.merchantId === batch.merchantId);
  if (pool) {
    pool.frozenAmount = shouldFrozen;
    pool.availableBalance = pool.totalBalance - pool.frozenAmount;
    pool.lastUpdated = new Date().toISOString();
  }

  recheckRefundInterceptors(batchId, batches, refundOrders, reservePools);
}

export function recheckRefundInterceptors(
  batchId: string,
  batches: Batch[],
  refundOrders: RefundOrder[],
  reservePools: ReservePool[]
): void {
  const batch = batches.find(b => b.id === batchId);
  if (!batch) return;

  const pool = reservePools.find(p => p.merchantId === batch.merchantId);
  if (!pool) return;

  const batchRefunds = refundOrders.filter(r => r.batchId === batchId);
  
  for (const refund of batchRefunds) {
    refund.isOverdraft = pool.availableBalance < refund.amount;
    
    if (refund.isOverdraft) {
      refund.overdraftNote = generateOverdraftPrompt(refund, pool);
    } else {
      refund.overdraftNote = undefined;
    }
    
    const duplicates = batchRefunds.filter(
      r => r.originalOrderNo === refund.originalOrderNo && r.id !== refund.id
    );
    refund.isDuplicate = duplicates.length > 0;
    if (refund.isDuplicate) {
      refund.duplicateRefundId = duplicates[0].id;
    } else {
      refund.duplicateRefundId = undefined;
    }
  }
}

export function getRefundAnomalies(
  refund: RefundOrder,
  reservePools: ReservePool[],
  batches: Batch[],
  refundOrders: RefundOrder[]
): AnomalyInfo[] {
  const anomalies: AnomalyInfo[] = [];

  if (refund.isOverdraft && refund.overdraftNote) {
    anomalies.push({
      type: 'overdraft',
      severity: 'danger',
      message: '备付金余额不足，该退款将导致透支',
      prompt: refund.overdraftNote,
    });
  }

  if (refund.isDuplicate) {
    const duplicateOrder = refundOrders.find(r => r.id === refund.duplicateRefundId);
    anomalies.push({
      type: 'duplicate',
      severity: 'danger',
      message: `检测到重复退款，关联单号：${refund.duplicateRefundId}`,
      prompt: generateDuplicatePrompt(refund, duplicateOrder),
    });
  }

  if (refund.isCrossBatch) {
    anomalies.push({
      type: 'cross_batch',
      severity: 'warning',
      message: refund.crossBatchFreezeNote || '跨批次冻结中，需等待多批次对账',
      prompt: generateCrossBatchPrompt(refund, batches),
    });
  }

  return anomalies;
}

export function recalculateAllPools(
  batches: Batch[],
  refundOrders: RefundOrder[],
  reservePools: ReservePool[]
): void {
  for (const batch of batches) {
    recalculateFrozenAmount(batch.id, batches, refundOrders, reservePools);
  }
}
