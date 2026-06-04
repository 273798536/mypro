import { ReviewLevel } from './types';

export const REVIEW_LEVELS: ReviewLevel[] = [
  {
    id: 'level-1',
    name: '基础关卡',
    description: '完成基础拼图审核，包含至少2个异常标注',
    order: 1,
    requiresBoundaryFailure: false,
    requiresUndo: false,
    minAnnotations: 2
  },
  {
    id: 'level-2',
    name: '边界失败关卡',
    description: '故意制造一次边界条件失败，验证错误处理机制',
    order: 2,
    requiresBoundaryFailure: true,
    requiresUndo: false,
    minAnnotations: 1
  },
  {
    id: 'level-3',
    name: '撤销重开关卡',
    description: '执行撤销操作或重开任务，验证历史回滚功能',
    order: 3,
    requiresBoundaryFailure: false,
    requiresUndo: true,
    minAnnotations: 1
  },
  {
    id: 'level-4',
    name: '综合结算关卡',
    description: '完成完整审核流程，生成结算报告',
    order: 4,
    requiresBoundaryFailure: false,
    requiresUndo: false,
    minAnnotations: 3
  }
];

export const ANNOTATION_COLORS: Record<string, string> = {
  correct: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  note: '#3b82f6'
};

export const ANNOTATION_LABELS: Record<string, string> = {
  correct: '正确',
  error: '错误',
  warning: '警告',
  note: '备注'
};

export const STATUS_LABELS: Record<string, string> = {
  pending: '待审核',
  in_progress: '进行中',
  completed: '已完成',
  needs_review: '需复核',
  rejected: '已驳回'
};

export const USABILITY_LABELS: Record<string, string> = {
  direct_use: '可直接使用',
  needs_trainer_review: '需培训师复核',
  rejected: '不可用'
};

export const USABILITY_COLORS: Record<string, string> = {
  direct_use: '#22c55e',
  needs_trainer_review: '#f59e0b',
  rejected: '#ef4444'
};

export const CONCLUSION_STATUS_LABELS: Record<string, string> = {
  pass: '通过',
  fail: '不通过',
  pending: '待确认',
  needs_confirmation: '需确认'
};

export const DEFAULT_SCORE_CATEGORIES = [
  '形状识别',
  '颜色搭配',
  '位置准确度',
  '完整性',
  '创意性'
];

export const API_BASE_URL = 'http://localhost:3001/api';
