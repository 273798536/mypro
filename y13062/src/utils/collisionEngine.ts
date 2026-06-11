import type { CollisionAnomaly, CalculationRule } from '@/types';
import type { ParsedWell, ParsedObstacle, ParsedLayer } from './cadParser';

export interface CollisionConfig {
  rule: CalculationRule;
  defaultDistanceThreshold: number;
  highRiskDistance: number;
  mediumRiskDistance: number;
  overlapTolerance: number;
  depthConflictThreshold: number;
}

export const DEFAULT_CONFIG: CollisionConfig = {
  rule: {
    id: 'rule-hj164-v21',
    name: '《地下水环境监测技术规范》HJ 164-2020 + 北京市补充细则V2.1',
    version: 'v2.1',
    distanceThresholds: {
      general: 50,
      pollutionSource: 30,
      waterSource: 50,
    },
    depthConflictThreshold: 1,
    description: 'HJ 164-2020 第5.2.3条 + 北京市补充细则V2.1第3.1.2条',
  },
  defaultDistanceThreshold: 30,
  highRiskDistance: 15,
  mediumRiskDistance: 30,
  overlapTolerance: 0.5,
  depthConflictThreshold: 1,
};

export function pointToRectDistance(
  px: number,
  py: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): { distance: number; nearestPoint: { x: number; y: number }; isOverlap: boolean } {
  const cx = Math.max(rx, Math.min(px, rx + rw));
  const cy = Math.max(ry, Math.min(py, ry + rh));

  const dx = px - cx;
  const dy = py - cy;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const isOverlap = px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;

  return {
    distance,
    nearestPoint: { x: cx, y: cy },
    isOverlap,
  };
}

export function detectWellObstacleCollision(
  well: ParsedWell,
  obstacle: ParsedObstacle,
  config: CollisionConfig = DEFAULT_CONFIG,
): CollisionAnomaly | null {
  const { distance, isOverlap } = pointToRectDistance(
    well.x,
    well.y,
    obstacle.x,
    obstacle.y,
    obstacle.w,
    obstacle.h,
  );

  const bufferZone = obstacle.bufferZone ?? config.defaultDistanceThreshold;

  if (isOverlap || distance < config.overlapTolerance) {
    return createAnomaly(well, obstacle, 'overlap', 'high', distance, config, '空间重叠');
  }

  if (distance < bufferZone) {
    let level: 'high' | 'medium' | 'low' = 'medium';
    if (distance < config.highRiskDistance) {
      level = 'high';
    } else if (distance < config.mediumRiskDistance) {
      level = 'medium';
    } else {
      level = 'low';
    }

    if (well.depth !== undefined && obstacle.depth) {
      const wellDepth = well.depth;
      const { min: obsMin, max: obsMax } = obstacle.depth;
      if (
        (wellDepth >= obsMin - config.depthConflictThreshold && wellDepth <= obsMax + config.depthConflictThreshold) ||
        (wellDepth <= obsMax && wellDepth + 3 >= obsMin)
      ) {
        return createAnomaly(well, obstacle, 'depth_conflict', level, distance, config, '埋深冲突');
      }
    }

    return createAnomaly(well, obstacle, 'distance_violation', level, distance, config, '距离违规');
  }

  return null;
}

