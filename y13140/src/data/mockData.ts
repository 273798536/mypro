import type { Parameter, Version, Note, Screenshot, Record, Anomaly } from '@/types';

export const mockParameters: Parameter[] = [
  { id: 'p1', name: '约束条件A（时间上限）', currentValue: 480, currentWeight: 0.53, changeCount: 3, unit: '分钟' },
  { id: 'p2', name: '变量下界x₁', currentValue: 5, currentWeight: 0.12, changeCount: 1, unit: '件' },
  { id: 'p3', name: '变量下界x₂', currentValue: 8, currentWeight: 0.15, changeCount: 2, unit: '件' },
  { id: 'p4', name: '目标系数c₁', currentValue: 120, currentWeight: 0.10, changeCount: 0, unit: '元' },
  { id: 'p5', name: '目标系数c₂', currentValue: 200, currentWeight: 0.10, changeCount: 0, unit: '元' },
];

export const mockVersions: Version[] = [
  {
    id: 'v1-1',
    paramId: 'p1',
    version: 1,
    value: 360,
    newValue: 420,
    weight: 0.30,
    newWeight: 0.30,
    operator: '阿宁',
    timestamp: '2026-06-03 09:12',
    reason: '根据5月教学时长调整',
  },
  {
    id: 'v1-2',
    paramId: 'p1',
    version: 2,
    value: 420,
    newValue: 480,
    weight: 0.30,
    newWeight: 0.40,
    operator: '阿宁',
    timestamp: '2026-06-08 14:30',
    reason: null,
  },
  {
    id: 'v1-3',
    paramId: 'p1',
    version: 3,
    value: 480,
    newValue: 480,
    weight: 0.40,
    newWeight: 0.53,
    operator: '匿名',
    timestamp: '2026-06-11 20:47',
    reason: null,
  },
  {
    id: 'v2-1',
    paramId: 'p2',
    version: 1,
    value: 3,
    newValue: 5,
    weight: 0.12,
    newWeight: 0.12,
    operator: '阿宁',
    timestamp: '2026-06-04 10:05',
    reason: '按照新考纲调增',
  },
  {
    id: 'v3-1',
    paramId: 'p3',
    version: 1,
    value: 6,
    newValue: 8,
    weight: 0.10,
    newWeight: 0.15,
    operator: '阿宁',
    timestamp: '2026-06-05 16:22',
    reason: '变量x₂占比提高',
  },
  {
    id: 'v3-2',
    paramId: 'p3',
    version: 2,
    value: 8,
    newValue: 8,
    weight: 0.15,
    newWeight: 0.15,
    operator: '匿名',
    timestamp: '2026-06-11 21:03',
    reason: null,
  },
];

export const mockNotes: Note[] = [
  {
    id: 'n1',
    versionId: 'v1-2',
    content: '后来补记：教研会临时决议把课时从7节调到8节，对应480分钟。当时没写理由是因为散会后急着赶地铁。',
    timestamp: '2026-06-09 08:45',
    author: '阿宁',
  },
  {
    id: 'n2',
    versionId: 'v1-3',
    content: '阿宁补充：权重0.53不是我改的，运营说"结论太温和"直接调的，没走流程。附当时聊天截图一张。',
    timestamp: '2026-06-12 11:20',
    author: '阿宁',
  },
];

