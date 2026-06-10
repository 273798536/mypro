/**
 * AI分析模拟服务
 * 功能：同义匹配模拟、异常检测、置信度评分、建议生成
 */

// ============= 类型定义 =============

/** AI分析请求参数 */
export interface AIAnalysisRequest {
  /** 分析目标数据 */
  data: AnalysisTargetData;
  /** 分析类型 */
  analysisTypes: AnalysisType[];
  /** 分析配置（可选） */
  config?: Partial<AIAnalysisConfig>;
}

/** 分析目标数据 */
export interface AnalysisTargetData {
  /** 待分析的记录列表 */
  records: DataRecord[];
  /** 参考数据（如历史数据、标准数据） */
  referenceData?: ReferenceData;
}

/** 数据记录 */
export interface DataRecord {
  /** 记录ID */
  id: string;
  /** 原始行号 */
  rowNumber?: number;
  /** 物种名称 */
  speciesName?: string;
  /** 批号 */
  batchNumber?: string;
  /** 采样地点 */
  samplingLocation?: string;
  /** 采样时间 */
  samplingTime?: string;
  /** 检测结论 */
  conclusion?: string;
  /** 检测指标 */
  metrics?: Record<string, number | string>;
  /** 其他自定义字段 */
  [key: string]: unknown;
}

/** 参考数据 */
export interface ReferenceData {
  /** 历史记录 */
  historicalRecords?: DataRecord[];
  /** 标准物种列表 */
  standardSpecies?: Array<{ code: string; name: string; aliases: string[] }>;
  /** 阈值配置 */
  thresholds?: Record<string, { min?: number; max?: number }>;
}

/** 分析类型 */
export type AnalysisType = 'synonym_match' | 'anomaly_detection' | 'confidence_scoring' | 'suggestion_generation';

/** AI分析配置 */
export interface AIAnalysisConfig {
  /** 同义匹配置信度阈值 */
  synonymMatchThreshold: number;
  /** 异常检测灵敏度 0-1 */
  anomalySensitivity: number;
  /** 置信度评分算法 */
  confidenceAlgorithm: 'weighted_average' | 'bayesian' | 'ensemble';
  /** 是否启用深度学习模拟 */
  enableDeepLearningSim: boolean;
  /** 建议生成风格 */
  suggestionStyle: 'conservative' | 'balanced' | 'aggressive';
}

/** AI分析结果 */
export interface AIAnalysisResult {
  /** 分析ID */
  analysisId: string;
  /** 分析时间 */
  analysisTime: string;
  /** 各类型分析结果 */
  results: {
    synonymMatch?: SynonymMatchResult;
    anomalyDetection?: AnomalyDetectionResult;
    confidenceScoring?: ConfidenceScoringResult;
    suggestionGeneration?: SuggestionGenerationResult;
  };
  /** 总体汇总 */
  summary: AnalysisSummary;
}

/** 同义匹配结果 */
export interface SynonymMatchResult {
  /** 总记录数 */
  totalRecords: number;
  /** 匹配统计 */
  stats: {
    exactMatch: number;
    fuzzyMatch: number;
    noMatch: number;
    conflicts: number;
  };
  /** 逐条匹配详情 */
  details: Array<{
    recordId: string;
    originalName: string;
    matchedName?: string;
    matchType: 'exact' | 'fuzzy' | 'none';
    confidence: number;
    isConflict: boolean;
    alternatives?: Array<{ name: string; confidence: number }>;
  }>;
}

/** 异常类型 */
export type AnomalyType =
  | 'value_out_of_range'
  | 'trend_abnormal'
  | 'duplicate_abnormal'
  | 'missing_data'
  | 'format_inconsistent'
  | 'species_mismatch'
  | 'time_anomaly'
  | 'location_anomaly';

/** 异常严重程度 */
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

/** 异常检测结果 */
export interface AnomalyDetectionResult {
  /** 异常总数 */
  totalAnomalies: number;
  /** 按严重程度统计 */
  severityCounts: Record<AnomalySeverity, number>;
  /** 按类型统计 */
  typeCounts: Record<AnomalyType, number>;
  /** 异常详情列表 */
  anomalies: AnomalyItem[];
}

