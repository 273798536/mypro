import html2canvas from 'html2canvas';
import { StorageSlot, WarehouseReceipt, OperationHistory } from '@/types';
import { WAREHOUSES } from '@/data/warehouseConfig';

export async function exportScreenshot(elementId: string, filename?: string): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Element not found');
  }

  const canvas = await html2canvas(element, {
    backgroundColor: '#0F172A',
    scale: 2,
    useCORS: true,
  });

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = filename || `sandbox-screenshot-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();

  return dataUrl;
}

export function exportReceiptsCSV(
  receipts: WarehouseReceipt[],
  slots: StorageSlot[],
  filename?: string
): void {
  const headers = [
    '仓单编号',
    '批次号',
    '商品品种',
    '数量',
    '库位编号',
    '仓库名称',
    '质检状态',
    '交割日期',
    '数据来源',
    '创建时间',
    '更新时间',
  ];

  const rows = receipts.map((r) => {
    const slot = slots.find((s) => s.id === r.slotId);
    const warehouse = WAREHOUSES.find((w) => w.id === slot?.warehouseId);
    return [
      r.id,
      r.batchNumber,
      r.commodity,
      r.quantity,
      r.slotId,
      warehouse?.name || '-',
      r.qualityStatus === 'pass' ? '合格' : r.qualityStatus === 'fail' ? '不合格' : '待检',
      r.deliveryDate,
      r.dataSource,
      r.createdAt,
      r.updatedAt,
    ];
  });

  const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.download = filename || `receipts-export-${Date.now()}.csv`;
  link.href = URL.createObjectURL(blob);
  link.click();
}

export function exportHistoryCSV(history: OperationHistory[], filename?: string): void {
  const headers = [
    '记录编号',
    '操作类型',
    '操作人',
    '操作时间',
    '描述',
    '数据来源',
    '修改前数据',
    '修改后数据',
  ];

  const typeLabels: Record<string, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    export: '导出',
    import: '导入',
  };

  const rows = history.map((h) => [
    h.id,
    typeLabels[h.operationType] || h.operationType,
    h.operator,
    new Date(h.timestamp).toLocaleString('zh-CN'),
    h.description,
    h.dataSource || '-',
    h.beforeData || '-',
    h.afterData || '-',
  ]);

  const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.download = filename || `history-export-${Date.now()}.csv`;
  link.href = URL.createObjectURL(blob);
  link.click();
}

export function generateSandboxReport(
  receipts: WarehouseReceipt[],
  slots: StorageSlot[],
  alerts: { type: string; severity: string; message: string }[]
): string {
  const totalSlots = slots.length;
  const usedSlots = slots.filter((s) => s.receipts.length > 0).length;
  const totalReceipts = receipts.length;
  const totalQuantity = receipts.reduce((sum, r) => sum + r.quantity, 0);
  const overloadSlots = slots.filter((s) => s.status === 'overload').length;
  const qualityFailCount = receipts.filter((r) => r.qualityStatus === 'fail').length;

  const report = [
    '=== 期货仓单库容沙盘报告 ===',
    '',
    `生成时间：${new Date().toLocaleString('zh-CN')}`,
    `数据版本：v1.0.0-${Date.now()}`,
    '',
    '--- 库容统计 ---',
    `总库位数：${totalSlots}`,
    `已用库位：${usedSlots}`,
    `利用率：${((usedSlots / totalSlots) * 100).toFixed(1)}%`,
    '',
    '--- 仓单统计 ---',
    `仓单总数：${totalReceipts}`,
    `总数量：${totalQuantity}`,
    '',
    '--- 异常统计 ---',
    `库容超限库位：${overloadSlots}`,
    `质检未过仓单：${qualityFailCount}`,
    `预警总数：${alerts.length}`,
    '',
    '--- 预警详情 ---',
    ...alerts.map((a) => `[${a.severity === 'error' ? '错误' : '警告'}] ${a.message}`),
  ].join('\n');

  return report;
}

export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
}
