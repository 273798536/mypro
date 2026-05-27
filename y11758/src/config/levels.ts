import { LevelConfig } from '@/types';

export const LEVELS: LevelConfig[] = [
  {
    id: 'level-1',
    name: '入门稽核',
    description: '熟悉基础操作，识别简单的发票异常。包含同票重复和付款滞后各1例。',
    timeLimit: 180,
    difficulty: 'easy',
    cardCount: {
      invoice: 6,
      customer: 4,
      payment: 5,
    },
    anomalies: {
      duplicateInvoices: 1,
      mismatchChains: 0,
      delayedPayments: 1,
    },
  },
  {
    id: 'level-2',
    name: '进阶稽核',
    description: '检测上下游不匹配和多笔异常。包含同票重复1例、上下游不匹配1例、付款滞后1例。',
    timeLimit: 240,
    difficulty: 'medium',
    cardCount: {
      invoice: 10,
      customer: 6,
      payment: 8,
    },
    anomalies: {
      duplicateInvoices: 1,
      mismatchChains: 1,
      delayedPayments: 1,
    },
  },
  {
    id: 'level-3',
    name: '高级稽核',
    description: '复杂场景，多种异常交织。包含同票重复2例、上下游不匹配1例、付款滞后2例。',
    timeLimit: 300,
    difficulty: 'hard',
    cardCount: {
      invoice: 15,
      customer: 8,
      payment: 12,
    },
    anomalies: {
      duplicateInvoices: 2,
      mismatchChains: 1,
      delayedPayments: 2,
    },
  },
];

export const DEFAULT_RISK_LABELS = [
  {
    id: 'duplicate_invoice',
    name: '同票重复',
    description: '同一发票号码出现多次',
  },
  {
    id: 'mismatch_chain',
    name: '上下游不匹配',
    description: '发票的销方/购方与客户信息不一致',
  },
  {
    id: 'delayed_payment',
    name: '付款滞后',
    description: '付款时间远晚于发票日期',
  },
  {
    id: 'amount_anomaly',
    name: '金额异常',
    description: '发票金额与付款金额不一致',
  },
];

export const ANOMALY_SCORES = {
  duplicate_invoice: 25,
  mismatch_chain: 30,
  delayed_payment: 20,
  amount_anomaly: 15,
};

export const WRONG_MARK_PENALTY = 15;

export const TIME_BONUS_PER_10_SECONDS = 5;

export const GRADE_THRESHOLDS = [
  { grade: 'S', minScore: 90 },
  { grade: 'A', minScore: 80 },
  { grade: 'B', minScore: 70 },
  { grade: 'C', minScore: 60 },
  { grade: 'D', minScore: 0 },
];
