import {
  mean,
  standardDeviation,
  zScore,
  normalCDF,
  poissonCDF,
  poissonQuantile,
  movingAverage,
  autoSelectModel,
  roundTo,
  addDays,
  formatDate,
} from '../statistics';
import type {
  SalesHistory,
  InventorySnapshot,
  PromotionCalendar,
  ForecastResult,
  ReplenishmentSuggestion,
  ForecastModel,
  ForecastParameters,
} from '@/types';

export interface NormalForecastOutput {
  mean: number;
  stdDev: number;
  safetyStock: number;
  reorderPoint: number;
  forecastLower: number;
  forecastUpper: number;
  stockoutProbability: number;
}

export function normalDistributionForecast(
  historicalDemand: number[],
  leadTimeDays: number,
  serviceLevel: number = 0.95
): NormalForecastOutput {
  const demandMean = mean(historicalDemand);
  const demandStdDev = standardDeviation(historicalDemand);
  
  const z = zScore(serviceLevel);
  const leadTimeDemandMean = demandMean * leadTimeDays;
  const leadTimeDemandStdDev = demandStdDev * Math.sqrt(leadTimeDays);
  
  const safetyStock = roundTo(z * leadTimeDemandStdDev, 2);
  const reorderPoint = roundTo(leadTimeDemandMean + safetyStock, 2);
  
  const forecastLower = roundTo(Math.max(0, leadTimeDemandMean - 1.96 * leadTimeDemandStdDev), 2);
  const forecastUpper = roundTo(leadTimeDemandMean + 1.96 * leadTimeDemandStdDev, 2);
  
  const stockoutProbability = roundTo(1 - normalCDF(reorderPoint, leadTimeDemandMean, leadTimeDemandStdDev), 4);
  
  return {
    mean: roundTo(demandMean, 2),
    stdDev: roundTo(demandStdDev, 2),
    safetyStock,
    reorderPoint,
    forecastLower,
    forecastUpper,
    stockoutProbability,
  };
}

export interface PoissonForecastOutput {
  lambda: number;
  safetyStock: number;
  reorderPoint: number;
  forecastLower: number;
  forecastUpper: number;
  stockoutProbability: number;
}

export function poissonDistributionForecast(
  historicalDemand: number[],
  leadTimeDays: number,
  serviceLevel: number = 0.95
): PoissonForecastOutput {
  const dailyMean = mean(historicalDemand);
  const lambda = dailyMean * leadTimeDays;
  
  const reorderPoint = poissonQuantile(serviceLevel, lambda);
  const safetyStock = roundTo(Math.max(0, reorderPoint - lambda), 2);
  
  const forecastLower = Math.max(0, Math.floor(lambda - Math.sqrt(lambda) * 1.96));
  const forecastUpper = Math.ceil(lambda + Math.sqrt(lambda) * 1.96);
  
  const stockoutProbability = roundTo(1 - poissonCDF(reorderPoint, lambda), 4);
  
  return {
    lambda: roundTo(lambda, 2),
    safetyStock,
    reorderPoint,
    forecastLower,
    forecastUpper,
    stockoutProbability,
  };
}

export interface MovingAverageForecastOutput {
  forecast: number;
  trend: number;
  safetyStock: number;
  reorderPoint: number;
  forecastLower: number;
  forecastUpper: number;
  stockoutProbability: number;
}

function calculateMAPE(actual: number[], forecast: number[]): number {
  if (actual.length === 0 || forecast.length === 0) return 0;
  const n = Math.min(actual.length, forecast.length);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (actual[i] !== 0) {
      sum += Math.abs((actual[i] - forecast[i]) / actual[i]);
      count++;
    }
  }
  return count > 0 ? (sum / count) * 100 : 0;
}

export function movingAverageForecast(
  historicalDemand: number[],
  leadTimeDays: number,
  windowSize: number = 7,
  serviceLevel: number = 0.95
): MovingAverageForecastOutput {
  const ma = movingAverage(historicalDemand, windowSize);
  const latestForecast = ma.length > 0 ? ma[ma.length - 1] : mean(historicalDemand);
  
  const residuals: number[] = [];
  for (let i = windowSize; i < historicalDemand.length; i++) {
    const maIdx = i - windowSize;
    if (maIdx < ma.length) {
      residuals.push(historicalDemand[i] - ma[maIdx]);
    }
  }
  
  const residualStdDev = standardDeviation(residuals);
  const z = zScore(serviceLevel);
  
  const leadTimeDemand = latestForecast * leadTimeDays;
  const leadTimeStdDev = residualStdDev * Math.sqrt(leadTimeDays);
  
  const safetyStock = roundTo(z * leadTimeStdDev, 2);
  const reorderPoint = roundTo(leadTimeDemand + safetyStock, 2);
  
  const trend = ma.length >= 2 ? roundTo(ma[ma.length - 1] - ma[ma.length - 2], 2) : 0;
  
  const forecastLower = roundTo(Math.max(0, leadTimeDemand - 1.96 * leadTimeStdDev), 2);
  const forecastUpper = roundTo(leadTimeDemand + 1.96 * leadTimeStdDev, 2);
  
  const stockoutProbability = roundTo(1 - normalCDF(reorderPoint, leadTimeDemand, leadTimeStdDev), 4);
  
  return {
    forecast: roundTo(latestForecast, 2),
    trend,
    safetyStock,
    reorderPoint,
    forecastLower,
    forecastUpper,
    stockoutProbability,
  };
}