/** 异常项 */
export interface AnomalyItem {
  /** 异常ID */
  anomalyId: string;
  /** 关联记录ID */
  recordId: string;
  /** 异常类型 */
  type: AnomalyType;
  /** 严重程度 */
  severity: AnomalySeverity;
  /** 异常字段 */
  field?: string;
  /** 期望值/范围 */
  expectedValue?: string | { min: number; max: number };
  /** 实际值 */
  actualValue?: string | number;
  /** 异常描述 */
  description: string;
  /** 置信度 */
  confidence: number;
}

/** 置信度评分结果 */
export interface ConfidenceScoringResult {
  /** 整体置信度 0-100 */
  overallConfidence: number;
  /** 各维度置信度 */
  dimensionScores: {
    dataQuality: number;
    consistency: number;
    completeness: number;
    accuracy: number;
  };
  /** 单条记录置信度 */
  recordScores: Array<{
    recordId: string;
    score: number;
    factors: Array<{ factor: string; weight: number; score: number }>;
  }>;
}

/** 建议类型 */
export type SuggestionType =
  | 'data_correction'
  | 'supplement_info'
  | 'manual_review'
  | 'merge_operation'
  | 'split_operation'
  | 'standardization'
  | 'warning'
  | 'optimization';

/** 建议生成结果 */
export interface SuggestionGenerationResult {
  /** 建议总数 */
  totalSuggestions: number;
  /** 按类型统计 */
  typeCounts: Record<SuggestionType, number>;
  /** 建议列表 */
  suggestions: SuggestionItem[];
}

/** 建议项 */
export interface SuggestionItem {
  /** 建议ID */
  suggestionId: string;
  /** 关联记录ID列表 */
  relatedRecordIds: string[];
  /** 建议类型 */
  type: SuggestionType;
  /** 优先级 1-5（5最高） */
  priority: number;
  /** 建议标题 */
  title: string;
  /** 详细描述 */
  description: string;
  /** 具体操作建议 */
  actionSteps: string[];
  /** 预估处理收益 */
  estimatedBenefit?: string;
}

/** 分析汇总 */
export interface AnalysisSummary {
  /** 总记录数 */
  totalRecords: number;
  /** 需要处理的问题数 */
  issuesToAddress: number;
  /** 整体质量评级 */
  qualityRating: 'A' | 'B' | 'C' | 'D' | 'F';
  /** 总体结论 */
  overallConclusion: string;
  /** 下一步建议 */
  nextSteps: string[];
}

// ============= Mock 数据和配置 =============

/** 默认AI分析配置 */
const DEFAULT_CONFIG: AIAnalysisConfig = {
  synonymMatchThreshold: 0.75,
  anomalySensitivity: 0.7,
  confidenceAlgorithm: 'weighted_average',
  enableDeepLearningSim: true,
  suggestionStyle: 'balanced'
};

/** 异常描述模板 */
const ANOMALY_DESCRIPTIONS: Record<AnomalyType, (severity: AnomalySeverity, field?: string, actual?: string | number, expected?: string | { min: number; max: number }) => string> = {
  value_out_of_range: (s, field, actual, expected) => {
    const range = expected && typeof expected === 'object' ? `[${expected.min} - ${expected.max}]` : String(expected || '');
    return `${field || '字段'}值${actual}超出正常范围${range}，请核对数据准确性`;
  },
  trend_abnormal: () => '检测到数据趋势异常，与历史数据存在显著偏离',
  duplicate_abnormal: () => '发现疑似重复数据，建议进行去重处理',
  missing_data: (s, field) => `${field || '关键字段'}数据缺失，可能影响分析结果`,
  format_inconsistent: (s, field) => `${field || '字段'}格式与标准不一致，建议标准化处理`,
  species_mismatch: () => '物种名称与分类信息不匹配，存在物种标识错误风险',
  time_anomaly: () => '采样时间存在异常（如未来时间、顺序错乱等）',
  location_anomaly: () => '采样地点信息异常，可能存在录入错误'
};

