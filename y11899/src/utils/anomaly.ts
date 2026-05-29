import { SupplierQuote } from '@/types';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function detectAnomalies(quotes: SupplierQuote[]) {
  const anomalies: import('@/types').Anomaly[] = [];

  const priceValues = quotes.map(q => q.price).filter(v => v > 0);
  const energyValues = quotes.map(q => q.energyConsumption).filter(v => v > 0);
  const deliveryValues = quotes.map(q => q.deliveryPeriod).filter(v => v > 0);
  const afterSalesValues = quotes.map(q => q.afterSales).filter(v => v > 0);

  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const stddev = (arr: number[]) => {
    const m = mean(arr);
    return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length);
  };

  const priceMean = mean(priceValues);
  const priceStd = stddev(priceValues);
  const energyMean = mean(energyValues);
  const energyStd = stddev(energyValues);
  const deliveryMean = mean(deliveryValues);
  const deliveryStd = stddev(deliveryValues);
  const afterSalesMean = mean(afterSalesValues);

  for (const q of quotes) {
    if (q.price === 0) {
      anomalies.push({
        id: generateId(),
        type: 'zero_value',
        supplierId: q.id,
        supplierName: q.name,
        dimension: 'price',
        description: `${q.name} 报价为 0，属于零值异常`,
        sourceReference: `供应商报价表 → ${q.name} → 价格`,
        severity: 'error',
      });
    }
    if (q.price < 0) {
      anomalies.push({
        id: generateId(),
        type: 'negative_value',
        supplierId: q.id,
        supplierName: q.name,
        dimension: 'price',
        description: `${q.name} 报价为负数（${q.price}），属于负值异常`,
        sourceReference: `供应商报价表 → ${q.name} → 价格`,
        severity: 'error',
      });
    }
    if (q.price > 0 && priceStd > 0 && Math.abs(q.price - priceMean) > 2 * priceStd) {
      anomalies.push({
        id: generateId(),
        type: 'extreme_outlier',
        supplierId: q.id,
        supplierName: q.name,
        dimension: 'price',
        description: `${q.name} 报价 ${q.price} 万元偏离均值 ${priceMean.toFixed(1)} 超过 2 倍标准差`,
        sourceReference: `供应商报价表 → ${q.name} → 价格`,
        severity: 'warning',
      });
    }

    if (q.energyConsumption === 0) {
      anomalies.push({
        id: generateId(),
        type: 'zero_value',
        supplierId: q.id,
        supplierName: q.name,
        dimension: 'energyConsumption',
        description: `${q.name} 能耗为 0，属于零值异常`,
        sourceReference: `供应商报价表 → ${q.name} → 能耗`,
        severity: 'warning',
      });
    }
    if (q.energyConsumption < 0) {
      anomalies.push({
        id: generateId(),
        type: 'negative_value',
        supplierId: q.id,
        supplierName: q.name,
        dimension: 'energyConsumption',
        description: `${q.name} 能耗为负数（${q.energyConsumption}），属于负值异常`,
        sourceReference: `供应商报价表 → ${q.name} → 能耗`,
        severity: 'error',
      });
    }
    if (q.energyConsumption > 0 && energyStd > 0 && Math.abs(q.energyConsumption - energyMean) > 2 * energyStd) {
      anomalies.push({
        id: generateId(),
        type: 'extreme_outlier',
        supplierId: q.id,
        supplierName: q.name,
        dimension: 'energyConsumption',
        description: `${q.name} 能耗 ${q.energyConsumption} 偏离均值 ${energyMean.toFixed(1)} 超过 2 倍标准差`,
        sourceReference: `供应商报价表 → ${q.name} → 能耗`,
        severity: 'warning',
      });
    }

    if (q.afterSales === 0) {
      anomalies.push({
        id: generateId(),
        type: 'zero_value',
        supplierId: q.id,
        supplierName: q.name,
        dimension: 'afterSales',
        description: `${q.name} 售后评分为 0，属于零值异常`,
        sourceReference: `供应商报价表 → ${q.name} → 售后`,
        severity: 'warning',
      });
    }
    if (afterSalesMean > 0 && q.afterSales > 0 && Math.abs(q.afterSales - afterSalesMean) > 30) {
      anomalies.push({
        id: generateId(),
        type: 'extreme_outlier',
        supplierId: q.id,
        supplierName: q.name,
        dimension: 'afterSales',
        description: `${q.name} 售后评分 ${q.afterSales} 偏离均值 ${afterSalesMean.toFixed(1)} 超过 30 分`,
        sourceReference: `供应商报价表 → ${q.name} → 售后`,
        severity: 'warning',
      });
    }

    if (q.deliveryPeriod === 0) {
      anomalies.push({
        id: generateId(),
        type: 'zero_value',
        supplierId: q.id,
        supplierName: q.name,
        dimension: 'deliveryPeriod',
        description: `${q.name} 交付期为 0 天，属于零值异常`,
        sourceReference: `供应商报价表 → ${q.name} → 交付期`,
        severity: 'warning',
      });
    }
    if (q.deliveryPeriod < 0) {
      anomalies.push({
        id: generateId(),
        type: 'negative_value',
        supplierId: q.id,
        supplierName: q.name,
        dimension: 'deliveryPeriod',
        description: `${q.name} 交付期为负数（${q.deliveryPeriod}），属于负值异常`,
        sourceReference: `供应商报价表 → ${q.name} → 交付期`,
        severity: 'error',
      });
    }
    if (q.deliveryPeriod > 0 && deliveryStd > 0 && Math.abs(q.deliveryPeriod - deliveryMean) > 2 * deliveryStd) {
      anomalies.push({
        id: generateId(),
        type: 'extreme_outlier',
        supplierId: q.id,
        supplierName: q.name,
        dimension: 'deliveryPeriod',
        description: `${q.name} 交付期 ${q.deliveryPeriod} 天偏离均值 ${deliveryMean.toFixed(0)} 超过 2 倍标准差`,
        sourceReference: `供应商报价表 → ${q.name} → 交付期`,
        severity: 'warning',
      });
    }
  }

  return anomalies;
}
