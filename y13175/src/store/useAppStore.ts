import { create } from 'zustand';
import {
  SensorLog,
  LogBatch,
  SensorPoint,
  ParamVersion,
  CalculationResult,
  ManualJudgment,
  Report,
  TimeSeriesPoint,
  ReportCategory,
} from '@/types';
import {
  mockSensorLogs,
  mockLogBatches,
  mockSensorPoints,
  mockParamVersions,
  mockCalculationResults,
  mockManualJudgments,
  mockReports,
  getTimeSeriesData,
} from '@/data/mockData';

interface AppState {
  sensorLogs: SensorLog[];
  logBatches: LogBatch[];
  sensorPoints: SensorPoint[];
  paramVersions: ParamVersion[];
  calculationResults: CalculationResult[];
  manualJudgments: ManualJudgment[];
  reports: Report[];

  selectedLogId: string | null;
  selectedPointId: string | null;
  selectedParamId: string | null;
  selectedResultId: string | null;
  selectedReportId: string | null;
  currentTime: number;
  timeRange: { start: number; end: number } | null;

  setSelectedLogId: (id: string | null) => void;
  setSelectedPointId: (id: string | null) => void;
  setSelectedParamId: (id: string | null) => void;
  setSelectedResultId: (id: string | null) => void;
  setSelectedReportId: (id: string | null) => void;
  setCurrentTime: (time: number) => void;
  setTimeRange: (range: { start: number; end: number } | null) => void;

  getSelectedLog: () => SensorLog | undefined;
  getSelectedLogPoints: () => SensorPoint[];
  getSelectedParam: () => ParamVersion | undefined;
  getSelectedResult: () => CalculationResult | undefined;
  getSelectedReport: () => Report | undefined;
  getLogBatches: (logId: string) => LogBatch[];
  getTimeSeries: (logId: string) => TimeSeriesPoint[];
  getReportsByCategory: (category: ReportCategory) => Report[];
  getManualJudgment: (resultId: string) => ManualJudgment | undefined;

  triggerCalculation: (logId: string, paramId: string) => void;
  addLogBatch: (logId: string, batch: Omit<LogBatch, 'id' | 'logId'>) => void;
  createReport: (resultId: string) => void;
  applyManualJudgment: (resultId: string, judgment: 'pass' | 'fail', reason: string, nextStep: string) => void;
}

const STORAGE_KEY = 'speckle-recalc-app-state';

function loadFromStorage(): Partial<AppState> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load state from localStorage', e);
  }
  return null;
}

