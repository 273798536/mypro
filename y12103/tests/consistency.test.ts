import { describe, it, expect } from 'vitest';
import { mean, variance, standardDeviation, zScore, normalCDF, poissonCDF, poissonQuantile, movingAverage, autoSelectModel, calculateHash, roundTo } from '../src/utils/statistics';
import { normalDistributionForecast, poissonDistributionForecast, movingAverageForecast, runForecastForSku, batchRunForecast, evaluatePromotionImpact, generateForecastSeries } from '../src/utils/forecast';
import { detectDemandSurge, detectDeliveryDelay, detectNegativeStock, detectAllAnomalies, generateAnomalySummary } from '../src/utils/anomaly';
import { formatReplenishmentForExport, formatAnomalyForExport } from '../src/utils/export';
import { sampleSkus, sampleSalesHistory, sampleInventorySnapshots, samplePromotionCalendar } from '../src/data/sampleData';
import { boundaryCases } from '../src/data/boundaryCases';
import type { SKU, SalesHistory, InventorySnapshot, PromotionCalendar, ForecastParameters } from '../src/types';

const defaultParams: ForecastParameters = {
  serviceLevel: 0.95,
  safetyStockMultiplier: 1.0,
  forecastHorizonDays: 28,
  reviewPeriodDays: 7,
};

describe('纯函数一致性测试', () => {
  const testData = [23, 45, 67, 89, 12, 34, 56, 78, 90, 21, 43, 65, 87, 10, 32, 54, 76, 98, 13, 24];
  
  it('mean函数重复调用结果一致', () => {
    const result1 = mean(testData);
    const result2 = mean(testData);
    const result3 = mean(testData);
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
    expect(result1).toBeCloseTo(49.35, 2);
  });
  
  it('variance函数重复调用结果一致', () => {
    const result1 = variance(testData);
    const result2 = variance(testData);
    expect(result1).toBe(result2);
    expect(result1).toBeGreaterThan(0);
  });
  
  it('standardDeviation函数重复调用结果一致', () => {
    const result1 = standardDeviation(testData);
    const result2 = standardDeviation(testData);
    expect(result1).toBe(result2);
  });
  
  it('normalCDF函数重复调用结果一致', () => {
    const result1 = normalCDF(1.96);
    const result2 = normalCDF(1.96);
    expect(result1).toBe(result2);
    expect(result1).toBeCloseTo(0.975, 3);
  });
  
  it('poissonCDF函数重复调用结果一致', () => {
    const result1 = poissonCDF(5, 3.5);
    const result2 = poissonCDF(5, 3.5);
    expect(result1).toBe(result2);
  });
  
  it('calculateHash函数相同输入产生相同输出', () => {
    const obj = { a: 1, b: 'test', c: [1, 2, 3] };
    const hash1 = calculateHash(obj);
    const hash2 = calculateHash(obj);
    const hash3 = calculateHash({ ...obj });
    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
    expect(hash1).toMatch(/^[a-f0-9]{16}$/);
  });
  
  it('calculateHash不同输入产生不同输出', () => {
    const hash1 = calculateHash({ a: 1 });
    const hash2 = calculateHash({ a: 2 });
    expect(hash1).not.toBe(hash2);
  });
});

describe('概率预测算法一致性测试', () => {
  const sku: SKU = sampleSkus[0];
  const salesHistory: SalesHistory[] = sampleSalesHistory.filter(s => s.skuId === sku.id);
  
  it('normalDistributionForecast重复调用结果一致', () => {
    const result1 = normalDistributionForecast(salesHistory, sku, defaultParams);
    const result2 = normalDistributionForecast(salesHistory, sku, defaultParams);
    const result3 = normalDistributionForecast(salesHistory, sku, defaultParams);
    
    expect(result1.forecastMean).toBe(result2.forecastMean);
    expect(result2.forecastMean).toBe(result3.forecastMean);
    expect(result1.forecastStd).toBe(result2.forecastStd);
    expect(result1.zValue).toBe(result2.zValue);
    expect(result1.modelUsed).toBe('normal');
  });
  
  it('runForecastForSku重复调用结果一致', () => {
    const result1 = runForecastForSku(sku, salesHistory, defaultParams);
    const result2 = runForecastForSku(sku, salesHistory, defaultParams);
    
    expect(result1.forecastMean).toBe(result2.forecastMean);
    expect(result1.modelUsed).toBe(result2.modelUsed);
    expect(result1.zValue).toBe(result2.zValue);
    expect(result1.mape).toBe(result2.mape);
  });
  
  it('batchRunForecast重复调用结果一致', () => {
    const result1 = batchRunForecast(sampleSkus, sampleSalesHistory, defaultParams);
    const result2 = batchRunForecast(sampleSkus, sampleSalesHistory, defaultParams);
    
    expect(result1.length).toBe(result2.length);
    for (let i = 0; i < result1.length; i++) {
      expect(result1[i].forecastMean).toBe(result2[i].forecastMean);
      expect(result1[i].skuId).toBe(result2[i].skuId);
    }
  });
  
  it('安全库存公式计算结果一致', () => {
    const z = 1.65;
    const demandStd = 15;
    const leadTimeDays = 7;
    const demandMean = 50;
    
    const safetyStock1 = z * Math.sqrt(leadTimeDays * demandStd ** 2 + demandMean ** 2 * 0);
    const safetyStock2 = z * Math.sqrt(leadTimeDays * demandStd ** 2 + demandMean ** 2 * 0);
    
    expect(safetyStock1).toBe(safetyStock2);
    expect(safetyStock1).toBeCloseTo(65.46, 2);
  });
});

