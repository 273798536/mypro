import { mockReviewMetrics, mockSamples, mockPlaybackResults } from '../data/mockData.js';
import type { ReviewMetrics, BiasingSample, PlaybackResult, ApiResponse } from '@shared/types';

export interface MetricDetail {
  metricName: string;
  currentValue: number;
  targetValue: number;
  delta: number;
  biasingSamples: BiasingSample[];
  relatedPlaybacks: PlaybackResult[];
}

export class ReviewService {
  static getMetrics(): ApiResponse<ReviewMetrics> {
    return {
      data: mockReviewMetrics,
      success: true,
    };
  }

  static getMetricDetails(metricName: string): ApiResponse<MetricDetail | null> {
    const metrics = mockReviewMetrics;
    
    const metricMap: Record<string, { current: number; target: number }> = {
      accuracy: { current: metrics.accuracy, target: 0.9 },
      precision: { current: metrics.precision, target: 0.85 },
      recall: { current: metrics.recall, target: 0.88 },
      misjudgmentRate: { current: metrics.misjudgmentRate, target: 0.1 },
    };

    const metricInfo = metricMap[metricName];
    if (!metricInfo) {
      return {
        data: null,
        success: false,
        message: `指标 ${metricName} 不存在`,
      };
    }

    const relevantSamples = metrics.topBiasingSamples.filter(
      s => s.affectedMetrics.includes(metricName)
    ).map(s => ({
      ...s,
      sample: mockSamples.find(sample => sample.id === s.sampleId),
    }));

    const relatedPlaybackIds = relevantSamples.map(s => s.sampleId);
    const relatedPlaybacks = mockPlaybackResults.filter(
      p => relatedPlaybackIds.includes(p.sampleId)
    ).map(p => ({
      ...p,
      sample: mockSamples.find(s => s.id === p.sampleId),
    }));

    return {
      data: {
        metricName,
        currentValue: metricInfo.current,
        targetValue: metricInfo.target,
        delta: metricInfo.current - metricInfo.target,
        biasingSamples: relevantSamples,
        relatedPlaybacks,
      },
      success: true,
    };
  }

  static getBiasingSampleDetails(sampleId: string): ApiResponse<BiasingSample | null> {
    const biasingSample = mockReviewMetrics.topBiasingSamples.find(
      s => s.sampleId === sampleId
    );
    
    if (!biasingSample) {
      return {
        data: null,
        success: false,
        message: `样本 ${sampleId} 不在拉偏名单中`,
      };
    }

    const sample = mockSamples.find(s => s.id === sampleId);
    
    return {
      data: {
        ...biasingSample,
        sample,
      },
      success: true,
    };
  }
}