const placeholderSvg = (label: string, bg: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='240' viewBox='0 0 420 240'>
      <rect width='420' height='240' fill='${bg}'/>
      <rect x='10' y='10' width='400' height='220' fill='none' stroke='#0f1f33' stroke-width='2' stroke-dasharray='4 3'/>
      <text x='210' y='110' text-anchor='middle' font-family='monospace' font-size='14' fill='#0f1f33'>${label}</text>
      <text x='210' y='140' text-anchor='middle' font-family='sans-serif' font-size='10' fill='#3e5e87'>旧版截图示意 · 胶片边框</text>
      <text x='210' y='210' text-anchor='middle' font-family='monospace' font-size='9' fill='#6682a5'>2026-06-11 · 截图前状态</text>
    </svg>`,
  );

export const mockScreenshots: Screenshot[] = [
  {
    id: 's1',
    versionId: 'v1-3',
    dataUrl: placeholderSvg('权重改之前：0.40 → 改之后：0.53', '#fdf8ee'),
    description: '聊天截图：运营说"调高点权重让结论更敏感"',
    timestamp: '2026-06-12 11:22',
  },
];

export const mockRecords: Record[] = [
  {
    id: 'r1',
    title: '记录＃07 · 2026届高三二模第22题（整数规划）',
    isSeeminglyNormal: false,
    inputParams: { x1: 15, x2: 20, A: 480 },
    calculation: {
      formula: 'max Z = 120x₁ + 200x₂, s.t. 12x₁ + 15x₂ ≤ A, x₁,x₂ ∈ ℕ',
      steps: ['A=480 代入约束 12×15+15×20=480 刚好取等', 'Z=120×15+200×20=5800'],
      result: 5800,
    },
    contributionToConclusion: 41,
    impactExplanation: '边界取等，贡献占比 41%',
  },
  {
    id: 'r2',
    title: '记录＃11 · 看起来正常的一题（为什么改结论的关键）',
    isSeeminglyNormal: true,
    inputParams: { x1: 18, x2: 16, A: 480 },
    calculation: {
      formula: 'max Z = 120x₁ + 200x₂, s.t. 12x₁ + 15x₂ ≤ A, x₁,x₂ ∈ ℕ',
      steps: [
        '表面看 A=480 代入：12×18+15×16=456 ≤ 480 ✔️ 可行',
        'Z = 120×18 + 200×16 = 5360',
        '但权重从 0.40 → 0.53 后，"取等/不取等"的敏感分差扩大',
        '加权贡献 = 5360 × (0.53/0.40)⁻¹ × 0.41 ≈ 比原估计多 +23%',
      ],
      result: 5360,
    },
    contributionToConclusion: 59,
    impactExplanation:
      '本条所有参数都在"正常范围"内，但权重 v1-3 的改动使它对结论的贡献占比从 36% 跳到 59%，直接把结论从"偏保守"拉到"偏激进"。',
  },
  {
    id: 'r3',
    title: '记录＃03 · 基础题对照',
    isSeeminglyNormal: false,
    inputParams: { x1: 10, x2: 12, A: 300 },
    calculation: {
      formula: 'max Z = 120x₁ + 200x₂',
      steps: ['12×10+15×12=300 取等', 'Z=1200+2400=3600'],
      result: 3600,
    },
    contributionToConclusion: 0,
    impactExplanation: '对照用，不影响当前结论',
  },
];

export const mockAnomalies: Anomaly[] = [
  {
    id: 'a1',
    type: 'extrapolation',
    title: '外推越界：约束A超过训练数据范围',
    rawStatement: '参数表原始说法：训练集中约束A的取值区间是 [240, 420] 分钟。建议使用范围外值时人工复核。',
    paramId: 'p1',
    versionId: 'v1-2',
    traceNote:
      'v1-2 把 A 从 420 调到 480，越过 [240, 420] 区间上界 60 分钟。当时未走人工复核，被系统标为"越界"，但该警告一直停留在页脚小字，直到复核时才被发现。',
  },
  {
    id: 'a2',
    type: 'weight',
    title: '权重异动：p1权重在非工作时段被修改',
    rawStatement: '参数表原始说法：权重调整应在教研工作时段（09:00-18:00）由阿宁本人操作，并附理由。',
    paramId: 'p1',
    versionId: 'v1-3',
    traceNote:
      'v1-3 操作时间 20:47，操作人匿名，权重 0.40 → 0.53，未附理由。阿宁后补备注说明是运营直接改的，没走流程。',
  },
];
