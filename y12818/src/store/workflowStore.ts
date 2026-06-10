/**
 * AI/ML 工作流状态管理 Store
 * 管理工作流步骤状态、样本导入数据、版本对比、分组指标配置、AI分析结果、人工修正、结论生成等
 */

import { create } from 'zustand';
import type {
  WorkflowStep,
  GroupDimension,
  MetricDefinition,
  SampleRecord,
  SpeciesMatchResult,
  AnomalyRecord,
  ConclusionRecord,
  ManualCorrection,
} from '@/types';
import type { VersionRecord } from '@/services/versionService';

/** 步骤完成状态 */
export type StepStatus = 'pending' | 'active' | 'completed';

/** 导入预览行数据 */
export interface ImportPreviewRow {
  /** 原始行号 */
  rowNumber: number;
  /** 列数据 */
  cells: Record<string, string | number | null>;
}

/** 版本对比选中项 */
export interface VersionCompareSelection {
  baseVersionId: string | null;
  targetVersionId: string | null;
}

/** 分组指标配置表单状态 */
export interface GroupMetricFormState {
  /** 配置名称 */
  name: string;
  /** 配置描述 */
  description: string;
  /** 分组维度 */
  groupDimensions: GroupDimension[];
  /** 指标列表 */
  metrics: MetricDefinition[];
  /** 指标权重映射 */
  metricWeights: Record<string, number>;
  /** 异常阈值 */
  anomalyThresholds: Record<string, {
    stdDevThreshold?: number;
    absoluteRange?: { min: number; max: number } | null;
    enabled: boolean;
  }>;
}

/** 人工修正行数据 */
export interface CorrectionRowData {
  /** 关联样本ID */
  sampleId: string;
  /** 原始行号 */
  originalRowNo: number;
  /** 样本编号 */
  sampleNo: string;
  /** 修正前值 */
  beforeValue: string | number | null;
  /** 修正后值 */
  afterValue: string | number | null;
  /** 修正字段名 */
  fieldName: string;
  /** 修正原因 */
  reason: string;
  /** 是否已保存 */
  isSaved: boolean;
}

/** 工作流 Store 状态接口 */
interface WorkflowStoreState {
  // ========== 步骤状态 ==========
  /** 当前激活步骤 */
  activeStep: WorkflowStep;
  /** 各步骤完成状态 */
  stepStatusMap: Record<WorkflowStep, StepStatus>;
  /** 已完成的步骤列表（用于显示打勾） */
  completedSteps: WorkflowStep[];

  // ========== 步骤一：样本导入 ==========
  /** 导入的文件名 */
  importFileName: string | null;
  /** 导入文件类型 */
  importFileType: 'excel' | 'csv' | null;
  /** 预览表头列表 */
  previewHeaders: string[];
  /** 预览行数据 */
  previewRows: ImportPreviewRow[];
  /** 导入预览总行数 */
  previewTotalRows: number;
  /** 是否正在解析文件 */
  isParsingFile: boolean;

  // ========== 步骤二：版本管理 ==========
  /** 版本列表 */
  versionList: VersionRecord[];
  /** 版本对比选中 */
  versionCompare: VersionCompareSelection;
  /** 是否正在加载版本列表 */
  isLoadingVersions: boolean;

  // ========== 步骤三：分组指标配置 ==========
  /** 分组指标表单数据 */
  groupMetricConfig: GroupMetricFormState;
  /** 可用分组维度选项 */
  availableDimensions: GroupDimension[];
  /** 是否正在保存配置 */
  isSavingConfig: boolean;

  // ========== 步骤四：AI分析 ==========
  /** 同义匹配结果列表 */
  synonymMatchResults: SpeciesMatchResult[];
  /** 异常标记列表 */
  anomalyMarkers: AnomalyRecord[];
  /** 是否正在执行AI分析 */
  isAnalyzing: boolean;
  /** AI分析进度百分比 */
  analysisProgress: number;

  // ========== 步骤五：人工修正 ==========
  /** 待修正列表 */
  correctionRows: CorrectionRowData[];
  /** 已修正的样本ID集合 */
  correctedSampleIds: Set<string>;
  /** 是否正在保存修正 */
  isSavingCorrections: boolean;

  // ========== 步骤六：结论生成 ==========
  /** 生成的结论记录 */
  conclusionRecord: ConclusionRecord | null;
  /** 全链路ID */
  traceChainId: string | null;
  /** 置信度分数 */
  confidenceScore: number | null;
  /** 各维度置信度 */
  confidenceDimensions: Array<{ dimension: string; score: number; explanation: string }>;
  /** 是否正在生成结论 */
  isGeneratingConclusion: boolean;

