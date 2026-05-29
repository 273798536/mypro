import type { Account, AccountStatus, OperationType } from '../types';
import { GAME_CONFIG } from '../constants/gameConfig';

export const getAccountStatus = (riskLevel: number): AccountStatus => {
  if (riskLevel >= GAME_CONFIG.DANGER_THRESHOLD) return 'danger';
  if (riskLevel >= GAME_CONFIG.WARNING_THRESHOLD) return 'warning';
  return 'normal';
};

export const getRiskColor = (status: AccountStatus): string => {
  switch (status) {
    case 'normal': return 'bg-risk-safe';
    case 'warning': return 'bg-risk-warning';
    case 'danger': return 'bg-risk-danger';
    case 'liquidated': return 'bg-risk-liquidated';
  }
};

export const getRiskTextColor = (status: AccountStatus): string => {
  switch (status) {
    case 'normal': return 'text-risk-safe';
    case 'warning': return 'text-risk-warning';
    case 'danger': return 'text-risk-danger';
    case 'liquidated': return 'text-risk-liquidated';
  }
};

export const getStatusLabel = (status: AccountStatus): string => {
  switch (status) {
    case 'normal': return '安全';
    case 'warning': return '预警';
    case 'danger': return '危险';
    case 'liquidated': return '爆仓';
  }
};

export const shouldForceLiquidate = (account: Account): boolean => {
  return account.riskLevel >= GAME_CONFIG.DANGER_THRESHOLD && account.status !== 'liquidated';
};

export const sortForceCloseQueue = (accounts: Account[]): Account[] => {
  return [...accounts]
    .filter(acc => shouldForceLiquidate(acc))
    .sort((a, b) => {
      if (b.riskLevel !== a.riskLevel) return b.riskLevel - a.riskLevel;
      if (b.unrealizedPnL !== a.unrealizedPnL) return a.unrealizedPnL - b.unrealizedPnL;
      return a.totalCapital - b.totalCapital;
    });
};

export const evaluateOperation = (
  account: Account,
  operationType: OperationType,
  amount?: number
): { isCorrect: boolean; reason: string; scoreChange: number } => {
  const { WARNING_THRESHOLD, DANGER_THRESHOLD, SCORE_CORRECT_OPERATION, SCORE_WRONG_OPERATION } = GAME_CONFIG;
  
  if (account.status === 'liquidated') {
    return {
      isCorrect: false,
      reason: '账户已爆仓，无法操作',
      scoreChange: SCORE_WRONG_OPERATION,
    };
  }

  const currentRisk = account.riskLevel;

  switch (operationType) {
    case 'add_margin':
      if (amount !== undefined && amount <= 0) {
        return {
          isCorrect: false,
          reason: '追加保证金金额必须大于0',
          scoreChange: SCORE_WRONG_OPERATION * 0.3,
        };
      }
      if (amount !== undefined && amount > account.availableCapital) {
        return {
          isCorrect: false,
          reason: '可用资金不足，无法追加该金额的保证金',
          scoreChange: SCORE_WRONG_OPERATION * 0.5,
        };
      }
      if (currentRisk >= DANGER_THRESHOLD) {
        return {
          isCorrect: true,
          reason: '高风险状态下追加保证金是正确操作',
          scoreChange: SCORE_CORRECT_OPERATION,
        };
      } else if (currentRisk >= WARNING_THRESHOLD) {
        return {
          isCorrect: true,
          reason: '预警状态下追加保证金是合理操作',
          scoreChange: SCORE_CORRECT_OPERATION * 0.8,
        };
      } else {
        return {
          isCorrect: false,
          reason: '风险度正常，无需追加保证金',
          scoreChange: SCORE_WRONG_OPERATION * 0.5,
        };
      }

    case 'partial_close':
    case 'full_close':
      if (currentRisk >= DANGER_THRESHOLD) {
        return {
          isCorrect: true,
          reason: '高风险状态下平仓是正确操作',
          scoreChange: SCORE_CORRECT_OPERATION,
        };
      } else if (currentRisk >= WARNING_THRESHOLD) {
        return {
          isCorrect: true,
          reason: '预警状态下减仓是合理操作',
          scoreChange: SCORE_CORRECT_OPERATION * 0.8,
        };
      } else {
        return {
          isCorrect: false,
          reason: '风险度正常，无需平仓',
          scoreChange: SCORE_WRONG_OPERATION * 0.5,
        };
      }

    case 'skip':
      if (currentRisk >= DANGER_THRESHOLD) {
        return {
          isCorrect: false,
          reason: '高风险状态下必须采取行动！',
          scoreChange: SCORE_WRONG_OPERATION,
        };
      } else if (currentRisk >= WARNING_THRESHOLD) {
        return {
          isCorrect: false,
          reason: '预警状态下建议采取行动',
          scoreChange: SCORE_WRONG_OPERATION * 0.5,
        };
      } else {
        return {
          isCorrect: true,
          reason: '风险可控，观望是合理选择',
          scoreChange: SCORE_CORRECT_OPERATION * 0.3,
        };
      }

    default:
      return {
        isCorrect: false,
        reason: '未知操作类型',
        scoreChange: 0,
      };
  }
};

export const assessGameResult = (
  totalScore: number,
  correctOps: number,
  totalOps: number
): { rating: 'S' | 'A' | 'B' | 'C' | 'D'; accuracy: number } => {
  const accuracy = totalOps > 0 ? (correctOps / totalOps) * 100 : 0;
  
  let rating: 'S' | 'A' | 'B' | 'C' | 'D' = 'D';
  if (totalScore >= 900) rating = 'S';
  else if (totalScore >= 800) rating = 'A';
  else if (totalScore >= 700) rating = 'B';
  else if (totalScore >= 600) rating = 'C';
  
  return { rating, accuracy };
};
