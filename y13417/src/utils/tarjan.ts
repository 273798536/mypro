import type { GraphData, CalcStep, Anomaly, AnomalyType } from '../types'

const OVERFLOW_THRESHOLD = 99999

function buildAdjList(graph: GraphData): Record<string, string[]> {
  const adj: Record<string, string[]> = {}
  for (const node of graph.nodes) {
    adj[node.id] = []
  }
  for (const edge of graph.edges) {
    adj[edge.from].push(edge.to)
    adj[edge.to].push(edge.from)
  }
  return adj
}

export interface TarjanResult {
  steps: CalcStep[]
  anomalies: Anomaly[]
  cutVertices: string[]
}

export function runTarjan(problemId: string, graph: GraphData): TarjanResult {
  const adj = buildAdjList(graph)
  const nodes = graph.nodes
  const steps: CalcStep[] = []
  const anomalies: Anomaly[] = []
  const cutVertices: string[] = []

  const dfnMap: Record<string, number> = {}
  const lowMap: Record<string, number> = {}
  const parentMap: Record<string, string> = {}
  const visited: Record<string, boolean> = {}
  let timer = 0
  let stepOrder = 0

  const nodeUnitMap: Record<string, string | undefined> = {}
  for (const n of nodes) {
    nodeUnitMap[n.id] = n.unit
  }

  function dfs(u: string, parent: string) {
    visited[u] = true
    timer++
    dfnMap[u] = timer
    lowMap[u] = timer
    parentMap[u] = parent

    const children = adj[u].filter(v => v !== parent)

    if (children.length === 0 && parent === '') {
      const step: CalcStep = {
        id: `${problemId}-step-${stepOrder}`,
        problemId,
        stepOrder: stepOrder++,
        currentNode: u,
        dfn: dfnMap[u],
        low: lowMap[u],
        parent: '∅',
        isCutCandidate: false,
        anomalyType: 'boundary',
        note: '孤立节点，无子树，不是割点',
      }
      steps.push(step)
      anomalies.push({
        id: `${problemId}-anomaly-${anomalies.length}`,
        problemId,
        calcStepId: step.id,
        type: 'boundary',
        description: `节点 ${u} 为孤立节点（无子树且无父节点），割点判断处于边界条件`,
        status: 'pending',
        resolutionNote: '',
        createdAt: new Date().toISOString(),
        resolvedAt: '',
      })
      return
    }

    if (children.length === 0 && parent !== '') {
      const step: CalcStep = {
        id: `${problemId}-step-${stepOrder}`,
        problemId,
        stepOrder: stepOrder++,
        currentNode: u,
        dfn: dfnMap[u],
        low: lowMap[u],
        parent,
        isCutCandidate: false,
        anomalyType: 'empty_set',
        note: '叶节点，子树回溯时发现空集合，low 值无法从子节点更新',
      }
      steps.push(step)
      anomalies.push({
        id: `${problemId}-anomaly-${anomalies.length}`,
        problemId,
        calcStepId: step.id,
        type: 'empty_set',
        description: `节点 ${u} 为叶节点，子树为空集合，low 值无法通过子节点回溯更新`,
        status: 'pending',
        resolutionNote: '',
        createdAt: new Date().toISOString(),
        resolvedAt: '',
      })
      return
    }

    for (const v of children) {
      if (!visited[v]) {
        dfs(v, u)
        lowMap[u] = Math.min(lowMap[u], lowMap[v])

        if (lowMap[v] > OVERFLOW_THRESHOLD) {
          const step: CalcStep = {
            id: `${problemId}-step-${stepOrder}`,
            problemId,
            stepOrder: stepOrder++,
            currentNode: u,
            dfn: dfnMap[u],
            low: lowMap[u],
            parent: parent || '∅',
            isCutCandidate: false,
            anomalyType: 'overflow',
            note: `low[${v}]=${lowMap[v]} 超出安全阈值 ${OVERFLOW_THRESHOLD}，数值溢出`,
          }
          steps.push(step)
          anomalies.push({
            id: `${problemId}-anomaly-${anomalies.length}`,
            problemId,
            calcStepId: step.id,
            type: 'overflow',
            description: `节点 ${u} 的子节点 ${v} 的 low 值 ${lowMap[v]} 超出安全阈值 ${OVERFLOW_THRESHOLD}`,
            status: 'pending',
            resolutionNote: '',
            createdAt: new Date().toISOString(),
            resolvedAt: '',
          })
          continue
        }

        if (parent === '') {
          const rootChildren = adj[u].filter(v2 => !visited[v2] || parentMap[v2] === u)
          if (rootChildren.length >= 2 || children.length >= 2) {
            if (!cutVertices.includes(u)) {
              cutVertices.push(u)
            }
          }
        } else {
          if (lowMap[v] >= dfnMap[u]) {
            if (!cutVertices.includes(u)) {
              cutVertices.push(u)
            }
          }
        }

        if (lowMap[v] === dfnMap[u] && parent !== '') {
          const step: CalcStep = {
            id: `${problemId}-step-${stepOrder}`,
            problemId,
            stepOrder: stepOrder++,
            currentNode: u,
            dfn: dfnMap[u],
            low: lowMap[u],
            parent: parent || '∅',
            isCutCandidate: true,
            anomalyType: 'boundary',
            note: `low[${v}]=${lowMap[v]} == dfn[${u}]=${dfnMap[u]}，割点判断恰好在边界`,
          }
          steps.push(step)
          anomalies.push({
            id: `${problemId}-anomaly-${anomalies.length}`,
            problemId,
            calcStepId: step.id,
            type: 'boundary',
            description: `节点 ${u} 满足 low[${v}]=${lowMap[v]} ≥ dfn[${u}]=${dfnMap[u]}，判断条件恰好等于阈值，属于边界情况`,
            status: 'pending',
            resolutionNote: '',
            createdAt: new Date().toISOString(),
            resolvedAt: '',
          })
        }
      } else {
        lowMap[u] = Math.min(lowMap[u], dfnMap[v])
      }
    }

    const hasAnomaly = steps.some(s => s.currentNode === u && s.anomalyType !== null)
    if (!hasAnomaly) {
      steps.push({
        id: `${problemId}-step-${stepOrder}`,
        problemId,
        stepOrder: stepOrder++,
        currentNode: u,
        dfn: dfnMap[u],
        low: lowMap[u],
        parent: parent || '∅',
        isCutCandidate: cutVertices.includes(u),
        anomalyType: null,
        note: cutVertices.includes(u) ? '确认为割点' : '非割点',
      })
    }
  }

  for (const node of nodes) {
    if (nodeUnitMap[node.id] === undefined) {
      anomalies.push({
        id: `${problemId}-anomaly-${anomalies.length}`,
        problemId,
        calcStepId: '',
        type: 'missing_unit',
        description: `节点 ${node.id}（${node.label}）缺少单位标注，导致判断条件不完整`,
        status: 'pending',
        resolutionNote: '',
        createdAt: new Date().toISOString(),
        resolvedAt: '',
      })
    }
  }

  for (const node of nodes) {
    if (!visited[node.id]) {
      dfs(node.id, '')
    }
  }

  steps.sort((a, b) => a.stepOrder - b.stepOrder)

  return { steps, anomalies, cutVertices }
}

export function getAnomalySuggestion(type: AnomalyType): string {
  switch (type) {
    case 'overflow':
      return '数值溢出：建议检查输入数据范围，考虑使用大数运算或分段计算策略'
    case 'empty_set':
      return '空集合：建议补充孤立节点和叶节点的特殊处理逻辑，确保 low 值回溯有兜底'
    case 'missing_unit':
      return '缺单位：需补充节点的物理/数学单位标注，否则判断条件不完整可能导致误判'
    case 'boundary':
      return '边界条件：割点判断恰好在阈值上，建议人工确认是否真正为割点'
  }
}