  // ========== 操作方法：步骤导航 ==========
  /**
   * 切换到指定步骤
   */
  setActiveStep: (step: WorkflowStep) => void;
  /**
   * 标记步骤为已完成
   */
  markStepCompleted: (step: WorkflowStep) => void;
  /**
   * 进入下一步骤
   */
  goToNextStep: () => void;
  /**
   * 返回上一步骤
   */
  goToPrevStep: () => void;
  /**
   * 重置所有步骤状态
   */
  resetAllSteps: () => void;

  // ========== 操作方法：样本导入 ==========
  /**
   * 设置导入文件信息
   */
  setImportFile: (fileName: string, fileType: 'excel' | 'csv') => void;
  /**
   * 设置预览数据
   */
  setPreviewData: (headers: string[], rows: ImportPreviewRow[], totalRows: number) => void;
  /**
   * 清除导入数据
   */
  clearImportData: () => void;
  /**
   * 设置文件解析状态
   */
  setParsingFile: (parsing: boolean) => void;

  // ========== 操作方法：版本管理 ==========
  /**
   * 设置版本列表
   */
  setVersionList: (versions: VersionRecord[]) => void;
  /**
   * 选择对比版本
   */
  selectCompareVersion: (type: 'base' | 'target', versionId: string | null) => void;
  /**
   * 清除版本对比选择
   */
  clearVersionCompare: () => void;
  /**
   * 设置版本加载状态
   */
  setLoadingVersions: (loading: boolean) => void;

  // ========== 操作方法：分组指标配置 ==========
  /**
   * 更新分组指标配置
   */
  updateGroupMetricConfig: (patch: Partial<GroupMetricFormState>) => void;
  /**
   * 切换分组维度选中状态
   */
  toggleGroupDimension: (dimension: GroupDimension) => void;
  /**
   * 更新指标权重
   */
  updateMetricWeight: (metricKey: string, weight: number) => void;
  /**
   * 设置配置保存状态
   */
  setSavingConfig: (saving: boolean) => void;

  // ========== 操作方法：AI分析 ==========
  /**
   * 设置同义匹配结果
   */
  setSynonymMatchResults: (results: SpeciesMatchResult[]) => void;
  /**
   * 设置异常标记列表
   */
  setAnomalyMarkers: (anomalies: AnomalyRecord[]) => void;
  /**
   * 开始AI分析
   */
  startAnalysis: () => void;
  /**
   * 更新分析进度
   */
  updateAnalysisProgress: (progress: number) => void;
  /**
   * 完成AI分析
   */
  finishAnalysis: () => void;

  // ========== 操作方法：人工修正 ==========
  /**
   * 设置待修正列表
   */
  setCorrectionRows: (rows: CorrectionRowData[]) => void;
  /**
   * 更新单个修正行
   */
  updateCorrectionRow: (index: number, patch: Partial<CorrectionRowData>) => void;
  /**
   * 添加新的修正行
   */
  addCorrectionRow: (row: CorrectionRowData) => void;
  /**
   * 删除修正行
   */
  removeCorrectionRow: (index: number) => void;
  /**
   * 标记样本已修正
   */
  markSampleCorrected: (sampleId: string) => void;
  /**
   * 设置修正保存状态
   */
  setSavingCorrections: (saving: boolean) => void;

  // ========== 操作方法：结论生成 ==========
  /**
   * 设置结论记录
   */
  setConclusionRecord: (conclusion: ConclusionRecord | null) => void;
  /**
   * 设置全链路ID和置信度
   */
  setTraceAndConfidence: (
    traceChainId: string,
    confidenceScore: number,
    dimensions: Array<{ dimension: string; score: number; explanation: string }>
  ) => void;
  /**
   * 设置结论生成状态
   */
  setGeneratingConclusion: (generating: boolean) => void;
  /**
   * 重置结论数据
   */
  resetConclusion: () => void;
}

/** 工作流步骤顺序数组 */
const WORKFLOW_STEPS: WorkflowStep[] = [
  'sample_import',
  'version_management',
  'group_metric',
  'ai_analysis',
  'manual_correction',
  'conclusion_generation',
];

/** 初始步骤状态 */
function getInitialStepStatusMap(): Record<WorkflowStep, StepStatus> {
  return {
    sample_import: 'active',
    version_management: 'pending',
    group_metric: 'pending',
    ai_analysis: 'pending',
    manual_correction: 'pending',
    conclusion_generation: 'pending',
  };
}