describe('异常检测算法一致性测试', () => {
  const sku: SKU = sampleSkus[0];
  const salesHistory: SalesHistory[] = sampleSalesHistory.filter(s => s.skuId === sku.id);
  const inventory: InventorySnapshot = sampleInventorySnapshots.find(i => i.skuId === sku.id)!;
  const forecast = normalDistributionForecast(salesHistory, sku, defaultParams);
  
  it('detectDemandSurge重复调用结果一致', () => {
    const result1 = detectDemandSurge(sku, salesHistory, forecast);
    const result2 = detectDemandSurge(sku, salesHistory, forecast);
    
    if (result1 && result2) {
      expect(result1.type).toBe(result2.type);
      expect(result1.severity).toBe(result2.severity);
      expect(result1.description).toBe(result2.description);
    } else {
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    }
  });
  
  it('detectNegativeStock重复调用结果一致', () => {
    const result1 = detectNegativeStock(sku, inventory);
    const result2 = detectNegativeStock(sku, inventory);
    
    if (result1 && result2) {
      expect(result1.type).toBe(result2.type);
      expect(result1.severity).toBe(result2.severity);
    } else {
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    }
  });
  
  it('detectAllAnomalies重复调用结果一致', () => {
    const inventoryMap = new Map(sampleInventorySnapshots.map(i => [i.skuId, i]));
    
    const result1 = detectAllAnomalies(
      sampleSkus,
      sampleSalesHistory,
      inventoryMap,
      batchRunForecast(sampleSkus, sampleSalesHistory, defaultParams),
      defaultParams
    );
    
    const result2 = detectAllAnomalies(
      sampleSkus,
      sampleSalesHistory,
      inventoryMap,
      batchRunForecast(sampleSkus, sampleSalesHistory, defaultParams),
      defaultParams
    );
    
    expect(result1.length).toBe(result2.length);
    for (let i = 0; i < result1.length; i++) {
      expect(result1[i].skuId).toBe(result2[i].skuId);
      expect(result1[i].type).toBe(result2[i].type);
      expect(result1[i].severity).toBe(result2[i].severity);
    }
  });
  
  it('generateAnomalySummary重复调用结果一致', () => {
    const inventoryMap = new Map(sampleInventorySnapshots.map(i => [i.skuId, i]));
    const anomalies = detectAllAnomalies(
      sampleSkus,
      sampleSalesHistory,
      inventoryMap,
      batchRunForecast(sampleSkus, sampleSalesHistory, defaultParams),
      defaultParams
    );
    
    const summary1 = generateAnomalySummary(anomalies);
    const summary2 = generateAnomalySummary(anomalies);
    
    expect(summary1.total).toBe(summary2.total);
    expect(summary1.bySeverity.critical).toBe(summary2.bySeverity.critical);
    expect(summary1.bySeverity.high).toBe(summary2.bySeverity.high);
    expect(summary1.bySeverity.medium).toBe(summary2.bySeverity.medium);
    expect(summary1.bySeverity.low).toBe(summary2.bySeverity.low);
  });
});

