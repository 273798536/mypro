import { PathNode, PathResult } from '../../types/game';
import { pathConnections, getDistance } from '../../data/mockData';

export class DijkstraPathfinder {
  findPath(
    start: PathNode,
    end: PathNode,
    nodes: PathNode[]
  ): PathResult {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set(nodes.map(n => n.id));

    nodes.forEach(n => {
      distances.set(n.id, Infinity);
      previous.set(n.id, null);
    });
    distances.set(start.id, 0);

    while (unvisited.size > 0) {
      let minDist = Infinity;
      let current: string | null = null;
      
      for (const nodeId of unvisited) {
        const dist = distances.get(nodeId) ?? Infinity;
        if (dist < minDist) {
          minDist = dist;
          current = nodeId;
        }
      }

      if (current === null || current === end.id) break;
      unvisited.delete(current);

      const neighbors = pathConnections[current] || [];
      for (const neighborId of neighbors) {
        if (!unvisited.has(neighborId)) continue;
        
        const currentNode = nodeMap.get(current);
        const neighborNode = nodeMap.get(neighborId);
        if (!currentNode || !neighborNode) continue;

        const alt = (distances.get(current) ?? 0) + getDistance(currentNode, neighborNode);
        if (alt < (distances.get(neighborId) ?? Infinity)) {
          distances.set(neighborId, alt);
          previous.set(neighborId, current);
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

    const totalDistance = distances.get(end.id) ?? Infinity;

    return {
      path,
      distance: totalDistance,
      optimal: true,
      optimalDistance: totalDistance,
    };
  }
}
