import {
  SensorLog,
  FieldMappingResult,
  ThresholdParams,
  ThresholdResult,
  QualityIssue,
  OverrideAnalysis,
  AnalysisReport,
} from '../types';
import { generateId } from '../data/sampleLogs';
import { getIssueTypeLabel, getSeverityLabel } from './qualityCheck';
import { getOverrideStatistics } from './overrideAnalysis';
import { compareResults } from './thresholdCalc';

const formatDate = (date: Date): string => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatNumber = (num: number, decimals: number = 4): string => {
  return num.toFixed(decimals);
};

const generateFieldMappingSection = (mappingResult: FieldMappingResult): string => {
  const { mapping, detectedFields, unmatchedFields } = mappingResult;

  let section = `## 2. 字段映射说明\n\n`;
  section += `传感器日志字段名可能前后不一，以下是本次分析的字段映射关系：\n\n`;
  section += `| 标准字段 | 映射的原始字段 | 检测到的同义词 |\n`;
  section += `|----------|----------------|----------------|\n`;

  const fieldLabels: Record<string, string> = {
    deviceId: '设备编号',
    resistance: '内阻测量值',
    temperature: '温度',
    timestamp: '时间戳',
    manualRemark: '人工备注',
    manualOperator: '操作人',
  };

  Object.keys(mapping).forEach((key) => {
    const label = fieldLabels[key] || key;
    const mappedField = mapping[key as keyof typeof mapping];
    const synonyms = detectedFields[key]?.filter((f) => f !== mappedField).join(', ') || '-';
    section += `| ${label} | ${mappedField} | ${synonyms} |\n`;
  });

  if (unmatchedFields.length > 0) {
    section += `\n**未匹配的字段**: ${unmatchedFields.join(', ')}\n`;
  }

  return section + '\n';
};

const generateQualitySection = (issues: QualityIssue[], logs: SensorLog[]): string => {
  if (issues.length === 0) {
    return `## 3. 数据质量检查\n\n✅ 未发现数据质量问题\n\n`;
  }

  let section = `## 3. 数据质量问题\n\n`;
  section += `共发现 **${issues.length}** 个数据质量问题：\n\n`;
  section += `| 序号 | 行号 | 设备编号 | 问题类型 | 严重程度 | 问题描述 | 原始引用 |\n`;
  section += `|------|------|----------|----------|----------|----------|----------|\n`;

  issues.forEach((issue, index) => {
    const issueTypeLabel = getIssueTypeLabel(issue.issueType);
    const severityLabel = getSeverityLabel(issue.severity);
    const severityIcon = issue.severity === 'error' ? '🔴' : '🟠';
    section += `| ${index + 1} | ${issue.rawLineNumber} | ${issue.deviceId || '-'} | ${issueTypeLabel} | ${severityIcon} ${severityLabel} | ${issue.description} | ${issue.rawReference} |\n`;
  });

  section += `\n> **注意**: 存在质量问题的记录已标注，但未计入有效统计结果。\n\n`;

  return section;
};

const generateCalculationSteps = (result: ThresholdResult): string => {
  let section = `**计算过程:**\n\n`;
  section += `| 步骤 | 描述 | 公式/说明 | 输入 | 输出 |\n`;
  section += `|------|------|-----------|------|------|\n`;

  result.calculationSteps.forEach((step, index) => {
    const formula = step.conversion ? step.conversion : step.formula;
    section += `| ${index + 1} | ${step.description} | ${formula} | ${formatNumber(step.inputValue)}${step.inputUnit} | ${formatNumber(step.outputValue)}${step.outputUnit} |\n`;
  });

  return section + '\n';
};

