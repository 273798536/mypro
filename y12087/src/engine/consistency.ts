import type { DetectionResult, AnomalyRecord, Streamline } from '@/types';
import { calculateHash } from '@/utils/math';

export interface ConsistencyCheckResult {
  isConsistent: boolean;
  matchingCount: number;
  totalCount: number;
  differences: string[];
}

function simplifyAnomaly(anomaly: AnomalyRecord, index: number): unknown {
  return {
    type: anomaly.type,
    streamlineIndex: index,
    value: Math.round(anomaly.value * 1000) / 1000,
    pointIndex: anomaly.pointIndex,
    position: anomaly.position.map(v => Math.round(v * 1000) / 1000),
  };
}

function simplifyStreamline(streamline: Streamline, index: number): unknown {
  return {
    index,
    seedPointIndex: index,
    status: streamline.status,
    anomalyCount: streamline.anomalies.length,
    pointCount: streamline.points.length,
    anomalies: streamline.anomalies.map((a) => simplifyAnomaly(a, index)),
  };
}

export function generateResultHash(result: DetectionResult): string {
  const simplified = {
    formulaId: result.formulaId,
    seedPoints: result.seedPoints.map((sp) => ({
      x: Math.round(sp.x * 1000) / 1000,
      y: Math.round(sp.y * 1000) / 1000,
      z: Math.round(sp.z * 1000) / 1000,
    })),
    statistics: {
      totalStreamlines: result.statistics.totalStreamlines,
      normalCount: result.statistics.normalCount,
      explosionCount: result.statistics.explosionCount,
      directionFlipCount: result.statistics.directionFlipCount,
      outOfBoundsCount: result.statistics.outOfBoundsCount,
    },
    streamlines: result.streamlines.map(simplifyStreamline),
    anomalies: result.anomalies.map(simplifyAnomaly),
  };

  return calculateHash(simplified);
}

export function checkConsistency(
  result1: DetectionResult,
  result2: DetectionResult
): ConsistencyCheckResult {
  const differences: string[] = [];
  
  if (result1.formulaId !== result2.formulaId) {
    differences.push(`公式ID不匹配: ${result1.formulaId} vs ${result2.formulaId}`);
  }
  
  if (result1.seedPoints.length !== result2.seedPoints.length) {
    differences.push(`种子点数量不匹配: ${result1.seedPoints.length} vs ${result2.seedPoints.length}`);
  }
  
  if (result1.statistics.totalStreamlines !== result2.statistics.totalStreamlines) {
    differences.push(`流线总数不匹配: ${result1.statistics.totalStreamlines} vs ${result2.statistics.totalStreamlines}`);
  }
  
  if (result1.statistics.normalCount !== result2.statistics.normalCount) {
    differences.push(`正常流线数量不匹配: ${result1.statistics.normalCount} vs ${result2.statistics.normalCount}`);
  }
  
  if (result1.statistics.explosionCount !== result2.statistics.explosionCount) {
    differences.push(`采样爆炸数量不匹配: ${result1.statistics.explosionCount} vs ${result2.statistics.explosionCount}`);
  }
  
  if (result1.statistics.directionFlipCount !== result2.statistics.directionFlipCount) {
    differences.push(`方向反转数量不匹配: ${result1.statistics.directionFlipCount} vs ${result2.statistics.directionFlipCount}`);
  }
  
  if (result1.statistics.outOfBoundsCount !== result2.statistics.outOfBoundsCount) {
    differences.push(`参数越界数量不匹配: ${result1.statistics.outOfBoundsCount} vs ${result2.statistics.outOfBoundsCount}`);
  }
  
  if (result1.anomalies.length !== result2.anomalies.length) {
    differences.push(`异常记录数量不匹配: ${result1.anomalies.length} vs ${result2.anomalies.length}`);
  }
  
  const hash1 = generateResultHash(result1);
  const hash2 = generateResultHash(result2);
  
  if (hash1 !== hash2 && differences.length === 0) {
    differences.push('结果哈希值不匹配，存在细微差异');
  }
  
  return {
    isConsistent: differences.length === 0,
    matchingCount: result1.anomalies.filter(a1 =>
      result2.anomalies.some(a2 =>
        a1.type === a2.type &&
        a1.streamlineId === a2.streamlineId &&
        Math.abs(a1.value - a2.value) < 0.001
      )
    ).length,
    totalCount: Math.max(result1.anomalies.length, result2.anomalies.length),
    differences,
  };
}

export function verifyRunConsistency(
  results: DetectionResult[],
  requiredRuns: number = 2
): {
  allConsistent: boolean;
  results: Array<{
    runNumber: number;
    isConsistent: boolean;
    differences: string[];
  }>;
} {
  if (results.length < requiredRuns) {
    return {
      allConsistent: false,
      results: [],
    };
  }
  
  const checks: Array<{
    runNumber: number;
    isConsistent: boolean;
    differences: string[];
  }> = [];
  
  for (let i = 1; i < requiredRuns; i++) {
    const check = checkConsistency(results[0], results[i]);
    checks.push({
      runNumber: i + 1,
      isConsistent: check.isConsistent,
      differences: check.differences,
    });
  }
  
  return {
    allConsistent: checks.every(c => c.isConsistent),
    results: checks,
  };
}

export function markColorScaleAffected(
  result: DetectionResult,
  colorScaleIds: string[]
): DetectionResult {
  return {
    ...result,
    hasColorScale: true,
    streamlines: result.streamlines.map(s => ({
      ...s,
      colorAffected: colorScaleIds.includes(s.id),
    })),
  };
}

export function findChangedStreamlines(
  before: DetectionResult,
  after: DetectionResult
): string[] {
  const changedIds: string[] = [];
  
  after.streamlines.forEach(afterStreamline => {
    const beforeStreamline = before.streamlines.find(s => s.id === afterStreamline.id);
    if (!beforeStreamline) {
      changedIds.push(afterStreamline.id);
      return;
    }
    
    if (beforeStreamline.status !== afterStreamline.status) {
      changedIds.push(afterStreamline.id);
      return;
    }
    
    if (beforeStreamline.anomalies.length !== afterStreamline.anomalies.length) {
      changedIds.push(afterStreamline.id);
      return;
    }
    
    if (beforeStreamline.colorAffected !== afterStreamline.colorAffected) {
      changedIds.push(afterStreamline.id);
    }
  });
  
  return changedIds;
}
