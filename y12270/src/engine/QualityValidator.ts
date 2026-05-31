import type { BondHolding, QualityIssue, SurfacePoint, AnalysisParams } from '../types';

const VALID_INDUSTRIES = [
  '国债', '地方政府债', '金融债', '企业债', '公司债',
  '中期票据', '短期融资券', '资产支持证券', '可转债', '可交换债'
];

export function validateDataQuality(
  holdings: BondHolding[],
  params: AnalysisParams,
  surfacePoints?: SurfacePoint[]
): QualityIssue[] {
  const issues: QualityIssue[] = [];

  issues.push(...detectMissingWeights(holdings));
  issues.push(...detectInvalidValues(holdings));
  issues.push(...detectIndustryConflicts(holdings));

  if (surfacePoints) {
    issues.push(...detectOutliers(surfacePoints, holdings));
  }

  return issues;
}

function detectMissingWeights(holdings: BondHolding[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const missingWeights = holdings.filter(h => h.weight === null || isNaN(h.weight));

  for (const bond of missingWeights) {
    issues.push({
      issueId: generateId(),
      bondId: bond.bondId,
      type: 'weight_missing',
      severity: 'high',
      description: `${bond.bondName} 权重缺失`,
      impact: `久期计算将使用等权重替代，影响组合久期准确性。该债券面值 ${formatCurrency(bond.faceValue)}，占组合面值约 ${calculateFaceValuePercentage(bond.faceValue, holdings)}%`,
      affectedResults: ['加权久期', '风险曲面Z轴值', '行业久期分布'],
      resolved: false
    });
  }

  return issues;
}

function detectInvalidValues(holdings: BondHolding[]): QualityIssue[] {
  const issues: QualityIssue[] = [];

  for (const bond of holdings) {
    if (bond.duration < 0 || bond.duration > 30) {
      issues.push({
        issueId: generateId(),
        bondId: bond.bondId,
        type: 'invalid_value',
        severity: 'high',
        description: `${bond.bondName} 久期值异常: ${bond.duration}年`,
        impact: `异常久期值可能扭曲风险曲面形态，建议核实数据准确性`,
        affectedResults: ['风险曲面X轴分布', '平均久期', '久期结论'],
        resolved: false
      });
    }

    if (bond.yield < -5 || bond.yield > 20) {
      issues.push({
        issueId: generateId(),
        bondId: bond.bondId,
        type: 'invalid_value',
        severity: 'high',
        description: `${bond.bondName} 收益率异常: ${bond.yield}%`,
        impact: `异常收益率可能扭曲风险曲面形态，建议核实数据准确性`,
        affectedResults: ['风险曲面Y轴分布', '平均收益率', '风险评估'],
        resolved: false
      });
    }

    if (bond.faceValue <= 0) {
      issues.push({
        issueId: generateId(),
        bondId: bond.bondId,
        type: 'invalid_value',
        severity: 'medium',
        description: `${bond.bondName} 面值异常: ${bond.faceValue}`,
        impact: `异常面值可能影响权重计算和组合分析`,
        affectedResults: ['权重计算', '组合规模统计'],
        resolved: false
      });
    }

    if (bond.weight !== null && (bond.weight < 0 || bond.weight > 100)) {
      issues.push({
        issueId: generateId(),
        bondId: bond.bondId,
        type: 'invalid_value',
        severity: 'high',
        description: `${bond.bondName} 权重值异常: ${bond.weight}%`,
        impact: `权重值超出合理范围，将影响加权久期计算`,
        affectedResults: ['加权久期', '风险曲面Z轴值'],
        resolved: false
      });
    }
  }

  return issues;
}

function detectIndustryConflicts(holdings: BondHolding[]): QualityIssue[] {
  const issues: QualityIssue[] = [];

  for (const bond of holdings) {
    if (!VALID_INDUSTRIES.includes(bond.industry)) {
      issues.push({
        issueId: generateId(),
        bondId: bond.bondId,
        type: 'industry_conflict',
        severity: 'medium',
        description: `${bond.bondName} 行业标签异常: "${bond.industry}" 不在标准行业列表中`,
        impact: `行业筛选可能无法正确识别该债券，可能导致其被排除在分析范围外`,
        affectedResults: ['行业筛选', '行业久期分布', '行业集中度分析'],
        resolved: false
      });
    }
  }

  const industryGroups: Record<string, BondHolding[]> = {};
  for (const bond of holdings) {
    if (!industryGroups[bond.industry]) industryGroups[bond.industry] = [];
    industryGroups[bond.industry].push(bond);
  }

  for (const [industry, bonds] of Object.entries(industryGroups)) {
    if (bonds.length > 1) {
      const durations = bonds.map(b => b.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDeviation = Math.max(...durations.map(d => Math.abs(d - avgDuration)));

      if (maxDeviation > 3) {
        issues.push({
          issueId: generateId(),
          bondId: bonds[0].bondId,
          type: 'industry_conflict',
          severity: 'medium',
          description: `行业"${industry}"内久期差异过大: 平均${avgDuration.toFixed(2)}年，最大偏差${maxDeviation.toFixed(2)}年`,
          impact: `同一行业内久期差异过大可能导致行业标签与久期分析冲突，建议检查分类准确性`,
          affectedResults: ['行业久期分布', '久期与行业标签的一致性', '风险曲面的行业解释力'],
          resolved: false
        });
      }
    }
  }

  return issues;
}

function detectOutliers(surfacePoints: SurfacePoint[], holdings: BondHolding[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const outlierPoints = surfacePoints.filter(p => p.isOutlier);

  for (const point of outlierPoints) {
    for (const bondId of point.bondIds) {
      const bond = holdings.find(h => h.bondId === bondId);
      if (bond) {
        const existingIssue = issues.find(i => i.bondId === bondId && i.type === 'outlier');
        if (!existingIssue) {
          issues.push({
            issueId: generateId(),
            bondId: bondId,
            type: 'outlier',
            severity: 'medium',
            description: `${bond.bondName} 为风险异常点 (风险值: ${point.z.toFixed(2)})`,
            impact: `该债券位于久期${point.x.toFixed(2)}年、收益率${point.y.toFixed(2)}%区域，风险值显著偏离周边区域，可能遮挡周边正常数据点，扭曲曲面形态`,
            affectedResults: ['曲面视觉效果', '局部风险评估', '久期-收益率分布解读'],
            resolved: false
          });
        }
      }
    }
  }

  return issues;
}

function generateId(): string {
  return 'issue-' + Math.random().toString(36).substring(2, 10);
}

function formatCurrency(value: number): string {
  if (value >= 100000000) {
    return (value / 100000000).toFixed(2) + '亿元';
  } else if (value >= 10000) {
    return (value / 10000).toFixed(2) + '万元';
  }
  return value.toLocaleString() + '元';
}

function calculateFaceValuePercentage(faceValue: number, allHoldings: BondHolding[]): string {
  const totalFaceValue = allHoldings.reduce((sum, h) => sum + h.faceValue, 0);
  if (totalFaceValue === 0) return '0.00';
  return ((faceValue / totalFaceValue) * 100).toFixed(2);
}

export function summarizeQualityIssues(issues: QualityIssue[]): {
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  hasHighSeverity: boolean;
} {
  const summary = {
    total: issues.length,
    bySeverity: { high: 0, medium: 0, low: 0 },
    byType: {
      weight_missing: 0,
      outlier: 0,
      industry_conflict: 0,
      invalid_value: 0
    },
    hasHighSeverity: false
  };

  for (const issue of issues) {
    summary.bySeverity[issue.severity]++;
    summary.byType[issue.type]++;
    if (issue.severity === 'high') {
      summary.hasHighSeverity = true;
    }
  }

  return summary;
}

export function getIssueTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    weight_missing: '权重缺失',
    outlier: '异常点',
    industry_conflict: '行业冲突',
    invalid_value: '数值异常'
  };
  return labels[type] || type;
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    high: '#ef4444',
    medium: '#f97316',
    low: '#eab308'
  };
  return colors[severity] || '#6b7280';
}