/** 默认分组指标配置 */
const DEFAULT_GROUP_METRIC_CONFIG: GroupMetricFormState = {
  name: '默认分组配置',
  description: '系统预置的默认分组与指标配置方案',
  groupDimensions: ['batch_number', 'species'],
  metrics: [
    {
      key: 'colony_count',
      label: '菌落计数',
      description: '样本菌落总数检测值',
      valueType: 'number',
      unit: 'CFU/g',
      valueRange: { min: 0, max: 10000 },
      enumOptions: null,
      isRequired: true,
      statisticWeight: 30,
      displayFormat: 'number',
      decimalPlaces: 0,
    },
    {
      key: 'incubate_temp',
      label: '培养温度',
      description: '培养箱设定温度',
      valueType: 'number',
      unit: '℃',
      valueRange: { min: 20, max: 45 },
      enumOptions: null,
      isRequired: true,
      statisticWeight: 15,
      displayFormat: 'number',
      decimalPlaces: 1,
    },
    {
      key: 'incubate_hours',
      label: '培养时长',
      description: '培养时间',
      valueType: 'number',
      unit: 'h',
      valueRange: { min: 12, max: 240 },
      enumOptions: null,
      isRequired: true,
      statisticWeight: 15,
      displayFormat: 'number',
      decimalPlaces: 0,
    },
  ],
  metricWeights: {
    colony_count: 40,
    incubate_temp: 30,
    incubate_hours: 30,
  },
  anomalyThresholds: {
    colony_count: { stdDevThreshold: 2, absoluteRange: null, enabled: true },
    incubate_temp: { stdDevThreshold: 1.5, absoluteRange: { min: 25, max: 42 }, enabled: true },
    incubate_hours: { stdDevThreshold: 2, absoluteRange: null, enabled: false },
  },
};