/** 建议模板库 */
const SUGGESTION_TEMPLATES: Array<Omit<SuggestionItem, 'suggestionId' | 'relatedRecordIds'> & { triggerCondition: (anomalies: AnomalyItem[]) => boolean }> = [
  {
    triggerCondition: (as) => as.some(a => a.type === 'species_mismatch' && a.severity === 'high'),
    type: 'data_correction',
    priority: 5,
    title: '修正物种名称',
    description: '检测到高置信度的物种名称错误，建议立即修正',
    actionSteps: ['使用同义匹配工具进行标准化', '参考标准物种库确认正确名称', '保存并记录修改原因'],
    estimatedBenefit: '可显著提升数据准确性和一致性'
  },
  {
    triggerCondition: (as) => as.some(a => a.type === 'duplicate_abnormal'),
    type: 'merge_operation',
    priority: 4,
    title: '合并重复记录',
    description: '发现重复的检测记录，建议进行合并处理',
    actionSteps: ['确认重复记录的关联性', '选择保留最完整的记录作为主记录', '将其他记录的补充信息合并到主记录', '标记被合并记录为已合并'],
    estimatedBenefit: '消除冗余数据，提高数据质量'
  },
  {
    triggerCondition: (as) => as.some(a => a.type === 'missing_data' && a.severity === 'high'),
    type: 'supplement_info',
    priority: 4,
    title: '补充缺失信息',
    description: '关键信息缺失，建议查找原始记录补充',
    actionSteps: ['核对原始实验记录', '联系相关人员获取缺失数据', '更新记录并注明补录时间'],
    estimatedBenefit: '完善数据完整性，支持后续分析'
  },
  {
    triggerCondition: (as) => as.some(a => a.confidence < 0.7 && a.severity === 'high'),
    type: 'manual_review',
    priority: 3,
    title: '人工审核确认',
    description: '部分异常自动判断置信度不足，建议人工介入审核',
    actionSteps: ['导出待审核记录列表', '分配给专业人员审核', '记录审核意见和结果'],
    estimatedBenefit: '降低误判风险，确保数据可靠性'
  },
  {
    triggerCondition: (as) => as.some(a => a.type === 'format_inconsistent'),
    type: 'standardization',
    priority: 3,
    title: '数据标准化处理',
    description: '数据格式存在不一致，建议统一标准化',
    actionSteps: ['应用字段映射规则进行格式转换', '校验转换后的数据正确性', '批量更新所有记录'],
    estimatedBenefit: '提高数据规范性，便于统计分析'
  }
];

// ============= 核心服务 =============

/**
 * AI分析模拟服务类
 */
export class AIService {
  private config: AIAnalysisConfig;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * 更新分析配置
   */
  updateConfig(config: Partial<AIAnalysisConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): AIAnalysisConfig {
    return { ...this.config };
  }

  /**
   * 执行完整AI分析
   */
  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResult> {
    const analysisId = this.generateId('AI-ANALYSIS');
    const analysisTime = new Date().toISOString();
    const config = { ...this.config, ...request.config };
    const results: AIAnalysisResult['results'] = {};

    // 模拟AI处理延迟
    await this.simulateDelay(300, 800);

    // 根据请求的分析类型依次执行
    for (const type of request.analysisTypes) {
      switch (type) {
        case 'synonym_match':
          results.synonymMatch = this.performSynonymMatch(request.data, config);
          break;
        case 'anomaly_detection':
          results.anomalyDetection = this.performAnomalyDetection(request.data, config);
          break;
        case 'confidence_scoring':
          results.confidenceScoring = this.performConfidenceScoring(request.data, config, results);
          break;
        case 'suggestion_generation':
          results.suggestionGeneration = this.performSuggestionGeneration(request.data, results);
          break;
      }
    }

    // 生成汇总
    const summary = this.generateSummary(request.data, results);

    return {
      analysisId,
      analysisTime,
      results,
      summary
    };
  }

  /**
   * 单独执行同义匹配分析
   */
  analyzeSynonymMatch(records: DataRecord[], config?: Partial<AIAnalysisConfig>): SynonymMatchResult {
    return this.performSynonymMatch({ records }, { ...this.config, ...config });
  }

  /**
   * 单独执行异常检测
   */
  analyzeAnomalyDetection(data: AnalysisTargetData, config?: Partial<AIAnalysisConfig>): AnomalyDetectionResult {
    return this.performAnomalyDetection(data, { ...this.config, ...config });
  }

