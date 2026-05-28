import { useState, useCallback } from 'react';
import type {
  Point2D,
  IntegrationConfig,
  IntegrationResult,
  Anomaly,
} from '@/types';
import { computeLineIntegral, type IntegrationResultData } from '@/utils/math/numericalIntegration';
import { analyzePath, type PathAnalysis } from '@/utils/math/anomalyDetection';
import type { VectorFieldFunction } from '@/utils/math/expressionParser';

function generateId(): string {
  return `result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useNumericalIntegration() {
  const [isComputing, setIsComputing] = useState(false);
  const [progress, setProgress] = useState(0);

  const computePathIntegral = useCallback(
    (
      vectorField: VectorFieldFunction,
      points: Point2D[],
      pathId: string,
      config: IntegrationConfig
    ): { result: IntegrationResult; analysis: PathAnalysis } | null => {
      if (points.length < 2) return null;

      const resultId = generateId();
      const analysis = analyzePath(points, config.stepSize, resultId);

      const startTime = performance.now();
      const integralResult: IntegrationResultData = computeLineIntegral(
        vectorField,
        points,
        config
      );
      const computationTime = performance.now() - startTime;

      const anomalies: Anomaly[] = analysis.anomalies;

      const result: IntegrationResult = {
        id: resultId,
        pathId,
        value: integralResult.value,
        method: config.method,
        stepSize: config.stepSize,
        errorEstimate: integralResult.errorEstimate,
        computationTime,
        hasAnomalies: analysis.hasAnomalies,
        anomalies,
        sampledPoints: integralResult.sampledPoints,
        computedAt: new Date().toISOString(),
      };

      return { result, analysis };
    },
    []
  );

  const computeMultiple = useCallback(
    async (
      vectorField: VectorFieldFunction,
      paths: Array<{ pathId: string; points: Point2D[] }>,
      config: IntegrationConfig
    ): Promise<
      Array<{ result: IntegrationResult; analysis: PathAnalysis }>
    > => {
      setIsComputing(true);
      setProgress(0);

      const results: Array<{
        result: IntegrationResult;
        analysis: PathAnalysis;
      }> = [];

      for (let i = 0; i < paths.length; i++) {
        const pathResult = computePathIntegral(
          vectorField,
          paths[i].points,
          paths[i].pathId,
          config
        );
        if (pathResult) {
          results.push(pathResult);
        }
        setProgress(((i + 1) / paths.length) * 100);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      setIsComputing(false);
      return results;
    },
    [computePathIntegral]
  );

  return {
    isComputing,
    progress,
    computePathIntegral,
    computeMultiple,
  };
}
