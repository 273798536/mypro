import { ClaimCase, Contract, CalculationResult } from '../types';

export class RecoveryCalculator {
  static calculate(claim: ClaimCase, contract: Contract): CalculationResult {
    const { totalLoss } = claim;
    const { shareRate, deductible, layerType, version } = contract;

    let deductibleApplied = deductible;
    let recoverableAmount = 0;
    let hasError = false;
    let errorMessage: string | undefined;
    let basis = '';

    if (layerType === 'quota') {
      recoverableAmount = Math.max(0, totalLoss - deductible) * shareRate;
      basis = `成数分保：(${totalLoss.toLocaleString()} - ${deductible.toLocaleString()}) × ${(shareRate * 100).toFixed(0)}% = ${recoverableAmount.toLocaleString()}`;
    } else {
      recoverableAmount = Math.max(0, totalLoss - deductible) * shareRate;
      basis = `溢额分保：max(0, ${totalLoss.toLocaleString()} - ${deductible.toLocaleString()}) × ${(shareRate * 100).toFixed(0)}% = ${recoverableAmount.toLocaleString()}`;
    }

    return {
      recoverableAmount: Math.round(recoverableAmount),
      deductibleApplied,
      hasError,
      errorMessage,
      basis,
    };
  }

  static detectDeductibleError(
    claim: ClaimCase,
    currentContract: Contract,
    appliedDeductible: number,
    contractVersions: { version: string; deductible: number }[]
  ): { hasError: boolean; message?: string } {
    const expectedDeductible = currentContract.deductible;
    const currentVersion = currentContract.version;

    if (appliedDeductible !== expectedDeductible) {
      const wrongVersion = contractVersions.find(v => v.deductible === appliedDeductible);
      if (wrongVersion) {
        return {
          hasError: true,
          message: `免赔错用：应使用${currentVersion}版本免赔额${expectedDeductible.toLocaleString()}，但实际按${wrongVersion.version}版本${appliedDeductible.toLocaleString()}计算`,
        };
      }
      return {
        hasError: true,
        message: `免赔错用：合同${currentVersion}版本免赔额应为${expectedDeductible.toLocaleString()}，但实际使用${appliedDeductible.toLocaleString()}`,
      };
    }

    return { hasError: false };
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