export const useWorkflowStore = create<WorkflowStoreState>((set, get) => ({
  // ========== 初始状态：步骤 ==========
  activeStep: 'sample_import',
  stepStatusMap: getInitialStepStatusMap(),
  completedSteps: [],

  // ========== 初始状态：样本导入 ==========
  importFileName: null,
  importFileType: null,
  previewHeaders: [],
  previewRows: [],
  previewTotalRows: 0,
  isParsingFile: false,

  // ========== 初始状态：版本管理 ==========
  versionList: [],
  versionCompare: { baseVersionId: null, targetVersionId: null },
  isLoadingVersions: false,

  // ========== 初始状态：分组指标配置 ==========
  groupMetricConfig: { ...DEFAULT_GROUP_METRIC_CONFIG },
  availableDimensions: [
    'batch_number',
    'sampling_location',
    'species',
    'culture_condition',
    'culture_medium',
  ],
  isSavingConfig: false,

  // ========== 初始状态：AI分析 ==========
  synonymMatchResults: [],
  anomalyMarkers: [],
  isAnalyzing: false,
  analysisProgress: 0,

  // ========== 初始状态：人工修正 ==========
  correctionRows: [],
  correctedSampleIds: new Set(),
  isSavingCorrections: false,

  // ========== 初始状态：结论生成 ==========
  conclusionRecord: null,
  traceChainId: null,
  confidenceScore: null,
  confidenceDimensions: [],
  isGeneratingConclusion: false,

  // ========== 方法：步骤导航 ==========
  setActiveStep: (step) => {
    set((state) => {
      const newStatusMap = { ...state.stepStatusMap };
      // 重置所有未完成步骤为 pending
      (Object.keys(newStatusMap) as WorkflowStep[]).forEach((s) => {
        if (!state.completedSteps.includes(s)) {
          newStatusMap[s] = 'pending';
        }
      });
      newStatusMap[step] = 'active';
      return { activeStep: step, stepStatusMap: newStatusMap };
    });
  },

  markStepCompleted: (step) => {
    set((state) => {
      if (state.completedSteps.includes(step)) return state;
      const newCompleted = [...state.completedSteps, step];
      const newStatusMap = { ...state.stepStatusMap };
      newStatusMap[step] = 'completed';
      return { completedSteps: newCompleted, stepStatusMap: newStatusMap };
    });
  },

  goToNextStep: () => {
    const state = get();
    const currentIndex = WORKFLOW_STEPS.indexOf(state.activeStep);
    if (currentIndex < WORKFLOW_STEPS.length - 1) {
      // 标记当前步骤完成
      get().markStepCompleted(state.activeStep);
      // 进入下一步
      const nextStep = WORKFLOW_STEPS[currentIndex + 1];
      get().setActiveStep(nextStep);
    }
  },

  goToPrevStep: () => {
    const state = get();
    const currentIndex = WORKFLOW_STEPS.indexOf(state.activeStep);
    if (currentIndex > 0) {
      const prevStep = WORKFLOW_STEPS[currentIndex - 1];
      get().setActiveStep(prevStep);
    }
  },

  resetAllSteps: () => {
    set({
      activeStep: 'sample_import',
      stepStatusMap: getInitialStepStatusMap(),
      completedSteps: [],
    });
  },

  // ========== 方法：样本导入 ==========
  setImportFile: (fileName, fileType) => {
    set({ importFileName: fileName, importFileType: fileType });
  },

  setPreviewData: (headers, rows, totalRows) => {
    set({ previewHeaders: headers, previewRows: rows, previewTotalRows: totalRows });
  },

  clearImportData: () => {
    set({
      importFileName: null,
      importFileType: null,
      previewHeaders: [],
      previewRows: [],
      previewTotalRows: 0,
    });
  },

  setParsingFile: (parsing) => {
    set({ isParsingFile: parsing });
  },

  // ========== 方法：版本管理 ==========
  setVersionList: (versions) => {
    set({ versionList: versions });
  },

  selectCompareVersion: (type, versionId) => {
    set((state) => ({
      versionCompare: {
        ...state.versionCompare,
        [type === 'base' ? 'baseVersionId' : 'targetVersionId']: versionId,
      },
    }));
  },

  clearVersionCompare: () => {
    set({ versionCompare: { baseVersionId: null, targetVersionId: null } });
  },

  setLoadingVersions: (loading) => {
    set({ isLoadingVersions: loading });
  },

  // ========== 方法：分组指标配置 ==========
  updateGroupMetricConfig: (patch) => {
    set((state) => ({
      groupMetricConfig: { ...state.groupMetricConfig, ...patch },
    }));
  },

  toggleGroupDimension: (dimension) => {
    set((state) => {
      const current = state.groupMetricConfig.groupDimensions;
      const next = current.includes(dimension)
        ? current.filter((d) => d !== dimension)
        : [...current, dimension];
      return {
        groupMetricConfig: { ...state.groupMetricConfig, groupDimensions: next },
      };
    });
  },

  updateMetricWeight: (metricKey, weight) => {
    set((state) => ({
      groupMetricConfig: {
        ...state.groupMetricConfig,
        metricWeights: {
          ...state.groupMetricConfig.metricWeights,
          [metricKey]: weight,
        },
      },
    }));
  },

  setSavingConfig: (saving) => {
    set({ isSavingConfig: saving });
  },

  // ========== 方法：AI分析 ==========
  setSynonymMatchResults: (results) => {
    set({ synonymMatchResults: results });
  },

  setAnomalyMarkers: (anomalies) => {
    set({ anomalyMarkers: anomalies });
  },

  startAnalysis: () => {
    set({ isAnalyzing: true, analysisProgress: 0 });
  },

  updateAnalysisProgress: (progress) => {
    set({ analysisProgress: Math.max(0, Math.min(100, progress)) });
  },

  finishAnalysis: () => {
    set({ isAnalyzing: false, analysisProgress: 100 });
  },

  // ========== 方法：人工修正 ==========
  setCorrectionRows: (rows) => {
    set({ correctionRows: rows });
  },

  updateCorrectionRow: (index, patch) => {
    set((state) => {
      const newRows = [...state.correctionRows];
      if (index >= 0 && index < newRows.length) {
        newRows[index] = { ...newRows[index], ...patch };
      }
      return { correctionRows: newRows };
    });
  },

  addCorrectionRow: (row) => {
    set((state) => ({ correctionRows: [...state.correctionRows, row] }));
  },

  removeCorrectionRow: (index) => {
    set((state) => ({
      correctionRows: state.correctionRows.filter((_, i) => i !== index),
    }));
  },

  markSampleCorrected: (sampleId) => {
    set((state) => {
      const newSet = new Set(state.correctedSampleIds);
      newSet.add(sampleId);
      return { correctedSampleIds: newSet };
    });
  },

  setSavingCorrections: (saving) => {
    set({ isSavingCorrections: saving });
  },

  // ========== 方法：结论生成 ==========
  setConclusionRecord: (conclusion) => {
    set({ conclusionRecord: conclusion });
  },

  setTraceAndConfidence: (traceChainId, confidenceScore, dimensions) => {
    set({
      traceChainId,
      confidenceScore,
      confidenceDimensions: dimensions,
    });
  },

  setGeneratingConclusion: (generating) => {
    set({ isGeneratingConclusion: generating });
  },

  resetConclusion: () => {
    set({
      conclusionRecord: null,
      traceChainId: null,
      confidenceScore: null,
      confidenceDimensions: [],
    });
  },
}));

export { WORKFLOW_STEPS };
