import type { SequenceProblem, OperationLog, DerivationStep } from "@/types";
import { detectOutliers } from "@/utils/sequence";

function buildFibonacciLike(): SequenceProblem {
  const initial = [1, 1];
  const values: number[] = [...initial];
  for (let i = 2; i < 12; i++) {
    values.push(values[i - 1] + values[i - 2]);
  }
  values[10] = 9999;
  values[11] = 159700;
  const historical = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
  const outlier = detectOutliers(values, 5);
  const steps: DerivationStep[] = [
    { step: 1, description: "已知初始项", formula: "a₁ = 1, a₂ = 1", result: 1 },
    { step: 2, description: "递推关系", formula: "aₙ = aₙ₋₁ + aₙ₋₂ (n ≥ 3)" },
    { step: 3, description: "计算 a₃", formula: "a₃ = a₂ + a₁ = 1 + 1", result: 2 },
    { step: 4, description: "计算 a₄", formula: "a₄ = a₃ + a₂ = 2 + 1", result: 3 },
    { step: 5, description: "计算 a₅", formula: "a₅ = a₄ + a₃ = 3 + 2", result: 5 },
    { step: 6, description: "计算 a₆", formula: "a₆ = a₅ + a₄ = 5 + 3", result: 8 },
    { step: 7, description: "外推越界项", formula: "a₁₁ 出现异常值 9999", result: 9999 },
  ];
  return {
    id: "SEQ-001",
    title: "斐波那契型数列递推",
    recurrenceFormula: "aₙ = aₙ₋₁ + aₙ₋₂, a₁=1, a₂=1",
    initialTerms: initial,
    computedValues: values,
    historicalAnswers: historical,
    status: "pending",
    isExtrapolationOutlier: outlier.indices.length > 0,
    outlierIndices: outlier.indices,
    dataGrade: "pending",
    note: "第11、12项疑似录入错误，与历史答案偏差过大",
    createdAt: "2026-06-01T09:20:00Z",
    updatedAt: "2026-06-05T14:30:00Z",
    derivationSteps: steps,
  };
}

function buildGeometric(): SequenceProblem {
  const initial = [3];
  const values: number[] = [...initial];
  const r = 2;
  for (let i = 1; i < 10; i++) {
    values.push(initial[0] * Math.pow(r, i));
  }
  const historical = [...values];
  const outlier = detectOutliers(values, 5);
  const steps: DerivationStep[] = [
    { step: 1, description: "已知首项与公比", formula: "a₁ = 3, 公比 r = 2" },
    { step: 2, description: "等比数列通项", formula: "aₙ = a₁ · rⁿ⁻¹" },
    { step: 3, description: "计算 a₅", formula: "a₅ = 3 × 2⁴ = 3 × 16", result: 48 },
  ];
  return {
    id: "SEQ-002",
    title: "等比数列递推",
    recurrenceFormula: "aₙ = 2·aₙ₋₁, a₁=3",
    initialTerms: initial,
    computedValues: values,
    historicalAnswers: historical,
    status: "approved",
    isExtrapolationOutlier: outlier.indices.length > 0,
    outlierIndices: outlier.indices,
    dataGrade: "available",
    note: "数据完整，历史答案与计算值一致",
    createdAt: "2026-05-28T10:00:00Z",
    updatedAt: "2026-06-02T11:15:00Z",
    derivationSteps: steps,
  };
}

function buildArithmetic(): SequenceProblem {
  const initial = [2];
  const values: number[] = [...initial];
  const d = 5;
  for (let i = 1; i < 10; i++) {
    values.push(initial[0] + d * i);
  }
  values[8] = 999;
  const historical = [2, 7, 12, 17, 22, 27, 32, 37, 42, 47];
  const outlier = detectOutliers(values, 5);
  const steps: DerivationStep[] = [
    { step: 1, description: "首项与公差", formula: "a₁ = 2, d = 5" },
    { step: 2, description: "通项公式", formula: "aₙ = a₁ + (n-1)d" },
    { step: 3, description: "异常位置", formula: "a₉ 录入异常值 999，正确应为 42", result: 42 },
  ];
  return {
    id: "SEQ-003",
    title: "等差数列递推",
    recurrenceFormula: "aₙ = aₙ₋₁ + 5, a₁=2",
    initialTerms: initial,
    computedValues: values,
    historicalAnswers: historical,
    correctedValues: [2, 7, 12, 17, 22, 27, 32, 37, 42, 47],
    status: "approved",
    isExtrapolationOutlier: outlier.indices.length > 0,
    outlierIndices: outlier.indices,
    dataGrade: "available",
    note: "a₉ 已修正，原录入错误999→42",
    createdAt: "2026-05-20T08:45:00Z",
    updatedAt: "2026-06-03T16:20:00Z",
    derivationSteps: steps,
  };
}

