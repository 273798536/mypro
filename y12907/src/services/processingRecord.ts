// 统一处理记录服务 - 分布统计和版本追踪共用同一批处理记录
// 确保界面和报告不会各算各的

import { ProcessingRecord, Sample, PromptVersion, AnalysisResult } from '../types';
import { getActiveRules, getRuleVersions } from '../data/securityRules';
import { reproducibilityManager } from '../utils/reproducibility';
import { versionManager } from './versionManager';

// 生成唯一ID
const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
};

// 处理记录服务
export class ProcessingRecordService {
  private records: Map<string, ProcessingRecord>;
  private recordSamples: Map<string, Sample[]>;
  private recordResults: Map<string, AnalysisResult>;

  constructor() {
    this.records = new Map();
    this.recordSamples = new Map();
    this.recordResults = new Map();
  }

  generateRecordId(): string {
    return generateId('REC');
  }

  // 创建处理记录（关键：快照当前所有配置）
  createRecord(
    samples: Sample[],
    promptVersion: PromptVersion,
    processedBy: string = '当前用户'
  ): ProcessingRecord {
    const recordId = this.generateRecordId();

    // 快照当前分析配置
    const analysisConfig: ProcessingRecord['analysisConfig'] = {
      ruleVersion: getRuleVersions().map(r => `${r.ruleId}v${r.version}`).join(','),
      detectionThreshold: 0.8,
      conflictRules: getActiveRules().map(r => r.ruleId)
    };

    // 统计异常和冲突数量（会在分析后更新）
    const anomalyCount = samples.filter(s => s.anomalies.length > 0).length;
    const conflictCount = 0; // 会在标签冲突检测后更新

    const record: ProcessingRecord = {
      recordId,
      promptVersionId: promptVersion.versionId,
      processedAt: new Date().toISOString(),
      processedBy,
      status: 'pending',
      analysisConfig,
      sampleCount: samples.length,
      anomalyCount,
      conflictCount
    };

    // 保存记录
    this.records.set(recordId, record);
    this.recordSamples.set(recordId, [...samples]); // 保存数据副本

    // 保存可复现性快照
    reproducibilityManager.saveRunSnapshot(
      recordId,
      promptVersion,
      analysisConfig,
      samples.length
    );

    return record;
  }

  // 更新记录状态和统计
  updateRecordStats(recordId: string, analysisResult: AnalysisResult): void {
    const record = this.records.get(recordId);
    if (!record) return;

    const anomalyCount = analysisResult.anomalySamples.length;
    const conflictCount = analysisResult.labelConflicts.length;

    this.records.set(recordId, {
      ...record,
      status: 'completed',
      anomalyCount,
      conflictCount
    });

    this.recordResults.set(recordId, analysisResult);

    // 关键：分析完成后，用分析结果中真实的 runId 和 seed 保存快照
    // 这样用户在界面上看到的运行ID，才能在复现时被正确找到
    const promptVersion = versionManager.getVersion(record.promptVersionId);
    if (promptVersion) {
      reproducibilityManager.saveRunSnapshot(
        recordId,
        promptVersion,
        record.analysisConfig,
        record.sampleCount,
        {
          runId: analysisResult.reproducibility.runId,
          seed: analysisResult.reproducibility.seed
        }
      );
    }
  }

  // 获取记录（所有查询都基于recordId，确保数据一致）
  getRecord(recordId: string): ProcessingRecord | undefined {
    return this.records.get(recordId);
  }

  // 获取记录关联的样本数据
  getRecordSamples(recordId: string): Sample[] {
    return this.recordSamples.get(recordId) || [];
  }

  // 获取记录的分析结果
  getRecordResult(recordId: string): AnalysisResult | undefined {
    return this.recordResults.get(recordId);
  }

  // 获取所有记录
  getAllRecords(): ProcessingRecord[] {
    return Array.from(this.records.values()).sort(
      (a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
    );
  }

  // 分布统计（基于recordId查询，确保和版本追踪使用同一批数据）
  getDistributionStats(recordId: string): AnalysisResult['distributionStats'] | null {
    const result = this.recordResults.get(recordId);
    if (!result) return null;
    return result.distributionStats;
  }

  // 版本追踪（同样基于recordId查询，确保使用同一批数据）
  getVersionTrace(recordId: string, promptVersion: PromptVersion): {
    record: ProcessingRecord;
    samples: Sample[];
    promptVersion: PromptVersion;
    analysisResult?: AnalysisResult;
  } | null {
    const record = this.records.get(recordId);
    if (!record) return null;

    const samples = this.recordSamples.get(recordId) || [];
    const analysisResult = this.recordResults.get(recordId);

    return {
      record,
      samples,
      promptVersion,
      analysisResult
    };
  }

  // 验证记录是否完整（用于三者对齐检查）
  validateRecordConsistency(recordId: string): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    const record = this.records.get(recordId);
    const samples = this.recordSamples.get(recordId);
    const result = this.recordResults.get(recordId);

    if (!record) {
      issues.push('处理记录不存在');
    }
    if (!samples || samples.length === 0) {
      issues.push('样本数据为空');
    }
    if (!result) {
      issues.push('分析结果不存在');
    }

    if (record && samples && result) {
      // 验证样本数量一致
      if (record.sampleCount !== samples.length) {
        issues.push(`样本数量不一致：记录${record.sampleCount}条，实际${samples.length}条`);
      }

      // 验证异常数量一致
      const actualAnomalies = samples.filter(s => s.anomalies.length > 0).length;
      if (result.anomalySamples.length !== actualAnomalies) {
        issues.push(`异常数量不一致：分析结果${result.anomalySamples.length}条，实际${actualAnomalies}条`);
      }

      // 验证分布统计和实际数据一致
      const { bySourceType } = result.distributionStats;
      const actualSourceTypes = samples.reduce((acc, s) => {
        acc[s.sourceType] = (acc[s.sourceType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.keys(bySourceType).forEach(type => {
        if (bySourceType[type as keyof typeof bySourceType] !== (actualSourceTypes[type] || 0)) {
          issues.push(`来源类型"${type}"数量不一致`);
        }
      });
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  // 用于导出：获取记录的完整数据包
  getRecordExportPackage(recordId: string): {
    record: ProcessingRecord;
    samples: Sample[];
    analysisResult: AnalysisResult;
  } | null {
    const record = this.records.get(recordId);
    const samples = this.recordSamples.get(recordId);
    const analysisResult = this.recordResults.get(recordId);

    if (!record || !samples || !analysisResult) return null;

    return {
      record,
      samples: JSON.parse(JSON.stringify(samples)), // 深拷贝
      analysisResult: JSON.parse(JSON.stringify(analysisResult))
    };
  }

  // 获取最新的处理记录
  getLatestRecord(): ProcessingRecord | null {
    const records = this.getAllRecords();
    return records.length > 0 ? records[0] : null;
  }
}

// 全局单例
export const processingRecordService = new ProcessingRecordService();

// 便捷函数
export const createRecord = (samples: Sample[], promptVersion: PromptVersion) =>
  processingRecordService.createRecord(samples, promptVersion);

export const getRecord = (recordId: string) =>
  processingRecordService.getRecord(recordId);

export const getRecordSamples = (recordId: string) =>
  processingRecordService.getRecordSamples(recordId);

export const getDistributionStats = (recordId: string) =>
  processingRecordService.getDistributionStats(recordId);

export const validateConsistency = (recordId: string) =>
  processingRecordService.validateRecordConsistency(recordId);
