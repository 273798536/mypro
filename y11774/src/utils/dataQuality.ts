import type { Asset, CorrelationEdge, DataQualityReport, TimeWindow } from '@/types';

export const checkSymmetry = (edges: CorrelationEdge[]): { isSymmetric: boolean; asymmetricPairs: string[] } => {
  const asymmetricPairs: string[] = [];

  edges.forEach((edge) => {
    if (!edge.isSymmetric) {
      asymmetricPairs.push(`${edge.source}-${edge.target}`);
    }
  });

  return {
    isSymmetric: asymmetricPairs.length === 0,
    asymmetricPairs,
  };
};

export const checkTimeWindows = (assets: Asset[]): { hasErrors: boolean; errors: string[] } => {
  const errors: string[] = [];
  const expectedLengths: Record<TimeWindow, number> = {
    '1m': 22,
    '3m': 66,
    '6m': 132,
    '1y': 252,
    '3y': 756,
    '5y': 1260,
  };

  assets.forEach((asset) => {
    Object.entries(asset.returns).forEach(([window, returns]) => {
      const expected = expectedLengths[window as TimeWindow];
      if (returns.length !== expected) {
        errors.push(
          `${asset.code} ${window}窗口数据长度异常: 期望${expected}, 实际${returns.length}`
        );
      }
    });
  });

  return {
    hasErrors: errors.length > 0,
    errors,
  };
};

export const calculateNodeDensity = (assetCount: number, edgeCount: number): number => {
  if (assetCount <= 1) return 0;
  const maxPossibleEdges = (assetCount * (assetCount - 1)) / 2;
  return edgeCount / maxPossibleEdges;
};

export const checkNodeDensity = (
  assetCount: number,
  edgeCount: number,
  threshold: number = 0.5
): { density: number; isOverDense: boolean } => {
  const density = calculateNodeDensity(assetCount, edgeCount);
  return {
    density,
    isOverDense: density > threshold,
  };
};

export const countByQualityStatus = (assets: Asset[]): {
  rawCount: number;
  correctedCount: number;
  pendingReviewCount: number;
} => {
  let rawCount = 0;
  let correctedCount = 0;
  let pendingReviewCount = 0;

  assets.forEach((asset) => {
    switch (asset.qualityStatus) {
      case 'raw':
        rawCount++;
        break;
      case 'corrected':
        correctedCount++;
        break;
      case 'pending_review':
        pendingReviewCount++;
        break;
    }
  });

  return { rawCount, correctedCount, pendingReviewCount };
};

export const generateDataQualityReport = (
  assets: Asset[],
  edges: CorrelationEdge[]
): DataQualityReport => {
  const symmetryCheck = checkSymmetry(edges);
  const timeWindowCheck = checkTimeWindows(assets);
  const densityCheck = checkNodeDensity(assets.length, edges.length);
  const qualityCounts = countByQualityStatus(assets);

  return {
    isSymmetric: symmetryCheck.isSymmetric,
    asymmetricPairs: symmetryCheck.asymmetricPairs,
    timeWindowErrors: timeWindowCheck.errors,
    nodeDensity: densityCheck.density,
    isOverDense: densityCheck.isOverDense,
    ...qualityCounts,
  };
};

export const getQualityWarnings = (report: DataQualityReport): string[] => {
  const warnings: string[] = [];

  if (!report.isSymmetric) {
    warnings.push(
      `⚠️ 相关矩阵存在 ${report.asymmetricPairs.length} 对不对称数据，请检查数据一致性`
    );
  }

  if (report.timeWindowErrors.length > 0) {
    warnings.push(
      `⚠️ 时间窗口存在 ${report.timeWindowErrors.length} 个数据长度异常`
    );
  }

  if (report.isOverDense) {
    warnings.push(
      `⚠️ 节点密度过高 (${(report.nodeDensity * 100).toFixed(1)}%)，可能影响可视化效果`
    );
  }

  if (report.pendingReviewCount > 0) {
    warnings.push(
      `📋 有 ${report.pendingReviewCount} 条数据需要人工确认`
    );
  }

  return warnings;
};
