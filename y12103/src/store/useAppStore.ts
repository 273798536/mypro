import { create } from 'zustand';
import type {
  SKU,
  SalesHistory,
  InventorySnapshot,
  PromotionCalendar,
  ForecastResult,
  ReplenishmentSuggestion,
  AnomalyRecord,
  DataVersion,
  ForecastParameters,
  ComparisonResult,
  InventoryHealthScore,
  ImportState,
} from '@/types';
import { batchRunForecast, evaluatePromotionImpact } from '@/utils/forecast';
import { detectAllAnomalies, generateAnomalySummary } from '@/utils/anomaly';
import { extractSkusFromData } from '@/utils/import';
import { calculateHash, formatDate, roundTo } from '@/utils/statistics';
import { sampleSkus, sampleSalesHistory, sampleInventorySnapshots, samplePromotionCalendar } from '@/data/sampleData';

interface AppState {
  skus: SKU[];
  salesHistory: SalesHistory[];
  inventorySnapshot: InventorySnapshot[];
  promotionCalendar: PromotionCalendar[];
  
  forecastResults: ForecastResult[];
  replenishmentSuggestions: ReplenishmentSuggestion[];
  anomalyRecords: AnomalyRecord[];
  
  versions: DataVersion[];
  currentVersionId: string | null;
  previousVersionId: string | null;
  
  parameters: ForecastParameters;
  
  importState: ImportState;
  
  isCalculating: boolean;
  lastCalculationHash: string | null;
  
  skuMap: Record<string, SKU>;
  leadTimeMap: Record<string, number>;
  
  importSalesData: (data: SalesHistory[]) => void;
  importInventoryData: (data: InventorySnapshot[]) => void;
  importPromotionData: (data: PromotionCalendar[]) => void;
  
  runForecast: () => void;
  updateParameters: (params: Partial<ForecastParameters>) => void;
  
  createVersion: (name: string, description: string) => string;
  compareVersions: (versionId1: string, versionId2: string) => ComparisonResult | null;
  restoreVersion: (versionId: string) => void;
  
  loadSampleData: () => void;
  loadPromotionData: () => void;
  resetAll: () => void;
  
  getHealthScore: () => InventoryHealthScore;
  getSkuStockStatus: () => Record<string, 'healthy' | 'warning' | 'shortage' | 'overstock'>;
}

const initialParameters: ForecastParameters = {
  serviceLevel: 0.95,
  forecastHorizonDays: 30,
  safetyStockMultiplier: 1.0,
  demandSurgeThreshold: 2.0,
};

const initialImportState: ImportState = {
  step: 'sales',
  salesImported: false,
  inventoryImported: false,
  promotionImported: false,
  salesRowCount: 0,
  inventoryRowCount: 0,
  promotionRowCount: 0,
};

function generateSkuMap(skus: SKU[]): Record<string, SKU> {
  const map: Record<string, SKU> = {};
  for (const sku of skus) {
    map[sku.skuId] = sku;
  }
  return map;
}

function generateLeadTimeMap(skus: SKU[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const sku of skus) {
    map[sku.skuId] = sku.leadTimeDays;
  }
  return map;
}