export const useAppStore = create<AppState>((set, get) => {
  const stored = loadFromStorage();

  return {
    sensorLogs: stored?.sensorLogs || mockSensorLogs,
    logBatches: stored?.logBatches || mockLogBatches,
    sensorPoints: stored?.sensorPoints || mockSensorPoints,
    paramVersions: stored?.paramVersions || mockParamVersions,
    calculationResults: stored?.calculationResults || mockCalculationResults,
    manualJudgments: stored?.manualJudgments || mockManualJudgments,
    reports: stored?.reports || mockReports,

    selectedLogId: stored?.selectedLogId || 'log-001',
    selectedPointId: null,
    selectedParamId: stored?.selectedParamId || 'param-v2',
    selectedResultId: stored?.selectedResultId || 'result-001',
    selectedReportId: null,
    currentTime: 0,
    timeRange: null,

    setSelectedLogId: (id) => {
      set({ selectedLogId: id, selectedPointId: null });
      const log = get().sensorLogs.find(l => l.id === id);
      if (log) {
        set({ currentTime: new Date(log.startTime).getTime() });
      }
    },
    setSelectedPointId: (id) => set({ selectedPointId: id }),
    setSelectedParamId: (id) => set({ selectedParamId: id }),
    setSelectedResultId: (id) => set({ selectedResultId: id }),
    setSelectedReportId: (id) => set({ selectedReportId: id }),
    setCurrentTime: (time) => set({ currentTime: time }),
    setTimeRange: (range) => set({ timeRange: range }),

    getSelectedLog: () => get().sensorLogs.find(l => l.id === get().selectedLogId),
    getSelectedLogPoints: () => get().sensorPoints.filter(p => p.logId === get().selectedLogId),
    getSelectedParam: () => get().paramVersions.find(p => p.id === get().selectedParamId),
    getSelectedResult: () => get().calculationResults.find(r => r.id === get().selectedResultId),
    getSelectedReport: () => get().reports.find(r => r.id === get().selectedReportId),
    getLogBatches: (logId) => get().logBatches.filter(b => b.logId === logId),
    getTimeSeries: (logId) => getTimeSeriesData(logId),
    getReportsByCategory: (category) => get().reports.filter(r => r.category === category),
    getManualJudgment: (resultId) => get().manualJudgments.find(m => m.resultId === resultId),

    triggerCalculation: (logId, paramId) => {
      const resultId = `result-${Date.now()}`;
      const log = get().sensorLogs.find(l => l.id === logId);
      const param = get().paramVersions.find(p => p.id === paramId);
      if (!log || !param) return;

      const newResult: CalculationResult = {
        id: resultId,
        logId,
        paramVersionId: paramId,
        calculatedAt: new Date().toISOString(),
        status: 'calculating',
        judgment: 'pending',
        confidence: 0,
        resultData: {
          averageIntensity: 0,
          contrastRatio: 0,
          speckleSize: 0,
          stability: 0,
        },
        samplingGaps: [],
        needsManualReview: false,
      };

      set((state) => ({
        calculationResults: [...state.calculationResults, newResult],
        selectedResultId: resultId,
      }));

      setTimeout(() => {
        const avgIntensity = 0.65 + Math.random() * 0.25;
        const contrast = 0.35 + Math.random() * 0.3;
        const speckleSize = 10 + Math.random() * 8;
        const stability = 0.6 + Math.random() * 0.35;
        const confidence = 0.5 + Math.random() * 0.45;

        const hasGaps = Math.random() > 0.5;
        const gaps = hasGaps
          ? [
              {
                id: `gap-${Date.now()}`,
                startTime: new Date(Date.now() - 3600000).toISOString(),
                endTime: new Date(Date.now() - 3600000 + 30000).toISOString(),
                duration: 30,
                severity: (Math.random() > 0.7 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
                sensorIds: ['s-03', 's-04'],
              },
            ]
          : [];

        const needsReview = hasGaps && gaps[0].severity === 'high' || confidence < 0.7;
        const judgment = confidence >= 0.8 ? 'pass' : confidence >= 0.6 ? 'pending' : 'fail';

        set((state) => ({
          calculationResults: state.calculationResults.map((r) =>
            r.id === resultId
              ? {
                  ...r,
                  status: 'done',
                  judgment,
                  confidence,
                  resultData: {
                    averageIntensity: avgIntensity,
                    contrastRatio: contrast,
                    speckleSize,
                    stability,
                  },
                  samplingGaps: gaps,
                  needsManualReview: needsReview,
                  reviewReason: needsReview
                    ? `置信度${(confidence * 100).toFixed(0)}%，${hasGaps ? '存在采样缺口' : '指标接近阈值'}，建议人工确认`
                    : undefined,
                }
              : r
          ),
        }));

        const state = get();
        const updatedResult = state.calculationResults.find(r => r.id === resultId);
        if (updatedResult) {
          state.createReport(resultId);
        }
      }, 1500);
    },

    addLogBatch: (logId, batch) => {
      const newBatch: LogBatch = {
        id: `batch-${Date.now()}`,
        logId,
        ...batch,
      };
      set((state) => ({
        logBatches: [...state.logBatches, newBatch],
      }));
    },

    createReport: (resultId) => {
      const result = get().calculationResults.find(r => r.id === resultId);
      const log = get().sensorLogs.find(l => l.id === result?.logId);
      const param = get().paramVersions.find(p => p.id === result?.paramVersionId);
      const manual = get().manualJudgments.find(m => m.resultId === resultId);
      if (!result || !log) return;

      let category: ReportCategory = 'processed';
      if (result.needsManualReview && !manual) {
        category = 'pending_material';
      } else if (manual) {
        category = 'manual_override';
      }

      const dataSources = [
        ...get().logBatches.filter(b => b.logId === log.id).map(b => b.id),
        param?.id,
      ].filter(Boolean) as string[];
      if (manual) dataSources.push(manual.id);

      const content = `# 激光散斑实验复算报告

## 基本信息
- **实验名称**: ${log.name}
- **复算时间**: ${new Date(result.calculatedAt).toLocaleString('zh-CN')}
- **使用参数版本**: ${param?.versionName || '未知'}
- **判断结果**: ${result.judgment === 'pass' ? '✅ 通过' : result.judgment === 'fail' ? '❌ 不合格' : '⏳ 待确认'}

## 数据来源
${get().logBatches.filter(b => b.logId === log.id).map((b, i) => `${i + 1}. ${b.fileName} (导入人: ${b.importedBy})`).join('\n')}

## 复算结果

| 指标 | 数值 | 阈值 | 状态 |
|------|------|------|------|
| 平均光强 | ${result.resultData.averageIntensity.toFixed(2)} | ≥0.7 | ${result.resultData.averageIntensity >= 0.7 ? '✅ 正常' : '⚠️ 偏低'} |
| 对比度 | ${result.resultData.contrastRatio.toFixed(2)} | ≥0.5 | ${result.resultData.contrastRatio >= 0.5 ? '✅ 正常' : '❌ 不达标'} |
| 散斑尺寸 | ${result.resultData.speckleSize.toFixed(1)}μm | 10-15μm | ${result.resultData.speckleSize >= 10 && result.resultData.speckleSize <= 15 ? '✅ 正常' : '⚠️ 异常'} |
| 稳定性 | ${result.resultData.stability.toFixed(2)} | ≥0.8 | ${result.resultData.stability >= 0.8 ? '✅ 正常' : '❌ 不达标'} |

## 采样缺口检测
共检测到 ${result.samplingGaps.length} 处采样缺口
${result.samplingGaps.map((g, i) => `- ${g.severity === 'high' ? '高严重度' : g.severity === 'medium' ? '中严重度' : '低严重度'}: ${new Date(g.startTime).toLocaleTimeString('zh-CN')} - ${new Date(g.endTime).toLocaleTimeString('zh-CN')} (${g.duration}秒) - ${g.sensorIds.length}个传感器受影响`).join('\n')}

## 置信度
${(result.confidence * 100).toFixed(0)}%

${manual ? `## 人工改判记录

**改判人**: ${manual.judgedBy}
**改判时间**: ${new Date(manual.judgedAt).toLocaleString('zh-CN')}
**改判原因**: ${manual.reason}
**下一步建议**: ${manual.nextStep}
` : result.needsManualReview ? `## ⚠️ 待人工确认

**原因**: ${result.reviewReason || ''}
**建议**: 请值班人员复核后进行确认或改判
` : ''}
`;

      const newReport: Report = {
        id: `report-${Date.now()}`,
        resultId,
        category,
        title: `${log.name} 复算报告${manual ? '【人工改判】' : result.needsManualReview ? '【待确认】' : ''}`,
        content,
        generatedAt: new Date().toISOString(),
        dataSources,
      };

      set((state) => ({
        reports: [...state.reports, newReport],
      }));
    },

    applyManualJudgment: (resultId, judgment, reason, nextStep) => {
      const manualId = `manual-${Date.now()}`;
      const newManual: ManualJudgment = {
        id: manualId,
        resultId,
        judgment,
        reason,
        nextStep,
        judgedAt: new Date().toISOString(),
        judgedBy: '当前值班人',
      };

      set((state) => ({
        manualJudgments: [...state.manualJudgments, newManual],
        calculationResults: state.calculationResults.map((r) =>
          r.id === resultId ? { ...r, judgment, needsManualReview: false } : r
        ),
      }));

      const existingReport = get().reports.find(r => r.resultId === resultId);
      if (existingReport) {
        set((state) => ({
          reports: state.reports.filter(r => r.resultId !== resultId),
        }));
      }
      get().createReport(resultId);
    },
  };
});
