import type {
  IndustryCard,
  FundPosition,
  NewsEvent,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ImportData,
} from '@/types';

const INDUSTRY_REQUIRED_FIELDS = [
  { key: 'name', label: '行业名称', responsible: '行业分析师', fixDoc: '《行业卡基础信息表》' },
  { key: 'riskLevel', label: '风险等级', responsible: '风险控制专员', fixDoc: '《风险等级评估标准》' },
  { key: 'sector', label: '所属板块', responsible: '行业研究员', fixDoc: '《行业分类标准》' },
  { key: 'manager', label: '负责人', responsible: '部门主管', fixDoc: '《人员职责分配表》' },
  { key: 'contact', label: '联系方式', responsible: '行政助理', fixDoc: '《内部通讯录》' },
];

const POSITION_REQUIRED_FIELDS = [
  { key: 'industryCardId', label: '关联行业卡ID', responsible: '数据管理员', fixDoc: '《行业卡与仓位映射表》' },
  { key: 'weight', label: '仓位权重', responsible: '基金经理', fixDoc: '《仓位配置说明书》' },
  { key: 'currentValue', label: '当前市值', responsible: '交易员', fixDoc: '《每日估值报告》' },
  { key: 'shares', label: '持有份额', responsible: '清算专员', fixDoc: '《持仓明细表》' },
];

const NEWS_REQUIRED_FIELDS = [
  { key: 'industryCardId', label: '关联行业卡ID', responsible: '数据管理员', fixDoc: '《行业卡与新闻映射表》' },
  { key: 'title', label: '新闻标题', responsible: '内容编辑', fixDoc: '《新闻内容审核规范》' },
  { key: 'content', label: '新闻内容', responsible: '内容编辑', fixDoc: '《新闻内容审核规范》' },
  { key: 'impactType', label: '影响类型', responsible: '策略分析师', fixDoc: '《事件影响评估指南》' },
  { key: 'round', label: '发生回合', responsible: '运营专员', fixDoc: '《游戏回合配置表》' },
];

function validateIndustryCards(cards: IndustryCard[]): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  cards.forEach((card) => {
    INDUSTRY_REQUIRED_FIELDS.forEach((field) => {
      const value = card[field.key as keyof IndustryCard];
      if (value === undefined || value === null || value === '' || (typeof value === 'number' && value === 0 && field.key !== 'expectedReturn' && field.key !== 'volatility')) {
        errors.push({
          field: field.key,
          entity: '行业卡',
          entityId: card.id,
          message: `行业卡「${card.name || card.id}」的「${field.label}」字段缺失或为空`,
          fixSuggestion: `请在${field.fixDoc}中补充该行业卡的${field.label}信息`,
          responsiblePerson: field.responsible,
        });
      }
    });

    if (card.expectedReturn === 0) {
      warnings.push({
        field: 'expectedReturn',
        entity: '行业卡',
        entityId: card.id,
        message: `行业卡「${card.name || card.id}」的预期收益率为0，可能影响游戏平衡性`,
        suggestion: '建议根据行业历史数据设置合理的预期收益率',
      });
    }

    if (card.volatility === 0) {
      warnings.push({
        field: 'volatility',
        entity: '行业卡',
        entityId: card.id,
        message: `行业卡「${card.name || card.id}」的波动率为0，可能导致市场波动过于平稳`,
        suggestion: '建议设置合理的波动率以体现行业风险特征',
      });
    }
  });

  return { errors, warnings };
}

function validatePositions(positions: FundPosition[]): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  positions.forEach((position) => {
    POSITION_REQUIRED_FIELDS.forEach((field) => {
      const value = position[field.key as keyof FundPosition];
      if (value === undefined || value === null || (typeof value === 'number' && value === 0)) {
        errors.push({
          field: field.key,
          entity: '基金仓位',
          entityId: position.id,
          message: `仓位「${position.id}」的「${field.label}」字段缺失或为0`,
          fixSuggestion: `请在${field.fixDoc}中补充该仓位的${field.label}数据`,
          responsiblePerson: field.responsible,
        });
      }
    });

    if (position.cost === 0) {
      warnings.push({
        field: 'cost',
        entity: '基金仓位',
        entityId: position.id,
        message: `仓位「${position.id}」的成本价为0，将无法准确计算收益率`,
        suggestion: '建议补充成本价以支持盈亏计算',
      });
    }
  });

  const totalWeight = positions.reduce((sum, p) => sum + p.weight, 0);
  if (Math.abs(totalWeight - 1) > 0.01 && totalWeight > 0) {
    warnings.push({
      field: 'weight',
      entity: '基金仓位',
      entityId: 'all',
      message: `所有仓位权重之和为${(totalWeight * 100).toFixed(1)}%，不等于100%`,
      suggestion: '建议调整各仓位权重使总和等于100%',
    });
  }

  return { errors, warnings };
}

