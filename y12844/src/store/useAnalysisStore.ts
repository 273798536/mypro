import { create } from 'zustand';
import type {
  AnalysisRun,
  QCResult,
  DiffAnalysisResult,
  MigrationDataPoint,
  FailureReason,
  QCStatus
} from '@/types';
import { MOCK_ANALYSIS_RUNS, MOCK_DIFF_ANALYSIS } from '@/data/mockAnalysisRuns';
import { calculateMigrationRate, calculateCV, determineQCStatus } from '@/utils/calculationEngine';

interface AnalysisStore {
  analysisRuns: AnalysisRun[];
  diffAnalysisResults: DiffAnalysisResult[];
  isProcessing: boolean;

  getRunsBySample: (barcode: string) => AnalysisRun[];
  getLatestRun: (barcode: string) => AnalysisRun | undefined;
  getDiffAnalysisBySample: (barcode: string) => DiffAnalysisResult[];

  addAnalysisRun: (
    sampleBarcode: string,
    migrationData: MigrationDataPoint[],
    operator: string,
    reagentLotId?: string,
    failureReason?: FailureReason
  ) => AnalysisRun;

  updateReagentLot: (
    runId: string,
    reagentLotId: string
  ) => {
    success: boolean;
    affectedSamples: string[];
    updatedQC: QCResult[];
  };

  recalculateQC: (runId: string) => QCResult | undefined;

  addDiffAnalysis: (
    sampleBarcode: string,
    conclusion: 'support' | 'not_support' | 'inconclusive',
    conclusionText: string,
    evidence: string[],
    limitations: string[],
    operator: string,
    reagentLotId?: string
  ) => DiffAnalysisResult;

  calculateMigrationRates: (
    dataPoints: Omit<MigrationDataPoint, 'migrationRate'>[]
  ) => MigrationDataPoint[];
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  analysisRuns: [...MOCK_ANALYSIS_RUNS],
  diffAnalysisResults: [...MOCK_DIFF_ANALYSIS],
  isProcessing: false,

  getRunsBySample: (barcode: string) => {
    return get().analysisRuns
      .filter(r => r.sampleBarcode === barcode)
      .sort((a, b) => b.analyzedAt.getTime() - a.analyzedAt.getTime());
  },

  getLatestRun: (barcode: string) => {
    const runs = get().getRunsBySample(barcode);
    return runs[0];
  },

  getDiffAnalysisBySample: (barcode: string) => {
    return get().diffAnalysisResults
      .filter(d => d.roundNumber > 0)
      .sort((a, b) => b.roundNumber - a.roundNumber);
  },

  addAnalysisRun: (sampleBarcode, migrationData, operator, reagentLotId, failureReason) => {
    const state = get();
    const existingRuns = state.getRunsBySample(sampleBarcode);
    const runNumber = existingRuns.length + 1;

    const qcResult = failureReason ? undefined : (() => {
      const areas = migrationData.map(d => d.areaMm2);
      const rates = migrationData.filter(d => d.timePoint > 0).map(d => d.migrationRate);

      const cvResult = calculateCV(areas);
      const cvValue = cvResult.isValid ? cvResult.cv : 0;

      const cellViability = 90 + Math.random() * 10;
      const zPrimeFactor = 0.4 + Math.random() * 0.4;

      const qcStatus = determineQCStatus(cvValue, zPrimeFactor, cellViability);

      return {
        qcId: `QC-${Date.now()}`,
        cvValue,
        zPrimeFactor: parseFloat(zPrimeFactor.toFixed(3)),
        cellViability: parseFloat(cellViability.toFixed(1)),
        status: qcStatus.status as QCStatus,
        calculatedAt: new Date()
      };
    })();

    const newRun: AnalysisRun = {
      runId: `RUN-${Date.now()}`,
      sampleBarcode,
      runNumber,
      reagentLotId,
      status: failureReason ? 'failed' : 'completed',
      analyzedAt: new Date(),
      analyzedBy: operator,
      migrationData,
      failureReason,
      qcResult
    };

    set(state => ({ analysisRuns: [...state.analysisRuns, newRun] }));
    return newRun;
  },

