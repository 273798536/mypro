import type { Asset } from '../types/asset';
import type { Anomaly, CategoryResult, ResultCategory } from '../types/analysis';
import { getAssetAnomalies, hasFilterFailure } from './anomalyDetector';

export function classifyAssets(
  assets: Asset[],
  anomalies: Anomaly[]
): CategoryResult {
  const ready: Asset[] = [];
  const needReview: Asset[] = [];
  const filterFailed: Asset[] = [];
  
  const filterHasFailed = hasFilterFailure(anomalies);
  
  for (const asset of assets) {
    const assetAnomalies = getAssetAnomalies(asset, anomalies);
    
    if (filterHasFailed && assetAnomalies.some(a => a.type === 'filter_failure')) {
      filterFailed.push(asset);
      continue;
    }
    
    const hasOcclusion = assetAnomalies.some(a => a.type === 'occlusion');
    const hasWeightIssue = assetAnomalies.some(a => a.type === 'weight');
    
    if (hasOcclusion || hasWeightIssue || asset.isOccluded || asset.hasWeightAnomaly) {
      needReview.push(asset);
      continue;
    }
    
    if (asset.weight !== 0) {
      ready.push(asset);
    }
  }
  
  return {
    ready,
    needReview,
    filterFailed,
  };
}

export function getCategoryColor(category: ResultCategory): string {
  const colors: Record<ResultCategory, string> = {
    ready: '#00D4AA',
    needReview: '#FFD700',
    filterFailed: '#DC143C',
  };
  return colors[category];
}

export function getCategoryLabel(category: ResultCategory): string {
  const labels: Record<ResultCategory, string> = {
    ready: '可直接用',
    needReview: '需研究员确认',
    filterFailed: '筛选失效',
  };
  return labels[category];
}

export function getCategoryIcon(category: ResultCategory): string {
  const icons: Record<ResultCategory, string> = {
    ready: 'check-circle',
    needReview: 'alert-triangle',
    filterFailed: 'x-circle',
  };
  return icons[category];
}

export function getCategoryDescription(category: ResultCategory): string {
  const descriptions: Record<ResultCategory, string> = {
    ready: '无异常，权重正常，筛选有效，可直接使用',
    needReview: '存在异常（权重异常、风险遮挡、接近阈值等问题',
    filterFailed: '行业筛选后样本不足或过度集中，暂时不能算',
  };
  return descriptions[category];
}

export function getAssetCategory(
  asset: Asset,
  anomalies: Anomaly[]
): ResultCategory {
  const assetAnomalies = getAssetAnomalies(asset, anomalies);
  
  if (assetAnomalies.some(a => a.type === 'filter_failure')) {
    return 'filterFailed';
  }
  
  const hasIssues = assetAnomalies.length > 0 || asset.isOccluded || asset.hasWeightAnomaly;
  
  if (hasIssues) {
    return 'needReview';
  }
  
  return 'ready';
}

export function getCategoryStats(categories: CategoryResult) {
  const total = categories.ready.length + categories.needReview.length + categories.filterFailed.length;
  return {
    total,
    ready: categories.ready.length,
    needReview: categories.needReview.length,
    filterFailed: categories.filterFailed.length,
    readyPercent: total > 0 ? (categories.ready.length / total) : 0,
    needReviewPercent: total > 0 ? (categories.needReview.length / total) : 0,
    filterFailedPercent: total > 0 ? (categories.filterFailed.length / total) : 0,
  };
}
