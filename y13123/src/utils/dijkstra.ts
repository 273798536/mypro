import type { GraphNode, GraphEdge } from '@/types';

export function dijkstra(
  nodes: GraphNode[],
  edges: GraphEdge[],
  start: string,
  end: string
): { path: string[]; distance: number } {
  const nodeIds = nodes.map((n) => n.id);
  if (!nodeIds.includes(start) || !nodeIds.includes(end)) {
    return { path: [], distance: Infinity };
  }

  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const visited = new Set<string>();

  nodeIds.forEach((id) => {
    dist[id] = Infinity;
    prev[id] = null;
  });
  dist[start] = 0;

  const adj: Record<string, { to: string; weight: number }[]> = {};
  nodeIds.forEach((id) => (adj[id] = []));
  edges.forEach((e) => {
    adj[e.from]?.push({ to: e.to, weight: e.weight });
    adj[e.to]?.push({ to: e.from, weight: e.weight });
  });

  while (visited.size < nodeIds.length) {
    let current: string | null = null;
    let currentDist = Infinity;
    nodeIds.forEach((id) => {
      if (!visited.has(id) && dist[id] < currentDist) {
        current = id;
        currentDist = dist[id];
      }
    });
    if (current === null || currentDist === Infinity) break;
    visited.add(current);

    adj[current].forEach(({ to, weight }) => {
      const candidate = dist[current] + weight;
      if (candidate < dist[to]) {
        dist[to] = candidate;
        prev[to] = current;
      }
    });
  }

  const path: string[] = [];
  let cur: string | null = end;
  while (cur !== null) {
    path.unshift(cur);
    cur = prev[cur] ?? null;
  }

  if (path[0] !== start || dist[end] === Infinity) {
    return { path: [], distance: Infinity };
  }
  return { path, distance: dist[end] };
}

export function markShortestPath(
  nodes: GraphNode[],
  edges: GraphEdge[],
  path: string[]
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const pathSet = new Set(path);
  const edgeSet = new Set<string>();
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    edgeSet.add([a, b].sort().join('|'));
  }
  return {
    nodes: nodes.map((n) => ({ ...n, onShortestPath: pathSet.has(n.id) })),
    edges: edges.map((e) => ({
      ...e,
      onShortestPath: edgeSet.has([e.from, e.to].sort().join('|')),
    })),
  };
}
