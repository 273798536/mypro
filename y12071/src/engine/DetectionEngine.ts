import {
  Scenario,
  DetectionResult,
  Point3D,
  SupportPoint,
  Sensor,
  PersonnelRoute,
  OffsetInfo,
} from '../types';
import { OFFSET_THRESHOLD, ROUTE_IMPACT_THRESHOLD } from '../data/mockScenario';

function calculateDistance(p1: Point3D, p2: Point3D): number {
  return Math.sqrt(
    Math.pow(p1[0] - p2[0], 2) +
    Math.pow(p1[1] - p2[1], 2) +
    Math.pow(p1[2] - p2[2], 2)
  );
}

function calculateDirection(from: Point3D, to: Point3D): Point3D {
  const distance = calculateDistance(from, to);
  if (distance === 0) return [0, 0, 0];
  return [
    (to[0] - from[0]) / distance,
    (to[1] - from[1]) / distance,
    (to[2] - from[2]) / distance,
  ];
}

function createOffsetInfo(expected: Point3D, actual: Point3D): OffsetInfo {
  return {
    expected,
    actual,
    distance: calculateDistance(expected, actual),
    direction: calculateDirection(expected, actual),
  };
}

function minDistanceToRoute(point: Point3D, routePoints: Point3D[]): number {
  let minDist = Infinity;
  for (const rp of routePoints) {
    const dist = calculateDistance(point, rp);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

function getSupportTypeName(type: string): string {
  const types: Record<string, string> = {
    bolt: '锚杆',
    anchor: '锚索',
    mesh: '锚网',
  };
  return types[type] || type;
}

function getSeverity(distance: number): 'high' | 'medium' | 'low' {
  if (distance >= 0.5) return 'high';
  if (distance >= 0.3) return 'medium';
  return 'low';
}

export function detectSupportOffsets(supportPoints: SupportPoint[]): DetectionResult[] {
  const results: DetectionResult[] = [];
  
  for (const sp of supportPoints) {
    if (sp.status === 'offset' && sp.offsetDistance && sp.offsetDistance > OFFSET_THRESHOLD) {
      results.push({
        id: `offset-${sp.id}`,
        type: 'offset',
        severity: getSeverity(sp.offsetDistance),
        description: `${getSupportTypeName(sp.type)}坐标偏移 ${sp.offsetDistance.toFixed(2)}m，超出阈值 ${OFFSET_THRESHOLD}m`,
        position: sp.position,
        offset: createOffsetInfo(sp.expectedPosition, sp.position),
        relatedEntityId: sp.id,
      });
    }
  }
  
  return results;
}

export function detectMissingSupports(supportPoints: SupportPoint[]): DetectionResult[] {
  const results: DetectionResult[] = [];
  
  for (const sp of supportPoints) {
    if (sp.status === 'missing') {
      results.push({
        id: `missing-${sp.id}`,
        type: 'missing_support',
        severity: 'high',
        description: `${getSupportTypeName(sp.type)}缺失，位置: (${sp.position.map(v => v.toFixed(1)).join(', ')})`,
        position: sp.expectedPosition,
        relatedEntityId: sp.id,
      });
    }
  }
  
  return results;
}

export function detectOfflineSensors(sensors: Sensor[]): DetectionResult[] {
  const results: DetectionResult[] = [];
  
  for (const sensor of sensors) {
    if (sensor.status === 'offline') {
      results.push({
        id: `offline-${sensor.id}`,
        type: 'sensor_offline',
        severity: 'medium',
        description: `传感器 ${sensor.name} 离线`,
        position: sensor.position,
        relatedEntityId: sensor.id,
      });
    }
    if (sensor.status === 'warning') {
      results.push({
        id: `warning-${sensor.id}`,
        type: 'sensor_offline',
        severity: 'low',
        description: `传感器 ${sensor.name} 数值异常: ${sensor.value}`,
        position: sensor.position,
        relatedEntityId: sensor.id,
      });
    }
  }
  
  return results;
}

export function markRouteImpact(
  results: DetectionResult[],
  route: PersonnelRoute | undefined
): DetectionResult[] {
  if (!route) return results;
  
  return results.map(r => ({
    ...r,
    affectedByRoute: minDistanceToRoute(r.position, route.points) < ROUTE_IMPACT_THRESHOLD,
  }));
}

export function runDetection(scenario: Scenario): DetectionResult[] {
  const offsetResults = detectSupportOffsets(scenario.supportPoints);
  const missingResults = detectMissingSupports(scenario.supportPoints);
  const sensorResults = detectOfflineSensors(scenario.sensors);
  
  let allResults = [...offsetResults, ...missingResults, ...sensorResults];
  
  allResults = markRouteImpact(allResults, scenario.personnelRoute);
  
  allResults.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity] || a.id.localeCompare(b.id);
  });
  
  return allResults;
}

export function compareDetections(
  firstPass: DetectionResult[],
  secondPass: DetectionResult[]
): { added: DetectionResult[]; removed: DetectionResult[]; changed: DetectionResult[] } {
  const firstMap = new Map(firstPass.map(r => [r.id, r]));
  const secondMap = new Map(secondPass.map(r => [r.id, r]));
  
  const added: DetectionResult[] = [];
  const removed: DetectionResult[] = [];
  const changed: DetectionResult[] = [];
  
  for (const r of secondPass) {
    if (!firstMap.has(r.id)) {
      added.push(r);
    } else if (r.affectedByRoute && !firstMap.get(r.id)?.affectedByRoute) {
      changed.push(r);
    }
  }
  
  for (const r of firstPass) {
    if (!secondMap.has(r.id)) {
      removed.push(r);
    }
  }
  
  return { added, removed, changed };
}
