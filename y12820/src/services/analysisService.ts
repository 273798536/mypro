import { DifferentialAnalysis, AnalysisResult, Sample, Group, ActionableError, QCRecord } from '../types';
import { calculateTTest, calculateLog2FoldChange, calculateMean, adjustPValues } from '../utils/statistics';
import { ActionableErrorHandler } from '../utils/errorHandler';
import { generateId } from '../utils/mockData';

export class DifferentialAnalysisEngine {
  static async runAnalysis(
    analysis: DifferentialAnalysis,
    groups: Group[],
    samples: Sample[],
    qcRecords: QCRecord[]
  ): Promise<{
    success: boolean;
    results?: AnalysisResult[];
    error?: ActionableError;
  }> {
    const validation = this.validateInput(analysis, groups, samples, qcRecords);
    if (validation) {
      return { success: false, error: validation };
    }

    await new Promise(resolve => setTimeout(resolve, 1500));

    const results = this.calculateStatistics(analysis, groups, samples, qcRecords);

    return {
      success: true,
      results,
    };
  }

  private static validateInput(
    analysis: DifferentialAnalysis,
    groups: Group[],
    samples: Sample[],
    qcRecords: QCRecord[]
  ): ActionableError | null {
    const controlGroup = groups.find(g => g.id === analysis.controlGroupId);
    const experimentalGroup = groups.find(g => g.id === analysis.experimentalGroupId);

    if (!controlGroup || !experimentalGroup) {
      return ActionableErrorHandler.createInsufficientDataError(0, 0);
    }

    const controlSamples = samples.filter(s => controlGroup.sampleIds.includes(s.id));
    const experimentalSamples = samples.filter(s => experimentalGroup.sampleIds.includes(s.id));

    if (controlSamples.length < 3 || experimentalSamples.length < 3) {
      return ActionableErrorHandler.createInsufficientDataError(
        controlSamples.length,
        experimentalSamples.length
      );
    }

    const allAnalysisSamples = [...controlSamples, ...experimentalSamples];
    const missingQc = allAnalysisSamples.filter(
      s => !qcRecords.find(q => q.sampleId === s.id)
    );

    if (missingQc.length > 0) {
      return ActionableErrorHandler.createMissingRecordsError(missingQc);
    }

    const failedQc = allAnalysisSamples.filter(
      s => qcRecords.find(q => q.sampleId === s.id)?.isLowQuality
    );

    if (failedQc.length > 0) {
      return ActionableErrorHandler.createQualityControlError(failedQc, qcRecords);
    }

    return null;
  }

  private static calculateStatistics(
    analysis: DifferentialAnalysis,
    groups: Group[],
    samples: Sample[],
    qcRecords: QCRecord[]
  ): AnalysisResult[] {
    const controlGroup = groups.find(g => g.id === analysis.controlGroupId)!;
    const experimentalGroup = groups.find(g => g.id === analysis.experimentalGroupId)!;

    const controlSamples = samples.filter(s => controlGroup.sampleIds.includes(s.id));
    const experimentalSamples = samples.filter(s => experimentalGroup.sampleIds.includes(s.id));

    const controlQcScores = controlSamples.map(
      s => qcRecords.find(q => q.sampleId === s.id)!.qcScore
    );
    const experimentalQcScores = experimentalSamples.map(
      s => qcRecords.find(q => q.sampleId === s.id)!.qcScore
    );

    const controlMean = calculateMean(controlQcScores);
    const experimentalMean = calculateMean(experimentalQcScores);

    const pValues: number[] = [];
    const allSamples = [...controlSamples, ...experimentalSamples];

    allSamples.forEach(sample => {
      const sampleQc = qcRecords.find(q => q.sampleId === s.id)!.qcScore;
      const otherGroupSamples = controlGroup.sampleIds.includes(sample.id)
        ? experimentalQcScores
        : controlQcScores;

      const { pValue } = calculateTTest([sampleQc], otherGroupSamples);
      pValues.push(pValue);
    });

    const adjustedPValues = adjustPValues(pValues);

    return allSamples.map((sample, index) => {
      const log2FoldChange = calculateLog2FoldChange(controlMean, experimentalMean);
      const adjustedPValue = adjustedPValues[index];
      const isSignificant = adjustedPValue < analysis.pValueThreshold &&
        Math.abs(log2FoldChange) > Math.log2(analysis.foldChangeThreshold);

      let regulation: 'up' | 'down' | 'none' = 'none';
      if (isSignificant) {
        regulation = log2FoldChange > 0 ? 'up' : 'down';
      }

      return {
        id: generateId(),
        analysisId: analysis.id,
        sampleId: sample.id,
        log2FoldChange,
        pValue: pValues[index],
        adjustedPValue,
        isSignificant,
        regulation,
      };
    });
  }
}
