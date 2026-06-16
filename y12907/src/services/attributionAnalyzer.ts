// 归因分析引擎 - 核心业务逻辑
// 包含：安全规则匹配、异常检测、标签冲突检测

import {
  Sample,
  SecurityRule,
  Anomaly,
  AnomalyType,
  AnomalySeverity,
  LabelConflict,
  AnalysisResult
} from '../types';
import { getActiveRules, getRuleById } from '../data/securityRules';
import {
  explainMissingRule,
  explainLabelConflict,
  explainMissingUnit,
  translate
} from '../utils/naturalLanguage';
import { reproducibilityManager } from '../utils/reproducibility';

// 归因分析引擎类
export class AttributionAnalyzer {
  private rules: SecurityRule[];

  constructor(rules?: SecurityRule[], threshold: number = 0.8) {
    this.rules = rules || getActiveRules();
    void threshold;
  }

  // 更新规则库
  updateRules(rules: SecurityRule[]): void {
    this.rules = rules;
  }

  // 设置检测阈值
  setThreshold(_threshold: number): void {
    void _threshold;
  }

  // ========== 安全规则匹配 ==========

  // 检查样本是否匹配某条规则
  private isMatch(sample: Sample, rule: SecurityRule): boolean {
    const { type, value } = rule.matchCondition;

    switch (type) {
      case 'keyword':
        return this.matchKeyword(sample.content, value);
      case 'regex':
        return this.matchRegex(sample.content, value);
      case 'custom':
        return this.matchCustom(sample, value);
      default:
        return false;
    }
  }

