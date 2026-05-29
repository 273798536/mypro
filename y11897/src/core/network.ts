import { RoadNetwork, RoadNode, RoadEdge, Coordinate, ValidationIssue } from '../types';
import { euclideanDistance } from './distance';

export interface NetworkPathResult {
  distance: number;
  path: string[];
}

export class NetworkGraph {
  private adjacencyList: Map<string, Array<{ nodeId: string; length: number }>>;
  private nodeCoordinates: Map<string, Coordinate>;

  constructor(network: RoadNetwork) {
    this.adjacencyList = new Map();
    this.nodeCoordinates = new Map();

    for (const node of network.nodes) {
      this.adjacencyList.set(node.id, []);
      this.nodeCoordinates.set(node.id, node.coordinate);
    }

    for (const edge of network.edges) {
      this.addEdge(edge);
    }
  }

  private addEdge(edge: RoadEdge): void {
    if (edge.walkable === false) return;

    const fromEdges = this.adjacencyList.get(edge.from);
    const toEdges = this.adjacencyList.get(edge.to);

    if (fromEdges) {
      fromEdges.push({ nodeId: edge.to, length: edge.length });
    }
    if (toEdges) {
      toEdges.push({ nodeId: edge.from, length: edge.length });
    }
  }

  findNearestNetworkNode(coordinate: Coordinate): { nodeId: string; distance: number } | null {
    let nearestNodeId: string | null = null;
    let minDistance = Infinity;

    for (const [nodeId, nodeCoord] of this.nodeCoordinates.entries()) {
      const distance = euclideanDistance(coordinate, nodeCoord);
      if (distance < minDistance) {
        minDistance = distance;
        nearestNodeId = nodeId;
      }
    }

    return nearestNodeId ? { nodeId: nearestNodeId, distance: minDistance } : null;
  }

  shortestPath(fromNodeId: string, toNodeId: string): NetworkPathResult | null {
    const distances: Map<string, number> = new Map();
    const previous: Map<string, string | null> = new Map();
    const unvisited: Set<string> = new Set();

    for (const nodeId of this.adjacencyList.keys()) {
      distances.set(nodeId, nodeId === fromNodeId ? 0 : Infinity);
      previous.set(nodeId, null);
      unvisited.add(nodeId);
    }

    while (unvisited.size > 0) {
      let currentNodeId: string | null = null;
      let minDistance = Infinity;

      for (const nodeId of unvisited) {
        const dist = distances.get(nodeId) ?? Infinity;
        if (dist < minDistance) {
          minDistance = dist;
          currentNodeId = nodeId;
        }
      }

      if (currentNodeId === null || minDistance === Infinity) {
        break;
      }

      if (currentNodeId === toNodeId) {
        break;
      }

      unvisited.delete(currentNodeId);

      const neighbors = this.adjacencyList.get(currentNodeId) ?? [];
      for (const neighbor of neighbors) {
        if (!unvisited.has(neighbor.nodeId)) continue;

        const alt = (distances.get(currentNodeId) ?? 0) + neighbor.length;
        if (alt < (distances.get(neighbor.nodeId) ?? Infinity)) {
          distances.set(neighbor.nodeId, alt);
          previous.set(neighbor.nodeId, currentNodeId);
        }
      }
    }

    const finalDistance = distances.get(toNodeId);
    if (finalDistance === undefined || finalDistance === Infinity) {
      return null;
    }

    const path: string[] = [];
    let current: string | null = toNodeId;
    while (current !== null) {
      path.unshift(current);
      current = previous.get(current) ?? null;
    }

    return { distance: finalDistance, path };
  }

  calculateNetworkDistance(
    fromCoord: Coordinate,
    toCoord: Coordinate
  ): { distance: number; viaPath: boolean; accessDistance: number } {
    const fromNearest = this.findNearestNetworkNode(fromCoord);
    const toNearest = this.findNearestNetworkNode(toCoord);

    if (!fromNearest || !toNearest) {
      return {
        distance: euclideanDistance(fromCoord, toCoord),
        viaPath: false,
        accessDistance: 0
      };
    }

    const pathResult = this.shortestPath(fromNearest.nodeId, toNearest.nodeId);

    if (pathResult) {
      return {
        distance: fromNearest.distance + pathResult.distance + toNearest.distance,
        viaPath: true,
        accessDistance: fromNearest.distance + toNearest.distance
      };
    } else {
      return {
        distance: euclideanDistance(fromCoord, toCoord),
        viaPath: false,
        accessDistance: fromNearest.distance + toNearest.distance
      };
    }
  }

  getNodes(): string[] {
    return Array.from(this.adjacencyList.keys());
  }

  getConnectedComponents(): string[][] {
    const visited: Set<string> = new Set();
    const components: string[][] = [];

    for (const nodeId of this.adjacencyList.keys()) {
      if (!visited.has(nodeId)) {
        const component: string[] = [];
        const queue: string[] = [nodeId];

        while (queue.length > 0) {
          const current = queue.shift()!;
          if (visited.has(current)) continue;

          visited.add(current);
          component.push(current);

          const neighbors = this.adjacencyList.get(current) ?? [];
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor.nodeId)) {
              queue.push(neighbor.nodeId);
            }
          }
        }

        components.push(component);
      }
    }

    return components;
  }
}

export function validateNetwork(network: RoadNetwork): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeIds = new Set(network.nodes.map(n => n.id));

  for (const edge of network.edges) {
    if (!nodeIds.has(edge.from)) {
      issues.push({
        type: 'network_breakpoint',
        severity: 'error',
        message: `边 ${edge.id} 引用了不存在的起点节点 ${edge.from}`,
        details: { edgeId: edge.id, missingNode: edge.from }
      });
    }
    if (!nodeIds.has(edge.to)) {
      issues.push({
        type: 'network_breakpoint',
        severity: 'error',
        message: `边 ${edge.id} 引用了不存在的终点节点 ${edge.to}`,
        details: { edgeId: edge.id, missingNode: edge.to }
      });
    }
  }

  const graph = new NetworkGraph(network);
  const components = graph.getConnectedComponents();

  if (components.length > 1) {
    issues.push({
      type: 'network_breakpoint',
      severity: 'warning',
      message: `路网存在 ${components.length} 个连通分量，部分区域可能无法到达`,
      details: { componentCount: components.length, componentSizes: components.map(c => c.length) }
    });
  }

  const isolatedNodes = components.filter(c => c.length === 1);
  if (isolatedNodes.length > 0) {
    issues.push({
      type: 'network_breakpoint',
      severity: 'warning',
      message: `发现 ${isolatedNodes.length} 个孤立节点，这些位置没有连接到路网`,
      details: { isolatedNodes: isolatedNodes.flat() }
    });
  }

  for (const node of network.nodes) {
    const edges = network.edges.filter(e => e.from === node.id || e.to === node.id);
    if (edges.length === 0) {
      issues.push({
        type: 'network_breakpoint',
        severity: 'info',
        message: `节点 ${node.id} (${node.coordinate.x}, ${node.coordinate.y}) 没有连接任何道路`,
        details: { nodeId: node.id }
      });
    }
  }

  return issues;
}
