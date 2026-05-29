import type { RoadNode, RoadEdge, FireStation, Building, CoverageResult } from '../types';

interface GraphNode {
  id: string;
  edges: { to: string; weight: number }[];
}

export function calculateShortestPath(
  nodes: RoadNode[],
  edges: RoadEdge[],
  startId: string,
  endId: string,
  speedCoefficient: number = 1.0
): { distance: number; time: number; path: string[] } | null {
  const graph: Map<string, GraphNode> = new Map();

  nodes.forEach((node) => {
    graph.set(node.id, { id: node.id, edges: [] });
  });

  edges.forEach((edge) => {
    if (edge.isBlocked) return;

    const fromNode = graph.get(edge.from);
    const toNode = graph.get(edge.to);

    if (fromNode && toNode) {
      const time = (edge.distance / (edge.speedLimit * speedCoefficient)) * 60;
      fromNode.edges.push({ to: edge.to, weight: time });
      toNode.edges.push({ to: edge.from, weight: time });
    }
  });

  const distances: Map<string, number> = new Map();
  const previous: Map<string, string | null> = new Map();
  const visited: Set<string> = new Set();

  nodes.forEach((node) => {
    distances.set(node.id, Infinity);
    previous.set(node.id, null);
  });

  distances.set(startId, 0);

  while (true) {
    let minNode: string | null = null;
    let minDist = Infinity;

    nodes.forEach((node) => {
      if (!visited.has(node.id) && distances.get(node.id)! < minDist) {
        minDist = distances.get(node.id)!;
        minNode = node.id;
      }
    });

    if (minNode === null || minNode === endId) break;

    visited.add(minNode);

    const currentNode = graph.get(minNode);
    if (!currentNode) continue;

    currentNode.edges.forEach((edge) => {
      if (!visited.has(edge.to)) {
        const newDist = distances.get(minNode)! + edge.weight;
        if (newDist < distances.get(edge.to)!) {
          distances.set(edge.to, newDist);
          previous.set(edge.to, minNode);
        }
      }
    });
  }

  if (distances.get(endId) === Infinity) return null;

  const path: string[] = [];
  let current: string | null = endId;
  while (current !== null) {
    path.unshift(current);
    current = previous.get(current) || null;
  }

  const totalDistance = path.reduce((sum, nodeId, index) => {
    if (index === 0) return 0;
    const prevNodeId = path[index - 1];
    const edge = edges.find(
      (e) =>
        (e.from === prevNodeId && e.to === nodeId) ||
        (e.from === nodeId && e.to === prevNodeId)
    );
    return sum + (edge?.distance || 0);
  }, 0);

  return {
    distance: totalDistance,
    time: distances.get(endId)!,
    path,
  };
}

export function findNearestRoadNode(
  position: [number, number, number],
  nodes: RoadNode[]
): string | null {
  let nearest: string | null = null;
  let minDist = Infinity;

  nodes.forEach((node) => {
    const dx = position[0] - node.position[0];
    const dz = position[2] - node.position[1];
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < minDist) {
      minDist = dist;
      nearest = node.id;
    }
  });

  return nearest;
}

export function calculateCoverage(
  fireStations: FireStation[],
  buildings: Building[],
  roadNodes: RoadNode[],
  roadEdges: RoadEdge[],
  parameters: { speedCoefficient: number; responseThreshold: number }
): CoverageResult[] {
  const results: CoverageResult[] = [];

  buildings.forEach((building) => {
    const buildingNodeId = findNearestRoadNode(building.position, roadNodes);
    if (!buildingNodeId) {
      results.push({
        buildingId: building.id,
        responseTime: Infinity,
        fireStationId: '',
        isBlind: true,
      });
      return;
    }

    let bestTime = Infinity;
    let bestStationId = '';

    fireStations.forEach((station) => {
      const stationNodeId = findNearestRoadNode(station.position, roadNodes);
      if (!stationNodeId) return;

      const result = calculateShortestPath(
        roadNodes,
        roadEdges,
        stationNodeId,
        buildingNodeId,
        parameters.speedCoefficient
      );

      if (result && result.time < bestTime) {
        bestTime = result.time;
        bestStationId = station.id;
      }
    });

    results.push({
      buildingId: building.id,
      responseTime: bestTime,
      fireStationId: bestStationId,
      isBlind: bestTime > parameters.responseThreshold || bestTime === Infinity,
    });
  });

  return results;
}
