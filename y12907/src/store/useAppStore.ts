import { create } from 'zustand';

import {
  AppState,
  PromptVersion,
  ExportConfig,
  Anomaly
} from '../types';
import { generateRealisticSamples, generateDemoScenario } from '../services/sampleGenerator';
import { attributionAnalyzer } from '../services/attributionAnalyzer';
import { processingRecordService } from '../services/processingRecord';
import { versionManager } from '../services/versionManager';
import { exportService } from '../services/exportService';
import { reproduceByRunId } from '../utils/reproducibility';
import { getActiveRules } from '../data/securityRules';

export const useAppStore = create<AppState>((set, get) => ({
  // ===== State =====
  processingRecords: [],
  currentRecordId: null,

  samples: [],
  securityRules: getActiveRules(),
  promptVersions: versionManager.getAllVersions(),

  analysisResult: null,
  reproducibilitySnapshots: [],

  ui: {
    activeTab: 'overview',
    selectedSampleId: null,
    selectedAnomalyId: null,
    isLoading: false,
    loadingText: ''
  },

  // ===== UI Actions =====
  setCurrentRecordId: (id: string | null) => {
    set({ currentRecordId: id });
    if (id) {
      const samples = processingRecordService.getRecordSamples(id);
      const result = processingRecordService.getRecordResult(id);
      set({ samples, analysisResult: result });
    }
  },

  setSelectedSample: (id: string | null) => {
    set({ ui: { ...get().ui, selectedSampleId: id } });
  },

  setSelectedAnomaly: (id: string | null) => {
    set({ ui: { ...get().ui, selectedAnomalyId: id } });
  },

  setLoading: (loading: boolean, text: string = '') => {
    set({ ui: { ...get().ui, isLoading: loading, loadingText: text } });
  },

  // ===== Business Actions =====
  loadSampleData: async (count: number = 100) => {
    const { setLoading } = get();
    setLoading(true, '正在生成贴近日常的样例数据...');

    try {
      // 使用演示场景：包含旧表、补录备注、漏填单位等真实场景
      const { samples: demoSamples, description } = generateDemoScenario();

      // 如果需要更多数据，补充生成
      let samples = demoSamples;
      if (count > demoSamples.length) {
        const additional = generateRealisticSamples(count - demoSamples.length, 'REC-DEMO-001');
        samples = [...samples, ...additional];
      }

      // 获取当前提示词版本
      const currentVersion = versionManager.getCurrentVersion();
      if (!currentVersion) {
        throw new Error('未找到可用的提示词版本');
      }

      // 创建统一处理记录（分布统计和版本追踪共用）
      const record = processingRecordService.createRecord(samples, currentVersion);

      // 绑定版本样本
      versionManager.bindVersionSamples(currentVersion.versionId, samples);

      set({
        samples,
        currentRecordId: record.recordId,
        processingRecords: processingRecordService.getAllRecords()
      });

      console.log('样例数据加载完成:', description);
    } finally {
      setLoading(false);
    }
  },

  importSamples: async (_file: File) => {
    const { setLoading } = get();
    setLoading(true, '正在导入并校验数据...');

    try {
      // 这里简化处理，实际项目中会解析Excel/CSV
      // 模拟导入过程
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 使用样例数据作为导入结果
      const samples = generateRealisticSamples(50, 'REC-IMPORT-001');
      const currentVersion = versionManager.getCurrentVersion();

      if (!currentVersion) {
        throw new Error('请先绑定提示词版本');
      }

      const record = processingRecordService.createRecord(samples, currentVersion);
      versionManager.bindVersionSamples(currentVersion.versionId, samples);

      set({
        samples,
        currentRecordId: record.recordId,
        processingRecords: processingRecordService.getAllRecords()
      });
    } finally {
      setLoading(false);
    }
  },

  bindPromptVersion: (versionData: Omit<PromptVersion, 'versionId'>) => {
    versionManager.addVersion(versionData);
    set({ promptVersions: versionManager.getAllVersions() });
  },

  runAnalysis: async () => {
    const { samples, currentRecordId, setLoading } = get();

    if (!currentRecordId || samples.length === 0) {
      throw new Error('请先加载或导入数据');
    }

    setLoading(true, '正在执行归因分析...');

    try {
      // 获取上一个版本的样本用于标签冲突检测
      const allRecords = processingRecordService.getAllRecords();
      const currentIndex = allRecords.findIndex(r => r.recordId === currentRecordId);
      const previousRecord = currentIndex > 0 ? allRecords[currentIndex - 1] : null;
      const previousSamples = previousRecord
        ? processingRecordService.getRecordSamples(previousRecord.recordId)
        : undefined;

      // 执行分析
      const result = await attributionAnalyzer.runAnalysis(
        samples,
        currentRecordId,
        previousSamples
      );

      // 更新样本的异常和规则匹配信息
      const processedSamples = samples.map(sample => {
        const matchedRules = attributionAnalyzer.matchSecurityRules(sample);
        const anomalies = attributionAnalyzer.detectAnomalies(sample, matchedRules);
        return { ...sample, matchedRules, anomalies };
      });

      // 更新处理记录的统计数据
      processingRecordService.updateRecordStats(currentRecordId, result);

      // 更新处理记录中的样本数据（确保三者对齐验证通过）
      processingRecordService['recordSamples'].set(currentRecordId, processedSamples);

      // 更新状态
      set({
        samples: processedSamples,
        analysisResult: result,
        processingRecords: processingRecordService.getAllRecords()
      });

      // 验证数据一致性（三者对齐）
      const consistency = processingRecordService.validateRecordConsistency(currentRecordId);
      if (!consistency.valid) {
        console.warn('数据一致性警告:', consistency.issues);
      } else {
        console.log('数据一致性验证通过：图、表、文字三者对齐');
      }

      return result;
    } finally {
      setLoading(false);
    }
  },

  resolveAnomaly: (anomalyId: string, opinion: string, handledBy: string) => {
    const { samples, currentRecordId } = get();

    const updatedSamples = samples.map(sample => {
      const hasAnomaly = sample.anomalies.some(a => a.anomalyId === anomalyId);
      if (!hasAnomaly) return sample;

      const updatedAnomalies = sample.anomalies.map((anomaly: Anomaly) => {
        if (anomaly.anomalyId === anomalyId) {
          return {
            ...anomaly,
            handlingStatus: 'resolved' as const,
            handlingOpinion: opinion,
            handledBy,
            handledAt: new Date().toISOString()
          };
        }
        return anomaly;
      });

      return { ...sample, anomalies: updatedAnomalies };
    });

    set({ samples: updatedSamples });

    // 更新处理记录中的样本数据
    if (currentRecordId) {
      // 这里简化处理，实际会更新存储
      processingRecordService['recordSamples'].set(currentRecordId, updatedSamples);
    }
  },

  exportReport: async (config: ExportConfig) => {
    const { currentRecordId, samples, analysisResult, setLoading } = get();

    if (!currentRecordId || !analysisResult || samples.length === 0) {
      throw new Error('请先完成分析后再导出报告');
    }

    const record = processingRecordService.getRecord(currentRecordId);
    if (!record) {
      throw new Error('找不到处理记录');
    }

    setLoading(true, '正在生成导出报告...');

    try {
      const { blob, filename } = await exportService.export(
        config,
        record,
        samples,
        analysisResult
      );

      exportService.downloadFile(blob, filename);
      return blob;
    } finally {
      setLoading(false);
    }
  },

  reproduceAnalysis: async (runId: string) => {
    const { setLoading } = get();
    setLoading(true, `正在复现分析 (${runId})...`);

    try {
      const reproduceConfig = reproduceByRunId(runId);
      if (!reproduceConfig) {
        throw new Error('找不到该运行ID的快照，无法复现');
      }

      const { seed, promptVersion } = reproduceConfig;

      // 使用相同种子重新生成数据
      const samples = generateRealisticSamples(100, 'REC-REPRODUCE-001', seed);

      // 创建新的处理记录
      const record = processingRecordService.createRecord(samples, promptVersion);

      // 执行分析
      const result = await attributionAnalyzer.runAnalysis(samples, record.recordId);
      processingRecordService.updateRecordStats(record.recordId, result);

      const processedSamples = samples.map(sample => {
        const matchedRules = attributionAnalyzer.matchSecurityRules(sample);
        const anomalies = attributionAnalyzer.detectAnomalies(sample, matchedRules);
        return { ...sample, matchedRules, anomalies };
      });

      set({
        samples: processedSamples,
        analysisResult: result,
        currentRecordId: record.recordId,
        processingRecords: processingRecordService.getAllRecords()
      });

      console.log(`分析复现完成，运行ID: ${runId}`);
    } finally {
      setLoading(false);
    }
  }
}));
