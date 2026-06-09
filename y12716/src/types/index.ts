export type DataSource = 'shared_drive' | 'legacy_sheet' | 'draft_note' | 'manual';

export interface Question {
  id: string;
  name: string;
  difficulty: number | null;
  chapter: string;
  unit: string | null;
  errorRate: number | null;
  dependencies: string[];
  notes: string;
  source: DataSource;
}

export interface ScheduleResult {
  questionId: string;
  rank: number;
  batch: number;
  publishDate: string;
  score: number;
  confidence: number;
  formula: string;
  appliedUnits: string[];
  failureReason: string | null;
  skipped: boolean;
  scoreBreakdown: {
    normalizedDifficulty: number;
    errorRateComponent: number;
    dependencyPenalty: number;
    chapterOrder: number;
  };
}

export interface DataGap {
  questionId: string;
  fieldName: string;
  severity: 'warning' | 'error';
  description: string;
  impact: string;
}

export interface EdgeCase {
  id: string;
  title: string;
  description: string;
  beforeData: Partial<Question>;
  afterData: Partial<Question>;
  resultChange: string;
  affectedQuestions: string[];
  beforeRank: number;
  afterRank: number;
  beforeBatch: number;
  afterBatch: number;
}

export interface ErrorToleranceConfig {
  difficultyWeight: number;
  errorRateWeight: number;
  dependencyPenaltyWeight: number;
  chapterOrderWeight: number;
  batchSize: number;
  daysPerBatch: number;
}

export interface FormulaMeta {
  expression: string;
  variables: {
    name: string;
    symbol: string;
    description: string;
    unit: string;
    defaultValue: number;
  }[];
  units: string[];
  applicableRange: string;
  failureReasons: string[];
}

export const DEFAULT_ERROR_TOLERANCE: ErrorToleranceConfig = {
  difficultyWeight: 0.35,
  errorRateWeight: 0.30,
  dependencyPenaltyWeight: 0.20,
  chapterOrderWeight: 0.15,
  batchSize: 5,
  daysPerBatch: 3,
};

export const FORMULA_META: FormulaMeta = {
  expression: 'S = w₁·D̃ + w₂·E + w₃·P + w₄·C',
  variables: [
    { name: '归一化难度', symbol: 'D̃', description: '难度评分/5，范围0-1，值越大越难', unit: '分', defaultValue: 0.5 },
    { name: '错题率', symbol: 'E', description: '学生做错该题的比例，范围0-1', unit: '%', defaultValue: 0.35 },
    { name: '依赖深度惩罚', symbol: 'P', description: '前置依赖层数/最大深度，范围0-1', unit: '层', defaultValue: 0 },
    { name: '章节顺序权重', symbol: 'C', description: '1 - 章节序号/总章节数，靠前章节权重高', unit: '章', defaultValue: 0.5 },
  ],
  units: ['分', '%', '层', '章', '题', '天', '批次'],
  applicableRange: '适用于K12学科类题库发布排期，依赖关系为有向无环图（DAG）。当存在循环依赖、引用不存在的前置题时，该题跳过计算并标记失败。',
  failureReasons: [
    '循环依赖：A→B→C→A，无法确定拓扑顺序',
    '前置依赖不存在：依赖ID在题库中找不到对应记录',
    '所有字段缺失：题目仅有ID，无任何计算所需数据',
    '章节索引越界：所属章节不在预设章节列表中',
  ],
};

export const SOURCE_LABELS: Record<DataSource, string> = {
  shared_drive: '共享盘-学生错题',
  legacy_sheet: '旧表-题目清单',
  draft_note: '草稿-人工备注',
  manual: '手动录入',
};

export const CHAPTER_ORDER: Record<string, number> = {
  '第一章-基础概念': 1,
  '第二章-进阶应用': 2,
  '第三章-综合训练': 3,
  '第四章-拓展提升': 4,
  '第五章-冲刺模拟': 5,
};
