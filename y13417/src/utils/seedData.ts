import type { Problem, CalcStep, Anomaly, ReviewRecord, EvidenceItem, GraphData } from '../types'
import { runTarjan } from './tarjan'

function makeGraph(
  nodes: Array<{ id: string; label: string; x: number; y: number; unit?: string }>,
  edges: Array<[string, string]>
): GraphData {
  return {
    nodes: nodes.map(n => ({ ...n })),
    edges: edges.map(([from, to]) => ({ from, to })),
  }
}

const normalGraph = makeGraph(
  [
    { id: 'A', label: 'A', x: 200, y: 50, unit: '节点' },
    { id: 'B', label: 'B', x: 100, y: 150, unit: '节点' },
    { id: 'C', label: 'C', x: 300, y: 150, unit: '节点' },
    { id: 'D', label: 'D', x: 50, y: 250, unit: '节点' },
    { id: 'E', label: 'E', x: 150, y: 250, unit: '节点' },
  ],
  [['A', 'B'], ['A', 'C'], ['B', 'D'], ['B', 'E']]
)

const overflowGraph = makeGraph(
  [
    { id: 'X', label: 'X', x: 200, y: 50, unit: '节点' },
    { id: 'Y', label: 'Y', x: 100, y: 150, unit: '节点' },
    { id: 'Z', label: 'Z', x: 300, y: 150, unit: '节点' },
  ],
  [['X', 'Y'], ['Y', 'Z']]
)

const emptySetGraph = makeGraph(
  [
    { id: 'P', label: 'P', x: 200, y: 50, unit: '节点' },
    { id: 'Q', label: 'Q', x: 100, y: 150, unit: '节点' },
    { id: 'R', label: 'R', x: 300, y: 150, unit: '节点' },
    { id: 'S', label: 'S', x: 300, y: 250, unit: '节点' },
  ],
  [['P', 'Q'], ['P', 'R'], ['R', 'S']]
)

const missingUnitGraph = makeGraph(
  [
    { id: 'M', label: 'M', x: 200, y: 50 },
    { id: 'N', label: 'N', x: 100, y: 150, unit: '节点' },
    { id: 'O', label: 'O', x: 300, y: 150 },
    { id: 'K', label: 'K', x: 200, y: 250, unit: '节点' },
  ],
  [['M', 'N'], ['M', 'O'], ['N', 'K'], ['O', 'K']]
)

const boundaryGraph = makeGraph(
  [
    { id: 'T', label: 'T', x: 200, y: 50, unit: '节点' },
    { id: 'U', label: 'U', x: 100, y: 150, unit: '节点' },
  ],
  [['T', 'U']]
)

const reviewDiffGraph = makeGraph(
  [
    { id: 'F', label: 'F', x: 200, y: 50, unit: '节点' },
    { id: 'G', label: 'G', x: 100, y: 150, unit: '节点' },
    { id: 'H', label: 'H', x: 300, y: 150, unit: '节点' },
    { id: 'I', label: 'I', x: 100, y: 250, unit: '节点' },
    { id: 'J', label: 'J', x: 300, y: 250, unit: '节点' },
  ],
  [['F', 'G'], ['F', 'H'], ['G', 'I'], ['H', 'J']]
)

const now = new Date().toISOString()