const generateDetailedAnalysis = (
  logs: SensorLog[],
  results: ThresholdResult[],
  overrides: OverrideAnalysis[],
  qualityIssues: QualityIssue[],
  params: ThresholdParams
): string => {
  const resultMap = new Map(results.map((r) => [r.logId, r]));
  const overrideMap = new Map(overrides.map((o) => [o.logId, o]));
  const issueLogIds = new Set(qualityIssues.map((i) => i.logId));

  let section = `## 4. 详细分析记录（参数组: ${params.name}）\n\n`;
  section += `**阈值参数**: 预警阈值 = ${params.warningThreshold}${params.thresholdUnit}`;
  if (params.temperatureCompensation) {
    section += `, 温度补偿启用（基准温度: ${params.baseTemperature}°C, 温度系数: ${params.temperatureCoefficient}/°C）`;
  }
  section += '\n\n';

  section += `| 行号 | 设备编号 | 原始内阻 | 原始温度 | 换算后内阻 | 阈值 | 自动判定 | 人工备注 | 人工判定 | 一致性 |\n`;
  section += `|------|----------|----------|----------|------------|------|----------|----------|----------|--------|\n`;

  logs.forEach((log) => {
    const result = resultMap.get(log.id);
    const override = overrideMap.get(log.id);
    const hasIssue = issueLogIds.has(log.id);

    const statusIcon = result?.isWarning ? '🔴 预警' : '🟢 正常';
    const manualIcon = override?.manualJudgement === 'warning' ? '🔴 预警' : override?.manualJudgement === 'normal' ? '🟢 正常' : '⚪ 未判定';
    const consistencyIcon = override?.isConsistent ? '✅' : '❌';

    const resistanceStr = log.resistance !== null ? `${log.resistance}${log.resistanceUnit}` : '⚠️ 缺失';
    const tempStr = log.temperature !== null ? `${log.temperature}°C` : '⚠️ 缺失';
    const measuredStr = result ? `${formatNumber(result.measuredValue)}${result.measuredUnit}` : '-';
    const thresholdStr = result ? `${result.thresholdValue}${result.thresholdUnit}` : '-';

    let deviceDisplay = log.deviceId || '⚠️ 缺失';
    if (hasIssue) {
      deviceDisplay = `**⚠️ ${deviceDisplay}**`;
    }

    section += `| ${log.rawLineNumber} | ${deviceDisplay} | ${resistanceStr} | ${tempStr} | ${measuredStr} | ${thresholdStr} | ${statusIcon} | ${log.manualRemark || '-'} | ${manualIcon} | ${override?.manualJudgement ? consistencyIcon : '-'} |\n`;
  });

  return section + '\n';
};

const generateOverrideSection = (overrides: OverrideAnalysis[]): string => {
  const stats = getOverrideStatistics(overrides);
  const inconsistentRecords = overrides.filter((o) => !o.isConsistent && o.manualJudgement !== null);

  let section = `## 5. 人工改判影响分析\n\n`;

  section += `### 5.1 改判统计\n\n`;
  section += `| 指标 | 数值 | 说明 |\n`;
  section += `|------|------|------|\n`;
  section += `| 总记录数 | ${stats.total} | |\n`;
  section += `| 无人工备注 | ${stats.noOverride} | 仅自动判定 |\n`;
  section += `| 判定一致 | ${stats.consistent} | 人工与自动判定相同 |\n`;
  section += `| **判定不一致** | **${stats.inconsistent}** | **人工改判了结果** |\n`;
  section += `| 预警→正常 | ${stats.warningToNormal} | 可能存在漏检风险 |\n`;
  section += `| 正常→预警 | ${stats.normalToWarning} | 发现漏检案例 |\n`;
  section += `| 改判率 | ${stats.overrideRate}% | |\n`;
  section += `| 影响总分 | ${stats.totalImpactScore} | 每次改判+1分 |\n\n`;

  if (inconsistentRecords.length > 0) {
    section += `### 5.2 不一致记录详情\n\n`;

    inconsistentRecords.forEach((record, index) => {
      section += `#### 5.2.${index + 1} 行号 ${record.rawLineNumber}（${record.deviceId}）\n\n`;
      section += `- **自动判定**: ${record.autoJudgement === 'warning' ? '🔴 预警' : '🟢 正常'}\n`;
      section += `- **人工判定**: ${record.manualJudgement === 'warning' ? '🔴 预警' : '🟢 正常'}\n`;
      if (record.operator) {
        section += `- **改判人**: ${record.operator}\n`;
      }
      if (record.manualRemark) {
        section += `- **人工备注**: "${record.manualRemark}"\n`;
      }
      section += `- **影响分析**: ${record.impactDescription}\n\n`;
    });
  }

  return section;
};

