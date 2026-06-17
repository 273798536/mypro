import { TensionRecord, ProcessingStatus, JumpCause, FilterCondition, StatsSummary, AnalysisResult } from '../types';

export interface AnalysisConfig {
  noiseThresholdStdDev: number;
  extremeThresholdStdDev: number;
  jumpRatioThreshold: number;
  tensionNormalMin: number;
  tensionNormalMax: number;
}

export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  noiseThresholdStdDev: 3,
  extremeThresholdStdDev: 5,
  jumpRatioThreshold: 0.3,
  tensionNormalMin: 0.5,
  tensionNormalMax: 50,
};

export function calculateStats(records: TensionRecord[]): StatsSummary {
  if (records.length === 0) {
    return {
      totalCount: 0,
      normalCount: 0,
      noiseCount: 0,
      extremeCount: 0,
      suspiciousCount: 0,
      manualOverrideCount: 0,
      jumpCount: 0,
      avgTension: 0,
      maxTension: 0,
      minTension: 0,
      tensionStdDev: 0,
    };
  }

  const tensions = records.map(r => r.tension);
  const avgTension = tensions.reduce((a, b) => a + b, 0) / tensions.length;
  const variance = tensions.reduce((sum, t) => sum + Math.pow(t - avgTension, 2), 0) / tensions.length;
  const tensionStdDev = Math.sqrt(variance);

  return {
    totalCount: records.length,
    normalCount: records.filter(r => r.processingStatus === ProcessingStatus.NORMAL).length,
    noiseCount: records.filter(r => r.processingStatus === ProcessingStatus.NOISE).length,
    extremeCount: records.filter(r => r.processingStatus === ProcessingStatus.EXTREME).length,
    suspiciousCount: records.filter(r => r.processingStatus === ProcessingStatus.SUSPICIOUS).length,
    manualOverrideCount: records.filter(r => r.processingStatus === ProcessingStatus.MANUAL_OVERRIDE).length,
    jumpCount: records.filter(r => r.isJumpPoint).length,
    avgTension: Number(avgTension.toFixed(2)),
    maxTension: Math.max(...tensions),
    minTension: Math.min(...tensions),
    tensionStdDev: Number(tensionStdDev.toFixed(2)),
  };
}

export function detectNoiseAndExtremes(
  records: TensionRecord[],
  config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG
): TensionRecord[] {
  if (records.length < 3) {
    return records.map(r => ({
      ...r,
      processingStatus: r.tension >= config.tensionNormalMin && r.tension <= config.tensionNormalMax
        ? ProcessingStatus.NORMAL
        : ProcessingStatus.SUSPICIOUS,
      statusReason: r.tension >= config.tensionNormalMin && r.tension <= config.tensionNormalMax
        ? '正常范围'
        : '样本量不足，需人工确认',
    }));
  }

  const tensions = records.map(r => r.tension);
  const avg = tensions.reduce((a, b) => a + b, 0) / tensions.length;
  const stdDev = Math.sqrt(
    tensions.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / tensions.length
  );

  return records.map(record => {
    const deviation = Math.abs(record.tension - avg);
    const stdDevsAway = stdDev > 0 ? deviation / stdDev : 0;

    if (stdDevsAway >= config.extremeThresholdStdDev) {
      return {
        ...record,
        processingStatus: ProcessingStatus.EXTREME,
        statusReason: `极端值：偏离均值 ${stdDevsAway.toFixed(1)}σ (均值=${avg.toFixed(2)}，标准差=${stdDev.toFixed(2)})`,
      };
    }

    if (stdDevsAway >= config.noiseThresholdStdDev) {
      return {
        ...record,
        processingStatus: ProcessingStatus.NOISE,
        statusReason: `疑似噪声：偏离均值 ${stdDevsAway.toFixed(1)}σ (均值=${avg.toFixed(2)}，标准差=${stdDev.toFixed(2)})`,
      };
    }

    if (record.tension < config.tensionNormalMin || record.tension > config.tensionNormalMax) {
      return {
        ...record,
        processingStatus: ProcessingStatus.SUSPICIOUS,
        statusReason: `张力值 ${record.tension.toFixed(2)} ${record.tensionUnit} 超出正常范围 [${config.tensionNormalMin}, ${config.tensionNormalMax}]`,
      };
    }

    return {
      ...record,
      processingStatus: ProcessingStatus.NORMAL,
      statusReason: '正常通过',
    };
  });
}

