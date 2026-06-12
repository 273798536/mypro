import type { Declaration, RiskLevel } from '@/types';
import { checkSalinityCompliance } from './salinity';

export interface RiskCalculationResult {
  level: RiskLevel;
  salinityCompliant: boolean;
  exchangeRateCompliant: boolean;
  details: string[];
}

export interface PartialRiskResult {
  partialResult: RiskCalculationResult;
  missingFields: string[];
  alreadyCalculated: string[];
}

export function calculateRisk(declaration: Declaration): RiskCalculationResult {
  const details: string[] = [];
  let salinityOk = true;
  let exchangeOk = true;

  for (const bw of declaration.ballastWater) {
    const result = checkSalinityCompliance(bw.salinity, bw.salinityUnit);
    if (!result.compliant) {
      salinityOk = false;
      details.push(`${bw.tankId} 盐度 ${bw.salinity} ${bw.salinityUnit} → ${result.psuValue} PSU，超出阈值 ${result.threshold} PSU（+${result.delta}）`);
    }
    if (bw.exchangeMethod !== 'none' && bw.exchangeRate < 95) {
      exchangeOk = false;
      details.push(`${bw.tankId} 交换率 ${bw.exchangeRate}% < 95%`);
    }
    if (bw.exchangeMethod === 'none') {
      details.push(`${bw.tankId} 未进行压载水交换`);
    }
  }

  let level: RiskLevel = 'low';
  if (!salinityOk || declaration.boundaryIssues.some(i => i.severity === 'critical')) {
    level = 'high';
  } else if (!exchangeOk || declaration.boundaryIssues.some(i => i.severity === 'warning')) {
    level = 'medium';
  }

  if (declaration.riskNotices.some(n => n.level === 'high')) {
    if (level === 'low') level = 'medium';
    if (level === 'medium') level = 'high';
  }

  return { level, salinityCompliant: salinityOk, exchangeRateCompliant: exchangeOk, details };
}

export function calculateRiskWithGaps(declaration: Declaration): PartialRiskResult {
  const missingFields = declaration.weatherGaps
    .filter(g => g.status === 'missing')
    .map(g => g.displayName);

  const alreadyCalculated = declaration.weatherGaps
    .filter(g => g.status === 'filled')
    .map(g => g.displayName);

  const partialResult = calculateRisk(declaration);

  if (missingFields.length > 0) {
    partialResult.details.push(
      `⚠ 以下计算因数据缺失未完成：${missingFields.join('、')}。已计算项：${alreadyCalculated.length > 0 ? alreadyCalculated.join('、') : '无'}。`
    );
  }

  return { partialResult, missingFields, alreadyCalculated };
}

export function getRiskLevelLabel(level: RiskLevel): string {
  switch (level) {
    case 'high': return '高风险';
    case 'medium': return '中风险';
    case 'low': return '低风险';
    case 'pending': return '待判定';
  }
}

export function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case 'high': return 'risk-high';
    case 'medium': return 'risk-medium';
    case 'low': return 'risk-low';
    case 'pending': return 'risk-safe';
  }
}
