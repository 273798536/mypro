import { PipeNode, PipeConnection, ValveState } from './types';

export interface ConnectivityResult {
  connectedNodes: Set<string>;
  isolatedNodes: Set<string>;
  nodeToSourceDistance: Map<string, number>;
}

export function buildAdjacencyList(
  nodes: PipeNode[],
  connections: PipeConnection[],
  valves: Map<string, ValveState>
): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();

  nodes.forEach((node) => {
    adjacency.set(node.id, []);
  });

  connections.forEach((conn) => {
    const fromNode = nodes.find((n) => n.id === conn.from);
    const toNode = nodes.find((n) => n.id === conn.to);

    if (!fromNode || !toNode) return;

    const fromValve = valves.get(conn.from);
    const toValve = valves.get(conn.to);

    const fromOpen = fromNode.type === 'valve' ? fromValve?.isOpen ?? true : true;
    const toOpen = toNode.type === 'valve' ? toValve?.isOpen ?? true : true;

    if (fromOpen && toOpen) {
      adjacency.get(conn.from)?.push(conn.to);
      adjacency.get(conn.to)?.push(conn.from);
    }
  });

  return adjacency;
}

export function calculateConnectivity(
  nodes: PipeNode[],
  connections: PipeConnection[],
  valves: Map<string, ValveState>
): ConnectivityResult {
  const adjacency = buildAdjacencyList(nodes, connections, valves);
  const sourceNodes = nodes.filter((n) => n.type === 'source').map((n) => n.id);
  const connected = new Set<string>();
  const distances = new Map<string, number>();
  const queue: string[] = [];

  sourceNodes.forEach((sourceId) => {
    connected.add(sourceId);
    distances.set(sourceId, 0);
    queue.push(sourceId);
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDistance = distances.get(current) ?? 0;
    const neighbors = adjacency.get(current) ?? [];

    neighbors.forEach((neighbor) => {
      if (!connected.has(neighbor)) {
        connected.add(neighbor);
        distances.set(neighbor, currentDistance + 1);
        queue.push(neighbor);
      }
    });
  }

  const isolated = new Set(nodes.map((n) => n.id).filter((id) => !connected.has(id)));

  return {
    connectedNodes: connected,
    isolatedNodes: isolated,
    nodeToSourceDistance: distances,
  };
}

export function isNodeConnected(
  nodeId: string,
  connectivity: ConnectivityResult
): boolean {
  return connectivity.connectedNodes.has(nodeId);
}

export function getDownstreamNodes(
  startNodeId: string,
  adjacency: Map<string, string[]>,
  excludeNodes: Set<string> = new Set()
): Set<string> {
  const downstream = new Set<string>();
  const queue: string[] = [startNodeId];
  const visited = new Set<string>(excludeNodes);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    downstream.add(current);

    const neighbors = adjacency.get(current) ?? [];
    neighbors.forEach((n) => {
      if (!visited.has(n)) {
        queue.push(n);
      }
    });
  }

  return downstream;
}

export function findAffectedUserZones(
  connectivity: ConnectivityResult,
  userZones: { id: string; nodeIds: string[]; name: string; population: number; hasWater: boolean }[]
): { id: string; nodeIds: string[]; name: string; population: number; hasWater: boolean }[] {
  return userZones.map((zone) => {
    const zoneNodesConnected = zone.nodeIds.some((nodeId) =>
      connectivity.connectedNodes.has(nodeId)
    );
    return {
      ...zone,
      hasWater: zoneNodesConnected,
    };
  });
}

export function getValveDownstreamImpact(
  valveId: string,
  nodes: PipeNode[],
  connections: PipeConnection[],
  valves: Map<string, ValveState>,
  userZones: { id: string; nodeIds: string[]; name: string; population: number }[]
): { affectedNodes: string[]; affectedPopulation: number; affectedZones: string[] } {
  const testValves = new Map(valves);
  testValves.set(valveId, {
    nodeId: valveId,
    isOpen: false,
    operatedAt: Date.now(),
    operator: 'system',
  });

  const newConnectivity = calculateConnectivity(nodes, connections, testValves);

  const affectedNodes = Array.from(newConnectivity.isolatedNodes);
  const affectedZones = userZones
    .filter((zone) => zone.nodeIds.some((id) => affectedNodes.includes(id)))
    .map((z) => z.name);
  const affectedPopulation = userZones
    .filter((zone) => zone.nodeIds.some((id) => affectedNodes.includes(id)))
    .reduce((sum, z) => sum + z.population, 0);

  return {
    affectedNodes,
    affectedPopulation,
    affectedZones,
  };
}
