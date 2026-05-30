import {
  mean,
  standardDeviation,
  roundTo,
  formatDate,
  daysBetween,
} from '../statistics';
import type {
  SalesHistory,
  InventorySnapshot,
  AnomalyRecord,
  AnomalyType,
  Severity,
  SKU,
  ForecastParameters,
} from '@/types';

function determineSeverity(zScore: number, anomalyType: AnomalyType): Severity {
  if (anomalyType === 'negative_stock') {
    return 'critical';
  }
  
  const absZ = Math.abs(zScore);
  if (absZ >= 3.0) return 'critical';
  if (absZ >= 2.5) return 'high';
  if (absZ >= 2.0) return 'medium';
  return 'low';
}

export function detectDemandSurge(
  salesHistory: SalesHistory[],
  skuMap: Record<string, SKU>,
  parameters: ForecastParameters,
  versionId: string,
  detectionDate: string = formatDate(new Date())
): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];
  const threshold = parameters.demandSurgeThreshold;
  
  const skuSales = new Map<string, SalesHistory[]>();
  for (const sale of salesHistory) {
    if (!skuSales.has(sale.skuId)) {
      skuSales.set(sale.skuId, []);
    }
    skuSales.get(sale.skuId)!.push(sale);
  }
  
  for (const [skuId, sales] of skuSales) {
    const sortedSales = [...sales].sort((a, b) => a.salesDate.localeCompare(b.salesDate));
    
    if (sortedSales.length < 7) continue;
    
    const quantities = sortedSales.map(s => s.quantitySold);
    const recentQuantities = quantities.slice(-7);
    const historicalQuantities = quantities.slice(0, -7);
    
    if (historicalQuantities.length < 14) continue;
    
    const historicalMean = mean(historicalQuantities);
    const historicalStd = standardDeviation(historicalQuantities);
    
    if (historicalStd === 0) continue;
    
    for (let i = 0; i < recentQuantities.length; i++) {
      const recentQty = recentQuantities[i];
      const z = (recentQty - historicalMean) / historicalStd;
      
      if (z >= threshold) {
        const severity = determineSeverity(z, 'demand_surge');
        const saleDate = sortedSales[sortedSales.length - 7 + i].salesDate;
        const expectedQty = roundTo(historicalMean, 2);
        const actualQty = recentQty;
        const surgePercentage = roundTo(((actualQty - expectedQty) / expectedQty) * 100, 2);
        
        const skuName = skuMap[skuId]?.skuName || skuId;
        const leadTime = skuMap[skuId]?.leadTimeDays || 7;
        
        const description = `SKU ${skuName} 在 ${saleDate} 出现需求突增。实际销量 ${actualQty} 件，预期 ${expectedQty} 件，超出预期 ${surgePercentage}%。`;
        
        const impactAssessment = `需求突增 ${z.toFixed(2)}σ，当前库存可能无法满足激增需求。按当前补货周期 ${leadTime} 天计算，缺货风险提升 ${roundTo(historicalStd / historicalMean * 100, 2)}%。`;
        
        const recommendation = `建议立即补货 ${Math.ceil(actualQty * leadTime * 1.2)} 件，并考虑设置临时安全库存。若为促销活动导致，需同步更新促销日历。`;
        
        anomalies.push({
          id: `anomaly-surge-${skuId}-${Date.now()}-${i}`,
          skuId,
          type: 'demand_surge',
          anomalyType: 'demand_surge',
          detectedAt: detectionDate,
          detectionDate,
          severity,
          description,
          impactAssessment,
          recommendation,
          versionId,
          details: {
            saleDate,
            expectedQty,
            actualQty,
            zScore: roundTo(z, 4),
            surgePercentage,
            historicalMean,
            historicalStd,
          },
        });
      }
    }
  }
  
  return anomalies.sort((a, b) => {
    const severityOrder: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

export function detectDeliveryDelay(
  inventorySnapshot: InventorySnapshot[],
  salesHistory: SalesHistory[],
  skuMap: Record<string, SKU>,
  parameters: ForecastParameters,
  versionId: string,
  detectionDate: string = formatDate(new Date())
): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];
  
  const skuOnOrder = new Map<string, InventorySnapshot[]>();
  for (const inv of inventorySnapshot) {
    if (inv.onOrderStock > 0) {
      if (!skuOnOrder.has(inv.skuId)) {
        skuOnOrder.set(inv.skuId, []);
      }
      skuOnOrder.get(inv.skuId)!.push(inv);
    }
  }
  
  for (const [skuId, snapshots] of skuOnOrder) {
    const sortedSnapshots = [...snapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
    
    if (sortedSnapshots.length < 2) continue;
    
    const firstSnapshot = sortedSnapshots[0];
    const latestSnapshot = sortedSnapshots[sortedSnapshots.length - 1];
    
    if (latestSnapshot.onOrderStock <= 0) continue;
    
    const expectedLeadTime = skuMap[skuId]?.leadTimeDays || 7;
    const actualWaitDays = daysBetween(firstSnapshot.snapshotDate, detectionDate);
    
    if (actualWaitDays > expectedLeadTime * 1.5) {
      const delayDays = actualWaitDays - expectedLeadTime;
      const delayRatio = roundTo((actualWaitDays / expectedLeadTime - 1) * 100, 2);
      
      const z = (actualWaitDays - expectedLeadTime) / (expectedLeadTime * 0.3);
      const severity = determineSeverity(z, 'delivery_delay');
      
      const skuName = skuMap[skuId]?.skuName || skuId;
      const unitCost = skuMap[skuId]?.unitCost || 0;
      
      const skuSales = salesHistory.filter(s => s.skuId === skuId);
      const recentSales = skuSales
        .filter(s => daysBetween(s.salesDate, detectionDate) <= 30)
        .reduce((sum, s) => sum + s.quantitySold, 0);
      const avgDailyDemand = roundTo(recentSales / 30, 2);
      
      const currentStock = latestSnapshot.currentStock;
      const stockoutDays = avgDailyDemand > 0 ? Math.floor(currentStock / avgDailyDemand) : Infinity;
      
      const description = `SKU ${skuName} 到货延迟。预期到货周期 ${expectedLeadTime} 天，实际已等待 ${actualWaitDays} 天，延迟 ${delayDays} 天（+${delayRatio}%）。`;
      
      const impactAssessment = `在途 ${latestSnapshot.onOrderStock} 件，价值 ¥${roundTo(latestSnapshot.onOrderStock * unitCost, 2)}。当前库存 ${currentStock} 件，按日均需求 ${avgDailyDemand} 件计算，仅够维持 ${stockoutDays === Infinity ? '∞' : stockoutDays} 天。`;
      
      const recommendation = `建议联系供应商确认到货时间，若延迟超过 ${expectedLeadTime * 2} 天，考虑启动备选供应商。${stockoutDays < 7 ? '⚠️ 库存仅够维持一周，需紧急处理！' : ''}`;
      
      anomalies.push({
        id: `anomaly-delay-${skuId}-${Date.now()}`,
        skuId,
        type: 'delivery_delay',
        anomalyType: 'delivery_delay',
        detectedAt: detectionDate,
        detectionDate,
        severity: stockoutDays < 7 ? 'critical' : severity,
        description,
        impactAssessment,
        recommendation,
        versionId,
        details: {
          expectedLeadTime,
          actualWaitDays,
          delayDays,
          delayRatio,
          onOrderStock: latestSnapshot.onOrderStock,
          currentStock,
          avgDailyDemand,
          stockoutDays,
          firstSnapshotDate: firstSnapshot.snapshotDate,
        },
      });
    }
  }
  
  return anomalies.sort((a, b) => {
    const severityOrder: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

export function detectNegativeStock(
  inventorySnapshot: InventorySnapshot[],
  skuMap: Record<string, SKU>,
  versionId: string,
  detectionDate: string = formatDate(new Date())
): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];
  
  for (const inv of inventorySnapshot) {
    const netStock = inv.currentStock - inv.reservedStock;
    
    if (netStock < 0) {
      const skuName = skuMap[inv.skuId]?.skuName || inv.skuId;
      const unitCost = skuMap[inv.skuId]?.unitCost || 0;
      const sellingPrice = skuMap[inv.skuId]?.sellingPrice || 0;
      
      const description = `SKU ${skuName} 出现负库存。物理库存 ${inv.currentStock} 件，已预留 ${inv.reservedStock} 件，净库存 ${netStock} 件。`;
      
      const shortageQty = Math.abs(netStock);
      const lostRevenue = roundTo(shortageQty * sellingPrice, 2);
      
      const impactAssessment = `短缺 ${shortageQty} 件，直接损失销售额约 ¥${lostRevenue}。负库存可能导致订单履约失败、客户投诉和信誉损失。`;
      
      const recommendation = `立即盘点确认实际库存，紧急补货 ${shortageQty} 件填补缺口。同时检查出库流程，防止超卖情况再次发生。`;
      
      anomalies.push({
        id: `anomaly-negative-${inv.skuId}-${Date.now()}`,
        skuId: inv.skuId,
        type: 'negative_stock',
        anomalyType: 'negative_stock',
        detectedAt: detectionDate,
        detectionDate,
        severity: 'critical',
        description,
        impactAssessment,
        recommendation,
        versionId,
        details: {
          currentStock: inv.currentStock,
          reservedStock: inv.reservedStock,
          netStock,
          shortageQty,
          unitCost,
          sellingPrice,
          lostRevenue,
          snapshotDate: inv.snapshotDate,
          warehouseId: inv.warehouseId,
        },
      });
    }
  }
  
  return anomalies;
}

export function detectAllAnomalies(
  salesHistory: SalesHistory[],
  inventorySnapshot: InventorySnapshot[],
  skuMap: Record<string, SKU>,
  parameters: ForecastParameters,
  versionId: string,
  detectionDate: string = formatDate(new Date())
): AnomalyRecord[] {
  const demandSurges = detectDemandSurge(salesHistory, skuMap, parameters, versionId, detectionDate);
  const deliveryDelays = detectDeliveryDelay(inventorySnapshot, salesHistory, skuMap, parameters, versionId, detectionDate);
  const negativeStocks = detectNegativeStock(inventorySnapshot, skuMap, versionId, detectionDate);
  
  return [...negativeStocks, ...demandSurges, ...deliveryDelays];
}

export function generateAnomalySummary(anomalies: AnomalyRecord[]): {
  total: number;
  byType: Record<AnomalyType, number>;
  bySeverity: Record<Severity, number>;
  criticalSkus: string[];
  highRiskSkus: string[];
} {
  const summary = {
    total: anomalies.length,
    byType: {
      demand_surge: 0,
      delivery_delay: 0,
      negative_stock: 0,
    } as Record<AnomalyType, number>,
    bySeverity: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    } as Record<Severity, number>,
    criticalSkus: [] as string[],
    highRiskSkus: [] as string[],
  };
  
  const criticalSet = new Set<string>();
  const highRiskSet = new Set<string>();
  
  for (const anomaly of anomalies) {
    summary.byType[anomaly.anomalyType]++;
    summary.bySeverity[anomaly.severity]++;
    
    if (anomaly.severity === 'critical') {
      criticalSet.add(anomaly.skuId);
    } else if (anomaly.severity === 'high') {
      highRiskSet.add(anomaly.skuId);
    }
  }
  
  summary.criticalSkus = Array.from(criticalSet);
  summary.highRiskSkus = Array.from(highRiskSet);
  
  return summary;
}