const generateParamCompareSection = (
  resultsA: ThresholdResult[],
  resultsB: ThresholdResult[],
  paramsA: ThresholdParams,
  paramsB: ThresholdParams
): string => {
  const comparison = compareResults(resultsA, resultsB);
  const differences = comparison.filter((c) => c.isDifferent);

  let section = `## 6. 两组参数对照分析\n\n`;

  section += `### 6.1 参数对比\n\n`;
  section += `| 参数 | ${paramsA.name} | ${paramsB.name} |\n`;
  section += `|------|----------------|----------------|\n`;
  section += `| 预警阈值 | ${paramsA.warningThreshold}${paramsA.thresholdUnit} | ${paramsB.warningThreshold}${paramsB.thresholdUnit} |\n`;
  section += `| 温度补偿 | ${paramsA.temperatureCompensation ? '启用' : '禁用'} | ${paramsB.temperatureCompensation ? '启用' : '禁用'} |\n`;
  if (paramsA.temperatureCompensation) {
    section += `| 基准温度 | ${paramsA.baseTemperature}°C | ${paramsB.baseTemperature}°C |\n`;
    section += `| 温度系数 | ${paramsA.temperatureCoefficient}/°C | ${paramsB.temperatureCoefficient}/°C |\n`;
  }

  section += `\n### 6.2 结果对比\n\n`;
  section += `| 指标 | ${paramsA.name} | ${paramsB.name} |\n`;
  section += `|------|----------------|----------------|\n`;
  section += `| 预警数 | ${resultsA.filter((r) => r.isWarning).length} | ${resultsB.filter((r) => r.isWarning).length} |\n`;
  section += `| 正常数 | ${resultsA.filter((r) => !r.isWarning).length} | ${resultsB.filter((r) => !r.isWarning).length} |\n`;
  section += `| **判定差异** | **${differences.length} 条记录** | |\n\n`;

  if (differences.length > 0) {
    section += `### 6.3 差异记录\n\n`;
    section += `| 行号 | 设备编号 | ${paramsA.name} | ${paramsB.name} | 差异 |\n`;
    section += `|------|----------|----------------|----------------|------|\n`;

    differences.forEach((diff) => {
      const statusA = diff.resultA.isWarning ? '🔴 预警' : '🟢 正常';
      const statusB = diff.resultB.isWarning ? '🔴 预警' : '🟢 正常';
      section += `| ${diff.rawLineNumber} | ${diff.deviceId} | ${statusA} | ${statusB} | ${diff.difference} |\n`;
    });

    section += '\n';
  }

  return section;
};

