import { NetworkEdge, NetworkNode } from '../types';

interface Edge {
  to: number;
  rev: number;
  capacity: number;
  originalEdgeId?: string;
}

export class DinicMaxFlow {
  private graph: Edge[][];
  private nodeIdToIndex: Map<string, number>;
  private indexToNodeId: Map<number, string>;
  private edgeIndexToOriginalId: Map<string, string>;

  constructor(nodes: NetworkNode[], edges: NetworkEdge[]) {
    this.nodeIdToIndex = new Map();
    this.indexToNodeId = new Map();
    this.edgeIndexToOriginalId = new Map();
    
    nodes.forEach((node, index) => {
      this.nodeIdToIndex.set(node.id, index);
      this.indexToNodeId.set(index, node.id);
    });

    this.graph = Array(nodes.length).fill(null).map(() => []);
    
    edges.forEach((edge) => {
      if (edge.disabled || edge.capacity <= 0) return;
      
      const fromIdx = this.nodeIdToIndex.get(edge.from);
      const toIdx = this.nodeIdToIndex.get(edge.to);
      
      if (fromIdx === undefined || toIdx === undefined) return;

      this.addEdge(fromIdx, toIdx, edge.capacity, edge.id);
      
      if (edge.bidirectional) {
        this.addEdge(toIdx, fromIdx, edge.capacity, edge.id);
      }
    });
  }

  private addEdge(from: number, to: number, capacity: number, originalEdgeId: string): void {
    const forwardEdge: Edge = {
      to,
      rev: this.graph[to].length,
      capacity,
      originalEdgeId
    };
    const backwardEdge: Edge = {
      to: from,
      rev: this.graph[from].length,
      capacity: 0,
      originalEdgeId
    };
    
    this.graph[from].push(forwardEdge);
    this.graph[to].push(backwardEdge);
    
    const edgeKey = `${from}-${to}-${this.graph[from].length - 1}`;
    this.edgeIndexToOriginalId.set(edgeKey, originalEdgeId);
  }

  private bfs(s: number, t: number, level: number[]): boolean {
    level.fill(-1);
    level[s] = 0;
    const queue: number[] = [s];
    
    while (queue.length > 0) {
      const v = queue.shift()!;
      for (const edge of this.graph[v]) {
        if (edge.capacity > 0 && level[edge.to] === -1) {
          level[edge.to] = level[v] + 1;
          queue.push(edge.to);
          if (edge.to === t) return true;
        }
      }
    }
    return false;
  }

  private dfs(
    v: number,
    t: number,
    flow: number,
    level: number[],
    ptr: number[],
    edgeFlows: Map<string, number>
  ): number {
    if (v === t) return flow;
    
    for (; ptr[v] < this.graph[v].length; ptr[v]++) {
      const edge = this.graph[v][ptr[v]];
      if (edge.capacity > 0 && level[v] < level[edge.to]) {
        const pushed = this.dfs(edge.to, t, Math.min(flow, edge.capacity), level, ptr, edgeFlows);
        if (pushed > 0) {
          edge.capacity -= pushed;
          this.graph[edge.to][edge.rev].capacity += pushed;
          
          if (edge.originalEdgeId) {
            const current = edgeFlows.get(edge.originalEdgeId) || 0;
            edgeFlows.set(edge.originalEdgeId, current + pushed);
          }
          return pushed;
        }
      }
    }
    return 0;
  }

  compute(sourceId: string, sinkId: string): { maxFlow: number; edgeFlows: Record<string, number> } {
    const s = this.nodeIdToIndex.get(sourceId);
    const t = this.nodeIdToIndex.get(sinkId);
    
    if (s === undefined || t === undefined) {
      return { maxFlow: 0, edgeFlows: {} };
    }

    const level: number[] = Array(this.graph.length).fill(-1);
    const edgeFlows = new Map<string, number>();
    let maxFlow = 0;

    while (this.bfs(s, t, level)) {
      const ptr: number[] = Array(this.graph.length).fill(0);
      let flow: number;
      do {
        flow = this.dfs(s, t, Infinity, level, ptr, edgeFlows);
        maxFlow += flow;
      } while (flow > 0);
      level.fill(-1);
    }

    const edgeFlowsRecord: Record<string, number> = {};
    edgeFlows.forEach((value, key) => {
      edgeFlowsRecord[key] = value;
    });

    return { maxFlow, edgeFlows: edgeFlowsRecord };
  }

  getReachableNodes(sourceId: string): Set<string> {
    const s = this.nodeIdToIndex.get(sourceId);
    if (s === undefined) return new Set();

    const visited = new Set<number>();
    const queue: number[] = [s];
    visited.add(s);

    while (queue.length > 0) {
      const v = queue.shift()!;
      for (const edge of this.graph[v]) {
        if (edge.capacity > 0 && !visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push(edge.to);
        }
      }
    }

    const reachableIds = new Set<string>();
    visited.forEach((idx) => {
      const nodeId = this.indexToNodeId.get(idx);
      if (nodeId) reachableIds.add(nodeId);
    });

    return reachableIds;
  }
}

export function findSourceAndSinkNodes(
  nodes: NetworkNode[],
  demands: { nodeId: string; type: string; amount: number }[]
): { sourceId: string | null; sinkId: string | null } {
  const supplyNodes = demands.filter(d => d.type === 'supply' && d.amount > 0);
  const demandNodes = demands.filter(d => d.type === 'demand' && d.amount > 0);
  
  if (supplyNodes.length === 0 || demandNodes.length === 0) {
    return { sourceId: null, sinkId: null };
  }
  
  return {
    sourceId: supplyNodes[0].nodeId,
    sinkId: demandNodes[0].nodeId
  };
}
