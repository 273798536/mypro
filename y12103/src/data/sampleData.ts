import type { SKU, SalesHistory, InventorySnapshot, PromotionCalendar } from '@/types';
import { addDays, formatDate } from '@/utils/statistics';

const today = new Date();
const formatD = (d: Date) => d.toISOString().split('T')[0];

export const sampleSkus: SKU[] = [
  {
    id: 'SKU001',
    skuId: 'SKU001',
    name: '经典款T恤-白色-M',
    skuName: '经典款T恤-白色-M',
    category: '服装',
    unitCost: 50,
    sellingPrice: 129,
    leadTimeDays: 7,
    reviewPeriodDays: 7,
  },
  {
    id: 'SKU002',
    skuId: 'SKU002',
    name: '经典款T恤-黑色-L',
    skuName: '经典款T恤-黑色-L',
    category: '服装',
    unitCost: 50,
    sellingPrice: 129,
    leadTimeDays: 7,
    reviewPeriodDays: 7,
  },
  {
    id: 'SKU003',
    skuId: 'SKU003',
    name: '牛仔裤-蓝色-30',
    skuName: '牛仔裤-蓝色-30',
    category: '服装',
    unitCost: 120,
    sellingPrice: 299,
    leadTimeDays: 14,
    reviewPeriodDays: 7,
  },
  {
    id: 'SKU004',
    skuId: 'SKU004',
    name: '运动鞋-白色-42',
    skuName: '运动鞋-白色-42',
    category: '鞋类',
    unitCost: 200,
    sellingPrice: 499,
    leadTimeDays: 21,
    reviewPeriodDays: 14,
  },
  {
    id: 'SKU005',
    skuId: 'SKU005',
    name: '双肩包-黑色',
    skuName: '双肩包-黑色',
    category: '配饰',
    unitCost: 80,
    sellingPrice: 199,
    leadTimeDays: 10,
    reviewPeriodDays: 7,
  },
  {
    id: 'SKU006',
    skuId: 'SKU006',
    name: '棒球帽-红色',
    skuName: '棒球帽-红色',
    category: '配饰',
    unitCost: 30,
    sellingPrice: 89,
    leadTimeDays: 7,
    reviewPeriodDays: 7,
  },
  {
    id: 'SKU007',
    skuId: 'SKU007',
    name: '羊毛衫-灰色-M',
    skuName: '羊毛衫-灰色-M',
    category: '服装',
    unitCost: 150,
    sellingPrice: 399,
    leadTimeDays: 14,
    reviewPeriodDays: 14,
  },
  {
    id: 'SKU008',
    skuId: 'SKU008',
    name: '休闲短裤-卡其-L',
    skuName: '休闲短裤-卡其-L',
    category: '服装',
    unitCost: 60,
    sellingPrice: 159,
    leadTimeDays: 7,
    reviewPeriodDays: 7,
  },
];

function generateSalesHistory(
  skuId: string,
  days: number,
  baseDemand: number,
  variability: number,
  hasSurge: boolean = false,
  surgeDayOffset: number = 7,
  surgeMultiplier: number = 3
): SalesHistory[] {
  const sales: SalesHistory[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    let demand = Math.max(0, Math.round(baseDemand + (Math.random() - 0.5) * 2 * variability));
    
    if (hasSurge && i === surgeDayOffset) {
      demand = Math.round(baseDemand * surgeMultiplier + Math.random() * variability);
    }
    
    if (demand > 0) {
      sales.push({
        id: `sales-${skuId}-${date}-${i}`,
        skuId,
        salesDate: date,
        quantitySold: demand,
        storeId: 'STORE001',
      });
    }
  }
  
  return sales;
}

export const sampleSalesHistory: SalesHistory[] = [
  ...generateSalesHistory('SKU001', 60, 25, 8, true, 7, 3.5),
  ...generateSalesHistory('SKU002', 60, 18, 6),
  ...generateSalesHistory('SKU003', 60, 12, 5, true, 5, 2.8),
  ...generateSalesHistory('SKU004', 60, 8, 4),
  ...generateSalesHistory('SKU005', 60, 15, 6),
  ...generateSalesHistory('SKU006', 60, 30, 10),
  ...generateSalesHistory('SKU007', 60, 5, 3),
  ...generateSalesHistory('SKU008', 60, 22, 7),
];