  /**
   * 单独执行置信度评分
   */
  analyzeConfidenceScoring(
    data: AnalysisTargetData,
    existingResults?: AIAnalysisResult['results'],
    config?: Partial<AIAnalysisConfig>
  ): ConfidenceScoringResult {
    return this.performConfidenceScoring(data, { ...this.config, ...config }, existingResults || {});
  }

  /**
   * 单独生成建议
   */
  generateSuggestions(
    data: AnalysisTargetData,
    existingResults: AIAnalysisResult['results']
  ): SuggestionGenerationResult {
    return this.performSuggestionGeneration(data, existingResults);
  }

  // ========= 私有实现方法 =========

  /**
   * 同义匹配实现（模拟AI模型匹配）
   */
  private performSynonymMatch(data: AnalysisTargetData, config: AIAnalysisConfig): SynonymMatchResult {
    const details: SynonymMatchResult['details'] = [];
    let exactMatch = 0;
    let fuzzyMatch = 0;
    let noMatch = 0;
    let conflicts = 0;

    const standardSpecies = data.referenceData?.standardSpecies || [
      { code: 'SP-001', name: '大肠埃希氏菌', aliases: ['大肠杆菌', 'E. coli'] },
      { code: 'SP-002', name: '金黄色葡萄球菌', aliases: ['金葡菌', 'S. aureus'] },
      { code: 'SP-003', name: '枯草芽孢杆菌', aliases: ['枯草杆菌'] },
    ];

    for (const record of data.records) {
      if (!record.speciesName) {
        details.push({
          recordId: record.id,
          originalName: '(空)',
          matchType: 'none',
          confidence: 0,
          isConflict: true
        });
        noMatch++;
        continue;
      }

      const normalizedName = record.speciesName.trim().toLowerCase();
      let foundMatch: typeof details[0] | null = null;

      // 精确匹配
      for (const sp of standardSpecies) {
        if (sp.name === record.speciesName || sp.aliases.includes(record.speciesName)) {
          foundMatch = {
            recordId: record.id,
            originalName: record.speciesName,
            matchedName: sp.name,
            matchType: 'exact',
            confidence: 0.99,
            isConflict: false
          };
          break;
        }
      }

      // 模糊匹配（模拟）
      if (!foundMatch) {
        const alternatives: Array<{ name: string; confidence: number }> = [];
        for (const sp of standardSpecies) {
          const allNames = [sp.name, ...sp.aliases];
          for (const name of allNames) {
            const similarity = this.calculateSimilarity(normalizedName, name.toLowerCase());
            if (similarity >= config.synonymMatchThreshold) {
              alternatives.push({ name: sp.name, confidence: Math.round(similarity * 100) / 100 });
            }
          }
        }

        if (alternatives.length > 0) {
          alternatives.sort((a, b) => b.confidence - a.confidence);
          const best = alternatives[0];
          const isConflict = alternatives.length >= 2 && alternatives[1].confidence >= 0.8 && (best.confidence - alternatives[1].confidence) < 0.1;

          foundMatch = {
            recordId: record.id,
            originalName: record.speciesName,
            matchedName: best.name,
            matchType: 'fuzzy',
            confidence: best.confidence,
            isConflict,
            alternatives: alternatives.slice(0, 3)
          };
          if (isConflict) conflicts++;
        }
      }

      if (foundMatch) {
        if (foundMatch.matchType === 'exact') exactMatch++;
        else fuzzyMatch++;
        details.push(foundMatch);
      } else {
        noMatch++;
        details.push({
          recordId: record.id,
          originalName: record.speciesName,
          matchType: 'none',
          confidence: 0,
          isConflict: true
        });
      }
    }

    return {
      totalRecords: data.records.length,
      stats: { exactMatch, fuzzyMatch, noMatch, conflicts },
      details
    };
  }