function buildReciprocal(): SequenceProblem {
  const initial = [1];
  const values: number[] = [...initial];
  for (let i = 1; i < 8; i++) {
    values.push(1 / (i + 1));
  }
  values[7] = -9999;
  const historical = [1, 0.5, 0.333, 0.25, 0.2, 0.167, 0.143, 0.125];
  const outlier = detectOutliers(values, 4);
  const steps: DerivationStep[] = [
    { step: 1, description: "倒数数列", formula: "aₙ = 1/n" },
    { step: 2, description: "外推异常", formula: "a₈ 出现负值异常，与数列单调递减矛盾" },
  ];
  return {
    id: "SEQ-004",
    title: "倒数型单调数列",
    recurrenceFormula: "aₙ = 1/n",
    initialTerms: initial,
    computedValues: values,
    historicalAnswers: historical,
    status: "suspended",
    isExtrapolationOutlier: outlier.indices.length > 0,
    outlierIndices: outlier.indices,
    dataGrade: "pending",
    note: "需确认采集源，a₈ 出现异常负值",
    createdAt: "2026-06-04T13:10:00Z",
    updatedAt: "2026-06-06T09:50:00Z",
    derivationSteps: steps,
  };
}

function buildQuadratic(): SequenceProblem {
  const values: number[] = [];
  for (let i = 1; i <= 10; i++) {
    values.push(i * i);
  }
  const historical = [...values];
  const outlier = detectOutliers(values, 5);
  const steps: DerivationStep[] = [
    { step: 1, description: "平方数列", formula: "aₙ = n²" },
    { step: 2, description: "验证", formula: "所有项与历史答案一致" },
  ];
  return {
    id: "SEQ-005",
    title: "平方数列",
    recurrenceFormula: "aₙ = n²",
    initialTerms: [1],
    computedValues: values,
    historicalAnswers: historical,
    status: "approved",
    isExtrapolationOutlier: outlier.indices.length > 0,
    outlierIndices: outlier.indices,
    dataGrade: "available",
    note: "全部可用",
    createdAt: "2026-05-15T15:00:00Z",
    updatedAt: "2026-05-20T10:00:00Z",
    derivationSteps: steps,
  };
}

function buildAlternating(): SequenceProblem {
  const values: number[] = [];
  for (let i = 1; i <= 10; i++) {
    values.push(Math.pow(-1, i + 1) * i);
  }
  values[9] = 100000;
  const historical = [1, -2, 3, -4, 5, -6, 7, -8, 9, -10];
  const outlier = detectOutliers(values, 5);
  const steps: DerivationStep[] = [
    { step: 1, description: "交错数列", formula: "aₙ = (-1)ⁿ⁺¹ · n" },
    { step: 2, description: "越界项", formula: "a₁₀ 应为 -10，实得 100000" },
  ];
  return {
    id: "SEQ-006",
    title: "交错符号数列",
    recurrenceFormula: "aₙ = (-1)ⁿ⁺¹·n",
    initialTerms: [1],
    computedValues: values,
    historicalAnswers: historical,
    status: "recollect",
    isExtrapolationOutlier: outlier.indices.length > 0,
    outlierIndices: outlier.indices,
    dataGrade: "recollect",
    note: "末项严重偏离，需重新采集数据",
    createdAt: "2026-06-07T11:25:00Z",
    updatedAt: "2026-06-08T08:40:00Z",
    derivationSteps: steps,
  };
}

export const mockProblems: SequenceProblem[] = [
  buildFibonacciLike(),
  buildGeometric(),
  buildArithmetic(),
  buildReciprocal(),
  buildQuadratic(),
  buildAlternating(),
];

export const mockLogs: OperationLog[] = [
  {
    id: "LOG-001",
    problemId: "SEQ-003",
    operationType: "correct",
    operator: "张编辑",
    beforeValue: "[2,7,12,17,22,27,32,37,999,47]",
    afterValue: "[2,7,12,17,22,27,32,37,42,47]",
    reason: "a₉ 录入错误，历史答案为42",
    timestamp: "2026-06-03T16:20:00Z",
  },
  {
    id: "LOG-002",
    problemId: "SEQ-003",
    operationType: "status_change",
    operator: "张编辑",
    beforeValue: "pending",
    afterValue: "approved",
    reason: "修正完成，数据可用",
    timestamp: "2026-06-03T16:22:00Z",
  },
  {
    id: "LOG-003",
    problemId: "SEQ-006",
    operationType: "status_change",
    operator: "李编辑",
    beforeValue: "pending",
    afterValue: "recollect",
    reason: "末项偏差过大，需重新采集",
    timestamp: "2026-06-08T08:40:00Z",
  },
  {
    id: "LOG-004",
    problemId: "SEQ-002",
    operationType: "import",
    operator: "系统导入",
    beforeValue: "(无)",
    afterValue: "SEQ-002 已入库",
    timestamp: "2026-05-28T10:00:00Z",
  },
];
