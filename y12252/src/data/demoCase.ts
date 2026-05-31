import type { DemoCase } from '@/types/game';

export const demoCase: DemoCase = {
  theoremTitle: '素数无限性证明审查',
  theoremStatement: '命题：存在无穷多个素数。（欧几里得定理）',
  studentProof: `证明：假设素数只有有限个，记为 p₁, p₂, ..., pₙ。

令 N = p₁ × p₂ × ... × pₙ + 1。

因为 N > 1，所以 N 必有素因子。

由于 N 除以每个 pᵢ 都余 1，所以 p₁, p₂, ..., pₙ 都不能整除 N。

因此 N 的素因子不在列表中，与假设矛盾。

故素数有无穷多个。□`,

  conditions: [
    {
      id: 'c1',
      content: '假设：素数只有有限个 p₁, p₂, ..., pₙ',
      source: 'original',
      category: 'given',
      isOnCanvas: false,
      position: { x: 0, y: 0 },
    },
    {
      id: 'c2',
      content: '构造 N = p₁ × p₂ × ... × pₙ + 1',
      source: 'derived',
      category: 'lemma',
      isOnCanvas: false,
      position: { x: 0, y: 0 },
    },
    {
      id: 'c3',
      content: 'N > 1，故 N 必有素因子（算术基本定理）',
      source: 'derived',
      category: 'lemma',
      isOnCanvas: false,
      position: { x: 0, y: 0 },
    },
    {
      id: 'c4',
      content: 'N 除以每个 pᵢ 都余 1',
      source: 'derived',
      category: 'given',
      isOnCanvas: false,
      position: { x: 0, y: 0 },
    },
    {
      id: 'c5',
      content: 'p₁, p₂, ..., pₙ 都不能整除 N',
      source: 'derived',
      category: 'lemma',
      isOnCanvas: false,
      position: { x: 0, y: 0 },
    },
    {
      id: 'c6',
      content: 'N 的素因子不在列表 {p₁, ..., pₙ} 中',
      source: 'derived',
      category: 'conclusion',
      isOnCanvas: false,
      position: { x: 0, y: 0 },
    },
    {
      id: 'c7',
      content: '与"素数只有有限个"矛盾',
      source: 'derived',
      category: 'conclusion',
      isOnCanvas: false,
      position: { x: 0, y: 0 },
    },
    {
      id: 'c8',
      content: '素数有无穷多个',
      source: 'derived',
      category: 'conclusion',
      isOnCanvas: false,
      position: { x: 0, y: 0 },
    },
    {
      id: 'c9',
      content: 'N 本身可能是素数',
      source: 'derived',
      category: 'given',
      isOnCanvas: false,
      position: { x: 0, y: 0 },
    },
    {
      id: 'c_trap',
      content: 'N 必定是素数',
      source: 'derived',
      category: 'lemma',
      isOnCanvas: false,
      position: { x: 0, y: 0 },
    },
  ],

  counterExamples: [
    {
      id: 'e1',
      content: '当 p₁=2, p₂=3, p₃=5, p₄=7, p₅=11, p₆=13 时，N = 2×3×5×7×11×13 + 1 = 30031 = 59 × 509，N 不是素数',
      source: 'imported',
      status: 'pending',
      relatedConditionId: 'c_trap',
      description: '反例表明 "N 必定是素数" 这一引理是错误的。学生证明中可能隐含了这个错误假设。',
    },
    {
      id: 'e2',
      content: '当 p₁=2, p₂=3 时，N = 2×3+1 = 7，N 是素数，列表外存在素数',
      source: 'imported',
      status: 'pending',
      relatedConditionId: 'c6',
      description: '这个例子支持结论但不构成反例，需判定其相关性。',
    },
    {
      id: 'e3',
      content: '算术基本定理要求 N > 1，但证明未显式验证 N > 1 的条件',
      source: 'discovered',
      status: 'pending',
      relatedConditionId: 'c3',
      description: '条件缺失：证明使用了算术基本定理，但未验证前置条件 N > 1 是否成立。',
    },
  ],

  correctLinks: [
    { fromCardId: 'c1', toCardId: 'c2', rule: 'deduction' },
    { fromCardId: 'c2', toCardId: 'c3', rule: 'deduction' },
    { fromCardId: 'c2', toCardId: 'c4', rule: 'deduction' },
    { fromCardId: 'c4', toCardId: 'c5', rule: 'deduction' },
    { fromCardId: 'c5', toCardId: 'c6', rule: 'deduction' },
    { fromCardId: 'c3', toCardId: 'c6', rule: 'deduction' },
    { fromCardId: 'c6', toCardId: 'c7', rule: 'contradiction' },
    { fromCardId: 'c7', toCardId: 'c8', rule: 'contradiction' },
    { fromCardId: 'c9', toCardId: 'c6', rule: 'deduction' },
  ],

  totalTime: 600,
};
