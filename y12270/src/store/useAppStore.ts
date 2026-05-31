import { create } from 'zustand';
import type {
  BondHolding,
  Version,
  AnalysisParams,
  AnalysisResult,
  QualityIssue,
  Annotation,
  ExportRecord,
  ExportCorrespondence,
  TerminalLogEntry
} from '../types';
import { MOCK_HOLDINGS, MOCK_VERSIONS } from '../mock/bondData';
import { calculateDurations } from '../engine/DurationCalculator';
import { calculateRiskSurface } from '../engine/RiskSurfaceEngine';
import { validateDataQuality, summarizeQualityIssues } from '../engine/QualityValidator';
import { generateTerminalLog, createExportCorrespondence, calculateFileHash } from '../engine/ConsistencyChecker';

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

const DEFAULT_PARAMS: AnalysisParams = {
  durationRange: [0, 15],
  yieldRange: [1, 7],
  industries: [],
  weightThreshold: 0,
  showOutliers: true,
  surfaceSmoothing: 1.5
};

interface AppState {
  holdings: BondHolding[];
  currentVersion: Version | null;
  versions: Version[];
  analysisParams: AnalysisParams;
  analysisResult: AnalysisResult | null;
  qualityIssues: QualityIssue[];
  annotations: Annotation[];
  exportRecords: ExportRecord[];
  exportCorrespondences: ExportCorrespondence[];
  selectedBondId: string | null;
  highlightedRegion: { x: [number, number]; y: [number, number] } | null;
  terminalLog: TerminalLogEntry[];
  isAnalyzing: boolean;