export const useAppStore = create<AppState>((set, get) => ({
  skus: [],
  salesHistory: [],
  inventorySnapshot: [],
  promotionCalendar: [],
  
  forecastResults: [],
  replenishmentSuggestions: [],
  anomalyRecords: [],
  
  versions: [],
  currentVersionId: null,
  previousVersionId: null,
  
  parameters: initialParameters,
  
  importState: initialImportState,
  
  isCalculating: false,
  lastCalculationHash: null,
  
  skuMap: {},
  leadTimeMap: {},
  
  importSalesData: (data) => {
    const existingSales = get().salesHistory;
    const existingSkus = get().skus;
    const newSales = [...existingSales, ...data];
    const newSkus = extractSkusFromData(newSales, get().inventorySnapshot);
    
    const mergedSkus = newSkus.map(ns => {
      const existing = existingSkus.find(s => s.skuId === ns.skuId);
      return existing || ns;
    });
    
    set({
      salesHistory: newSales,
      skus: mergedSkus,
      skuMap: generateSkuMap(mergedSkus),
      leadTimeMap: generateLeadTimeMap(mergedSkus),
      importState: {
        ...get().importState,
        salesImported: true,
        salesRowCount: newSales.length,
        step: get().importState.inventoryImported ? 'promotion' : 'inventory',
      },
    });
  },
  
  importInventoryData: (data) => {
    const existingInv = get().inventorySnapshot;
    const existingSkus = get().skus;
    const newInv = [...existingInv, ...data];
    const newSkus = extractSkusFromData(get().salesHistory, newInv);
    
    const mergedSkus = newSkus.map(ns => {
      const existing = existingSkus.find(s => s.skuId === ns.skuId);
      return existing || ns;
    });
    
    set({
      inventorySnapshot: newInv,
      skus: mergedSkus,
      skuMap: generateSkuMap(mergedSkus),
      leadTimeMap: generateLeadTimeMap(mergedSkus),
      importState: {
        ...get().importState,
        inventoryImported: true,
        inventoryRowCount: newInv.length,
        step: 'promotion',
      },
    });
  },
  
  importPromotionData: (data) => {
    set({
      promotionCalendar: data,
      importState: {
        ...get().importState,
        promotionImported: true,
        promotionRowCount: data.length,
        step: 'complete',
      },
    });
  },
  
  runForecast: () => {
    const state = get();
    if (state.skus.length === 0 || state.salesHistory.length === 0) {
      return;
    }
    
    set({ isCalculating: true });
    
    const skuIds = state.skus.map(s => s.skuId);
    const latestInventory: InventorySnapshot[] = [];
    const seenSkus = new Set<string>();
    
    const sortedInv = [...state.inventorySnapshot].sort(
      (a, b) => b.snapshotDate.localeCompare(a.snapshotDate)
    );
    
    for (const inv of sortedInv) {
      if (!seenSkus.has(inv.skuId)) {
        latestInventory.push(inv);
        seenSkus.add(inv.skuId);
      }
    }
    
    const versionId = state.currentVersionId || `v-${Date.now()}`;
    
    const { forecasts, suggestions } = batchRunForecast(
      skuIds,
      state.salesHistory,
      latestInventory,
      state.leadTimeMap,
      state.parameters,
      versionId,
      state.promotionCalendar
    );
    
    const anomalies = detectAllAnomalies(
      state.salesHistory,
      latestInventory,
      state.skuMap,
      state.parameters,
      versionId
    );
    
    const inputData = JSON.stringify({
      sales: state.salesHistory,
      inventory: latestInventory,
      promotions: state.promotionCalendar,
      params: state.parameters,
    });
    const hash = calculateHash(inputData);
    
    set({
      forecastResults: forecasts,
      replenishmentSuggestions: suggestions,
      anomalyRecords: anomalies,
      isCalculating: false,
      lastCalculationHash: hash,
    });
  },
  
  updateParameters: (params) => {
    set({
      parameters: { ...get().parameters, ...params },
    });
    
    requestAnimationFrame(() => {
      get().runForecast();
    });
  },
  
  createVersion: (name, description) => {
    const state = get();
    const versionId = `v-${Date.now()}`;
    const newVersion: DataVersion = {
      id: versionId,
      versionId,
      name,
      versionName: name,
      createdAt: formatDate(new Date()),
      description,
      hasPromotionData: state.promotionCalendar.length > 0,
      parentVersionId: state.currentVersionId || undefined,
      hash: state.lastCalculationHash || '',
      inputDataHash: state.lastCalculationHash || '',
      parameters: state.parameters,
      data: {
        skus: state.skus,
        salesHistory: state.salesHistory,
        inventorySnapshots: state.inventorySnapshot,
        promotionCalendar: state.promotionCalendar,
        replenishmentSuggestions: state.replenishmentSuggestions,
        anomalyRecords: state.anomalyRecords,
        forecastResults: state.forecastResults,
      },
    };
    
    set({
      previousVersionId: state.currentVersionId,
      currentVersionId: newVersion.versionId,
      versions: [...state.versions, newVersion],
    });
    
    return newVersion.versionId;
  },
  
  compareVersions: (versionId1, versionId2) => {
    const state = get();
    const v1 = state.versions.find(v => v.versionId === versionId1);
    const v2 = state.versions.find(v => v.versionId === versionId2);
    
    if (!v1 || !v2) return null;
    
    const suggestions1 = state.replenishmentSuggestions.filter(s => s.versionId === versionId1);
    const suggestions2 = state.replenishmentSuggestions.filter(s => s.versionId === versionId2);
    
    if (suggestions1.length === 0 || suggestions2.length === 0) return null;
    
    const impact = evaluatePromotionImpact(
      suggestions1,
      suggestions2,
      state.promotionCalendar
    );
    
    const promotionSkuIds = new Set(impact.map(i => i.skuId));
    
    const differences: ComparisonResult['differences'] = [];
    
    for (const s2 of suggestions2) {
      const s1 = suggestions1.find(s => s.skuId === s2.skuId);
      if (!s1) continue;
      
      const fields: (keyof ReplenishmentSuggestion)[] = [
        'safetyStock',
        'reorderPoint',
        'suggestedOrderQuantity',
        'stockoutProbability',
        'forecastedDemand',
      ];
      
      for (const field of fields) {
        const v1Val = s1[field];
        const v2Val = s2[field];
        
        if (typeof v1Val === 'number' && typeof v2Val === 'number' && v1Val !== v2Val) {
          const changeType = v2Val > v1Val ? 'increase' : 'decrease';
          const changePercentage = v1Val !== 0 ? roundTo(((v2Val - v1Val) / v1Val) * 100, 2) : undefined;
          
          differences.push({
            skuId: s2.skuId,
            field,
            value1: v1Val,
            value2: v2Val,
            changeType,
            changePercentage,
          });
        }
      }
    }
    
    const changedSkus = new Set(differences.map(d => d.skuId));
    const avgImpact = impact.length > 0
      ? impact.reduce((sum, i) => sum + i.impactPercentage, 0) / impact.length
      : 0;
    
    const totalQty1 = suggestions1.reduce((sum, s) => sum + s.suggestedOrderQuantity, 0);
    const totalQty2 = suggestions2.reduce((sum, s) => sum + s.suggestedOrderQuantity, 0);
    const totalValue1 = suggestions1.reduce((sum, s) => {
      const sku = state.skuMap[s.skuId];
      return sum + s.suggestedOrderQuantity * (sku?.unitCost ?? 0);
    }, 0);
    const totalValue2 = suggestions2.reduce((sum, s) => {
      const sku = state.skuMap[s.skuId];
      return sum + s.suggestedOrderQuantity * (sku?.unitCost ?? 0);
    }, 0);
    
    const skuComparisons = suggestions2.map(s2 => {
      const s1 = suggestions1.find(s => s.skuId === s2.skuId);
      const promotionImpact = impact.find(i => i.skuId === s2.skuId);
      return {
        skuId: s2.skuId,
        left: s1!,
        right: s2,
        promotionImpact,
      };
    }).filter(s => s.left);
    
    const statusChangedCount = skuComparisons.filter(sc => {
      const leftStock = sc.left.currentStock + sc.left.onOrderStock;
      const rightStock = sc.right.currentStock + sc.right.onOrderStock;
      const leftStatus = leftStock >= sc.left.safetyStock ? 'healthy' : leftStock >= 0 ? 'warning' : 'critical';
      const rightStatus = rightStock >= sc.right.safetyStock ? 'healthy' : rightStock >= 0 ? 'warning' : 'critical';
      return leftStatus !== rightStatus;
    }).length;
    
    const healthScore1 = state.getHealthScore();
    const healthScore2 = state.getHealthScore();
    
    return {
      version1: v1,
      version2: v2,
      differences,
      promotionAffectedSkus: Array.from(promotionSkuIds),
      summary: {
        totalSkus: state.skus.length,
        changedSkus: changedSkus.size,
        avgImpactPercentage: avgImpact,
      },
      healthScoreChange: {
        leftOverall: healthScore1.overall,
        rightOverall: healthScore2.overall,
      },
      totalOrderQuantityChange: {
        left: totalQty1,
        right: totalQty2,
        change: totalQty2 - totalQty1,
      },
      totalOrderValueChange: {
        left: totalValue1,
        right: totalValue2,
        change: totalValue2 - totalValue1,
      },
      affectedByPromotionCount: impact.length,
      statusChangedCount,
      skuComparisons,
    };
  },
  
  restoreVersion: (versionId) => {
    set({ currentVersionId: versionId });
    get().runForecast();
  },
  
  loadSampleData: () => {
    const skus = sampleSkus;
    set({
      skus,
      salesHistory: sampleSalesHistory,
      inventorySnapshot: sampleInventorySnapshots,
      skuMap: generateSkuMap(skus),
      leadTimeMap: generateLeadTimeMap(skus),
      importState: {
        step: 'promotion',
        salesImported: true,
        inventoryImported: true,
        promotionImported: false,
        salesRowCount: sampleSalesHistory.length,
        inventoryRowCount: sampleInventorySnapshots.length,
        promotionRowCount: 0,
      },
    });
    
    requestAnimationFrame(() => {
      get().runForecast();
    });
  },
  
  loadPromotionData: () => {
    set({
      promotionCalendar: samplePromotionCalendar,
      importState: {
        ...get().importState,
        promotionImported: true,
        promotionRowCount: samplePromotionCalendar.length,
        step: 'complete',
      },
    });
    
    requestAnimationFrame(() => {
      get().runForecast();
    });
  },
  
  resetAll: () => {
    set({
      skus: [],
      salesHistory: [],
      inventorySnapshot: [],
      promotionCalendar: [],
      forecastResults: [],
      replenishmentSuggestions: [],
      anomalyRecords: [],
      versions: [],
      currentVersionId: null,
      previousVersionId: null,
      parameters: initialParameters,
      importState: initialImportState,
      isCalculating: false,
      lastCalculationHash: null,
      skuMap: {},
      leadTimeMap: {},
    });
  },
  
  getHealthScore: () => {
    const state = get();
    const suggestions = state.replenishmentSuggestions;
    
    if (suggestions.length === 0) {
      return {
        overall: 0,
        stockoutRisk: 0,
        overstockRisk: 0,
        capitalEfficiency: 0,
        turnoverScore: 0,
      };
    }
    
    let shortageCount = 0;
    let overstockCount = 0;
    let totalValue = 0;
    let overstockValue = 0;
    let totalTurnover = 0;
    
    for (const s of suggestions) {
      const sku = state.skuMap[s.skuId];
      const availableStock = s.currentStock;
      const unitCost = sku?.unitCost ?? 0;
      
      if (availableStock < s.safetyStock * 0.5) {
        shortageCount++;
      }
      
      const daysOfStock = s.forecastedDemand > 0
        ? (availableStock + s.onOrderStock) / s.forecastedDemand * 7
        : 0;
      
      if (daysOfStock > 60) {
        overstockCount++;
        overstockValue += availableStock * unitCost;
      }
      
      totalValue += availableStock * unitCost;
      
      if (s.forecastedDemand > 0 && availableStock > 0) {
        totalTurnover += s.forecastedDemand * 30 / availableStock;
      }
    }
    
    const stockoutRisk = 100 - (shortageCount / suggestions.length) * 100;
    const overstockRisk = 100 - (overstockCount / suggestions.length) * 100;
    const capitalEfficiency = totalValue > 0 ? 100 - (overstockValue / totalValue) * 100 : 100;
    const turnoverScore = Math.min(100, (totalTurnover / suggestions.length) * 20);
    
    const overall = (stockoutRisk * 0.35 + overstockRisk * 0.25 + capitalEfficiency * 0.25 + turnoverScore * 0.15);
    
    return {
      overall: roundTo(overall, 1),
      stockoutRisk: roundTo(stockoutRisk, 1),
      overstockRisk: roundTo(overstockRisk, 1),
      capitalEfficiency: roundTo(capitalEfficiency, 1),
      turnoverScore: roundTo(turnoverScore, 1),
    };
  },
  
  getSkuStockStatus: () => {
    const state = get();
    const statusMap: Record<string, 'healthy' | 'warning' | 'shortage' | 'overstock'> = {};
    
    for (const s of state.replenishmentSuggestions) {
      const availableStock = s.currentStock;
      const daysOfStock = s.forecastedDemand > 0
        ? (availableStock + s.onOrderStock) / s.forecastedDemand * 7
        : 0;
      
      if (availableStock < 0) {
        statusMap[s.skuId] = 'shortage';
      } else if (availableStock < s.safetyStock * 0.5) {
        statusMap[s.skuId] = 'shortage';
      } else if (availableStock < s.safetyStock) {
        statusMap[s.skuId] = 'warning';
      } else if (daysOfStock > 60) {
        statusMap[s.skuId] = 'overstock';
      } else {
        statusMap[s.skuId] = 'healthy';
      }
    }
    
    return statusMap;
  },
}));