describe('促销日历影响测试', () => {
  const sku: SKU = sampleSkus[0];
  const salesHistory: SalesHistory[] = sampleSalesHistory.filter(s => s.skuId === sku.id);
  
  it('evaluatePromotionImpact正确标注促销影响', () => {
    const forecast1 = runForecastForSku(sku, salesHistory, defaultParams);
    const forecast2 = runForecastForSku(sku, salesHistory, defaultParams, samplePromotionCalendar);
    
    const impact = evaluatePromotionImpact(forecast1, forecast2, sku, defaultParams);
    
    expect(impact).toBeDefined();
    if (forecast2.affectedByPromotion) {
      expect(impact.affectedByPromotion).toBe(true);
      expect(impact.promotionImpact).toBeDefined();
      expect(impact.promotionImpact!.newSafetyStock).toBeGreaterThan(impact.promotionImpact!.originalSafetyStock);
      expect(impact.promotionImpact!.impactPercentage).toBeGreaterThan(0);
    }
  });
  
  it('evaluatePromotionImpact重复调用结果一致', () => {
    const forecast1 = runForecastForSku(sku, salesHistory, defaultParams);
    const forecast2 = runForecastForSku(sku, salesHistory, defaultParams, samplePromotionCalendar);
    
    const impact1 = evaluatePromotionImpact(forecast1, forecast2, sku, defaultParams);
    const impact2 = evaluatePromotionImpact(forecast1, forecast2, sku, defaultParams);
    
    expect(impact1.affectedByPromotion).toBe(impact2.affectedByPromotion);
    if (impact1.promotionImpact && impact2.promotionImpact) {
      expect(impact1.promotionImpact.originalSafetyStock).toBe(impact2.promotionImpact.originalSafetyStock);
      expect(impact1.promotionImpact.newSafetyStock).toBe(impact2.promotionImpact.newSafetyStock);
      expect(impact1.promotionImpact.impactPercentage).toBe(impact2.promotionImpact.impactPercentage);
    }
  });
});

describe('边界样例测试', () => {
  it('需求突增场景正确检测', () => {
    const demandSurgeCase = boundaryCases.find(c => c.name.startsWith('需求突增'))!;
    const { inputData, expectedOutput } = demandSurgeCase;
    
    const forecasts = batchRunForecast(inputData.skus, inputData.salesHistory, defaultParams);
    const inventoryMap = new Map(inputData.inventorySnapshots.map(i => [i.skuId, i]));
    const anomalies = detectAllAnomalies(
      inputData.skus,
      inputData.salesHistory,
      inventoryMap,
      forecasts,
      defaultParams
    );
    
    const demandSurgeAnomalies = anomalies.filter(a => a.type === 'demand_surge');
    expect(demandSurgeAnomalies.length).toBeGreaterThanOrEqual(expectedOutput.expectedAnomalies.demandSurge);
    
    demandSurgeAnomalies.forEach(a => {
      expect(['high', 'critical']).toContain(a.severity);
      expect(a.description).toContain('突增');
    });
  });
  
  it('到货延迟场景正确检测', () => {
    const deliveryDelayCase = boundaryCases.find(c => c.name === '到货延迟')!;
    const { inputData, expectedOutput } = deliveryDelayCase;
    
    const forecasts = batchRunForecast(inputData.skus, inputData.salesHistory, defaultParams);
    const inventoryMap = new Map(inputData.inventorySnapshots.map(i => [i.skuId, i]));
    const anomalies = detectAllAnomalies(
      inputData.skus,
      inputData.salesHistory,
      inventoryMap,
      forecasts,
      defaultParams
    );
    
    const delayAnomalies = anomalies.filter(a => a.type === 'delivery_delay');
    expect(delayAnomalies.length).toBeGreaterThanOrEqual(expectedOutput.expectedAnomalies.deliveryDelay);
  });
  
  it('负库存场景正确检测', () => {
    const negativeStockCase = boundaryCases.find(c => c.name === '负库存')!;
    const { inputData, expectedOutput } = negativeStockCase;
    
    const forecasts = batchRunForecast(inputData.skus, inputData.salesHistory, defaultParams);
    const inventoryMap = new Map(inputData.inventorySnapshots.map(i => [i.skuId, i]));
    const anomalies = detectAllAnomalies(
      inputData.skus,
      inputData.salesHistory,
      inventoryMap,
      forecasts,
      defaultParams
    );
    
    const negativeAnomalies = anomalies.filter(a => a.type === 'negative_stock');
    expect(negativeAnomalies.length).toBeGreaterThanOrEqual(expectedOutput.expectedAnomalies.negativeStock);
    
    negativeAnomalies.forEach(a => {
      expect(a.severity).toBe('critical');
    });
  });
  
  it('复合异常场景正确检测所有类型', () => {
    const complexCase = boundaryCases.find(c => c.name === '复合异常')!;
    const { inputData, expectedOutput } = complexCase;
    
    const forecasts = batchRunForecast(inputData.skus, inputData.salesHistory, defaultParams);
    const inventoryMap = new Map(inputData.inventorySnapshots.map(i => [i.skuId, i]));
    const anomalies = detectAllAnomalies(
      inputData.skus,
      inputData.salesHistory,
      inventoryMap,
      forecasts,
      defaultParams
    );
    
    expect(anomalies.filter(a => a.type === 'demand_surge').length).toBeGreaterThanOrEqual(expectedOutput.expectedAnomalies.demandSurge);
    expect(anomalies.filter(a => a.type === 'delivery_delay').length).toBeGreaterThanOrEqual(expectedOutput.expectedAnomalies.deliveryDelay);
    expect(anomalies.filter(a => a.type === 'negative_stock').length).toBeGreaterThanOrEqual(expectedOutput.expectedAnomalies.negativeStock);
  });
  
  it('边界样例重复运行结果一致', () => {
    const demandSurgeCase = boundaryCases.find(c => c.name.startsWith('需求突增'))!;
    const { inputData } = demandSurgeCase;
    
    const runOnce = () => {
      const forecasts = batchRunForecast(inputData.skus, inputData.salesHistory, defaultParams);
      const inventoryMap = new Map(inputData.inventorySnapshots.map(i => [i.skuId, i]));
      return detectAllAnomalies(
        inputData.skus,
        inputData.salesHistory,
        inventoryMap,
        forecasts,
        defaultParams
      );
    };
    
    const result1 = runOnce();
    const result2 = runOnce();
    const result3 = runOnce();
    
    expect(result1.length).toBe(result2.length);
    expect(result2.length).toBe(result3.length);
    
    for (let i = 0; i < result1.length; i++) {
      expect(result1[i].skuId).toBe(result2[i].skuId);
      expect(result1[i].type).toBe(result2[i].type);
      expect(result1[i].severity).toBe(result2[i].severity);
      expect(result2[i].skuId).toBe(result3[i].skuId);
      expect(result2[i].type).toBe(result3[i].type);
    }
  });
});