function createAnomaly(
  well: ParsedWell,
  obstacle: ParsedObstacle,
  type: 'overlap' | 'distance_violation' | 'depth_conflict',
  level: 'high' | 'medium' | 'low',
  distance: number,
  config: CollisionConfig,
  conflictLabel: string,
): CollisionAnomaly {
  const now = new Date().toLocaleString('zh-CN', { hour12: false });
  const anomalyId = `anom-${well.id}-${obstacle.id}`.replace(/[^a-zA-Z0-9-]/g, '-');

  let description = '';
  let ruleSnapshot = '';

  const obsName = obstacle.name || obstacle.type;

  switch (type) {
    case 'overlap':
      description = `监测井【${well.name}】与障碍物【${obsName}】完全重叠，需重新选点`;
      ruleSnapshot = `${config.rule.description}：监测井应避开建构筑物`;
      break;
    case 'distance_violation':
      description = `监测井【${well.name}】与障碍物【${obsName}】水平距离仅${distance.toFixed(1)}米，低于规范要求的${obstacle.bufferZone ?? config.defaultDistanceThreshold}米防护距离`;
      ruleSnapshot = `${config.rule.description}：监测井与污染源距离≥${obstacle.bufferZone ?? config.defaultDistanceThreshold}m`;
      break;
    case 'depth_conflict':
      description = `监测井【${well.name}】埋深${well.depth}m，与障碍物【${obsName}】埋深范围(${obstacle.depth?.min}-${obstacle.depth?.max}m)存在交叉`;
      ruleSnapshot = `${config.rule.description}：成孔过程应避让地下管线`;
      break;
  }

  return {
    id: anomalyId,
    taskId: '',
    wellName: well.name,
    wellId: well.id,
    type,
    level,
    status: 'unconfirmed',
    position: { x: well.x, y: well.y },
    distance: type === 'overlap' ? 0 : distance,
    conflictingObject: `${obstacle.type}${obsName !== obstacle.type ? `（${obsName}）` : ''}`,
    description,
    ruleSnapshot,
    createdAt: now,
    updatedAt: now,
    materials: [],
    confirmHistory: [],
    obstacleId: obstacle.id,
  };
}

export interface CalculateResult {
  anomalies: CollisionAnomaly[];
  totalWells: number;
  totalObstacles: number;
  processedAt: string;
  stats: {
    high: number;
    medium: number;
    low: number;
    overlap: number;
    distance: number;
    depth: number;
  };
}

export function calculateCollisions(
  wells: ParsedWell[],
  obstacles: ParsedObstacle[],
  config: CollisionConfig = DEFAULT_CONFIG,
  existingAnomalies: CollisionAnomaly[] = [],
): CalculateResult {
  const anomalies: CollisionAnomaly[] = [];
  const processed = new Set<string>();

  for (const well of wells) {
    for (const obstacle of obstacles) {
      const key = `${well.id}-${obstacle.id}`;
      if (processed.has(key)) continue;
      processed.add(key);

      const anomaly = detectWellObstacleCollision(well, obstacle, config);
      if (anomaly) {
        const existing = existingAnomalies.find(e => e.wellId === well.id && e.obstacleId === obstacle.id);
        if (existing) {
          anomalies.push({
            ...anomaly,
            id: existing.id,
            status: existing.status,
            materials: existing.materials,
            confirmHistory: existing.confirmHistory,
            createdAt: existing.createdAt,
          });
        } else {
          anomalies.push(anomaly);
        }
      }
    }
  }

  const stats = {
    high: anomalies.filter(a => a.level === 'high').length,
    medium: anomalies.filter(a => a.level === 'medium').length,
    low: anomalies.filter(a => a.level === 'low').length,
    overlap: anomalies.filter(a => a.type === 'overlap').length,
    distance: anomalies.filter(a => a.type === 'distance_violation').length,
    depth: anomalies.filter(a => a.type === 'depth_conflict').length,
  };

  return {
    anomalies,
    totalWells: wells.length,
    totalObstacles: obstacles.length,
    processedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    stats,
  };
}

export interface MergeResult {
  wells: ParsedWell[];
  obstacles: ParsedObstacle[];
  mergedCount: { wells: number; obstacles: number };
  warnings: string[];
}

