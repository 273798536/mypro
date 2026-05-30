import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type {
  ReplenishmentSuggestion,
  AnomalyRecord,
  ForecastResult,
  ComparisonResult,
  SKU,
  InventoryHealthScore,
} from '@/types';
import { roundTo } from '../statistics';

export function exportToCSV<T>(data: T[], filename: string): void {
  const csv = Papa.unparse(data);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

export function exportToExcel(
  sheets: { name: string; data: any[] }[],
  filename: string
): void {
  const wb = XLSX.utils.book_new();
  
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatReplenishmentForExport(
  suggestions: ReplenishmentSuggestion[],
  skuMap: Record<string, SKU>
): any[] {
  return suggestions.map(s => {
    const sku = skuMap[s.skuId];
    const unitCost = sku?.unitCost ?? 0;
    
    return {
      'SKU编码': s.skuId,
      'SKU名称': sku?.skuName ?? s.skuId,
      '分类': sku?.category ?? '未分类',
      '当前库存': s.currentStock,
      '在途库存': s.onOrderStock,
      '预测需求': s.forecastedDemand,
      '安全库存': s.safetyStock,
      '再订货点': s.reorderPoint,
      '建议补货量': s.suggestedOrderQuantity,
      '建议补货日期': s.suggestedOrderDate,
      '预计到货日期': s.expectedArrivalDate,
      '服务水平': `${(s.serviceLevel * 100).toFixed(0)}%`,
      '缺货概率': `${(s.stockoutProbability * 100).toFixed(2)}%`,
      '补货成本': `¥${roundTo(s.suggestedOrderQuantity * unitCost, 2)}`,
      '促销影响': s.affectedByPromotion ? '是' : '否',
      '促销影响比例': s.promotionImpact ? `${s.promotionImpact.impactPercentage}%` : '-',
      '库存状态': getStockStatus(s),
    };
  });
}

function getStockStatus(s: ReplenishmentSuggestion): string {
  const availableStock = s.currentStock - (s.currentStock > 0 ? 0 : 0);
  const daysOfStock = s.forecastedDemand > 0 
    ? (availableStock + s.onOrderStock) / s.forecastedDemand * 7
    : Infinity;
  
  if (availableStock < 0) return '负库存';
  if (availableStock < s.safetyStock * 0.5) return '缺货';
  if (availableStock < s.safetyStock) return '预警';
  if (daysOfStock > 60) return '积压';
  return '健康';
}

export function formatAnomaliesForExport(
  anomalies: AnomalyRecord[],
  skuMap: Record<string, SKU>
): any[] {
  const typeLabels: Record<string, string> = {
    demand_surge: '需求突增',
    delivery_delay: '到货延迟',
    negative_stock: '负库存',
  };
  
  const severityLabels: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重',
  };
  
  return anomalies.map(a => ({
    '异常类型': typeLabels[a.anomalyType] ?? a.anomalyType,
    '严重程度': severityLabels[a.severity] ?? a.severity,
    'SKU编码': a.skuId,
    'SKU名称': skuMap[a.skuId]?.skuName ?? a.skuId,
    '检测日期': a.detectionDate,
    '问题描述': a.description,
    '影响评估': a.impactAssessment,
    '处理建议': a.recommendation,
  }));
}

export function formatComparisonForExport(
  comparison: ComparisonResult,
  skuMap: Record<string, SKU>
): any[] {
  const fieldLabels: Record<string, string> = {
    safetyStock: '安全库存',
    reorderPoint: '再订货点',
    suggestedOrderQuantity: '建议补货量',
    stockoutProbability: '缺货概率',
    forecastedDemand: '预测需求',
  };
  
  const changeTypeLabels: Record<string, string> = {
    increase: '增加',
    decrease: '减少',
    added: '新增',
    removed: '移除',
  };
  
  return comparison.differences.map(d => {
    const sku = skuMap[d.skuId];
    const isPromotionAffected = comparison.promotionAffectedSkus.includes(d.skuId);
    
    let formattedValue1 = d.value1;
    let formattedValue2 = d.value2;
    
    if (d.field === 'stockoutProbability') {
      formattedValue1 = `${(Number(d.value1) * 100).toFixed(2)}%`;
      formattedValue2 = `${(Number(d.value2) * 100).toFixed(2)}%`;
    }
    
    return {
      'SKU编码': d.skuId,
      'SKU名称': sku?.skuName ?? d.skuId,
      '受促销影响': isPromotionAffected ? '是' : '否',
      '字段': fieldLabels[d.field] ?? d.field,
      [`${comparison.version1.versionName}值`]: formattedValue1,
      [`${comparison.version2.versionName}值`]: formattedValue2,
      '变化类型': changeTypeLabels[d.changeType] ?? d.changeType,
      '变化比例': d.changePercentage ? `${d.changePercentage}%` : '-',
    };
  });
}

export function exportFullReport(
  suggestions: ReplenishmentSuggestion[],
  anomalies: AnomalyRecord[],
  forecasts: ForecastResult[],
  skus: SKU[],
  healthScore: InventoryHealthScore,
  versionName: string
): void {
  const skuMap: Record<string, SKU> = {};
  for (const sku of skus) {
    skuMap[sku.skuId] = sku;
  }
  
  const summarySheet = [{
    '报告名称': `库存补货分析报告 - ${versionName}`,
    '生成时间': new Date().toLocaleString('zh-CN'),
    'SKU总数': skus.length,
    '需补货SKU数': suggestions.filter(s => s.suggestedOrderQuantity > 0).length,
    '异常SKU数': new Set(anomalies.map(a => a.skuId)).size,
    '库存健康度': `${healthScore.overall.toFixed(1)}分`,
    '缺货风险': `${healthScore.stockoutRisk.toFixed(1)}分`,
    '积压风险': `${healthScore.overstockRisk.toFixed(1)}分`,
    '总补货成本': `¥${roundTo(
      suggestions.reduce((sum, s) => sum + s.suggestedOrderQuantity * (skuMap[s.skuId]?.unitCost ?? 0), 0),
      2
    )}`,
  }];
  
  const replenishmentSheet = formatReplenishmentForExport(suggestions, skuMap);
  const anomalySheet = formatAnomaliesForExport(anomalies, skuMap);
  
  const forecastSheet = forecasts.map(f => ({
    'SKU编码': f.skuId,
    'SKU名称': skuMap[f.skuId]?.skuName ?? f.skuId,
    '预测日期': f.forecastDate,
    '预测均值': f.forecastMean,
    '95%置信下限': f.forecastLower95,
    '95%置信上限': f.forecastUpper95,
    '标准差': f.standardDeviation,
    '预测模型': f.modelUsed,
  }));
  
  exportToExcel(
    [
      { name: '报告概览', data: summarySheet },
      { name: '补货建议', data: replenishmentSheet },
      { name: '异常分析', data: anomalySheet },
      { name: '预测明细', data: forecastSheet },
    ],
    `库存补货报告_${versionName}_${new Date().toISOString().split('T')[0]}.xlsx`
  );
}

export function exportComparisonReport(
  comparison: ComparisonResult,
  version1Name: string,
  version2Name: string,
): void {
  const suggestions1 = comparison.version1.data.replenishmentSuggestions;
  const suggestions2 = comparison.version2.data.replenishmentSuggestions;
  const anomalies1 = comparison.version1.data.anomalyRecords;
  const anomalies2 = comparison.version2.data.anomalyRecords;
  const skus = comparison.version1.data.skus;
  const skuMap: Record<string, SKU> = {};
  for (const sku of skus) {
    skuMap[sku.skuId] = sku;
  }
  
  const summarySheet = [{
    '对比报告': '促销日历影响分析',
    '版本1': version1Name,
    '版本2': version2Name,
    '对比时间': new Date().toLocaleString('zh-CN'),
    'SKU总数': comparison.summary.totalSkus,
    '变化SKU数': comparison.summary.changedSkus,
    '受促销影响SKU数': comparison.promotionAffectedSkus.length,
    '平均影响比例': `${comparison.summary.avgImpactPercentage.toFixed(2)}%`,
    '版本1异常数': anomalies1.length,
    '版本2异常数': anomalies2.length,
    '版本1需补货SKU数': suggestions1.filter(s => s.suggestedOrderQuantity > 0).length,
    '版本2需补货SKU数': suggestions2.filter(s => s.suggestedOrderQuantity > 0).length,
  }];
  
  const comparisonSheet = formatComparisonForExport(comparison, skuMap);
  const v1Replenishment = formatReplenishmentForExport(suggestions1, skuMap);
  const v2Replenishment = formatReplenishmentForExport(suggestions2, skuMap);
  
  exportToExcel(
    [
      { name: '对比概览', data: summarySheet },
      { name: '变化明细', data: comparisonSheet },
      { name: `版本1_${comparison.version1.versionName}`, data: v1Replenishment },
      { name: `版本2_${comparison.version2.versionName}`, data: v2Replenishment },
    ],
    `版本对比报告_${comparison.version1.versionName}_vs_${comparison.version2.versionName}.xlsx`
  );
}
