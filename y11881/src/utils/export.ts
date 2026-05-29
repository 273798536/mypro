import * as XLSX from 'xlsx';
import { Transaction, Denomination, Inventory, Shift } from '../types';

export function exportToCSV(
  transactions: Transaction[],
  denominations: Denomination[],
  inventory: Inventory[],
  shifts: Shift[],
  includeTrace: boolean = false
): string {
  const denomMap: Record<string, Denomination> = {};
  denominations.forEach((d) => {
    denomMap[d.id] = d;
  });

  const shiftMap: Record<string, Shift> = {};
  shifts.forEach((s) => {
    shiftMap[s.id] = s;
  });

  const headers = [
    '交易ID',
    '班次',
    '操作人员',
    '交易时间',
    '应收金额',
    '实收金额',
    '找零金额',
    '状态',
    '找零明细',
  ];

  if (includeTrace) {
    headers.push('算法', '库存快照');
  }

  const rows = transactions.map((tx) => {
    const shift = shiftMap[tx.shiftId];
    const details = tx.changeDetails
      .map((d) => {
        const denom = denomMap[d.denominationId];
        return `${denom?.name || d.denominationId} x${d.quantity}`;
      })
      .join('; ');

    const row: string[] = [
      tx.id,
      shift?.name || tx.shiftId,
      tx.operator,
      tx.timestamp.toLocaleString('zh-CN'),
      tx.receivableAmount.toFixed(2),
      tx.receivedAmount.toFixed(2),
      tx.changeAmount.toFixed(2),
      tx.status === 'success' ? '成功' : tx.status === 'warning' ? '警告' : '失败',
      details,
    ];

    if (includeTrace) {
      row.push(tx.sourceTrace.algorithm);
      JSON.stringify(tx.sourceTrace.inventorySnapshot);
    }

    return row;
  });

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  return '\uFEFF' + csvContent;
}

export function exportToExcel(
  transactions: Transaction[],
  denominations: Denomination[],
  inventory: Inventory[],
  shifts: Shift[],
  includeTrace: boolean = false
): Blob {
  const denomMap: Record<string, Denomination> = {};
  denominations.forEach((d) => {
    denomMap[d.id] = d;
  });

  const shiftMap: Record<string, Shift> = {};
  shifts.forEach((s) => {
    shiftMap[s.id] = s;
  });

  const txData = transactions.map((tx) => {
    const shift = shiftMap[tx.shiftId];
    const details = tx.changeDetails
      .map((d) => {
        const denom = denomMap[d.denominationId];
        return `${denom?.name || d.denominationId} x${d.quantity}`;
      })
      .join('; ');

    const row: Record<string, string | number> = {
      交易ID: tx.id,
      班次: shift?.name || tx.shiftId,
      操作人员: tx.operator,
      交易时间: tx.timestamp.toLocaleString('zh-CN'),
      应收金额: tx.receivableAmount,
      实收金额: tx.receivedAmount,
      找零金额: tx.changeAmount,
      状态: tx.status === 'success' ? '成功' : tx.status === 'warning' ? '警告' : '失败',
      找零明细: details,
    };

    if (includeTrace) {
      row['算法'] = tx.sourceTrace.algorithm;
      row['库存快照'] = JSON.stringify(tx.sourceTrace.inventorySnapshot);
    }

    return row;
  });

  const inventoryData = inventory.map((inv) => {
    const denom = denomMap[inv.denominationId];
    return {
      面额: denom?.name || inv.denominationId,
      面值: denom?.value || 0,
      当前库存: inv.quantity,
      预警阈值: denom?.warningThreshold || 0,
      临界阈值: denom?.criticalThreshold || 0,
      最后更新: inv.lastUpdated.toLocaleString('zh-CN'),
    };
  });

  const shiftData = shifts.map((s) => ({
    班次名称: s.name,
    操作人员: s.operator,
    开始时间: s.startTime.toLocaleString('zh-CN'),
    结束时间: s.endTime?.toLocaleString('zh-CN') || '进行中',
    状态: s.status === 'active' ? '进行中' : s.status === 'completed' ? '已完成' : '待开始',
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txData), '交易记录');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventoryData), '库存状态');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(shiftData), '班次记录');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateSummaryReport(
  transactions: Transaction[],
  denominations: Denomination[],
  inventory: Inventory[]
): {
  totalTransactions: number;
  totalChangeAmount: number;
  successRate: number;
  warningCount: number;
  failedCount: number;
  topUsedDenominations: { name: string; count: number }[];
} {
  const denomMap: Record<string, Denomination> = {};
  denominations.forEach((d) => {
    denomMap[d.id] = d;
  });

  const usageCount: Record<string, number> = {};
  let totalChangeAmount = 0;
  let warningCount = 0;
  let failedCount = 0;

  for (const tx of transactions) {
    totalChangeAmount += tx.changeAmount;
    if (tx.status === 'warning') warningCount++;
    if (tx.status === 'failed') failedCount++;

    for (const detail of tx.changeDetails) {
      usageCount[detail.denominationId] = (usageCount[detail.denominationId] || 0) + detail.quantity;
    }
  }

  const topUsed = Object.entries(usageCount)
    .map(([id, count]) => ({
      name: denomMap[id]?.name || id,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalTransactions: transactions.length,
    totalChangeAmount,
    successRate: transactions.length > 0
      ? ((transactions.length - warningCount - failedCount) / transactions.length) * 100
      : 100,
    warningCount,
    failedCount,
    topUsedDenominations: topUsed,
  };
}