function validateNewsEvents(news: NewsEvent[]): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  news.forEach((item) => {
    NEWS_REQUIRED_FIELDS.forEach((field) => {
      const value = item[field.key as keyof NewsEvent];
      if (value === undefined || value === null || value === '' || (typeof value === 'number' && value === 0 && field.key === 'round')) {
        errors.push({
          field: field.key,
          entity: '新闻事件',
          entityId: item.id,
          message: `新闻「${item.title || item.id}」的「${field.label}」字段缺失或无效`,
          fixSuggestion: `请在${field.fixDoc}中补充该新闻的${field.label}信息`,
          responsiblePerson: field.responsible,
        });
      }
    });

    if (item.impactMagnitude === 0) {
      warnings.push({
        field: 'impactMagnitude',
        entity: '新闻事件',
        entityId: item.id,
        message: `新闻「${item.title || item.id}」的影响程度为0，将不会对市场产生实际影响`,
        suggestion: '建议根据新闻重要性设置合理的影响程度（-0.15至0.15之间）',
      });
    }

    if (!item.source) {
      warnings.push({
        field: 'source',
        entity: '新闻事件',
        entityId: item.id,
        message: `新闻「${item.title || item.id}」缺少信息来源`,
        suggestion: '建议补充新闻来源以增强可信度',
      });
    }

    if (!['positive', 'negative', 'neutral'].includes(item.impactType)) {
      errors.push({
        field: 'impactType',
        entity: '新闻事件',
        entityId: item.id,
        message: `新闻「${item.title || item.id}」的影响类型「${item.impactType}」无效`,
        fixSuggestion: '请将影响类型设置为 positive、negative 或 neutral',
        responsiblePerson: '策略分析师',
      });
    }
  });

  return { errors, warnings };
}

export function validateImportData(data: ImportData): ValidationResult {
  const industryResult = validateIndustryCards(data.industryCards || []);
  const positionResult = validatePositions(data.positions || []);
  const newsResult = validateNewsEvents(data.newsEvents || []);

  const allErrors = [
    ...industryResult.errors,
    ...positionResult.errors,
    ...newsResult.errors,
  ];

  const allWarnings = [
    ...industryResult.warnings,
    ...positionResult.warnings,
    ...newsResult.warnings,
  ];

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

export function formatValidationMessage(result: ValidationResult): string {
  if (result.valid && result.warnings.length === 0) {
    return '✅ 数据校验通过，所有字段完整且格式正确';
  }

  const parts: string[] = [];

  if (result.errors.length > 0) {
    parts.push(`❌ 发现 ${result.errors.length} 个必须修复的错误：`);
    result.errors.slice(0, 5).forEach((err) => {
      parts.push(`  • ${err.message}`);
      parts.push(`    建议：${err.fixSuggestion}`);
      parts.push(`    负责人：${err.responsiblePerson}`);
    });
    if (result.errors.length > 5) {
      parts.push(`  ... 还有 ${result.errors.length - 5} 个错误`);
    }
  }

  if (result.warnings.length > 0) {
    parts.push(`⚠️  发现 ${result.warnings.length} 个建议优化的警告：`);
    result.warnings.slice(0, 3).forEach((warn) => {
      parts.push(`  • ${warn.message}`);
      parts.push(`    建议：${warn.suggestion}`);
    });
    if (result.warnings.length > 3) {
      parts.push(`  ... 还有 ${result.warnings.length - 3} 个警告`);
    }
  }

  return parts.join('\n');
}