export function runForecastForSku(
  skuId: string,
  salesHistory: SalesHistory[],
  inventory: InventorySnapshot | undefined,
  leadTimeDays: number,
  parameters: ForecastParameters,
  versionId: string,
  promotionCalendar: PromotionCalendar[] = [],
  forecastDate: string = formatDate(new Date())
): {
  forecast: ForecastResult;
  suggestion: ReplenishmentSuggestion;
} {
  const skuSales = salesHistory
    .filter(s => s.skuId === skuId)
    .sort((a, b) => a.salesDate.localeCompare(b.salesDate));
  
  const historicalDemand = skuSales.map(s => s.quantitySold);
  
  const hasPromotion = promotionCalendar.some(p => 
    p.skuId === skuId && 
    p.isActive && 
    p.startDate <= forecastDate && 
    p.endDate >= forecastDate
  );
  
  if (historicalDemand.length === 0) {
    const zeroForecast: ForecastResult = {
      id: `forecast-${skuId}-${Date.now()}`,
      skuId,
      forecastDate,
      forecastMean: 0,
      forecastStd: 0,
      forecastLower95: 0,
      forecastUpper95: 0,
      standardDeviation: 0,
      modelUsed: 'poisson',
      versionId,
      historicalDemand: [],
      zValue: zScore(parameters?.serviceLevel ?? 0.95),
      mape: 0,
      safetyStock: 0,
      reorderPoint: 0,
      affectedByPromotion: false,
    };
    
    const currentStock = inventory?.currentStock ?? 0;
    const onOrderStock = inventory?.onOrderStock ?? 0;
    
    const zeroSuggestion: ReplenishmentSuggestion = {
      id: `suggestion-${skuId}-${Date.now()}`,
      skuId,
      safetyStock: 0,
      reorderPoint: 0,
      suggestedOrderQuantity: 0,
      suggestedOrderDate: forecastDate,
      expectedArrivalDate: addDays(forecastDate, leadTimeDays),
      serviceLevel: parameters.serviceLevel,
      stockoutProbability: 0,
      versionId,
      affectedByPromotion: false,
      currentStock,
      onOrderStock,
      forecastedDemand: 0,
    };
    
    return { forecast: zeroForecast, suggestion: zeroSuggestion };
  }
  
  const activePromotions = promotionCalendar.filter(p => {
    if (p.skuId !== skuId || !p.isActive) return false;
    const today = new Date(forecastDate);
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    return today >= start && today <= end;
  });
  
  let adjustedDemand = [...historicalDemand];
  let promotionMultiplier = 1;
  
  if (activePromotions.length > 0) {
    const avgLift = activePromotions.reduce((sum, p) => sum + p.expectedLift, 0) / activePromotions.length;
    promotionMultiplier = 1 + avgLift;
    adjustedDemand = historicalDemand.map(d => d * promotionMultiplier);
  }
  
  const model = autoSelectModel(adjustedDemand);
  
  let forecastResult;
  let demandForecast: number;
  let safetyStock: number;
  let reorderPoint: number;
  let forecastLower95: number;
  let forecastUpper95: number;
  let stdDev: number;
  let stockoutProbability: number;
  
  switch (model) {
    case 'normal': {
      const result = normalDistributionForecast(adjustedDemand, leadTimeDays, parameters.serviceLevel);
      forecastResult = result;
      demandForecast = result.mean * leadTimeDays;
      safetyStock = result.safetyStock * parameters.safetyStockMultiplier;
      reorderPoint = result.reorderPoint;
      forecastLower95 = result.forecastLower;
      forecastUpper95 = result.forecastUpper;
      stdDev = result.stdDev;
      stockoutProbability = result.stockoutProbability;
      break;
    }
    case 'poisson': {
      const result = poissonDistributionForecast(adjustedDemand, leadTimeDays, parameters.serviceLevel);
      forecastResult = result;
      demandForecast = result.lambda;
      safetyStock = result.safetyStock * parameters.safetyStockMultiplier;
      reorderPoint = result.reorderPoint;
      forecastLower95 = result.forecastLower;
      forecastUpper95 = result.forecastUpper;
      stdDev = Math.sqrt(result.lambda);
      stockoutProbability = result.stockoutProbability;
      break;
    }
    case 'moving_average':
    default: {
      const result = movingAverageForecast(adjustedDemand, leadTimeDays, 7, parameters.serviceLevel);
      forecastResult = result;
      demandForecast = result.forecast * leadTimeDays;
      safetyStock = result.safetyStock * parameters.safetyStockMultiplier;
      reorderPoint = result.reorderPoint;
      forecastLower95 = result.forecastLower;
      forecastUpper95 = result.forecastUpper;
      stdDev = Math.sqrt(variance(adjustedDemand));
      stockoutProbability = result.stockoutProbability;
      break;
    }
  }
  
  const currentStock = inventory?.currentStock ?? 0;
  const onOrderStock = inventory?.onOrderStock ?? 0;
  const reservedStock = inventory?.reservedStock ?? 0;
  const availableStock = currentStock - reservedStock;
  
  let suggestedOrderQuantity = Math.max(0, Math.ceil(reorderPoint - availableStock - onOrderStock));
  
  const suggestedOrderDate = forecastDate;
  const expectedArrivalDate = addDays(forecastDate, leadTimeDays);
  
  const forecast: ForecastResult = {
    id: `forecast-${skuId}-${Date.now()}`,
    skuId,
    forecastDate,
    forecastMean: roundTo(demandForecast, 2),
    forecastStd: roundTo(stdDev, 2),
    forecastLower95: roundTo(forecastLower95, 2),
    forecastUpper95: roundTo(forecastUpper95, 2),
    standardDeviation: roundTo(stdDev, 2),
    modelUsed: model,
    versionId,
    historicalDemand: adjustedDemand,
    zValue: zScore(parameters.serviceLevel),
    mape: roundTo(calculateMAPE(historicalDemand, movingAverage(historicalDemand, 7)), 2),
    safetyStock: roundTo(safetyStock, 2),
    reorderPoint: roundTo(reorderPoint, 2),
    affectedByPromotion: hasPromotion,
  };
  
  const suggestion: ReplenishmentSuggestion = {
    id: `suggestion-${skuId}-${Date.now()}`,
    skuId,
    safetyStock: roundTo(safetyStock, 2),
    reorderPoint: roundTo(reorderPoint, 2),
    suggestedOrderQuantity,
    suggestedOrderDate,
    expectedArrivalDate,
    serviceLevel: parameters.serviceLevel,
    stockoutProbability,
    versionId,
    affectedByPromotion: activePromotions.length > 0,
    currentStock,
    onOrderStock,
    forecastedDemand: roundTo(demandForecast, 2),
  };
  
  if (activePromotions.length > 0) {
    const baseResult = normalDistributionForecast(historicalDemand, leadTimeDays, parameters.serviceLevel);
    const baseSafetyStock = baseResult.safetyStock * parameters.safetyStockMultiplier;
    const baseReorderPoint = baseResult.reorderPoint;
    const baseOrderQty = Math.max(0, Math.ceil(baseReorderPoint - availableStock - onOrderStock));
    
    suggestion.promotionImpact = {
      skuId,
      impactPercentage: roundTo(((safetyStock - baseSafetyStock) / baseSafetyStock) * 100, 2),
      fieldChanges: [
        { field: 'safetyStock', oldValue: roundTo(baseSafetyStock, 2), newValue: roundTo(safetyStock, 2) },
        { field: 'reorderPoint', oldValue: roundTo(baseReorderPoint, 2), newValue: roundTo(reorderPoint, 2) },
        { field: 'suggestedOrderQuantity', oldValue: baseOrderQty, newValue: suggestedOrderQuantity },
      ],
    };
  }
  
  return { forecast, suggestion };
}