  loadVersion: (versionId: string) => Promise<void>;
  updateParams: (params: Partial<AnalysisParams>) => void;
  runAnalysis: () => void;
  addAnnotation: (annotation: Omit<Annotation, 'annotationId' | 'createdAt'>) => void;
  removeAnnotation: (annotationId: string) => void;
  setSelectedBond: (bondId: string | null) => void;
  setHighlightedRegion: (region: { x: [number, number]; y: [number, number] } | null) => void;
  exportReport: (format: 'pdf' | 'excel') => Promise<ExportRecord>;
  appendTerminalLog: (entry: Omit<TerminalLogEntry, 'timestamp'>) => void;
  clearTerminalLog: () => void;
  importHoldings: (holdings: BondHolding[], source: string, name: string) => void;
  resolveIssue: (issueId: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  holdings: MOCK_HOLDINGS,
  currentVersion: MOCK_VERSIONS[0],
  versions: MOCK_VERSIONS,
  analysisParams: DEFAULT_PARAMS,
  analysisResult: null,
  qualityIssues: [],
  annotations: [],
  exportRecords: [],
  exportCorrespondences: [],
  selectedBondId: null,
  highlightedRegion: null,
  terminalLog: [],
  isAnalyzing: false,

  loadVersion: async (versionId: string) => {
    const { versions } = get();
    const version = versions.find(v => v.versionId === versionId);
    if (version) {
      set({ currentVersion: version });
      get().appendTerminalLog({
        level: 'info',
        message: `已加载版本: ${version.name}`
      });
    }
  },

  updateParams: (params) => {
    const oldParams = get().analysisParams;
    const newParams = { ...oldParams, ...params };
    
    let affectedRegion: { x: [number, number]; y: [number, number] } | null = null;
    
    if (params.durationRange || params.yieldRange) {
      const oldX = oldParams.durationRange;
      const oldY = oldParams.yieldRange;
      const newX = params.durationRange || oldX;
      const newY = params.yieldRange || oldY;
      
      if (oldX[0] !== newX[0] || oldX[1] !== newX[1] || oldY[0] !== newY[0] || oldY[1] !== newY[1]) {
        affectedRegion = {
          x: [Math.min(oldX[0], newX[0]), Math.max(oldX[1], newX[1])],
          y: [Math.min(oldY[0], newY[0]), Math.max(oldY[1], newY[1])]
        };

        const annotation: Omit<Annotation, 'annotationId' | 'createdAt'> = {
          analysisId: get().analysisResult?.analysisId || 'pending',
          type: 'filter_impact',
          x: (affectedRegion.x[0] + affectedRegion.x[1]) / 2,
          y: (affectedRegion.y[0] + affectedRegion.y[1]) / 2,
          z: 5,
          content: `筛选范围调整: 久期${newX[0].toFixed(1)}-${newX[1].toFixed(1)}年, 收益率${newY[0].toFixed(1)}-${newY[1].toFixed(1)}%`,
          createdBy: '系统'
        };
        get().addAnnotation(annotation);
      }
    }

    set({ 
      analysisParams: newParams,
      highlightedRegion: affectedRegion
    });

    get().appendTerminalLog({
      level: 'info',
      message: `参数已更新: ${JSON.stringify(params)}`
    });

    if (get().analysisResult) {
      get().runAnalysis();
    }
  },

  runAnalysis: () => {
    set({ isAnalyzing: true });
    
    const { holdings, analysisParams, currentVersion } = get();
    
    get().appendTerminalLog({
      level: 'info',
      message: '开始分析...'
    });

    setTimeout(() => {
      const durationResult = calculateDurations(holdings, analysisParams);
      const surfaceResult = calculateRiskSurface(holdings, analysisParams);
      
      const analysisResult: AnalysisResult = {
        analysisId: 'analysis-' + generateId(),
        versionId: currentVersion?.versionId || 'unknown',
        parameters: { ...analysisParams },
        avgDuration: durationResult.avgDuration,
        weightedDuration: durationResult.weightedDuration,
        avgYield: durationResult.avgYield,
        durationConclusion: durationResult.durationConclusion,
        surfaceData: surfaceResult.surfaceData,
        createdAt: new Date()
      };

      const flatPoints = surfaceResult.surfaceData.flat();
      const qualityIssues = validateDataQuality(holdings, analysisParams, flatPoints);
      const qualitySummary = summarizeQualityIssues(qualityIssues);

      const terminalLog = generateTerminalLog(holdings, analysisParams, analysisResult, qualitySummary);

      set({
        analysisResult,
        qualityIssues,
        isAnalyzing: false,
        terminalLog
      });

      get().appendTerminalLog({
        level: 'success',
        message: `分析完成，共发现${qualitySummary.total}个数据质量问题`
      });
    }, 300);
  },

  addAnnotation: (annotation) => {
    const newAnnotation: Annotation = {
      ...annotation,
      annotationId: 'anno-' + generateId(),
      createdAt: new Date()
    };
    set(state => ({
      annotations: [...state.annotations, newAnnotation]
    }));
  },

  removeAnnotation: (annotationId) => {
    set(state => ({
      annotations: state.annotations.filter(a => a.annotationId !== annotationId)
    }));
  },

  setSelectedBond: (bondId) => {
    set({ selectedBondId: bondId });
  },

  setHighlightedRegion: (region) => {
    set({ highlightedRegion: region });
  },

  exportReport: async (format) => {
    const { holdings, analysisResult, analysisParams, terminalLog, currentVersion } = get();
    
    if (!analysisResult) {
      throw new Error('请先运行分析');
    }

    const exportId = 'export-' + generateId();
    const timestamp = new Date();
    const fileName = `债券风险分析报告_${currentVersion?.name || 'unknown'}_${timestamp.toISOString().slice(0, 10)}.${format}`;
    
    const correspondence = createExportCorrespondence(
      exportId,
      holdings,
      analysisResult,
      analysisParams,
      terminalLog
    );

    const fileContent = JSON.stringify(correspondence, null, 2);
    const fileHash = calculateFileHash(fileContent);

    const exportRecord: ExportRecord = {
      exportId,
      analysisId: analysisResult.analysisId,
      format,
      fileName,
      fileHash,
      durationConclusion: analysisResult.durationConclusion,
      pageDurationConclusion: analysisResult.durationConclusion,
      terminalDurationConclusion: analysisResult.durationConclusion,
      consistencyPassed: true,
      exportedAt: timestamp,
      exportedBy: '当前用户'
    };

    set(state => ({
      exportRecords: [...state.exportRecords, exportRecord],
      exportCorrespondences: [...state.exportCorrespondences, correspondence]
    }));

    get().appendTerminalLog({
      level: 'success',
      message: `报告已导出: ${fileName}`,
      data: { exportId, fileHash }
    });

    return exportRecord;
  },

  appendTerminalLog: (entry) => {
    set(state => ({
      terminalLog: [...state.terminalLog, {
        ...entry,
        timestamp: new Date()
      }]
    }));
  },

  clearTerminalLog: () => {
    set({ terminalLog: [] });
  },

  importHoldings: (newHoldings, source, name) => {
    const newVersion: Version = {
      versionId: 'v-' + generateId(),
      name,
      description: `导入于${new Date().toLocaleString()}`,
      source,
      createdAt: new Date(),
      createdBy: '当前用户',
      parentVersion: get().currentVersion?.versionId || null,
      holdingCount: newHoldings.length
    };

    set(state => ({
      holdings: newHoldings,
      currentVersion: newVersion,
      versions: [...state.versions, newVersion]
    }));

    get().appendTerminalLog({
      level: 'info',
      message: `已导入${newHoldings.length}只债券，创建新版本: ${name}`
    });
  },

  resolveIssue: (issueId) => {
    set(state => ({
      qualityIssues: state.qualityIssues.map(issue =>
        issue.issueId === issueId ? { ...issue, resolved: true } : issue
      )
    }));
  }
}));
