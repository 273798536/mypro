import type { Batch, PaymentStatus } from '@shared/types';
import { PAYMENT_LABEL, STATUS_LABEL } from '@shared/types';

const PAGE_STATUS_TO_CSV: Record<string, string> = {
  pending: '待启动',
  running: '复核中',
  completed: '已完成',
  revised: '已改判',
};

const PAYMENT_STATUS_TO_CSV: Record<PaymentStatus, string> = {
  matched: '已匹配',
  unmatched: '未匹配',
  revised: '已改判',
};

export class ExportService {
  verifyConsistency(batch: Batch): boolean {
    if (PAGE_STATUS_TO_CSV[batch.status] !== STATUS_LABEL[batch.status]) return false;
    for (const p of batch.payments) {
      if (PAYMENT_STATUS_TO_CSV[p.status] !== PAYMENT_LABEL[p.status]) return false;
    }
    return true;
  }

  toCSV(batch: Batch): { filename: string; content: string } {
    const header = [
      '批次号',
      '日期',
      '批次状态',
      '回款行ID',
      '来源行号',
      '影响范围',
      '金额(HKD)',
      '税费(HKD)',
      '回款状态',
      '备注',
    ].join(',');
    const rows = batch.payments.map((p) =>
      [
        batch.batchNo,
        batch.date,
        PAGE_STATUS_TO_CSV[batch.status],
        p.id,
        p.sourceRow,
        `"${p.affectedScope.join(' / ')}"`,
        p.amount.toFixed(2),
        p.tax.toFixed(2),
        PAYMENT_STATUS_TO_CSV[p.status],
        `"${(p.remark || '').replace(/"/g, '""')}"`,
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const base64 = Buffer.from('\uFEFF' + csv, 'utf-8').toString('base64');
    return {
      filename: `${batch.batchNo}-税费复核明细-${batch.date}.csv`,
      content: base64,
    };
  }
}

export const exportService = new ExportService();