  /**
   * 异常检测实现（模拟AI模型检测）
   */
  private performAnomalyDetection(data: AnalysisTargetData, config: AIAnalysisConfig): AnomalyDetectionResult {
    const anomalies: AnomalyItem[] = [];
    const severityCounts: Record<AnomalySeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const typeCounts: Record<AnomalyType, number> = {
      value_out_of_range: 0, trend_abnormal: 0, duplicate_abnormal: 0, missing_data: 0,
      format_inconsistent: 0, species_mismatch: 0, time_anomaly: 0, location_anomaly: 0
    };

    for (const record of data.records) {
      // 检测缺失数据
      const criticalFields = ['speciesName', 'batchNumber', 'samplingTime'];
      for (const field of criticalFields) {
        if (!record[field]) {
          const severity: AnomalySeverity = field === 'speciesName' ? 'high' : 'medium';
          const anomaly: AnomalyItem = {
            anomalyId: this.generateId('ANOM'),
            recordId: record.id,
            type: 'missing_data',
            severity,
            field,
            description: ANOMALY_DESCRIPTIONS.missing_data(severity, field),
            confidence: 0.95
          };
          anomalies.push(anomaly);
          severityCounts[severity]++;
          typeCounts.missing_data++;
        }
      }

      // 检测物种名称格式
      if (record.speciesName && /^\d+$/.test(record.speciesName)) {
        const anomaly: AnomalyItem = {
          anomalyId: this.generateId('ANOM'),
          recordId: record.id,
          type: 'format_inconsistent',
          severity: 'medium',
          field: 'speciesName',
          actualValue: record.speciesName,
          description: ANOMALY_DESCRIPTIONS.format_inconsistent('medium', 'speciesName'),
          confidence: 0.85
        };
        anomalies.push(anomaly);
        severityCounts.medium++;
        typeCounts.format_inconsistent++;
      }

      // 检测批号格式
      if (record.batchNumber && record.batchNumber.length < 3) {
        const anomaly: AnomalyItem = {
          anomalyId: this.generateId('ANOM'),
          recordId: record.id,
          type: 'format_inconsistent',
          severity: 'low',
          field: 'batchNumber',
          actualValue: record.batchNumber,
          expectedValue: '长度>=3的批号字符串',
          description: ANOMALY_DESCRIPTIONS.format_inconsistent('low', 'batchNumber'),
          confidence: 0.7 * config.anomalySensitivity
        };
        anomalies.push(anomaly);
        severityCounts.low++;
        typeCounts.format_inconsistent++;
      }

      // 检测时间异常
      if (record.samplingTime) {
        const sampleDate = new Date(record.samplingTime);
        const now = new Date();
        if (!isNaN(sampleDate.getTime())) {
          if (sampleDate > now) {
            const anomaly: AnomalyItem = {
              anomalyId: this.generateId('ANOM'),
              recordId: record.id,
              type: 'time_anomaly',
              severity: 'high',
              field: 'samplingTime',
              actualValue: record.samplingTime,
              description: ANOMALY_DESCRIPTIONS.time_anomaly('high'),
              confidence: 0.98
            };
            anomalies.push(anomaly);
            severityCounts.high++;
            typeCounts.time_anomaly++;
          }
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          if (sampleDate < oneYearAgo) {
            const anomaly: AnomalyItem = {
              anomalyId: this.generateId('ANOM'),
              recordId: record.id,
              type: 'time_anomaly',
              severity: 'low',
              field: 'samplingTime',
              actualValue: record.samplingTime,
              description: '采样时间超过1年，建议确认数据有效性',
              confidence: 0.6
            };
            anomalies.push(anomaly);
            severityCounts.low++;
            typeCounts.time_anomaly++;
          }
        }
      }

      // 模拟检测数值异常
      if (record.metrics) {
        for (const [key, value] of Object.entries(record.metrics)) {
          if (typeof value === 'number' && (value < 0 || value > 1000)) {
            const anomaly: AnomalyItem = {
              anomalyId: this.generateId('ANOM'),
              recordId: record.id,
              type: 'value_out_of_range',
              severity: value > 1000 ? 'high' : 'medium',
              field: key,
              actualValue: value,
              expectedValue: { min: 0, max: 1000 },
              description: ANOMALY_DESCRIPTIONS.value_out_of_range(value > 1000 ? 'high' : 'medium', key, value, { min: 0, max: 1000 }),
              confidence: 0.82
            };
            anomalies.push(anomaly);
            severityCounts[anomaly.severity]++;
            typeCounts.value_out_of_range++;
          }
        }
      }
    }

    // 模拟检测重复（基于简化的相似性判断）
    for (let i = 0; i < data.records.length; i++) {
      for (let j = i + 1; j < data.records.length; j++) {
        const r1 = data.records[i];
        const r2 = data.records[j];
        const sameSpecies = r1.speciesName && r2.speciesName && r1.speciesName === r2.speciesName;
        const sameBatch = r1.batchNumber && r2.batchNumber && r1.batchNumber === r2.batchNumber;
        const sameLocation = r1.samplingLocation && r2.samplingLocation && r1.samplingLocation === r2.samplingLocation;
        if (sameSpecies && sameBatch && sameLocation) {
          const anomaly: AnomalyItem = {
            anomalyId: this.generateId('ANOM'),
            recordId: r1.id,
            type: 'duplicate_abnormal',
            severity: 'medium',
            description: ANOMALY_DESCRIPTIONS.duplicate_abnormal('medium'),
            confidence: 0.88
          };
          anomalies.push(anomaly);
          severityCounts.medium++;
          typeCounts.duplicate_abnormal++;
          break;
        }
      }
    }

    return {
      totalAnomalies: anomalies.length,
      severityCounts,
      typeCounts,
      anomalies
    };
  }