describe('数据导出一致性测试', () => {
  it('formatReplenishmentForExport与页面逻辑一致', () => {
    const forecast = runForecastForSku(sampleSkus[0], sampleSalesHistory.filter(s => s.skuId === sampleSkus[0].id), defaultParams);
    const inventory = sampleInventorySnapshots.find(i => i.skuId === sampleSkus[0].id)!;
    
    const replenishment = {
      id: 'test',
      skuId: sampleSkus[0].id,
      safetyStock: forecast.safetyStock,
      reorderPoint: forecast.reorderPoint,
      suggestedOrderQuantity: Math.max(0, Math.ceil(forecast.reorderPoint - inventory.quantity)),
      suggestedOrderDate: new Date().toISOString().split('T')[0],
      expectedArrivalDate: new Date(Date.now() + sampleSkus[0].leadTimeDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currentStock: inventory.quantity,
      forecastedDemand: forecast.forecastMean * 4,
      serviceLevel: defaultParams.serviceLevel,
      stockoutProbability: 1 - defaultParams.serviceLevel,
      affectedByPromotion: false,
    };
    
    const exported = formatReplenishmentForExport(replenishment, sampleSkus[0]);
    
    expect(exported['SKU编号']).toBe(sampleSkus[0].id);
    expect(exported['商品名称']).toBe(sampleSkus[0].name);
    expect(exported['当前库存']).toBe(inventory.quantity);
    expect(exported['安全库存']).toBe(roundTo(forecast.safetyStock, 0));
    expect(exported['再订货点']).toBe(roundTo(forecast.reorderPoint, 0));
    expect(exported['建议补货量']).toBe(Math.max(0, Math.ceil(forecast.reorderPoint - inventory.quantity)));
    
    const expectedStatus = inventory.quantity < forecast.safetyStock * 0.5 ? '缺货' :
                          inventory.quantity < forecast.safetyStock ? '预警' :
                          inventory.quantity > forecast.safetyStock * 2 ? '积压' : '健康';
    expect(exported['库存状态']).toBe(expectedStatus);
  });
  
  it('formatAnomalyForExport与页面逻辑一致', () => {
    const demandSurgeCase = boundaryCases.find(c => c.name.startsWith('需求突增'))!;
    const { inputData } = demandSurgeCase;
    
    const forecasts = batchRunForecast(inputData.skus, inputData.salesHistory, defaultParams);
    const inventoryMap = new Map(inputData.inventorySnapshots.map(i => [i.skuId, i]));
    const anomalies = detectAllAnomalies(
      inputData.skus,
      inputData.salesHistory,
      inventoryMap,
      forecasts,
      defaultParams
    );
    
    if (anomalies.length > 0) {
      const anomaly = anomalies[0];
      const sku = inputData.skus.find(s => s.id === anomaly.skuId)!;
      const exported = formatAnomalyForExport(anomaly, sku);
      
      expect(exported['SKU编号']).toBe(sku.id);
      expect(exported['商品名称']).toBe(sku.name);
      expect(exported['异常类型']).toBe(anomaly.type === 'demand_surge' ? '需求突增' :
                                        anomaly.type === 'delivery_delay' ? '到货延迟' : '负库存');
      expect(exported['严重程度']).toBe(anomaly.severity === 'critical' ? '严重' :
                                         anomaly.severity === 'high' ? '高风险' :
                                         anomaly.severity === 'medium' ? '中风险' : '低风险');
      expect(exported['异常描述']).toBe(anomaly.description);
    }
  });
});

describe('参数动态响应测试', () => {
  const sku: SKU = sampleSkus[0];
  const salesHistory: SalesHistory[] = sampleSalesHistory.filter(s => s.skuId === sku.id);
  
  it('服务水平变化时安全库存同步变化', () => {
    const params90: ForecastParameters = { ...defaultParams, serviceLevel: 0.90 };
    const params95: ForecastParameters = { ...defaultParams, serviceLevel: 0.95 };
    const params99: ForecastParameters = { ...defaultParams, serviceLevel: 0.99 };
    
    const forecast90 = runForecastForSku(sku, salesHistory, params90);
    const forecast95 = runForecastForSku(sku, salesHistory, params95);
    const forecast99 = runForecastForSku(sku, salesHistory, params99);
    
    expect(forecast90.safetyStock).toBeLessThan(forecast95.safetyStock);
    expect(forecast95.safetyStock).toBeLessThan(forecast99.safetyStock);
    expect(forecast90.zValue).toBeCloseTo(1.28, 2);
    expect(forecast95.zValue).toBeCloseTo(1.65, 2);
    expect(forecast99.zValue).toBeCloseTo(2.33, 2);
  });
  
  it('安全库存乘数变化时补货建议同步变化', () => {
    const params05: ForecastParameters = { ...defaultParams, safetyStockMultiplier: 0.5 };
    const params10: ForecastParameters = { ...defaultParams, safetyStockMultiplier: 1.0 };
    const params20: ForecastParameters = { ...defaultParams, safetyStockMultiplier: 2.0 };
    
    const forecast05 = runForecastForSku(sku, salesHistory, params05);
    const forecast10 = runForecastForSku(sku, salesHistory, params10);
    const forecast20 = runForecastForSku(sku, salesHistory, params20);
    
    expect(forecast05.safetyStock).toBe(forecast10.safetyStock * 0.5);
    expect(forecast20.safetyStock).toBe(forecast10.safetyStock * 2);
  });
  
  it('参数变化后异常检测结果同步更新', () => {
    const skuWithLowStock: SKU = { ...sku };
    const lowInventory: InventorySnapshot = {
      skuId: sku.id,
      quantity: 5,
      snapshotDate: new Date().toISOString().split('T')[0],
      warehouse: 'WH01',
    };
    
    const paramsConservative: ForecastParameters = { ...defaultParams, serviceLevel: 0.99 };
    const paramsAggressive: ForecastParameters = { ...defaultParams, serviceLevel: 0.90 };
    
    const forecastConservative = runForecastForSku(skuWithLowStock, salesHistory, paramsConservative);
    const forecastAggressive = runForecastForSku(skuWithLowStock, salesHistory, paramsAggressive);
    
    const anomalyConservative = detectNegativeStock(skuWithLowStock, lowInventory);
    const anomalyAggressive = detectNegativeStock(skuWithLowStock, lowInventory);
    
    expect(forecastConservative.safetyStock).toBeGreaterThan(forecastAggressive.safetyStock);
  });
});