export const sampleInventorySnapshots: InventorySnapshot[] = [
  {
    id: 'inv-SKU001-1',
    skuId: 'SKU001',
    snapshotDate: formatD(today),
    currentStock: 80,
    quantity: 80,
    reservedStock: 0,
    onOrderStock: 0,
    warehouseId: 'WH001',
    warehouse: 'WH001',
  },
  {
    id: 'inv-SKU002-1',
    skuId: 'SKU002',
    snapshotDate: formatD(today),
    currentStock: 200,
    quantity: 200,
    reservedStock: 0,
    onOrderStock: 0,
    warehouseId: 'WH001',
    warehouse: 'WH001',
  },
  {
    id: 'inv-SKU003-1',
    skuId: 'SKU003',
    snapshotDate: formatD(today),
    currentStock: -5,
    quantity: -5,
    reservedStock: 25,
    onOrderStock: 0,
    warehouseId: 'WH001',
    warehouse: 'WH001',
  },
  {
    id: 'inv-SKU004-1',
    skuId: 'SKU004',
    snapshotDate: formatD(today),
    currentStock: 15,
    quantity: 15,
    reservedStock: 0,
    onOrderStock: 50,
    warehouseId: 'WH001',
    warehouse: 'WH001',
  },
  {
    id: 'inv-SKU004-2',
    skuId: 'SKU004',
    snapshotDate: addDays(today, -25),
    currentStock: 65,
    quantity: 65,
    reservedStock: 0,
    onOrderStock: 50,
    warehouseId: 'WH001',
    warehouse: 'WH001',
  },
  {
    id: 'inv-SKU005-1',
    skuId: 'SKU005',
    snapshotDate: formatD(today),
    currentStock: 500,
    quantity: 500,
    reservedStock: 0,
    onOrderStock: 0,
    warehouseId: 'WH001',
    warehouse: 'WH001',
  },
  {
    id: 'inv-SKU006-1',
    skuId: 'SKU006',
    snapshotDate: formatD(today),
    currentStock: 30,
    quantity: 30,
    reservedStock: 0,
    onOrderStock: 0,
    warehouseId: 'WH001',
    warehouse: 'WH001',
  },
  {
    id: 'inv-SKU007-1',
    skuId: 'SKU007',
    snapshotDate: formatD(today),
    currentStock: 5,
    quantity: 5,
    reservedStock: 0,
    onOrderStock: 0,
    warehouseId: 'WH001',
    warehouse: 'WH001',
  },
  {
    id: 'inv-SKU008-1',
    skuId: 'SKU008',
    snapshotDate: formatD(today),
    currentStock: 120,
    quantity: 120,
    reservedStock: 0,
    onOrderStock: 0,
    warehouseId: 'WH001',
    warehouse: 'WH001',
  },
];

export const samplePromotionCalendar: PromotionCalendar[] = [
  {
    id: 'promo-SKU001-1',
    skuId: 'SKU001',
    startDate: formatD(today),
    endDate: addDays(today, 14),
    promotionType: '满减',
    discountRate: 0.15,
    expectedLift: 0.5,
    isActive: true,
  },
  {
    id: 'promo-SKU006-1',
    skuId: 'SKU006',
    startDate: addDays(today, 3),
    endDate: addDays(today, 10),
    promotionType: '折扣',
    discountRate: 0.2,
    expectedLift: 0.8,
    isActive: true,
  },
  {
    id: 'promo-SKU008-1',
    skuId: 'SKU008',
    startDate: addDays(today, -3),
    endDate: addDays(today, 7),
    promotionType: '买赠',
    discountRate: 0,
    expectedLift: 0.4,
    isActive: true,
  },
  {
    id: 'promo-SKU003-1',
    skuId: 'SKU003',
    startDate: addDays(today, 20),
    endDate: addDays(today, 30),
    promotionType: '新品',
    discountRate: 0.1,
    expectedLift: 0.3,
    isActive: false,
  },
];
