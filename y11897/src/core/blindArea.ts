import { ResidentPoint, CoverageResult, BlindArea } from '../types';
import { euclideanDistance } from './distance';

export interface BlindAreaAnalysisOptions {
  clusterThreshold?: number;
  minClusterSize?: number;
}

export function identifyBlindAreas(
  residents: ResidentPoint[],
  coverageResults: CoverageResult[],
  options: BlindAreaAnalysisOptions = {}
): BlindArea[] {
  const { clusterThreshold = 500, minClusterSize = 3 } = options;

  const uncoveredResidents = residents.filter(r => {
    const result = coverageResults.find(cr => cr.residentId === r.id);
    return result && !result.covered;
  });

  if (uncoveredResidents.length === 0) {
    return [];
  }

  const clusters: ResidentPoint[][] = [];
  const visited = new Set<string>();

  for (const resident of uncoveredResidents) {
    if (visited.has(resident.id)) continue;

    const cluster: ResidentPoint[] = [];
    const queue: ResidentPoint[] = [resident];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;

      visited.add(current.id);
      cluster.push(current);

      for (const other of uncoveredResidents) {
        if (visited.has(other.id)) continue;

        const distance = euclideanDistance(current.coordinate, other.coordinate);
        if (distance <= clusterThreshold) {
          queue.push(other);
        }
      }
    }

    if (cluster.length >= minClusterSize) {
      clusters.push(cluster);
    }
  }

  const blindAreas: BlindArea[] = clusters.map((cluster, index) => {
    const centerX = cluster.reduce((sum, r) => sum + r.coordinate.x, 0) / cluster.length;
    const centerY = cluster.reduce((sum, r) => sum + r.coordinate.y, 0) / cluster.length;
    const totalPopulation = cluster.reduce((sum, r) => sum + r.population, 0);

    const avgDistanceToFacility = cluster.reduce((sum, r) => {
      const result = coverageResults.find(cr => cr.residentId === r.id);
      return sum + (result?.nearestFacilityDistance || Infinity);
    }, 0) / cluster.length;

    let severity: 'high' | 'medium' | 'low';
    if (totalPopulation > 1000 && avgDistanceToFacility > 2000) {
      severity = 'high';
    } else if (totalPopulation > 500 && avgDistanceToFacility > 1000) {
      severity = 'medium';
    } else {
      severity = 'low';
    }

    return {
      id: `blind-area-${index + 1}`,
      residentIds: cluster.map(r => r.id),
      population: totalPopulation,
      centerCoordinate: { x: centerX, y: centerY },
      reason: 'distance_too_far',
      severity
    };
  });

  return blindAreas;
}

export function generateBlindAreaExplanation(blindArea: BlindArea): string {
  const severityText = {
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级'
  };

  const reasonText = {
    no_facility: '周边没有公共服务设施',
    distance_too_far: '距离最近设施过远',
    network_disconnected: '路网不连通导致无法到达'
  };

  return [
    `盲区 ${blindArea.id}:`,
    `- 影响人口: ${blindArea.population.toLocaleString()} 人`,
    `- 涉及居民点: ${blindArea.residentIds.length} 个`,
    `- 优先级: ${severityText[blindArea.severity]}`,
    `- 原因: ${reasonText[blindArea.reason]}`,
    `- 中心位置: (${blindArea.centerCoordinate.x.toFixed(2)}, ${blindArea.centerCoordinate.y.toFixed(2)})`
  ].join('\n');
}

export function suggestBlindAreaSolutions(blindAreas: BlindArea[]): string[] {
  const suggestions: string[] = [];

  const highPriorityAreas = blindAreas.filter(a => a.severity === 'high');
  if (highPriorityAreas.length > 0) {
    const totalPopulation = highPriorityAreas.reduce((sum, a) => sum + a.population, 0);
    suggestions.push(
      `【紧急】发现 ${highPriorityAreas.length} 个高优先级盲区，共影响 ${totalPopulation.toLocaleString()} 人，建议优先在这些区域新建或扩建服务设施。`
    );
  }

  const mediumPriorityAreas = blindAreas.filter(a => a.severity === 'medium');
  if (mediumPriorityAreas.length > 0) {
    suggestions.push(
      `【建议】发现 ${mediumPriorityAreas.length} 个中优先级盲区，可考虑纳入下一期设施规划。`
    );
  }

  const totalUncoveredPopulation = blindAreas.reduce((sum, a) => sum + a.population, 0);
  if (totalUncoveredPopulation > 5000) {
    suggestions.push(
      `【提示】未覆盖人口超过 5000 人，建议整体评估设施布局，考虑增加服务半径或新增设施点。`
    );
  }

  if (blindAreas.length > 0 && blindAreas.every(a => a.reason === 'network_disconnected')) {
    suggestions.push(
      `【路网建议】所有盲区均由路网不连通导致，建议优先完善步行道路系统。`
    );
  }

  return suggestions;
}