  // 关键词匹配
  private matchKeyword(content: string, keywords: string): boolean {
    const keywordList = keywords.split(/[,，]/).map(k => k.trim()).filter(Boolean);
    return keywordList.some(keyword =>
      content.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // 正则表达式匹配
  private matchRegex(content: string, pattern: string): boolean {
    try {
      const regex = new RegExp(pattern);
      return regex.test(content);
    } catch (e) {
      console.warn('正则表达式错误:', pattern);
      return false;
    }
  }

  // 自定义规则匹配
  private matchCustom(sample: Sample, ruleType: string): boolean {
    switch (ruleType) {
      case 'check_unit_field':
        return !sample.unit || sample.unit.trim() === '';
      case 'check_format_standard':
        return this.checkFormatError(sample);
      default:
        return false;
    }
  }

  // 格式错误检查
  private checkFormatError(sample: Sample): boolean {
    // 检查日期格式
    const dateRegex = /\d{4}[-/]\d{2}[-/]\d{2}/;
    const hasDate = dateRegex.test(sample.content);
    if (hasDate) {
      const correctFormat = /\d{4}-\d{2}-\d{2}/.test(sample.content);
      if (!correctFormat) return true;
    }

    // 检查数值格式
    const numberRegex = /[零一二三四五六七八九十百千万亿\d]+[.．]?[零一二三四五六七八九十百千万亿\d]*[元块个条件次]/;
    if (numberRegex.test(sample.content)) {
      // 检查是否有对应的单位（已在其他规则中检查）
    }

    return false;
  }

  // 执行安全规则匹配
  matchSecurityRules(sample: Sample): string[] {
    return this.rules
      .filter(rule => rule.isActive && this.isMatch(sample, rule))
      .map(rule => rule.ruleId);
  }

  // ========== 异常检测 ==========

  // 检查样本应该匹配哪些规则（用于检测漏配）
  private checkExpectedRules(sample: Sample): string[] {
    const expected: string[] = [];
    const content = sample.content.toLowerCase();

    // R001: 敏感词检测
    const sensitiveKeywords = ['敏感', '违禁', '暴力', '色情', '赌博', '诈骗', '毒品', '枪支', '炸药'];
    if (sensitiveKeywords.some(kw => content.includes(kw))) {
      expected.push('R001');
    }

    // R002: 个人信息
    if (/\d{11}/.test(content) || /\d{17}[\dxX]/.test(content)) {
      expected.push('R002');
    }

    // R003: 单位校验 - 如果有数值但没有单位
    if (/\d+/.test(content) && !sample.unit) {
      expected.push('R003');
    }

    // R004: 违法违规
    const illegalKeywords = ['毒品', '枪支', '炸药', '假证', '洗钱', '黑客', '赌博', '诈骗'];
    if (illegalKeywords.some(kw => content.includes(kw))) {
      expected.push('R004');
    }

    // R006: 医疗健康
    const medicalKeywords = ['诊断', '治疗', '用药', '处方', '癌症', '糖尿病', '高血压', '医院', '医生'];
    if (medicalKeywords.some(kw => content.includes(kw))) {
      expected.push('R006');
    }

    // R007: 金融投资
    const financeKeywords = ['炒股', '股票', '投资', '理财', '保本', '收益', '基金', '外汇'];
    if (financeKeywords.some(kw => content.includes(kw))) {
      expected.push('R007');
    }

    // R008: 未成年人
    const minorKeywords = ['未成年人', '儿童', '小学生', '初中生', '打赏', '充值'];
    if (minorKeywords.some(kw => content.includes(kw))) {
      expected.push('R008');
    }

    return expected;
  }

  // 确定异常严重程度
  private determineSeverity(type: AnomalyType, sample: Sample): AnomalySeverity {
    switch (type) {
      case 'missing_rule':
        // 根据规则重要性确定
        if (sample.content.includes('毒品') || sample.content.includes('枪支')) {
          return 'critical';
        }
        if (sample.content.includes('投资') || sample.content.includes('医疗')) {
          return 'high';
        }
        return 'medium';
      case 'label_conflict':
        return 'high';
      case 'missing_unit':
        return 'medium';
      case 'format_error':
        return 'low';
      default:
        return 'medium';
    }
  }

  // 检测样本异常
  detectAnomalies(sample: Sample, matchedRuleIds: string[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // 1. 漏填单位检测
    if (!sample.unit || sample.unit.trim() === '') {
      const rule = getRuleById('R003');
      anomalies.push({
        anomalyId: `ANOM-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: 'missing_unit',
        severity: 'medium',
        description: 'unit_field_empty',
        naturalDescription: explainMissingUnit(sample.content),
        relatedRuleId: 'R003',
        handlingStatus: 'pending',
        handlingOpinion: rule?.handlingOpinion
      });
    }

    // 2. 规则漏配检测
    const expectedRules = this.checkExpectedRules(sample);
    const missingRules = expectedRules.filter(id => !matchedRuleIds.includes(id));

    missingRules.forEach(ruleId => {
      const rule = getRuleById(ruleId);
      const techDescription = `rule_${ruleId}_not_matched`;

      anomalies.push({
        anomalyId: `ANOM-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: 'missing_rule',
        severity: this.determineSeverity('missing_rule', sample),
        description: techDescription,
        naturalDescription: rule
          ? explainMissingRule(ruleId, rule.ruleName, sample.content)
          : translate(techDescription),
        relatedRuleId: ruleId,
        handlingStatus: 'pending',
        handlingOpinion: rule?.handlingOpinion
      });
    });

    // 3. 格式错误检测
    if (this.checkFormatError(sample)) {
      anomalies.push({
        anomalyId: `ANOM-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: 'format_error',
        severity: 'low',
        description: 'format_error_date',
        naturalDescription: translate('format_error_date'),
        relatedRuleId: 'R005',
        handlingStatus: 'pending',
        handlingOpinion: getRuleById('R005')?.handlingOpinion
      });
    }

    return anomalies;
  }

  // ========== 标签冲突检测 ==========

  // 检测标签冲突
  detectLabelConflicts(
    currentSamples: Sample[],
    previousSamples?: Sample[]
  ): LabelConflict[] {
    if (!previousSamples || previousSamples.length === 0) {
      return [];
    }

    const conflicts: LabelConflict[] = [];

    currentSamples.forEach(current => {
      const previous = previousSamples.find(p => p.sampleId === current.sampleId);
      if (previous && previous.securityLabel !== current.securityLabel) {
        conflicts.push({
          conflictId: `CONFLICT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          sampleId: current.sampleId,
          previousLabel: previous.securityLabel,
          currentLabel: current.securityLabel,
          reason: 'prompt_version_change',
          versionDiff: explainLabelConflict(
            previous.securityLabel,
            current.securityLabel,
            '提示词版本变更导致标签不一致，建议人工复核确认正确标签'
          )
        });
      }
    });

    return conflicts;
  }

  // ========== 分布统计 ==========

  // 计算分布统计
  calculateDistributionStats(
    samples: Sample[],
    labelConflicts: LabelConflict[]
  ): AnalysisResult['distributionStats'] {
    const bySourceType: AnalysisResult['distributionStats']['bySourceType'] = {
      old_table: 0,
      supplement: 0,
      normal: 0,
      missing_unit: 0
    };

    const byAnomalyType: AnalysisResult['distributionStats']['byAnomalyType'] = {
      missing_rule: 0,
      label_conflict: labelConflicts.length,
      missing_unit: 0,
      format_error: 0
    };

    const byRuleMatch: AnalysisResult['distributionStats']['byRuleMatch'] = {};
    const bySecurityLabel: AnalysisResult['distributionStats']['bySecurityLabel'] = {};

    // 初始化规则匹配统计
    this.rules.forEach(rule => {
      byRuleMatch[rule.ruleId] = { matched: 0, unmatched: 0 };
    });

    samples.forEach(sample => {
      // 按来源类型统计
      bySourceType[sample.sourceType]++;

      // 按安全标签统计
      bySecurityLabel[sample.securityLabel] = (bySecurityLabel[sample.securityLabel] || 0) + 1;

      // 按规则匹配统计
      this.rules.forEach(rule => {
        if (sample.matchedRules.includes(rule.ruleId)) {
          byRuleMatch[rule.ruleId].matched++;
        } else {
          byRuleMatch[rule.ruleId].unmatched++;
        }
      });

      // 按异常类型统计
      sample.anomalies.forEach(anomaly => {
        byAnomalyType[anomaly.type]++;
      });
    });

    return {
      bySourceType,
      byAnomalyType,
      byRuleMatch,
      bySecurityLabel
    };
  }

