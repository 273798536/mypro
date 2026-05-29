import { PathNode, PathResult } from '../../types/game';
import { pathConnections, getDistance } from '../../data/mockData';
import { DijkstraPathfinder } from './dijkstra';

export class GreedyPathfinder {
  findPath(
    start: PathNode,
    end: PathNode,
    nodes: PathNode[]
  ): PathResult {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const path: PathNode[] = [start];
    const visited = new Set<string>([start.id]);
    let current = start;
    let totalDistance = 0;

    while (current.id !== end.id) {
      const neighbors = pathConnections[current.id] || [];
      let nearest: string | null = null;
      let nearestDist = Infinity;

      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) continue;
        
        const neighborNode = nodeMap.get(neighborId);
        if (!neighborNode) continue;

        const distToGoal = getDistance(neighborNode, end);
        if (distToGoal < nearestDist) {
          nearestDist = distToGoal;
          nearest = neighborId;
        }
      }

      if (nearest === null) {
        const unvisitedNeighbors = neighbors.filter(n => !visited.has(n));
        if (unvisitedNeighbors.length > 0) {
          nearest = unvisitedNeighbors[0];
        } else {
          break;
        }
      }

      const nextNode = nodeMap.get(nearest);
      if (nextNode) {
        totalDistance += getDistance(current, nextNode);
        path.push(nextNode);
        visited.add(nextNode.id);
        current = nextNode;
      } else {
        break;
      }
    }

    const dijkstra = new DijkstraPathfinder();
    const optimalResult = dijkstra.findPath(start, end, nodes);

    return {
      path,
      distance: totalDistance,
      optimal: Math.abs(totalDistance - optimalResult.optimalDistance) < 0.1,
      optimalDistance: optimalResult.optimalDistance,
    };
  }
}