const generateConclusion = (
  logs: SensorLog[],
  results: ThresholdResult[],
  overrides: OverrideAnalysis[],
  qualityIssues: QualityIssue[]
): string => {
  const validResults = results.filter((r) => !r.hasQualityIssue);
  const warningCount = validResults.filter((r) => r.isWarning).length;
  const normalCount = validResults.filter((r) => !r.isWarning).length;
  const stats = getOverrideStatistics(overrides);

  let section = `## 7. 结论与建议\n\n`;

  section += `### 7.1 数据概览\n\n`;
  section += `- 总记录数: ${logs.length} 条\n`;
  section += `- 有效记录: ${validResults.length} 条（已排除 ${qualityIssues.length} 条质量问题记录）\n`;
  section += `- 预警记录: ${warningCount} 条（${((warningCount / (validResults.length || 1)) * 100).toFixed(1)}%）\n`;
  section += `- 正常记录: ${normalCount} 条（${((normalCount / (validResults.length || 1)) * 100).toFixed(1)}%）\n\n`;

  section += `### 7.2 主要发现\n\n`;

  if (qualityIssues.length > 0) {
    section += `- ⚠️ 存在 ${qualityIssues.length} 个数据质量问题，建议检查数据源\n`;
  }

  if (stats.inconsistent > 0) {
    section += `- ⚠️ 存在 ${stats.inconsistent} 条人工改判记录（改判率 ${stats.overrideRate}%），建议复核以下内容：\n`;
    if (stats.warningToNormal > 0) {
      section += `  - ${stats.warningToNormal} 条"预警→正常"改判，评估是否存在漏检风险\n`;
    }
    if (stats.normalToWarning > 0) {
      section += `  - ${stats.normalToWarning} 条"正常→预警"改判，评估阈值设置是否合理\n`;
    }
  } else {
    section += `- ✅ 自动判定与人工判定一致性良好\n`;
  }

  if (warningCount > 0) {
    section += `- 🔴 ${warningCount} 条记录触发预警阈值，建议安排电池维护或更换\n`;
  }

  section += `\n### 7.3 建议\n\n`;
  section += `1. 定期检查传感器日志数据质量，减少重复记录和异常值\n`;
  section += `2. 建立人工改判标准化流程，明确改判原因和依据\n`;
  section += `3. 根据人工改判反馈，定期优化阈值参数设置\n`;
  section += `4. 对预警设备建立跟踪机制，定期复测确认\n`;

  return section;
};

export const generateReport = (
  logs: SensorLog[],
  mappingResult: FieldMappingResult,
  paramsA: ThresholdParams,
  paramsB: ThresholdParams,
  resultsA: ThresholdResult[],
  resultsB: ThresholdResult[],
  qualityIssues: QualityIssue[],
  overrides: OverrideAnalysis[],
  dataSource: string
): AnalysisReport => {
  const validResults = resultsA.filter((r) => !r.hasQualityIssue);
  const warningCount = validResults.filter((r) => r.isWarning).length;
  const normalCount = validResults.filter((r) => !r.isWarning).length;
  const stats = getOverrideStatistics(overrides);

  let markdown = `# 电池内阻阈值预警分析报告\n\n`;
  markdown += `> 报告生成时间: ${formatDate(new Date())}\n`;
  markdown += `> 数据来源: ${dataSource}\n\n`;

  markdown += `## 1. 数据概览\n\n`;
  markdown += `| 指标 | 数值 |\n`;
  markdown += `|------|------|\n`;
  markdown += `| 总记录数 | ${logs.length} |\n`;
  markdown += `| 有效记录 | ${validResults.length} |\n`;
  markdown += `| 预警记录 | ${warningCount} |\n`;
  markdown += `| 正常记录 | ${normalCount} |\n`;
  markdown += `| 人工改判 | ${stats.inconsistent} |\n`;
  markdown += `| 数据质量问题 | ${qualityIssues.length} |\n\n`;

  markdown += generateFieldMappingSection(mappingResult);
  markdown += generateQualitySection(qualityIssues, logs);
  markdown += generateDetailedAnalysis(logs, resultsA, overrides, qualityIssues, paramsA);
  markdown += generateOverrideSection(overrides);
  markdown += generateParamCompareSection(resultsA, resultsB, paramsA, paramsB);
  markdown += generateConclusion(logs, resultsA, overrides, qualityIssues);

  markdown += `\n---\n\n`;
  markdown += `*本报告由电池内阻阈值预警分析系统自动生成，所有结论均可追溯至原始传感器日志。*\n`;

  return {
    reportId: generateId(),
    generatedAt: formatDate(new Date()),
    dataSource,
    totalRecords: logs.length,
    validRecords: validResults.length,
    warningCount,
    normalCount,
    overrideCount: stats.inconsistent,
    inconsistencyCount: stats.inconsistent,
    qualityIssueCount: qualityIssues.length,
    markdownContent: markdown,
  };
};

export const downloadReport = (report: AnalysisReport, filename?: string): void => {
  const blob = new Blob([report.markdownContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `电池内阻预警分析报告_${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('复制失败:', err);
    return false;
  }
};
