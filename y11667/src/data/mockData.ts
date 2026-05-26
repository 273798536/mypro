import { StorageSlot, WarehouseReceipt, OperationHistory } from '@/types';
import { WAREHOUSES } from './warehouseConfig';

const today = new Date();
const formatDate = (d: Date) => d.toISOString().split('T')[0];

const generateReceipts = (): WarehouseReceipt[] => {
  const receipts: WarehouseReceipt[] = [];
  let receiptId = 1;

  const commodities = ['阴极铜', '铝锭', '锌锭', '铅锭', '镍板', '锡锭'];

  for (let i = 0; i < 45; i++) {
    const whIndex = i < 30 ? 0 : 1;
    const wh = WAREHOUSES[whIndex];
    const level = Math.floor(i / (wh.rows * wh.cols)) % wh.levels;
    const row = Math.floor((i % (wh.rows * wh.cols)) / wh.cols);
    const col = (i % (wh.rows * wh.cols)) % wh.cols;
    const slotId = `${wh.id}-L${level}-R${row}-C${col}`;

    const daysOffset = Math.floor(Math.random() * 60) - 10;
    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + daysOffset);

    let qualityStatus: 'pass' | 'fail' | 'pending' = 'pass';
    if (i === 8 || i === 22 || i === 38) qualityStatus = 'fail';
    if (i === 15 || i === 33) qualityStatus = 'pending';

    const batchNum = i === 5 || i === 18 ? 'BATCH-DUP-001' : `BATCH-${String(receiptId).padStart(5, '0')}`;

    receipts.push({
      id: `R-${String(receiptId).padStart(6, '0')}`,
      slotId,
      batchNumber: batchNum,
      commodity: commodities[i % commodities.length],
      quantity: Math.floor(Math.random() * 80) + 20,
      deliveryDate: formatDate(deliveryDate),
      qualityStatus,
      dataSource: qualityStatus === 'fail' 
        ? '质检机构：上海有色金属检测中心' 
        : '期货公司：国泰君安期货',
      createdAt: formatDate(new Date(today.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000)),
      updatedAt: formatDate(new Date(today.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000)),
    });
    receiptId++;
  }

  return receipts;
};

export const MOCK_RECEIPTS: WarehouseReceipt[] = generateReceipts();

export const generateSlots = (): StorageSlot[] => {
  const slots: StorageSlot[] = [];

  WAREHOUSES.forEach((wh) => {
    for (let level = 0; level < wh.levels; level++) {
      for (let row = 0; row < wh.rows; row++) {
        for (let col = 0; col < wh.cols; col++) {
          const slotId = `${wh.id}-L${level}-R${row}-C${col}`;
          const slotReceipts = MOCK_RECEIPTS.filter((r) => r.slotId === slotId);
          const usedCapacity = slotReceipts.reduce((sum, r) => sum + r.quantity, 0);
          const maxCapacity = 100;

          let status: StorageSlot['status'] = 'normal';

          const hasQualityFail = slotReceipts.some((r) => r.qualityStatus === 'fail');
          const hasDeliverySoon = slotReceipts.some((r) => {
            const diff = new Date(r.deliveryDate).getTime() - today.getTime();
            return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
          });

          if (usedCapacity > maxCapacity) {
            status = 'overload';
          } else if (hasQualityFail) {
            status = 'quality_fail';
          } else if (usedCapacity > maxCapacity * 0.85) {
            status = 'warning';
          } else if (hasDeliverySoon) {
            status = 'delivery_soon';
          }

          slots.push({
            id: slotId,
            warehouseId: wh.id,
            row,
            col,
            level,
            maxCapacity,
            usedCapacity,
            status,
            receipts: slotReceipts,
          });
        }
      }
    }
  });

  slots[12].usedCapacity = 115;
  slots[12].status = 'overload';
  slots[35].usedCapacity = 108;
  slots[35].status = 'overload';

  return slots;
};

export const MOCK_SLOTS: StorageSlot[] = generateSlots();

export const MOCK_HISTORY: OperationHistory[] = [
  {
    id: 'H-001',
    operationType: 'import',
    operator: '系统管理员',
    timestamp: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    description: '导入仓单数据 45 条',
    dataSource: '期货公司交割系统批量导入',
  },
  {
    id: 'H-002',
    operationType: 'update',
    operator: '运营专员-张三',
    timestamp: new Date(today.getTime() - 90 * 60 * 1000).toISOString(),
    description: '修正仓单 R-000008 质检状态：待检 → 不合格',
    dataSource: '第三方质检报告 QS-2026-0589',
    beforeData: '{"qualityStatus":"pending"}',
    afterData: '{"qualityStatus":"fail"}',
  },
  {
    id: 'H-003',
    operationType: 'export',
    operator: '运营主管-李四',
    timestamp: new Date(today.getTime() - 30 * 60 * 1000).toISOString(),
    description: '导出沙盘报告（截图+CSV）',
  },
];
