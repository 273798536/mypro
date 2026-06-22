import type {
  GraphNode, GraphEdge, ComputationStep, NodeIntermediateValues,
  ParamVersion, BoundaryWarning, ComputationSnapshot, CutVertexJudgment
} from '@/types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function runTarjanCutVertex(
  nodes: GraphNode[],
  edges: GraphEdge[],
  params: { rootId: string; thresholdOffset: number; unitScale: number }
): ComputationSnapshot {
  const paramVersion: ParamVersion = {
    version: 'v' + generateId().slice(0, 6),
    timestamp: new Date().toISOString(),
    changes: '初始运行',
    rootId: params.rootId,
    thresholdOffset: params.thresholdOffset,
    unitScale: params.unitScale,
  }

  const steps: ComputationStep[] = []
  const adjacency: Record<string, string[]> = {}
  const degree: Record<string, number> = {}
  const warnings: BoundaryWarning[] = []

  nodes.forEach(n => {
    adjacency[n.id] = []
    degree[n.id] = 0
  })

  edges.forEach(e => {
    adjacency[e.source].push(e.target)
    adjacency[e.target].push(e.source)
    degree[e.source] = (degree[e.source] || 0) + 1
    degree[e.target] = (degree[e.target] || 0) + 1
  })

  nodes.forEach(n => {
    if (degree[n.id] === 0) {
      warnings.push({
        nodeId: n.id,
        type: 'isolated',
        humanMessage: `节点 ${n.label || n.id} 没有任何边连接，是孤立点。移除它不影响图的连通性，也不算割点。`,
        technicalDetail: `degree(${n.id}) = 0`,
      })
    } else if (degree[n.id] === 1) {
      warnings.push({
        nodeId: n.id,
        type: 'degree_one',
        humanMessage: `节点 ${n.label || n.id} 只有一条边连着，是叶子节点。去掉它不会断开其他节点的通路，所以不会是割点。`,
        technicalDetail: `degree(${n.id}) = 1`,
      })
    }
  })

  const dfn: Record<string, number> = {}
  const low: Record<string, number> = {}
  const parent: Record<string, string | null> = {}
  const childCount: Record<string, number> = {}
  const visitOrder: Record<string, number> = {}
  let timer = 0
  let order = 0
  const cutVertices: string[] = []
  const intermediates: NodeIntermediateValues[] = []

  const rootId = params.rootId || nodes[0]?.id
  const adjustedLow = (v: number) => Math.round(v * params.unitScale * 1000) / 1000
  const effectiveThreshold = params.thresholdOffset

  steps.push({
    nodeId: '__system__',
    stepType: 'init',
    formula: '参数初始化',
    substitutedValues: `root=${rootId}, thresholdOffset=${params.thresholdOffset}, unitScale=${params.unitScale}`,
    intermediateResult: `有效阈值=${effectiveThreshold}, 单位换算系数=${params.unitScale}`,
    finalResult: `参数版本=${paramVersion.version}`,
    paramVersion: paramVersion.version,
    timestamp: Date.now(),
  })

  function dfs(u: string) {
    timer++
    const scaledDfn = adjustedLow(timer)
    dfn[u] = scaledDfn
    low[u] = scaledDfn
    parent[u] = null
    childCount[u] = 0
    order++
    visitOrder[u] = order

    steps.push({
      nodeId: u,
      stepType: 'dfs_enter',
      formula: 'dfn[u] = low[u] = ++timer × unitScale',
      substitutedValues: `timer=${timer}, unitScale=${params.unitScale}`,
      intermediateResult: `dfn[${u}]=${scaledDfn}`,
      finalResult: `low[${u}]=${scaledDfn}`,
      paramVersion: paramVersion.version,
      timestamp: Date.now(),
    })

    for (const v of adjacency[u]) {
      if (dfn[v] === undefined) {
        if (parent[u] === null && parent[v] === undefined) {
          parent[v] = u
        }
        childCount[u]++
        dfs(v)

        const oldLow = low[u]
        low[u] = Math.round(Math.min(low[u], low[v]) * 1000) / 1000

        steps.push({
          nodeId: u,
          stepType: 'update_low',
          formula: 'low[u] = min(low[u], low[v])',
          substitutedValues: `low[${u}]=${oldLow}, low[${v}]=${low[v]}`,
          intermediateResult: `min(${oldLow}, ${low[v]}) = ${low[u]}`,
          finalResult: `low[${u}] 更新为 ${low[u]}`,
          paramVersion: paramVersion.version,
          timestamp: Date.now(),
        })

        if (parent[u] === null) {
          if (childCount[u] >= 2) {
            if (!cutVertices.includes(u)) {
              cutVertices.push(u)
            }
          }
        } else {
          const checkVal = low[v]
          const threshold = dfn[u] + effectiveThreshold

          steps.push({
            nodeId: u,
            stepType: 'check_cut',
            formula: 'low[v] >= dfn[u] + thresholdOffset',
            substitutedValues: `low[${v}]=${checkVal}, dfn[${u}]=${dfn[u]}, offset=${effectiveThreshold}`,
            intermediateResult: `${checkVal} >= ${dfn[u]} + ${effectiveThreshold} = ${threshold}`,
            finalResult: checkVal >= threshold ? `满足割点条件 → ${u} 是割点` : `不满足 → ${u} 非割点`,
            paramVersion: paramVersion.version,
            timestamp: Date.now(),
          })

          if (checkVal >= threshold) {
            if (!cutVertices.includes(u)) {
              cutVertices.push(u)
            }
          }
        }
      } else if (v !== parent[u]) {
        const oldLow = low[u]
        low[u] = Math.round(Math.min(low[u], dfn[v]) * 1000) / 1000

        steps.push({
          nodeId: u,
          stepType: 'update_low',
          formula: 'low[u] = min(low[u], dfn[v])  [回边]',
          substitutedValues: `low[${u}]=${oldLow}, dfn[${v}]=${dfn[v]}`,
          intermediateResult: `min(${oldLow}, ${dfn[v]}) = ${low[u]}`,
          finalResult: `low[${u}] 更新为 ${low[u]}`,
          paramVersion: paramVersion.version,
          timestamp: Date.now(),
        })
      }
    }

    const isRoot = parent[u] === null
    const isCut = cutVertices.includes(u)

    let judgment: CutVertexJudgment
    if (isRoot) {
      judgment = {
        condition: '根节点: childCount >= 2',
        actualValue: `childCount=${childCount[u]}`,
        threshold: '2',
        conclusion: childCount[u] >= 2 ? 'is_cut' : 'not_cut',
        boundaryNote: childCount[u] >= 2
          ? `根节点 ${u} 有 ${childCount[u]} 棵子树，移除后图会断成 ${childCount[u]} 块`
          : undefined,
      }
      if (isRoot && childCount[u] >= 2 && !cutVertices.includes(u)) {
        cutVertices.push(u)
      }
    } else {
      const checkAnyChild = adjacency[u].filter(v => parent[v] === u)
      const meetsCondition = checkAnyChild.some(v => low[v] >= dfn[u] + effectiveThreshold)
      judgment = {
        condition: '非根: low[v] >= dfn[u] + offset',
        actualValue: checkAnyChild.map(v => `low[${v}]=${low[v]}`).join(', '),
        threshold: `dfn[${u}]+offset=${dfn[u]}+${effectiveThreshold}=${dfn[u] + effectiveThreshold}`,
        conclusion: meetsCondition ? 'is_cut' : 'not_cut',
      }
    }

    if (isRoot && childCount[u] === 0 && adjacency[u].length === 0) {
      warnings.push({
        nodeId: u,
        type: 'root_special',
        humanMessage: `根节点 ${u} 没有子节点且无邻接边，这个图只有这一个孤立点。`,
      })
    }

    steps.push({
      nodeId: u,
      stepType: 'dfs_exit',
      formula: 'DFS 退出节点',
      substitutedValues: `dfn=${dfn[u]}, low=${low[u]}, childCount=${childCount[u]}`,
      intermediateResult: `判断条件: ${judgment.condition}`,
      finalResult: isCut ? `✓ ${u} 是割点` : `✗ ${u} 非割点`,
      paramVersion: paramVersion.version,
      timestamp: Date.now(),
    })

    intermediates.push({
      nodeId: u,
      dfn: dfn[u],
      low: low[u],
      parent: parent[u],
      childCount: childCount[u],
      visitOrder: visitOrder[u],
      isRoot,
      cutVertexJudgment: judgment,
    })
  }

  if (rootId && adjacency[rootId] !== undefined) {
    dfs(rootId)
  }

  nodes.forEach(n => {
    if (dfn[n.id] === undefined) {
      dfs(n.id)
    }
  })

  return {
    id: generateId(),
    paramVersion,
    steps,
    intermediates,
    cutVertices,
    boundaryWarnings: warnings,
    createdAt: new Date().toISOString(),
  }
}

export const SAMPLE_GRAPH = {
  nodes: [
    { id: 'A', label: 'A', x: 300, y: 80 },
    { id: 'B', label: 'B', x: 180, y: 180 },
    { id: 'C', label: 'C', x: 420, y: 180 },
    { id: 'D', label: 'D', x: 120, y: 300 },
    { id: 'E', label: 'E', x: 240, y: 300 },
    { id: 'F', label: 'F', x: 360, y: 300 },
    { id: 'G', label: 'G', x: 480, y: 300 },
  ],
  edges: [
    { source: 'A', target: 'B' },
    { source: 'A', target: 'C' },
    { source: 'B', target: 'D' },
    { source: 'B', target: 'E' },
    { source: 'C', target: 'F' },
    { source: 'C', target: 'G' },
    { source: 'D', target: 'E' },
  ],
  description: '7节点示例图: A是割点(连接B和C两棵子树), B是非割点(D-E有环路), C是割点(F和G只通过C连接)',
}