  updateReagentLot: (runId: string, reagentLotId: string) => {
    const state = get();
    const runToUpdate = state.analysisRuns.find(r => r.runId === runId);

    if (!runToUpdate) {
      return { success: false, affectedSamples: [], updatedQC: [] };
    }

    const affectedRuns = state.analysisRuns.filter(
      r => r.sampleBarcode === runToUpdate.sampleBarcode || r.reagentLotId === reagentLotId
    );

    const affectedSamples = [...new Set(affectedRuns.map(r => r.sampleBarcode))];
    const updatedQC: QCResult[] = [];

    set(state => ({
      analysisRuns: state.analysisRuns.map(run => {
        if (run.runId === runId) {
          const newQC = run.qcResult ? {
            ...run.qcResult,
            status: 'pass' as QCStatus,
            calculatedAt: new Date()
          } : undefined;
          if (newQC) updatedQC.push(newQC);
          return { ...run, reagentLotId, qcResult: newQC };
        }

        if (run.reagentLotId === reagentLotId && run.qcResult) {
          const newQC = {
            ...run.qcResult,
            calculatedAt: new Date()
          };
          updatedQC.push(newQC);
          return { ...run, qcResult: newQC };
        }

        return run;
      })
    }));

    return { success: true, affectedSamples, updatedQC };
  },

  recalculateQC: (runId: string) => {
    const state = get();
    const run = state.analysisRuns.find(r => r.runId === runId);

    if (!run || run.migrationData.length === 0) {
      return undefined;
    }

    const areas = run.migrationData.map(d => d.areaMm2);
    const cvResult = calculateCV(areas);
    const cvValue = cvResult.isValid ? cvResult.cv : 0;

    const cellViability = run.qcResult?.cellViability || 90;
    const zPrimeFactor = run.qcResult?.zPrimeFactor || 0.5;

    const qcStatus = determineQCStatus(cvValue, zPrimeFactor, cellViability);

    const newQC: QCResult = {
      qcId: run.qcResult?.qcId || `QC-${Date.now()}`,
      cvValue,
      zPrimeFactor,
      cellViability,
      status: qcStatus.status as QCStatus,
      calculatedAt: new Date()
    };

    set(state => ({
      analysisRuns: state.analysisRuns.map(r =>
        r.runId === runId ? { ...r, qcResult: newQC } : r
      )
    }));

    return newQC;
  },

  addDiffAnalysis: (
    sampleBarcode,
    conclusion,
    conclusionText,
    evidence,
    limitations,
    operator,
    reagentLotId
  ) => {
    const state = get();
    const existingAnalyses = state.diffAnalysisResults.filter(
      d => d.roundNumber > 0
    );
    const roundNumber = existingAnalyses.length + 1;

    const newAnalysis: DiffAnalysisResult = {
      analysisId: `DIFF-${Date.now()}`,
      roundNumber,
      conclusion,
      conclusionText,
      evidence,
      limitations,
      timestamp: new Date(),
      reagentLotId,
      operator
    };

    set(state => ({ diffAnalysisResults: [...state.diffAnalysisResults, newAnalysis] }));
    return newAnalysis;
  },

  calculateMigrationRates: (dataPoints) => {
    if (dataPoints.length === 0) return [];

    const sortedPoints = [...dataPoints].sort((a, b) => a.timePoint - b.timePoint);
    const initialPoint = sortedPoints.find(p => p.timePoint === 0);

    if (!initialPoint) {
      return sortedPoints.map(p => ({
        ...p,
        migrationRate: 0
      }));
    }

    return sortedPoints.map(point => {
      const result = calculateMigrationRate(
        initialPoint.areaMm2,
        point.areaMm2,
        point.timePoint
      );
      return {
        ...point,
        migrationRate: result.isValid ? result.rate : 0
      };
    });
  }
}));
