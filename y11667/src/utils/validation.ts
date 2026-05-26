import { Alert, StorageSlot, WarehouseReceipt } from '@/types';

export function detectDuplicateReceipts(receipts: WarehouseReceipt[]): Alert[] {
  const alerts: Alert[] = [];
  const batchMap = new Map<string, WarehouseReceipt[]>();

  receipts.forEach((r) => {
    const existing = batchMap.get(r.batchNumber) || [];
    batchMap.set(r.batchNumber, [...existing, r]);
  });

  batchMap.forEach((batchReceipts, batchNumber) => {
    if (batchReceipts.length > 1) {
      alerts.push({
        id: `dup-${batchNumber}`,
        type: 'duplicate',
        severity: 'error',
        message: `批次【${batchNumber}】存在 ${batchReceipts.length} 条重复仓单，请核实`,
        batchNumber,
        receiptId: batchReceipts[0].id,
      });
    }
  });

  return alerts;
}

export function detectOverload(slots: StorageSlot[]): Alert[] {
  return slots
    .filter((s) => s.usedCapacity > s.maxCapacity)
    .map((s) => ({
      id: `overload-${s.id}`,
      type: 'overload',
      severity: 'error',
      message: `库位【${s.id}】库容超限：已用 ${s.usedCapacity} / 上限 ${s.maxCapacity}`,
      slotId: s.id,
    }));
}

export function detectQualityFail(receipts: WarehouseReceipt[]): Alert[] {
  return receipts
    .filter((r) => r.qualityStatus === 'fail')
    .map((r) => ({
      id: `qf-${r.id}`,
      type: 'quality_fail',
      severity: 'warning',
      message: `仓单【${r.id}】质检未通过，批次：${r.batchNumber}`,
      receiptId: r.id,
      batchNumber: r.batchNumber,
    }));
}

export function detectDeliverySoon(receipts: WarehouseReceipt[]): Alert[] {
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  return receipts
    .filter((r) => {
      const deliveryTime = new Date(r.deliveryDate).getTime();
      const diff = deliveryTime - now;
      return diff > 0 && diff < sevenDays;
    })
    .map((r) => {
      const daysLeft = Math.ceil((new Date(r.deliveryDate).getTime() - now) / (24 * 60 * 60 * 1000));
      return {
        id: `ds-${r.id}`,
        type: 'delivery_soon',
        severity: 'warning',
        message: `仓单【${r.id}】将在 ${daysLeft} 天后交割（${r.deliveryDate}）`,
        receiptId: r.id,
        batchNumber: r.batchNumber,
      };
    });
}

export function generateAllAlerts(slots: StorageSlot[], receipts: WarehouseReceipt[]): Alert[] {
  return [
    ...detectDuplicateReceipts(receipts),
    ...detectOverload(slots),
    ...detectQualityFail(receipts),
    ...detectDeliverySoon(receipts),
  ];
}

export function filterSlots(
  slots: StorageSlot[],
  filters: {
    warehouses: string[];
    qualityStatus: ('pass' | 'fail' | 'pending')[];
    batchNumbers: string[];
    deliveryDateRange: { start: string; end: string } | null;
  }
): StorageSlot[] {
  return slots.filter((slot) => {
    if (filters.warehouses.length > 0 && !filters.warehouses.includes(slot.warehouseId)) {
      return false;
    }

    if (slot.receipts.length === 0) {
      return filters.warehouses.length === 0;
    }

    const hasMatchingReceipt = slot.receipts.some((receipt) => {
      if (filters.qualityStatus.length > 0 && !filters.qualityStatus.includes(receipt.qualityStatus)) {
        return false;
      }

      if (filters.batchNumbers.length > 0 && !filters.batchNumbers.includes(receipt.batchNumber)) {
        return false;
      }

      if (filters.deliveryDateRange) {
        const deliveryDate = new Date(receipt.deliveryDate).getTime();
        const start = new Date(filters.deliveryDateRange.start).getTime();
        const end = new Date(filters.deliveryDateRange.end).getTime();
        if (deliveryDate < start || deliveryDate > end) {
          return false;
        }
      }

      return true;
    });

    return hasMatchingReceipt;
  });
}