function variance(data: number[]): number {
  if (data.length < 2) return 0;
  const m = mean(data);
  const squaredDiffs = data.map((val) => Math.pow(val - m, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
}

export function batchRunForecast(
  skuIds: string[],
  salesHistory: SalesHistory[],
  inventorySnapshots: InventorySnapshot[],
  leadTimeMap: Record<string, number>,
  parameters: ForecastParameters,
  versionId: string,
  promotionCalendar: PromotionCalendar[] = []
): {
  forecasts: ForecastResult[];
  suggestions: ReplenishmentSuggestion[];
} {
  const forecasts: ForecastResult[] = [];
  const suggestions: ReplenishmentSuggestion[] = [];
  
  for (const skuId of skuIds) {
    const inventory = inventorySnapshots.find(i => i.skuId === skuId);
    const leadTimeDays = leadTimeMap[skuId] ?? 7;
    
    const result = runForecastForSku(
      skuId,
      salesHistory,
      inventory,
      leadTimeDays,
      parameters,
      versionId,
      promotionCalendar
    );
    
    forecasts.push(result.forecast);
    suggestions.push(result.suggestion);
  }
  
  return { forecasts, suggestions };
}

export function evaluatePromotionImpact(
  originalSuggestions: ReplenishmentSuggestion[],
  newSuggestions: ReplenishmentSuggestion[],
  promotionCalendar: PromotionCalendar[]
): {
  skuId: string;
  impactPercentage: number;
  fieldChanges: { field: string; oldValue: number; newValue: number }[];
}[] {
  const promotionSkus = new Set(promotionCalendar.filter(p => p.isActive).map(p => p.skuId));
  
  const impactList: {
    skuId: string;
    impactPercentage: number;
    fieldChanges: { field: string; oldValue: number; newValue: number }[];
  }[] = [];
  
  for (const newSugg of newSuggestions) {
    if (!promotionSkus.has(newSugg.skuId)) continue;
    
    const oldSugg = originalSuggestions.find(o => o.skuId === newSugg.skuId);
    if (!oldSugg) continue;
    
    const fieldChanges: { field: string; oldValue: number; newValue: number }[] = [];
    
    if (oldSugg.safetyStock !== newSugg.safetyStock) {
      fieldChanges.push({
        field: 'safetyStock',
        oldValue: oldSugg.safetyStock,
        newValue: newSugg.safetyStock,
      });
    }
    
    if (oldSugg.reorderPoint !== newSugg.reorderPoint) {
      fieldChanges.push({
        field: 'reorderPoint',
        oldValue: oldSugg.reorderPoint,
        newValue: newSugg.reorderPoint,
      });
    }
    
    if (oldSugg.suggestedOrderQuantity !== newSugg.suggestedOrderQuantity) {
      fieldChanges.push({
        field: 'suggestedOrderQuantity',
        oldValue: oldSugg.suggestedOrderQuantity,
        newValue: newSugg.suggestedOrderQuantity,
      });
    }
    
    if (oldSugg.stockoutProbability !== newSugg.stockoutProbability) {
      fieldChanges.push({
        field: 'stockoutProbability',
        oldValue: oldSugg.stockoutProbability,
        newValue: newSugg.stockoutProbability,
      });
    }
    
    const impactPercentage = oldSugg.safetyStock > 0
      ? roundTo(((newSugg.safetyStock - oldSugg.safetyStock) / oldSugg.safetyStock) * 100, 2)
      : newSugg.safetyStock > 0 ? 100 : 0;
    
    if (fieldChanges.length > 0) {
      impactList.push({
        skuId: newSugg.skuId,
        impactPercentage,
        fieldChanges,
      });
    }
  }
  
  return impactList;
}

export function generateForecastSeries(
  historicalDemand: number[],
  forecastHorizon: number = 30,
  model: ForecastModel = 'normal'
): {
  dates: string[];
  historical: (number | null)[];
  forecastMean: (number | null)[];
  forecastLower: (number | null)[];
  forecastUpper: (number | null)[];
} {
  const today = new Date();
  const dates: string[] = [];
  const historical: (number | null)[] = [];
  const forecastMean: (number | null)[] = [];
  const forecastLower: (number | null)[] = [];
  const forecastUpper: (number | null)[] = [];
  
  for (let i = historicalDemand.length - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i - 1);
    dates.push(formatDate(d));
    historical.push(historicalDemand[historicalDemand.length - 1 - i]);
    forecastMean.push(null);
    forecastLower.push(null);
    forecastUpper.push(null);
  }
  
  const demandMean = mean(historicalDemand);
  const demandStd = standardDeviation(historicalDemand);
  
  for (let i = 0; i < forecastHorizon; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(formatDate(d));
    historical.push(null);
    
    const dayMean = demandMean;
    const dayStd = demandStd * Math.sqrt(i + 1);
    
    forecastMean.push(roundTo(dayMean, 2));
    forecastLower.push(roundTo(Math.max(0, dayMean - 1.96 * dayStd), 2));
    forecastUpper.push(roundTo(dayMean + 1.96 * dayStd, 2));
  }
  
  return { dates, historical, forecastMean, forecastLower, forecastUpper };
}