  /**
   * 置信度评分实现
   */
  private performConfidenceScoring(
    data: AnalysisTargetData,
    config: AIAnalysisConfig,
    existingResults: AIAnalysisResult['results']
  ): ConfidenceScoringResult {
    const anomalyResult = existingResults.anomalyDetection;
    const synonymResult = existingResults.synonymMatch;

    // 计算各维度基础得分
    let dataQualityScore = 85;
    let consistencyScore = 88;
    let completenessScore = 90;
    let accuracyScore = 82;

    // 根据异常检测结果调整
    if (anomalyResult) {
      const highAnomalies = anomalyResult.severityCounts.high + anomalyResult.severityCounts.critical;
      const mediumAnomalies = anomalyResult.severityCounts.medium;
      const lowAnomalies = anomalyResult.severityCounts.low;

      dataQualityScore = Math.max(0, 100 - highAnomalies * 10 - mediumAnomalies * 5 - lowAnomalies * 2);
      consistencyScore = Math.max(0, 100 - anomalyResult.typeCounts.format_inconsistent * 8 - anomalyResult.typeCounts.value_out_of_range * 6);
    }

    // 根据同义匹配结果调整准确性
    if (synonymResult) {
      const matchRatio = (synonymResult.stats.exactMatch + synonymResult.stats.fuzzyMatch * 0.7) / Math.max(1, synonymResult.totalRecords);
      accuracyScore = Math.round(matchRatio * 85 + (1 - matchRatio) * 30);
    }

    // 根据缺失数据计算完整性
    const totalFields = data.records.length * 5;
    let filledFields = 0;
    for (const record of data.records) {
      if (record.speciesName) filledFields++;
      if (record.batchNumber) filledFields++;
      if (record.samplingLocation) filledFields++;
      if (record.samplingTime) filledFields++;
      if (record.conclusion) filledFields++;
    }
    completenessScore = Math.round((filledFields / totalFields) * 100);

    // 计算单条记录置信度
    const recordScores: ConfidenceScoringResult['recordScores'] = data.records.map(record => {
      const factors: ConfidenceScoringResult['recordScores'][0]['factors'] = [];
      let weightedSum = 0;
      let totalWeight = 0;

      // 物种名称因素
      const speciesFactor = {
        factor: '物种名称完整性',
        weight: 0.25,
        score: record.speciesName ? 90 : 30
      };
      factors.push(speciesFactor);
      weightedSum += speciesFactor.score * speciesFactor.weight;
      totalWeight += speciesFactor.weight;

      // 批号因素
      const batchFactor = {
        factor: '批号信息完整性',
        weight: 0.2,
        score: record.batchNumber ? 95 : 40
      };
      factors.push(batchFactor);
      weightedSum += batchFactor.score * batchFactor.weight;
      totalWeight += batchFactor.weight;

      // 采样信息因素
      const samplingScore = (record.samplingLocation ? 50 : 0) + (record.samplingTime ? 50 : 0);
      const samplingFactor = {
        factor: '采样信息完整性',
        weight: 0.25,
        score: samplingScore
      };
      factors.push(samplingFactor);
      weightedSum += samplingFactor.score * samplingFactor.weight;
      totalWeight += samplingFactor.weight;

      // 结论因素
      const conclusionFactor = {
        factor: '检测结论完整性',
        weight: 0.15,
        score: record.conclusion ? 100 : 50
      };
      factors.push(conclusionFactor);
      weightedSum += conclusionFactor.score * conclusionFactor.weight;
      totalWeight += conclusionFactor.weight;

      // 指标完整性因素
      const metricsFactor = {
        factor: '检测指标完整性',
        weight: 0.15,
        score: record.metrics && Object.keys(record.metrics).length > 0 ? 85 : 45
      };
      factors.push(metricsFactor);
      weightedSum += metricsFactor.score * metricsFactor.weight;
      totalWeight += metricsFactor.weight;

      const finalScore = Math.round(weightedSum / totalWeight);
      return { recordId: record.id, score: finalScore, factors };
    });

    // 计算整体置信度
    const avgRecordScore = recordScores.reduce((sum, r) => sum + r.score, 0) / Math.max(1, recordScores.length);
    const dimensionAvg = (dataQualityScore + consistencyScore + completenessScore + accuracyScore) / 4;
    const overallConfidence = Math.round((avgRecordScore * 0.6 + dimensionAvg * 0.4));

    return {
      overallConfidence,
      dimensionScores: {
        dataQuality: dataQualityScore,
        consistency: consistencyScore,
        completeness: completenessScore,
        accuracy: accuracyScore
      },
      recordScores
    };
  }

