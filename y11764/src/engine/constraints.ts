import type { Portfolio } from '../types/portfolio';
import type { Constraint, FilterState, ConstraintValidationResult } from '../types/constraints';

export function checkConstraint(portfolio: Portfolio, constraint: Constraint): boolean {
  if (!constraint.enabled) return true;

  let value: number;
  
  switch (constraint.type) {
    case 'weight':
      if (!constraint.assetId) return true;
      value = portfolio.weights[constraint.assetId] || 0;
      break;
    case 'return':
      value = portfolio.expectedReturn;
      break;
    case 'volatility':
      value = portfolio.volatility;
      break;
    case 'drawdown':
      value = portfolio.maxDrawdown;
      break;
    case 'correlation':
      return true;
    default:
      return true;
  }

  const constraintValue = constraint.value;
  
  switch (constraint.operator) {
    case 'gt':
      return value > (constraintValue as number);
    case 'lt':
      return value < (constraintValue as number);
    case 'eq':
      return Math.abs(value - (constraintValue as number)) < 0.0001;
    case 'between':
      const [min, max] = constraintValue as [number, number];
      return value >= min && value <= max;
    default:
      return true;
  }
}

export function validatePortfolio(
  portfolio: Portfolio,
  constraints: Constraint[]
): ConstraintValidationResult {
  const violatedConstraints: Constraint[] = [];
  const suggestions: string[] = [];

  for (const constraint of constraints) {
    if (!constraint.enabled) continue;
    
    if (!checkConstraint(portfolio, constraint)) {
      violatedConstraints.push(constraint);
      
      let suggestion = '';
      switch (constraint.type) {
        case 'weight':
          suggestion = `调整${constraint.label}至${constraint.operator === 'lt' ? '低于' : '高于'}${(constraint.value as number * 100).toFixed(1)}%`;
          break;
        case 'return':
          suggestion = `预期收益率需${constraint.operator === 'gt' ? '高于' : '低于'}${(constraint.value as number * 100).toFixed(1)}%`;
          break;
        case 'volatility':
          suggestion = `波动率需${constraint.operator === 'lt' ? '低于' : '高于'}${(constraint.value as number * 100).toFixed(1)}%`;
          break;
        case 'drawdown':
          suggestion = `最大回撤需${constraint.operator === 'gt' ? '大于' : '小于'}${(constraint.value as number * 100).toFixed(1)}%`;
          break;
      }
      suggestions.push(suggestion);
    }
  }

  return {
    valid: violatedConstraints.length === 0,
    violatedConstraints,
    suggestions
  };
}

export function filterPortfolios(
  portfolios: Portfolio[],
  constraints: Constraint[],
  filters: FilterState
): Portfolio[] {
  return portfolios.filter(portfolio => {
    if (!filters.showAnomalies && portfolio.status !== 'normal') {
      return false;
    }

    if (filters.showOnlyFeasible) {
      const validation = validatePortfolio(portfolio, constraints);
      if (!validation.valid) return false;
    }

    if (filters.returnMin !== undefined && portfolio.expectedReturn < filters.returnMin) {
      return false;
    }
    if (filters.returnMax !== undefined && portfolio.expectedReturn > filters.returnMax) {
      return false;
    }

    if (filters.volatilityMin !== undefined && portfolio.volatility < filters.volatilityMin) {
      return false;
    }
    if (filters.volatilityMax !== undefined && portfolio.volatility > filters.volatilityMax) {
      return false;
    }

    if (filters.drawdownMin !== undefined && portfolio.maxDrawdown < filters.drawdownMin) {
      return false;
    }
    if (filters.drawdownMax !== undefined && portfolio.maxDrawdown > filters.drawdownMax) {
      return false;
    }

    if (filters.sharpeMin !== undefined && portfolio.sharpeRatio < filters.sharpeMin) {
      return false;
    }

    return true;
  });
}

export function findInactiveConstraints(
  portfolios: Portfolio[],
  constraints: Constraint[]
): Constraint[] {
  const inactiveConstraints: Constraint[] = [];

  for (const constraint of constraints) {
    if (!constraint.enabled) continue;

    const validPortfolios = portfolios.filter(p => checkConstraint(p, constraint));
    
    if (validPortfolios.length === 0) {
      inactiveConstraints.push(constraint);
    } else if (validPortfolios.length === portfolios.length) {
      inactiveConstraints.push(constraint);
    }
  }

  return inactiveConstraints;
}

export function getConstraintLabel(constraint: Constraint): string {
  const opLabels: Record<string, string> = {
    gt: '>',
    lt: '<',
    eq: '=',
    between: '在...之间'
  };

  const typeLabels: Record<string, string> = {
    weight: '权重',
    return: '收益',
    volatility: '波动',
    drawdown: '回撤',
    correlation: '相关性'
  };

  const valueStr = Array.isArray(constraint.value)
    ? `${(constraint.value[0] * 100).toFixed(1)}% ~ ${(constraint.value[1] * 100).toFixed(1)}%`
    : `${(constraint.value as number * 100).toFixed(1)}%`;

  return `${typeLabels[constraint.type]} ${opLabels[constraint.operator]} ${valueStr}`;
}