  // ========== 完整分析流程 ==========

  // 执行完整的归因分析
  async runAnalysis(
    samples: Sample[],
    recordId: string,
    previousSamples?: Sample[]
  ): Promise<AnalysisResult> {
    // 1. 对每个样本执行规则匹配和异常检测
    const processedSamples = samples.map(sample => {
      const matchedRules = this.matchSecurityRules(sample);
      const anomalies = this.detectAnomalies(sample, matchedRules);

      return {
        ...sample,
        matchedRules,
        anomalies
      };
    });

    // 2. 检测标签冲突
    const labelConflicts = this.detectLabelConflicts(processedSamples, previousSamples);

    // 3. 计算分布统计
    const distributionStats = this.calculateDistributionStats(processedSamples, labelConflicts);

    // 4. 识别异常样本
    const anomalySamples = processedSamples
      .filter(s => s.anomalies.length > 0)
      .map(s => s.sampleId);

    // 5. 生成可复现性信息
    const rng = reproducibilityManager.createSeededRandom();
    const reproducibility = {
      runId: reproducibilityManager.generateRunId(),
      seed: rng.nextInt(100000, 999999),
      timestamp: new Date().toISOString()
    };

    // 6. 构建结果
    const result: AnalysisResult = {
      resultId: `RESULT-${Date.now()}`,
      recordId,
      distributionStats,
      anomalySamples,
      labelConflicts,
      reproducibility
    };

    return result;
  }

  // 处理异常（标记为已处理）
  resolveAnomaly(
    sample: Sample,
    anomalyId: string,
    opinion: string,
    handledBy: string
  ): Sample {
    const updatedAnomalies = sample.anomalies.map(anomaly => {
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

    return {
      ...sample,
      anomalies: updatedAnomalies
    };
  }

  // 生成分析摘要文字说明
  generateSummary(result: AnalysisResult, samples: Sample[]): string {
    const totalSamples = samples.length;
    const anomalyCount = result.anomalySamples.length;
    const anomalyRate = ((anomalyCount / totalSamples) * 100).toFixed(2);
    const conflictCount = result.labelConflicts.length;

    const { bySourceType, byAnomalyType } = result.distributionStats;

    const summary = [
      `本次分析共处理样本 ${totalSamples} 条，发现异常样本 ${anomalyCount} 条，异常率 ${anomalyRate}%。`,
      '',
      '【数据来源分布】',
      `  · 正常录入：${bySourceType.normal} 条 (${((bySourceType.normal / totalSamples) * 100).toFixed(1)}%)`,
      `  · 旧表导入：${bySourceType.old_table} 条 (${((bySourceType.old_table / totalSamples) * 100).toFixed(1)}%)`,
      `  · 补录备注：${bySourceType.supplement} 条 (${((bySourceType.supplement / totalSamples) * 100).toFixed(1)}%)`,
      `  · 漏填单位：${bySourceType.missing_unit} 条 (${((bySourceType.missing_unit / totalSamples) * 100).toFixed(1)}%)`,
      '',
      '【异常类型分布】',
      `  · 规则漏配：${byAnomalyType.missing_rule} 条 - 安全规则未能捕获应识别的内容`,
      `  · 标签冲突：${conflictCount} 条 - 提示词版本变更导致标签不一致`,
      `  · 漏填单位：${byAnomalyType.missing_unit} 条 - 样本缺少单位字段`,
      `  · 格式错误：${byAnomalyType.format_error} 条 - 数据格式不符合规范`,
      '',
      `运行编号：${result.reproducibility.runId}`,
      `分析时间：${new Date(result.reproducibility.timestamp).toLocaleString('zh-CN')}`,
      '',
      '说明：所有异常均已关联到具体的安全规则，可通过异常追溯功能查看详细原因和处理建议。'
    ];

    return summary.join('\n');
  }
}

// 全局单例
export const attributionAnalyzer = new AttributionAnalyzer();