  /**
   * 建议生成实现
   */
  private performSuggestionGeneration(
    data: AnalysisTargetData,
    existingResults: AIAnalysisResult['results']
  ): SuggestionGenerationResult {
    const suggestions: SuggestionItem[] = [];
    const typeCounts: Record<SuggestionType, number> = {
      data_correction: 0, supplement_info: 0, manual_review: 0, merge_operation: 0,
      split_operation: 0, standardization: 0, warning: 0, optimization: 0
    };

    const anomalies = existingResults.anomalyDetection?.anomalies || [];
    const synonymResult = existingResults.synonymMatch;
    const confidenceResult = existingResults.confidenceScoring;

    // 根据异常触发建议模板
    for (const template of SUGGESTION_TEMPLATES) {
      if (template.triggerCondition(anomalies)) {
        const relatedRecordIds = Array.from(new Set(anomalies.map(a => a.recordId))).slice(0, 10);
        suggestions.push({
          suggestionId: this.generateId('SUG'),
          relatedRecordIds,
          type: template.type,
          priority: template.priority,
          title: template.title,
          description: template.description,
          actionSteps: template.actionSteps,
          estimatedBenefit: template.estimatedBenefit
        });
        typeCounts[template.type]++;
      }
    }

    // 同义匹配相关建议
    if (synonymResult && synonymResult.stats.noMatch > 0) {
      const noMatchRecords = synonymResult.details.filter(d => d.matchType === 'none').map(d => d.recordId);
      suggestions.push({
        suggestionId: this.generateId('SUG'),
        relatedRecordIds: noMatchRecords.slice(0, 10),
        type: 'manual_review',
        priority: 4,
        title: '审核未匹配的物种名称',
        description: `有${synonymResult.stats.noMatch}条记录的物种名称无法自动匹配，请人工确认或添加到标准库`,
        actionSteps: [
          '导出未匹配物种名称列表',
          '逐一核对原始记录',
          '确认为新物种时添加到标准物种库',
          '确认为输入错误时进行修正'
        ]
      });
      typeCounts.manual_review++;
    }

    if (synonymResult && synonymResult.stats.conflicts > 0) {
      const conflictRecords = synonymResult.details.filter(d => d.isConflict).map(d => d.recordId);
      suggestions.push({
        suggestionId: this.generateId('SUG'),
        relatedRecordIds: conflictRecords.slice(0, 10),
        type: 'warning',
        priority: 4,
        title: '处理物种名称冲突',
        description: `检测到${synonymResult.stats.conflicts}处物种名称存在多个高置信度候选，请人工确认`,
        actionSteps: [
          '查看每条冲突记录的候选物种列表',
          '结合其他信息（分类层级、菌株编号等）确认',
          '添加新的同义词提高后续自动识别率'
        ],
        estimatedBenefit: '消除歧义，提高数据准确性'
      });
      typeCounts.warning++;
    }

    // 置信度相关建议
    if (confidenceResult && confidenceResult.overallConfidence < 75) {
      suggestions.push({
        suggestionId: this.generateId('SUG'),
        relatedRecordIds: [],
        type: 'optimization',
        priority: 3,
        title: '提升整体数据质量',
        description: `当前数据整体置信度为${confidenceResult.overallConfidence}分，存在优化空间`,
        actionSteps: [
          `数据质量维度(${confidenceResult.dimensionScores.dataQuality}分)：处理检测到的异常值`,
          `数据一致性维度(${confidenceResult.dimensionScores.consistency}分)：统一字段格式`,
          `数据完整性维度(${confidenceResult.dimensionScores.completeness}分)：补充缺失信息`,
          `数据准确性维度(${confidenceResult.dimensionScores.accuracy}分)：核对物种名称等关键字段`
        ],
        estimatedBenefit: '全面提升数据质量，为后续分析提供可靠基础'
      });
      typeCounts.optimization++;
    }

    // 按优先级排序
    suggestions.sort((a, b) => b.priority - a.priority);

    return {
      totalSuggestions: suggestions.length,
      typeCounts,
      suggestions
    };
  }

