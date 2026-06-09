import type { FlowEdge, FlowNode, BottleneckExplanation } from '@/types';

interface ResidualEdge {
  to: number;
  rev: number;
  capacity: number;
  flow: number;
  originalEdgeId?: string;
}

export interface MaxFlowResult {
  maxFlow: number;
  flows: Map<string, number>;
  bottleneckEdges: string[];
  bottleneckNodes: string[];
  minCutS: Set<string>;
}

function buildGraph(
  nodes: FlowNode[],
  edges: FlowEdge[]
): { graph: ResidualEdge[][]; nodeIndex: Map<string, number>; indexNode: Map<number, string> } {
  const nodeIndex = new Map<string, number>();
  const indexNode = new Map<number, string>();
  nodes.forEach((n, i) => {
    nodeIndex.set(n.id, i);
    indexNode.set(i, n.id);
  });

  const graph: ResidualEdge[][] = Array.from({ length: nodes.length }, () => []);

  edges.forEach((e) => {
    const fromIdx = nodeIndex.get(e.from);
    const toIdx = nodeIndex.get(e.to);
    if (fromIdx === undefined || toIdx === undefined) return;

    const forward: ResidualEdge = {
      to: toIdx,
      rev: graph[toIdx].length,
      capacity: e.capacity,
      flow: 0,
      originalEdgeId: e.id,
    };
    const backward: ResidualEdge = {
      to: fromIdx,
      rev: graph[fromIdx].length,
      capacity: 0,
      flow: 0,
    };
    graph[fromIdx].push(forward);
    graph[toIdx].push(backward);
  });

  return { graph, nodeIndex, indexNode };
}

function bfs(
  graph: ResidualEdge[][],
  s: number,
  t: number
): { level: number[]; found: boolean } {
  const level = Array(graph.length).fill(-1);
  level[s] = 0;
  const queue: number[] = [s];

  while (queue.length > 0) {
    const v = queue.shift()!;
    for (const edge of graph[v]) {
      if (edge.capacity > 0 && level[edge.to] < 0) {
        level[edge.to] = level[v] + 1;
        queue.push(edge.to);
      }
    }
  }
  return { level, found: level[t] >= 0 };
}

function dfs(
  graph: ResidualEdge[][],
  level: number[],
  iter: number[],
  v: number,
  t: number,
  flow: number
): number {
  if (v === t) return flow;
  for (let i = iter[v]; i < graph[v].length; i++) {
    iter[v] = i;
    const edge = graph[v][i];
    if (edge.capacity > 0 && level[v] < level[edge.to]) {
      const d = dfs(graph, level, iter, edge.to, t, Math.min(flow, edge.capacity));
      if (d > 0) {
        edge.capacity -= d;
        edge.flow += d;
        graph[edge.to][edge.rev].capacity += d;
        return d;
      }
    }
  }
  return 0;
}

export function maxFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  sourceId: string,
  sinkId: string
): MaxFlowResult {
  const { graph, nodeIndex, indexNode } = buildGraph(nodes, edges);
  const s = nodeIndex.get(sourceId)!;
  const t = nodeIndex.get(sinkId)!;

  let flow = 0;
  while (true) {
    const { level, found } = bfs(graph, s, t);
    if (!found) break;
    const iter = Array(graph.length).fill(0);
    let f: number;
    while ((f = dfs(graph, level, iter, s, t, Infinity)) > 0) {
      flow += f;
    }
  }

  const flows = new Map<string, number>();
  const bottleneckEdges: string[] = [];

  for (let v = 0; v < graph.length; v++) {
    for (const edge of graph[v]) {
      if (edge.originalEdgeId && edge.flow > 0) {
        flows.set(edge.originalEdgeId, edge.flow);
        if (edge.capacity === 0) {
          bottleneckEdges.push(edge.originalEdgeId);
        }
      }
    }
  }

  const { level } = bfs(graph, s, t);
  const minCutS = new Set<string>();
  const bottleneckNodes: string[] = [];

  for (let i = 0; i < level.length; i++) {
    if (level[i] >= 0) {
      minCutS.add(indexNode.get(i)!);
    }
  }

  edges.forEach((e) => {
    if (minCutS.has(e.from) && !minCutS.has(e.to)) {
      const node = nodes.find((n) => n.id === e.to);
      if (node && !bottleneckNodes.includes(node.id)) {
        bottleneckNodes.push(node.id);
      }
    }
  });

  return { maxFlow: flow, flows, bottleneckEdges, bottleneckNodes, minCutS };
}

export function generateExplanation(
  result: MaxFlowResult,
  nodes: FlowNode[],
  edges: FlowEdge[],
  sourceId: string,
  sinkId: string
): BottleneckExplanation {
  const source = nodes.find((n) => n.id === sourceId);
  const sink = nodes.find((n) => n.id === sinkId);
  const bottleneckNodeIds = result.bottleneckNodes;
  const bottleneckEdgeIds = result.bottleneckEdges;

  const bottleneckNodeLabels = bottleneckNodeIds
    .map((id) => nodes.find((n) => n.id === id)?.label || id)
    .filter(Boolean);

  let summary: string;
  let teachingNote: string;

  if (bottleneckNodeLabels.length === 1) {
    summary = `最大流为 ${result.maxFlow}，瓶颈在节点「${bottleneckNodeLabels[0]}」`;
    teachingNote = `从${source?.label || '源点'}到${sink?.label || '汇点'}的所有路径都必须经过「${bottleneckNodeLabels[0]}」，该节点的处理能力限制了整个网络的吞吐量，就像高速公路上的唯一收费站。`;
  } else if (bottleneckNodeLabels.length > 1) {
    summary = `最大流为 ${result.maxFlow}，瓶颈分布在 ${bottleneckNodeLabels.length} 个节点`;
    teachingNote = `网络中存在多个瓶颈节点：${bottleneckNodeLabels.join('、')}。这些节点共同构成了从${source?.label || '源点'}到${sink?.label || '汇点'}的最窄通道，想提升整体流量需要同时扩容这些节点。`;
  } else if (bottleneckEdgeIds.length > 0) {
    const bottleneckEdge = edges.find((e) => e.id === bottleneckEdgeIds[0]);
    summary = `最大流为 ${result.maxFlow}，瓶颈在关键边上`;
    teachingNote = bottleneckEdge
      ? `从「${nodes.find((n) => n.id === bottleneckEdge.from)?.label}」到「${nodes.find((n) => n.id === bottleneckEdge.to)?.label}」的通道已满负荷（${bottleneckEdge.flow}/${bottleneckEdge.capacity}），这条边是整个网络的咽喉要道。`
      : `部分关键边已达到容量上限，它们共同决定了网络的最大输送能力。`;
  } else {
    summary = `最大流为 ${result.maxFlow}`;
    teachingNote = `该网络的最大输送能力为 ${result.maxFlow}，目前没有明显的单一瓶颈，流量分布相对均衡。`;
  }

  return {
    summary,
    teachingNote,
    affectedNodes: bottleneckNodeIds,
    affectedEdges: bottleneckEdgeIds,
    maxFlow: result.maxFlow,
    bottleneckValue: result.maxFlow,
  };
}
