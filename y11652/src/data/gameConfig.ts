import type { Difficulty } from '@/types';

export const DIFFICULTY_CONFIG: Record<Difficulty, {
  cardCount: number;
  timeLimit: number;
  borrowProbability: number;
}> = {
  easy: {
    cardCount: 8,
    timeLimit: 300,
    borrowProbability: 0.2,
  },
  normal: {
    cardCount: 12,
    timeLimit: 360,
    borrowProbability: 0.3,
  },
  hard: {
    cardCount: 16,
    timeLimit: 420,
    borrowProbability: 0.4,
  },
};

export const SCORE_CONFIG = {
  correctClassification: 10,
  correctSecurityLevel: 5,
  correctRetentionPeriod: 5,
  correctBorrowRegistration: 5,
  comboBonusPerLevel: 2,
  maxComboBonus: 10,
  wrongClassification: -10,
  wrongSecurityLevel: -5,
  wrongRetentionPeriod: -5,
  borrowNotRegistered: -5,
};

export const COLORS = {
  primary: '#1e3a5f',
  secondary: '#f5f0e6',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  contract: '#3b82f6',
  invoice: '#10b981',
  confidential: '#ef4444',
};
