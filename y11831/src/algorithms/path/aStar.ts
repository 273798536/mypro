import { PathNode, PathResult } from '../../types/game';
import { pathConnections, getDistance } from '../../data/mockData';
import { DijkstraPathfinder } from './dijkstra';

export class AStarPathfinder {
  private heuristic(node: PathNode, goal: PathNode): number {
    return getDistance(node, goal) * 0.9;
  }

  findPath(
    start: PathNode,
    end: PathNode,
    nodes: PathNode[]
  ): PathResult {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const openSet = new Set<string>();

    nodes.forEach(n => {
      gScore.set(n.id, Infinity);
      fScore.set(n.id, Infinity);
      previous.set(n.id, null);
    });

    gScore.set(start.id, 0);
    fScore.set(start.id, this.heuristic(start, end));
    openSet.add(start.id);

    while (openSet.size > 0) {
      let current: string | null = null;
      let minF = Infinity;
      
      for (const nodeId of openSet) {
        const f = fScore.get(nodeId) ?? Infinity;
        if (f < minF) {
          minF = f;
          current = nodeId;
        }
      }

      if (current === null || current === end.id) break;
      openSet.delete(current);

      const neighbors = pathConnections[current] || [];
      for (const neighborId of neighbors) {
        const currentNode = nodeMap.get(current);
        const neighborNode = nodeMap.get(neighborId);
        if (!currentNode || !neighborNode) continue;

        const tentativeG = (gScore.get(current) ?? 0) + getDistance(currentNode, neighborNode);
        
        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          previous.set(neighborId, current);
          gScore.set(neighborId, tentativeG);
          fScore.set(neighborId, tentativeG + this.heuristic(neighborNode, end));
          openSet.add(neighborId);
        }
      }
    }

    const path: PathNode[] = [];
    let current: string | null = end.id;
    while (current !== null) {
      const node = nodeMap.get(current);
      if (node) path.unshift(node);
      current = previous.get(current) ?? null;
    }

    const dijkstra = new DijkstraPathfinder();
    const optimalResult = dijkstra.findPath(start, end, nodes);

    return {
      path,
      distance: gScore.get(end.id) ?? Infinity,
      optimal: Math.abs((gScore.get(end.id) ?? 0) - optimalResult.optimalDistance) < 0.1,
      optimalDistance: optimalResult.optimalDistance,
    };
  }
}