  /**
   * 生成分析汇总
   */
  private generateSummary(
    data: AnalysisTargetData,
    results: AIAnalysisResult['results']
  ): AnalysisSummary {
    const totalRecords = data.records.length;
    const anomalies = results.anomalyDetection?.anomalies || [];
    const suggestions = results.suggestionGeneration?.suggestions || [];
    const confidence = results.confidenceScoring?.overallConfidence || 70;

    // 计算问题数
    const highIssues = anomalies.filter(a => a.severity === 'high' || a.severity === 'critical').length;
    const medIssues = anomalies.filter(a => a.severity === 'medium').length;
    const issuesToAddress = highIssues + medIssues;

    // 质量评级
    let qualityRating: AnalysisSummary['qualityRating'];
    if (confidence >= 90) qualityRating = 'A';
    else if (confidence >= 80) qualityRating = 'B';
    else if (confidence >= 70) qualityRating = 'C';
    else if (confidence >= 60) qualityRating = 'D';
    else qualityRating = 'F';

    // 生成结论
    let overallConclusion: string;
    if (qualityRating === 'A' || qualityRating === 'B') {
      overallConclusion = `数据质量良好，共分析${totalRecords}条记录，整体置信度${confidence}分。`;
    } else if (qualityRating === 'C') {
      overallConclusion = `数据质量中等，共分析${totalRecords}条记录，存在${issuesToAddress}个需要关注的问题。`;
    } else {
      overallConclusion = `数据质量存在风险，共分析${totalRecords}条记录，发现${issuesToAddress}个重要问题需要处理。`;
    }

    // 下一步建议
    const nextSteps: string[] = [];
    if (suggestions.length > 0) {
      const topSuggestions = suggestions.slice(0, 3);
      topSuggestions.forEach((s, i) => {
        nextSteps.push(`${i + 1}. 【优先级${s.priority}】${s.title}`);
      });
    }
    if (nextSteps.length === 0) {
      nextSteps.push('1. 确认分析结果无误后保存数据');
      nextSteps.push('2. 根据需要生成相关报告');
    }

    return {
      totalRecords,
      issuesToAddress,
      qualityRating,
      overallConclusion,
      nextSteps
    };
  }

  // ========= 工具方法 =========

  /**
   * 计算字符串相似度（模拟AI语义相似度）
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;
    if (str1.includes(str2) || str2.includes(str1)) return 0.85;

    // 简化版Jaccard相似度
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  /**
   * 生成唯一ID
   */
  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * 模拟异步延迟
   */
  private simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs) + minMs);
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

/** 单例导出 */
export const aiService = new AIService();