export function mergeLayers(
  baseWells: ParsedWell[],
  baseObstacles: ParsedObstacle[],
  newLayer: ParsedLayer,
  isSupplement: boolean = false,
): MergeResult {
  const warnings: string[] = [];
  const mergedWells = [...baseWells];
  const mergedObstacles = [...baseObstacles];
  const wellIds = new Set(baseWells.map(w => w.id));
  const obstacleIds = new Set(baseObstacles.map(o => o.id));

  let newWellCount = 0;
  let newObstacleCount = 0;
  let skippedWellCount = 0;
  let skippedObstacleCount = 0;

  for (const well of newLayer.wells) {
    if (wellIds.has(well.id)) {
      skippedWellCount++;
      if (!isSupplement) {
        const idx = mergedWells.findIndex(w => w.id === well.id);
        mergedWells[idx] = { ...well };
        newWellCount++;
      }
    } else {
      mergedWells.push(well);
      wellIds.add(well.id);
      newWellCount++;
    }
  }

  for (const obstacle of newLayer.obstacles) {
    if (obstacleIds.has(obstacle.id)) {
      skippedObstacleCount++;
      if (!isSupplement) {
        const idx = mergedObstacles.findIndex(o => o.id === obstacle.id);
        mergedObstacles[idx] = { ...obstacle };
        newObstacleCount++;
      }
    } else {
      mergedObstacles.push(obstacle);
      obstacleIds.add(obstacle.id);
      newObstacleCount++;
    }
  }

  if (isSupplement) {
    if (skippedWellCount > 0 || skippedObstacleCount > 0) {
      warnings.push(
        `后补材料模式：已跳过 ${skippedWellCount} 口重复井、${skippedObstacleCount} 个重复障碍，不覆盖原有数据`,
      );
    }
    if (newWellCount > 0 || newObstacleCount > 0) {
      warnings.push(
        `后补材料模式：已新增 ${newWellCount} 口井、${newObstacleCount} 个障碍，原有异常和结论维持不变`,
      );
    }
  } else {
    if (skippedWellCount > 0) {
      warnings.push(`已更新 ${skippedWellCount} 口已有井的坐标数据`);
    }
    if (skippedObstacleCount > 0) {
      warnings.push(`已更新 ${skippedObstacleCount} 个已有障碍物的坐标数据`);
    }
  }

  return {
    wells: mergedWells,
    obstacles: mergedObstacles,
    mergedCount: { wells: newWellCount, obstacles: newObstacleCount },
    warnings,
  };
}

export interface RecalculateResult {
  anomalies: CollisionAnomaly[];
  changes: {
    added: number;
    removed: number;
    upgraded: number;
    downgraded: number;
    unchanged: number;
  };
  stats: CalculateResult['stats'];
}

export function recalculateWithNewLayer(
  existingWells: ParsedWell[],
  existingObstacles: ParsedObstacle[],
  existingAnomalies: CollisionAnomaly[],
  newLayer: ParsedLayer,
  isSupplement: boolean,
  config: CollisionConfig = DEFAULT_CONFIG,
): RecalculateResult & { mergedWells: ParsedWell[]; mergedObstacles: ParsedObstacle[]; warnings: string[] } {
  const mergeResult = mergeLayers(existingWells, existingObstacles, newLayer, isSupplement);

  if (isSupplement) {
    return {
      anomalies: existingAnomalies,
      mergedWells: mergeResult.wells,
      mergedObstacles: mergeResult.obstacles,
      changes: { added: 0, removed: 0, upgraded: 0, downgraded: 0, unchanged: existingAnomalies.length },
      stats: {
        high: existingAnomalies.filter(a => a.level === 'high').length,
        medium: existingAnomalies.filter(a => a.level === 'medium').length,
        low: existingAnomalies.filter(a => a.level === 'low').length,
        overlap: existingAnomalies.filter(a => a.type === 'overlap').length,
        distance: existingAnomalies.filter(a => a.type === 'distance_violation').length,
        depth: existingAnomalies.filter(a => a.type === 'depth_conflict').length,
      },
      warnings: mergeResult.warnings,
    };
  }

  const calcResult = calculateCollisions(
    mergeResult.wells,
    mergeResult.obstacles,
    config,
    existingAnomalies,
  );

  const existingIds = new Set(existingAnomalies.map(a => a.id));
  const newIds = new Set(calcResult.anomalies.map(a => a.id));

  let added = 0;
  let removed = 0;
  let upgraded = 0;
  let downgraded = 0;
  let unchanged = 0;

  for (const a of calcResult.anomalies) {
    if (!existingIds.has(a.id)) {
      added++;
      continue;
    }
    const existing = existingAnomalies.find(e => e.id === a.id)!;
    if (existing.level !== a.level) {
      const levelOrder = { high: 3, medium: 2, low: 1 };
      if (levelOrder[a.level] > levelOrder[existing.level]) {
        upgraded++;
      } else {
        downgraded++;
      }
    } else {
      unchanged++;
    }
  }

  for (const e of existingAnomalies) {
    if (!newIds.has(e.id)) {
      removed++;
    }
  }

  return {
    anomalies: calcResult.anomalies,
    mergedWells: mergeResult.wells,
    mergedObstacles: mergeResult.obstacles,
    changes: { added, removed, upgraded, downgraded, unchanged },
    stats: calcResult.stats,
    warnings: mergeResult.warnings,
  };
}
