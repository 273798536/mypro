import type { Node, Route, SolverStep, AnalysisResult } from '@/types';

interface Edge {
  from: number;
  to: number;
  capacity: number;
  flow: number;
  reverseEdge: number;
  routeId: string;
}

function buildAdjacencyList(
  nodes: Node[],
  routes: Route[]
): { adj: Edge[][]; nodeIndex: Map<string, number>; indexToNode: Map<number, string> } {
  const nodeIndex = new Map<string, number>();
  const indexToNode = new Map<number, string>();
  nodes.forEach((node, idx) => {
    nodeIndex.set(node.id, idx);
    indexToNode.set(idx, node.id);
  });

  const adj: Edge[][] = Array.from({ length: nodes.length }, () => []);

  routes.forEach((route) => {
    if (route.capacity === 0 || route.isDisabled) return;
    const fromIdx = nodeIndex.get(route.from);
    const toIdx = nodeIndex.get(route.to);
    if (fromIdx === undefined || toIdx === undefined) return;

    const forwardEdge: Edge = {
      from: fromIdx,
      to: toIdx,
      capacity: route.capacity,
      flow: 0,
      reverseEdge: adj[toIdx].length,
      routeId: route.id,
    };

    const backwardEdge: Edge = {
      from: toIdx,
      to: fromIdx,
      capacity: 0,
      flow: 0,
      reverseEdge: adj[fromIdx].length,
      routeId: `rev-${route.id}`,
    };

    adj[fromIdx].push(forwardEdge);
    adj[toIdx].push(backwardEdge);
  });

  return { adj, nodeIndex, indexToNode };
}

function bfs(
  adj: Edge[][],
  source: number,
  sink: number
): { path: number[]; edgeIndices: number[]; minCapacity: number } | null {
  const n = adj.length;
  const visited = new Array(n).fill(false);
  const parentNode = new Array(n).fill(-1);
  const parentEdge = new Array(n).fill(-1);
  const minCapacity = new Array(n).fill(Infinity);

  const queue: number[] = [source];
  visited[source] = true;

  while (queue.length > 0) {
    const u = queue.shift()!;

    for (let i = 0; i < adj[u].length; i++) {
      const edge = adj[u][i];
      const residual = edge.capacity - edge.flow;
      if (!visited[edge.to] && residual > 0) {
        visited[edge.to] = true;
        parentNode[edge.to] = u;
        parentEdge[edge.to] = i;
        minCapacity[edge.to] = Math.min(minCapacity[u], residual);

        if (edge.to === sink) {
          const path: number[] = [];
          const edgeIndices: number[] = [];
          let cur = sink;
          while (cur !== source) {
            path.unshift(cur);
            edgeIndices.unshift(parentEdge[cur]);
            cur = parentNode[cur];
          }
          path.unshift(source);
          return { path, edgeIndices, minCapacity: minCapacity[sink] };
        }
        queue.push(edge.to);
      }
    }
  }

  return null;
}

export function edmondsKarp(
  nodes: Node[],
  routes: Route[],
  sourceId: string,
  sinkIds: string[]
): { maxFlow: number; solverSteps: SolverStep[]; routeFlows: Record<string, number> } {
  const { adj, nodeIndex, indexToNode } = buildAdjacencyList(nodes, routes);
  const source = nodeIndex.get(sourceId);

  if (source === undefined) {
    return { maxFlow: 0, solverSteps: [], routeFlows: {} };
  }

  let maxFlow = 0;
  const solverSteps: SolverStep[] = [];
  const routeFlows: Record<string, number> = {};

  routes.forEach((r) => {
    routeFlows[r.id] = 0;
  });

  const superSinkId = '__super_sink__';
  const superSinkIdx = nodes.length;
  adj.push([]);

  sinkIds.forEach((sinkId) => {
    const sinkIdx = nodeIndex.get(sinkId);
    if (sinkIdx !== undefined) {
      const sinkNode = nodes[sinkIdx];
      const demand = sinkNode.demand || Infinity;
      adj[sinkIdx].push({
        from: sinkIdx,
        to: superSinkIdx,
        capacity: demand,
        flow: 0,
        reverseEdge: adj[superSinkIdx].length,
        routeId: `sink-edge-${sinkId}`,
      });
      adj[superSinkIdx].push({
        from: superSinkIdx,
        to: sinkIdx,
        capacity: 0,
        flow: 0,
        reverseEdge: adj[sinkIdx].length - 1,
        routeId: `rev-sink-edge-${sinkId}`,
      });
    }
  });

  let step = 0;
  while (true) {
    const bfsResult = bfs(adj, source, superSinkIdx);
    if (!bfsResult) break;

    const { path, edgeIndices, minCapacity } = bfsResult;
    const augmentingPath = path.map((idx) => indexToNode.get(idx) || superSinkId);

    let bottleneckRouteId = '';
    let minResidual = Infinity;

    for (let i = 0; i < edgeIndices.length; i++) {
      const u = path[i];
      const edgeIdx = edgeIndices[i];
      const edge = adj[u][edgeIdx];
      const residual = edge.capacity - edge.flow;
      if (residual < minResidual && !edge.routeId.startsWith('sink-edge-') && !edge.routeId.startsWith('rev-')) {
        minResidual = residual;
        bottleneckRouteId = edge.routeId;
      }
    }

    for (let i = 0; i < edgeIndices.length; i++) {
      const u = path[i];
      const edgeIdx = edgeIndices[i];
      const edge = adj[u][edgeIdx];
      edge.flow += minCapacity;
      adj[edge.to][edge.reverseEdge].flow -= minCapacity;

      if (!edge.routeId.startsWith('sink-edge-') && !edge.routeId.startsWith('rev-')) {
        routeFlows[edge.routeId] = (routeFlows[edge.routeId] || 0) + minCapacity;
      }
    }

    const residualCapacities: Record<string, number> = {};
    for (let u = 0; u < nodes.length; u++) {
      for (const edge of adj[u]) {
        if (!edge.routeId.startsWith('sink-edge-') && !edge.routeId.startsWith('rev-')) {
          residualCapacities[edge.routeId] = edge.capacity - edge.flow;
        }
      }
    }

    maxFlow += minCapacity;
    step++;

    const cleanPath = augmentingPath.filter((p) => p !== superSinkId);
    if (bottleneckRouteId === '') {
      for (let i = 0; i < edgeIndices.length; i++) {
        const u = path[i];
        const edgeIdx = edgeIndices[i];
        const edge = adj[u][edgeIdx];
        if (!edge.routeId.startsWith('sink-edge-') && !edge.routeId.startsWith('rev-')) {
          bottleneckRouteId = edge.routeId;
          break;
        }
      }
    }

    solverSteps.push({
      step,
      augmentingPath: cleanPath,
      flowAdded: minCapacity,
      bottleneckRouteId,
      residualCapacities,
    });
  }

  return { maxFlow, solverSteps, routeFlows };
}
