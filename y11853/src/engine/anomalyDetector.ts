import type { Asset } from '../types/asset';
import type { Anomaly } from '../types/analysis';
import { distance3D, calculateConcentration } from '../utils/math';

export function detectOcclusions(
  assets: Asset[],
  threshold: number = 0.5
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const checkedPairs = new Set<string>();
  
  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      const pairKey = `${i}-${j}`;
      if (checkedPairs.has(pairKey)) continue;
      
      const asset1 = assets[i];
      const asset2 = assets[j];
      
      if (asset1.weight === 0 || asset2.weight === 0) continue;
      
      const dist = distance3D(asset1.position, asset2.position);
      
      if (dist < threshold && asset1.riskLevel !== asset2.riskLevel) {
        checkedPairs.add(pairKey);
        
        asset1.isOccluded = true;
        asset2.isOccluded = true;
        
        anomalies.push({
          type: 'occlusion',
          severity: 'warning',
          assetIds: [asset1.id, asset2.id],
          description: `资产 ${asset1.code} (${asset1.name}) 与 ${asset2.code} (${asset2.name}) 风险等级不同但空间位置接近 (${dist.toFixed(2)})，可能存在风险遮挡`,
        });
      }
    }
  }
  
  return anomalies;
}

export function detectWeightAnomalies(assets: Asset[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  for (const asset of assets) {
    if (asset.weight < 0 || asset.weight > 2 || asset.weight === 0) {
      asset.hasWeightAnomaly = true;
      
      let description = '';
      if (asset.weight === 0) {
        description = `资产 ${asset.code} (${asset.name}) 权重为0，将被自动隐藏`;
      } else if (asset.weight < 0) {
        description = `资产 ${asset.code} (${asset.name}) 权重为负 (${asset.weight.toFixed(2)})，存在异常`;
      } else {
        description = `资产 ${asset.code} (${asset.name}) 权重过高 (${asset.weight.toFixed(2)})，需要确认`;
      }
      
      anomalies.push({
        type: 'weight',
        severity: asset.weight === 0 ? 'warning' : 'warning',
        assetIds: [asset.id],
        description,
      });
    }
  }
  
  return anomalies;
}

export function checkFilterValidity(
  allAssets: Asset[],
  filteredAssets: Asset[]
): Anomaly | null {
  const filteredWithWeight = filteredAssets.filter(a => a.weight !== 0);
  
  if (filteredWithWeight.length < 5) {
    return {
      type: 'filter_failure',
      severity: 'error',
      assetIds: filteredAssets.map(a => a.id),
      description: `筛选后仅剩余 ${filteredWithWeight.length} 个有效资产（权重≠0），样本量不足（需≥5）`,
    };
  }
  
  const concentration = calculateConcentration(filteredWithWeight);
  if (concentration > 0.8) {
    return {
      type: 'filter_failure',
      severity: 'error',
      assetIds: filteredAssets.map(a => a.id),
      description: `筛选后资产集中度达 ${(concentration * 100).toFixed(1)}%，过度集中（需≤80%）`,
    };
  }
  
  return null;
}

export function detectAllAnomalies(
  allAssets: Asset[],
  filteredAssets: Asset[]
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  const occlusionAnomalies = detectOcclusions(filteredAssets);
  const weightAnomalies = detectWeightAnomalies(allAssets);
  const filterAnomaly = checkFilterValidity(allAssets, filteredAssets);
  
  anomalies.push(...occlusionAnomalies, ...weightAnomalies);
  if (filterAnomaly) {
    anomalies.push(filterAnomaly);
  }
  
  return anomalies;
}

export function getAssetAnomalies(asset: Asset, allAnomalies: Anomaly[]): Anomaly[] {
  return allAnomalies.filter(a => a.assetIds.includes(asset.id));
}

export function hasFilterFailure(anomalies: Anomaly[]): boolean {
  return anomalies.some(a => a.type === 'filter_failure');
}
