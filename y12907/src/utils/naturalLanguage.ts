// 自然语言转译工具 - 避免字段名和缩写，让非技术人员能看懂

import { AnomalyType, SampleSourceType } from '../types';

// 技术术语到自然语言的映射
const translationMap: Record<string, string> = {
  // 字段名转译
  'unit_field_empty': '样本的"单位"这一列没有填写内容',
  'unit_field_missing': '数据中缺少"单位"字段信息',
  'annotation_label': '人工标注的标签',
  'security_label': '安全审核标签',
  'source_type': '数据来源类型',
  'match_condition': '规则匹配条件',
  'handling_opinion': '处理建议',
  
  // 规则漏配转译
  'rule_R001_not_matched': '安全规则R001（敏感词检测规则）未能识别到该样本应当包含的敏感内容，可能是关键词库未覆盖',
  'rule_R002_not_matched': '安全规则R002（个人信息保护规则）未能识别到该样本中的个人隐私信息，可能是正则表达式不够全面',
  'rule_R003_not_matched': '安全规则R003（单位校验规则）未生效，因为样本没有填写单位字段',
  'rule_R004_not_matched': '安全规则R004（违法违规内容规则）未能识别到该样本中的违法违规内容',
  'rule_R005_not_matched': '安全规则R005（数据格式规范规则）未能检测到该样本的格式问题',
  'rule_R006_not_matched': '安全规则R006（医疗健康建议规则）未能识别到该样本中的医疗建议内容',
  'rule_R007_not_matched': '安全规则R007（金融投资建议规则）未能识别到该样本中的投资建议内容',
  'rule_R008_not_matched': '安全规则R008（未成年人保护规则）未能识别到涉及未成年人的不适宜内容',
  
  // 异常原因转译
  'label_conflict_version': '由于提示词版本更新后，该样本的安全标签与之前版本标注结果不一致',
  'label_conflict_manual': '人工审核标注与模型自动标注结果存在差异',
  'format_error_date': '日期格式不符合要求，应为YYYY-MM-DD格式',
  'format_error_number': '数值格式不正确，包含非数字字符',
  'format_error_length': '文本长度超出限制范围',
  
  // 来源类型转译
  'source_type_old_table': '数据来源于历史旧表导入，可能存在格式不统一的问题',
  'source_type_supplement': '数据来源于后期补录备注，可能缺少完整的上下文信息',
  'source_type_normal': '数据来源于正常录入流程',
  'source_type_missing_unit': '该条数据未填写计量单位字段',
  
  // 处理状态转译
  'status_pending': '等待处理',
  'status_processing': '正在分析处理中',
  'status_completed': '分析处理已完成',
  'status_error': '处理过程中出现错误',
  
  // 严重程度转译
  'severity_low': '轻微问题，不影响整体分析结果',
  'severity_medium': '中等问题，需要关注并处理',
  'severity_high': '严重问题，必须处理，否则影响分析结论',
  'severity_critical': '致命问题，可能导致整个批次数据作废'
};

// 异常类型通用转译
export const translateAnomalyType = (type: AnomalyType): string => {
  const typeMap: Record<AnomalyType, string> = {
    'missing_rule': '安全规则漏配',
    'label_conflict': '标签冲突',
    'missing_unit': '漏填单位',
    'format_error': '格式错误'
  };
  return typeMap[type] || type;
};

// 来源类型通用转译
export const translateSourceType = (type: SampleSourceType): string => {
  const typeMap: Record<SampleSourceType, string> = {
    'old_table': '历史旧表导入',
    'supplement': '后期补录备注',
    'normal': '正常录入',
    'missing_unit': '漏填单位'
  };
  return typeMap[type] || type;
};

// 技术术语转译
export const translate = (term: string): string => {
  if (translationMap[term]) {
    return translationMap[term];
  }
  
  // 处理 rule_XXX_not_matched 的通用情况
  const ruleMatch = term.match(/rule_(R\d+)_not_matched/);
  if (ruleMatch) {
    const ruleId = ruleMatch[1];
    return `安全规则${ruleId}未能匹配到该样本，可能是规则配置的关键词或匹配条件不够全面，导致本应被捕获的内容漏过了`;
  }
  
  // 处理 unit_field_XXX 的通用情况
  const unitMatch = term.match(/unit_field_(\w+)/);
  if (unitMatch) {
    return `样本的"单位"字段${unitMatch[1] === 'empty' ? '为空' : '有问题'}，需要补充完整才能进行准确的安全规则校验`;
  }
  
  return term;
};

// 生成规则漏配的自然语言解释
export const explainMissingRule = (ruleId: string, ruleName: string, sampleContent: string): string => {
  const explanations = [
    `按照「${ruleName}」（${ruleId}）的要求，样本内容"${sampleContent.substring(0, 30)}${sampleContent.length > 30 ? '...' : ''}"本应被该安全规则捕获。`,
    `实际未匹配的可能原因：`,
    `1. 规则配置的关键词库中未包含此类表述方式`,
    `2. 规则的正则表达式匹配范围不够全面`,
    `3. 样本采用了规则未覆盖的委婉或隐晦表达方式`,
    `建议：检查规则配置，补充相关关键词或调整匹配条件`
  ];
  return explanations.join('\n');
};

// 生成标签冲突的自然语言解释
export const explainLabelConflict = (
  previousLabel: string,
  currentLabel: string,
  versionDiff: string
): string => {
  return [
    `该样本存在标签冲突：`,
    `- 之前版本标注为：${previousLabel}`,
    `- 当前版本标注为：${currentLabel}`,
    `原因分析：${versionDiff}`,
    `建议：核对提示词版本变更内容，确定哪个标签更准确，必要时进行人工复核`
  ].join('\n');
};

// 生成漏填单位的自然语言解释
export const explainMissingUnit = (sampleContent: string): string => {
  return [
    `该样本未填写计量单位字段。`,
    `样本内容：${sampleContent.substring(0, 50)}${sampleContent.length > 50 ? '...' : ''}`,
    `影响：缺少单位可能导致安全规则R003（单位校验规则）无法准确判断数据的合理性。`,
    `建议：请补充填写单位（如：个、条、件、篇、元、次等），确保数据完整后再进行分析。`
  ].join('\n');
};

// 生成导出报告的头部说明
export const generateReportHeader = (totalSamples: number, anomalyCount: number, runId: string): string => {
  return [
    '安全拒答样本归因分析报告',
    '='.repeat(40),
    `分析时间：${new Date().toLocaleString('zh-CN')}`,
    `运行编号：${runId}（可用于复现本次分析结果）`,
    `分析样本总数：${totalSamples}条`,
    `发现异常样本：${anomalyCount}条`,
    `异常率：${((anomalyCount / totalSamples) * 100).toFixed(2)}%`,
    '',
    '说明：本报告所有技术术语已转译为自然语言，方便非技术人员阅读。',
    '如需追溯具体异常的详细原因，请使用系统的异常追溯功能。',
    '='.repeat(40),
    ''
  ].join('\n');
};

// 生成处理意见的自然语言描述
export const translateHandlingOpinion = (technicalOpinion: string): string => {
  // 简单的处理意见美化
  if (technicalOpinion.includes('退回')) {
    return `建议退回标注人员处理：${technicalOpinion}`;
  }
  if (technicalOpinion.includes('人工审核')) {
    return `需要人工审核确认：${technicalOpinion}`;
  }
  if (technicalOpinion.includes('脱敏')) {
    return `需要进行数据脱敏处理：${technicalOpinion}`;
  }
  return technicalOpinion;
};
