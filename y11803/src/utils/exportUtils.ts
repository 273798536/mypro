import type { RefundOrder, HistoryRecord } from '@/types';
import { formatDateTime, formatCurrency, getStatusLabel, getActionLabel } from './formatters';

export function exportToCSV(
  data: any[],
  filename: string,
  fieldMapping: Record<string, string>
): void {
  const headers = Object.values(fieldMapping);
  const keys = Object.keys(fieldMapping);

  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      keys.map(key => {
        const value = row[key];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getRefundExportMapping(): Record<string, string> {
  return {
    id: '退款单号',
    merchantOriginalName: '商户原始名称',
    amount: '退款金额',
    status: '状态',
    batchId: '批次号',
    sourceSystem: '来源系统',
    originalOrderNo: '原始订单号',
    customerName: '客户名称',
    customerPhone: '客户电话',
    refundReason: '退款原因',
    applyTime: '申请时间',
    isDuplicate: '是否重复退款',
    isOverdraft: '是否透支',
    isCrossBatch: '是否跨批次',
    duplicateExplanation: '重复退款解释',
    crossBatchFreezeNote: '跨批次冻结备注',
    overdraftNote: '透支备注',
  };
}

export function getHistoryExportMapping(): Record<string, string> {
  return {
    id: '记录ID',
    refundOrderId: '退款单号',
    operatorOriginalName: '操作人原始名称',
    action: '操作类型',
    reason: '变更原因',
    timestamp: '操作时间',
    ip: '操作IP',
  };
}

export function formatRefundForExport(refunds: RefundOrder[]): any[] {
  return refunds.map(r => ({
    ...r,
    amount: formatCurrency(r.amount),
    status: getStatusLabel(r.status),
    applyTime: formatDateTime(r.applyTime),
    isDuplicate: r.isDuplicate ? '是' : '否',
    isOverdraft: r.isOverdraft ? '是' : '否',
    isCrossBatch: r.isCrossBatch ? '是' : '否',
  }));
}

export function formatHistoryForExport(records: HistoryRecord[]): any[] {
  return records.map(r => ({
    ...r,
    action: getActionLabel(r.action),
    timestamp: formatDateTime(r.timestamp),
  }));
}