export function detectJumps(records: TensionRecord[], config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG): TensionRecord[] {
  if (records.length < 2) {
    return records;
  }

  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);
  const result: TensionRecord[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : null;

    if (!prev) {
      result.push({ ...current, isJumpPoint: false });
      continue;
    }

    const prevTension = prev.tension;
    const currTension = current.tension;
    const diff = Math.abs(currTension - prevTension);
    const ratio = prevTension > 0 ? diff / prevTension : 0;

    if (ratio >= config.jumpRatioThreshold) {
      let jumpCause: JumpCause;
      let jumpDetail = `张力从 ${prevTension.toFixed(2)} ${current.tensionUnit} 跳变至 ${currTension.toFixed(2)} ${current.tensionUnit}，变化率 ${(ratio * 100).toFixed(1)}%`;

      if (prev.tensionUnit !== current.tensionUnit) {
        jumpCause = JumpCause.UNIT_MISMATCH;
        jumpDetail += `（单位不一致：前一条为 ${prev.tensionUnit}，当前为 ${current.tensionUnit}）`;
      } else if (prev.materialId !== current.materialId) {
        jumpCause = JumpCause.MATERIAL_NAME_MISMATCH;
        jumpDetail += `（材料不一致：前一条为 ${prev.materialName}(${prev.materialId})，当前为 ${current.materialName}(${current.materialId})）`;
      } else {
        jumpCause = JumpCause.THRESHOLD;
        jumpDetail += '（阈值范围内跳变，可能由材料内部波动或传感器突变引起）';
      }

      result.push({
        ...current,
        isJumpPoint: true,
        jumpCause,
        jumpDetail,
      });
    } else {
      result.push({ ...current, isJumpPoint: false });
    }
  }

  return result;
}

export function applyFilter(records: TensionRecord[], filter: FilterCondition): TensionRecord[] {
  return records.filter(record => {
    if (filter.materialId && record.materialId !== filter.materialId) {
      return false;
    }
    if (filter.materialName && !record.materialName.includes(filter.materialName)) {
      return false;
    }
    if (filter.pulleyGroupId && record.pulleyGroupId !== filter.pulleyGroupId) {
      return false;
    }
    if (filter.statuses && filter.statuses.length > 0 && !filter.statuses.includes(record.processingStatus)) {
      return false;
    }
    if (filter.timeRange) {
      if (record.timestamp < filter.timeRange.start || record.timestamp > filter.timeRange.end) {
        return false;
      }
    }
    if (filter.tensionRange) {
      if (record.tension < filter.tensionRange.min || record.tension > filter.tensionRange.max) {
        return false;
      }
    }
    if (filter.showJumpOnly && !record.isJumpPoint) {
      return false;
    }
    return true;
  });
}

export function buildAnalysisResult(records: TensionRecord[], filter: FilterCondition): AnalysisResult {
  const filteredRecords = applyFilter(records, filter);
  const stats = calculateStats(filteredRecords);
  const jumpPoints = filteredRecords.filter(r => r.isJumpPoint);
  const abnormalRecords = filteredRecords.filter(
    r => r.processingStatus !== ProcessingStatus.NORMAL
  );

  const materialMap = new Map<string, { materialId: string; materialName: string; count: number }>();
  filteredRecords.forEach(r => {
    const existing = materialMap.get(r.materialId);
    if (existing) {
      existing.count += 1;
    } else {
      materialMap.set(r.materialId, {
        materialId: r.materialId,
        materialName: r.materialName,
        count: 1,
      });
    }
  });

  const pulleyMap = new Map<string, { pulleyGroupId: string; count: number }>();
  filteredRecords.forEach(r => {
    const existing = pulleyMap.get(r.pulleyGroupId);
    if (existing) {
      existing.count += 1;
    } else {
      pulleyMap.set(r.pulleyGroupId, {
        pulleyGroupId: r.pulleyGroupId,
        count: 1,
      });
    }
  });

  return {
    records: filteredRecords.sort((a, b) => a.timestamp - b.timestamp),
    stats,
    jumpPoints,
    abnormalRecords,
    materialGroups: Array.from(materialMap.values()),
    pulleyGroups: Array.from(pulleyMap.values()),
    filterApplied: filter,
  };
}

export function analyzeRecords(records: TensionRecord[], config: Partial<AnalysisConfig> = {}): TensionRecord[] {
  const fullConfig = { ...DEFAULT_ANALYSIS_CONFIG, ...config };
  let result = detectNoiseAndExtremes(records, fullConfig);
  result = detectJumps(result, fullConfig);
  return result;
}
