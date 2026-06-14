import { create } from 'zustand';
import {
  AnalysisState,
  SensorLog,
  FieldMappingResult,
  ThresholdParams,
  ThresholdResult,
  QualityIssue,
  OverrideAnalysis,
  AnalysisReport,
} from '../types';
import { defaultThresholdParamsA, defaultThresholdParamsB } from '../data/sampleLogs';
import { parseCSVData, parseJSONData } from '../utils/dataParser';
import { calculateAllThresholds } from '../utils/thresholdCalc';
import { checkDataQuality, getQualityIssueLogIds } from '../utils/qualityCheck';
import { analyzeOverrides } from '../utils/overrideAnalysis';
import { generateReport } from '../utils/reportGenerator';

interface AnalysisStore extends AnalysisState {
  setRawLogs: (logs: SensorLog[], mappingResult: FieldMappingResult, fileName: string) => void;
  setThresholdParamsA: (params: Partial<ThresholdParams>) => void;
  setThresholdParamsB: (params: Partial<ThresholdParams>) => void;
  runAnalysis: () => void;
  generateAnalysisReport: () => void;
  setSelectedLogId: (logId: string | null) => void;
  loadSampleData: () => void;
  loadAltSampleData: () => void;
  clearData: () => void;
  parseAndLoadFile: (file: File) => Promise<void>;
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  rawLogs: [],
  fieldMappingResult: null,
  thresholdParamsA: { ...defaultThresholdParamsA },
  thresholdParamsB: { ...defaultThresholdParamsB },
  resultsA: [],
  resultsB: [],
  qualityIssues: [],
  overrideAnalysis: [],
  currentReport: null,
  selectedLogId: null,
  isAnalyzing: false,
  fileName: '',

  setRawLogs: (logs, mappingResult, fileName) => {
    set({
      rawLogs: logs,
      fieldMappingResult: mappingResult,
      fileName,
      resultsA: [],
      resultsB: [],
      qualityIssues: [],
      overrideAnalysis: [],
      currentReport: null,
      selectedLogId: null,
    });
  },

  setThresholdParamsA: (params) => {
    set((state) => ({
      thresholdParamsA: { ...state.thresholdParamsA, ...params },
    }));
  },

  setThresholdParamsB: (params) => {
    set((state) => ({
      thresholdParamsB: { ...state.thresholdParamsB, ...params },
    }));
  },

  runAnalysis: () => {
    const { rawLogs, thresholdParamsA, thresholdParamsB, fieldMappingResult, fileName } = get();
    if (rawLogs.length === 0) return;

    set({ isAnalyzing: true });

    setTimeout(() => {
      const qualityIssues = checkDataQuality(rawLogs);
      const qualityIssueLogIds = getQualityIssueLogIds(qualityIssues);

      const resultsA = calculateAllThresholds(rawLogs, thresholdParamsA, qualityIssueLogIds);
      const resultsB = calculateAllThresholds(rawLogs, thresholdParamsB, qualityIssueLogIds);

      const overrides = analyzeOverrides(rawLogs, resultsA);

      const report = fieldMappingResult && resultsA.length > 0
        ? generateReport(
            rawLogs,
            fieldMappingResult,
            thresholdParamsA,
            thresholdParamsB,
            resultsA,
            resultsB,
            qualityIssues,
            overrides,
            fileName || '传感器日志数据'
          )
        : null;

      set({
        qualityIssues,
        resultsA,
        resultsB,
        overrideAnalysis: overrides,
        currentReport: report,
        isAnalyzing: false,
      });
    }, 100);
  },

  generateAnalysisReport: () => {
    const {
      rawLogs,
      fieldMappingResult,
      thresholdParamsA,
      thresholdParamsB,
      resultsA,
      resultsB,
      qualityIssues,
      overrideAnalysis,
      fileName,
    } = get();

    if (!fieldMappingResult || resultsA.length === 0) return;

    const report = generateReport(
      rawLogs,
      fieldMappingResult,
      thresholdParamsA,
      thresholdParamsB,
      resultsA,
      resultsB,
      qualityIssues,
      overrideAnalysis,
      fileName || '传感器日志数据'
    );

    set({ currentReport: report });
  },

  setSelectedLogId: (logId) => {
    set({ selectedLogId: logId });
  },

  loadSampleData: () => {
    import('../data/sampleLogs').then(({ sampleCSVData }) => {
      const { logs, mappingResult } = parseCSVData(sampleCSVData, '样例数据（标准字段名）');
      get().setRawLogs(logs, mappingResult, '样例数据（标准字段名）');
      get().runAnalysis();
    });
  },

  loadAltSampleData: () => {
    import('../data/sampleLogs').then(({ sampleCSVDataAltFields }) => {
      const { logs, mappingResult } = parseCSVData(sampleCSVDataAltFields, '样例数据（备用字段名）');
      get().setRawLogs(logs, mappingResult, '样例数据（备用字段名）');
      get().runAnalysis();
    });
  },

  clearData: () => {
    set({
      rawLogs: [],
      fieldMappingResult: null,
      resultsA: [],
      resultsB: [],
      qualityIssues: [],
      overrideAnalysis: [],
      currentReport: null,
      selectedLogId: null,
      fileName: '',
    });
  },

  parseAndLoadFile: async (file: File) => {
    const text = await file.text();
    const fileName = file.name;

    let logs: SensorLog[] = [];
    let mappingResult: FieldMappingResult | null = null;

    if (fileName.endsWith('.csv')) {
      const result = parseCSVData(text, fileName);
      logs = result.logs;
      mappingResult = result.mappingResult;
    } else if (fileName.endsWith('.json')) {
      const result = parseJSONData(text, fileName);
      logs = result.logs;
      mappingResult = result.mappingResult;
    } else {
      throw new Error('不支持的文件格式，请上传CSV或JSON文件');
    }

    get().setRawLogs(logs, mappingResult, fileName);
    get().runAnalysis();
  },
}));