const rawProblems: Problem[] = [
  {
    id: 'prob-1',
    title: '正常题：5节点树',
    description: '5节点树结构，2个割点（A和B），计算过程无异常',
    graph: normalGraph,
    expectedCutVertices: ['A', 'B'],
    submittedAnswer: ['A', 'B'],
    status: 'reviewed',
    createdAt: now,
  },
  {
    id: 'prob-2',
    title: '溢出题：low值越界',
    description: '3节点链，模拟Y节点low值计算过程中数值溢出（注入脏数据）',
    graph: overflowGraph,
    expectedCutVertices: ['Y'],
    submittedAnswer: [],
    status: 'anomaly',
    createdAt: now,
  },
  {
    id: 'prob-3',
    title: '空集题：叶节点无子树',
    description: '4节点图，Q和S为叶节点，子树为空集合导致low值无法回溯',
    graph: emptySetGraph,
    expectedCutVertices: ['P'],
    submittedAnswer: ['P', 'R'],
    status: 'anomaly',
    createdAt: now,
  },
  {
    id: 'prob-4',
    title: '缺单位题：节点无标注',
    description: '4节点图，M和O节点缺少单位标注，判断条件不完整',
    graph: missingUnitGraph,
    expectedCutVertices: ['M', 'O'],
    submittedAnswer: ['M'],
    status: 'anomaly',
    createdAt: now,
  },
  {
    id: 'prob-5',
    title: '边界题：单边连接',
    description: '2节点图，T和U之间仅一条边，割点判断处于边界条件',
    graph: boundaryGraph,
    expectedCutVertices: [],
    submittedAnswer: ['T'],
    status: 'boundary',
    createdAt: now,
  },
  {
    id: 'prob-6',
    title: '复核差异题：两次结论不同',
    description: '5节点图，已有两次复核结论不同，需填写差异解释',
    graph: reviewDiffGraph,
    expectedCutVertices: ['F'],
    submittedAnswer: ['F', 'G'],
    status: 'pending',
    createdAt: now,
  },
]

export function generateSeedData(): {
  problems: Problem[]
  calcSteps: CalcStep[]
  anomalies: Anomaly[]
  reviewRecords: ReviewRecord[]
  evidenceItems: EvidenceItem[]
} {
  const allSteps: CalcStep[] = []
  const allAnomalies: Anomaly[] = []
  const evidenceItems: EvidenceItem[] = []

  for (const prob of rawProblems) {
    const result = runTarjan(prob.id, prob.graph)
    allSteps.push(...result.steps)
    allAnomalies.push(...result.anomalies)

    for (const step of result.steps) {
      evidenceItems.push({
        id: `ev-${step.id}`,
        problemId: prob.id,
        eventType: 'calc_step',
        description: `步骤 ${step.stepOrder + 1}：访问节点 ${step.currentNode}，dfn=${step.dfn}，low=${step.low}${step.anomalyType ? `，异常：${step.anomalyType}` : ''}`,
        relatedCalcStepId: step.id,
        relatedAnomalyId: '',
        createdAt: prob.createdAt,
      })
    }

    for (const anomaly of result.anomalies) {
      evidenceItems.push({
        id: `ev-${anomaly.id}`,
        problemId: prob.id,
        eventType: 'anomaly_found',
        description: `发现异常[${anomaly.type}]：${anomaly.description}`,
        relatedCalcStepId: anomaly.calcStepId,
        relatedAnomalyId: anomaly.id,
        createdAt: anomaly.createdAt,
      })
    }
  }

  const overflowAnomaly = allAnomalies.find(a => a.type === 'overflow')
  if (overflowAnomaly) {
    overflowAnomaly.description = '节点 Y 的 low 值 100000 超出安全阈值 99999，数值溢出'
    const relatedStep = allSteps.find(s => s.id === overflowAnomaly.calcStepId)
    if (relatedStep) {
      relatedStep.dfn = 100000
      relatedStep.low = 100000
      relatedStep.anomalyType = 'overflow'
      relatedStep.note = 'low[Z]=100000 超出安全阈值 99999，数值溢出'
    }
  }

  const reviewRecords: ReviewRecord[] = [
    {
      id: 'review-1',
      problemId: 'prob-6',
      previousConclusion: '割点为 {F}',
      currentConclusion: '割点为 {F, G}',
      diffExplanation: '第一次复核仅确认F为割点，但重新计算后发现G也满足 low[I]=2 ≥ dfn[G]=2 的条件，之前的判断遗漏了G节点的边界情况',
      createdAt: now,
    },
  ]

  evidenceItems.push({
    id: 'ev-review-1',
    problemId: 'prob-6',
    eventType: 'review',
    description: '复核：结论从"割点为 {F}"变更为"割点为 {F, G}"。原因：重新计算发现G也满足割点条件，之前遗漏了边界情况',
    relatedCalcStepId: '',
    relatedAnomalyId: '',
    createdAt: now,
  })

  return {
    problems: rawProblems,
    calcSteps: allSteps,
    anomalies: allAnomalies,
    reviewRecords,
    evidenceItems,
  }
}
