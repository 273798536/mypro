import { PipeNode, PipeConnection, ValveState, LeakState } from './types';
import { ConnectivityResult, buildAdjacencyList } from './connectivity';
import { PRESSURE_CONFIG } from './config';

export interface PressureResult {
  nodePressures: Map<string, number>;
  averagePressure: number;
  minPressure: number;
  maxPressure: number;
  lowPressureNodes: string[];
  hasLowPressure: boolean;
}

export function calculatePressures(
  nodes: PipeNode[],
  connections: PipeConnection[],
  valves: Map<string, ValveState>,
  leaks: Map<string, LeakState>,
  connectivity: ConnectivityResult
): PressureResult {
  const pressures = new Map<string, number>();
  const adjacency = buildAdjacencyList(nodes, connections, valves);

  const sourceNodes = nodes.filter((n) => n.type === 'source');
  sourceNodes.forEach((source) => {
    pressures.set(source.id, source.basePressure ?? PRESSURE_CONFIG.maxNormal);
  });

  const queue: string[] = sourceNodes.map((n) => n.id);
  const processed = new Set<string>(sourceNodes.map((n) => n.id));

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentPressure = pressures.get(currentId) ?? 0;
    const neighbors = adjacency.get(currentId) ?? [];

    neighbors.forEach((neighborId) => {
      if (!processed.has(neighborId) && connectivity.connectedNodes.has(neighborId)) {
        const node = nodes.find((n) => n.id === neighborId);
        if (!node) return;

        const distance = getNodeDistance(nodes, currentId, neighborId);
        let newPressure = currentPressure - distance * PRESSURE_CONFIG.decayPerUnit;

        if (node.type === 'leak') {
          const leak = leaks.get(neighborId);
          if (leak && !leak.isControlled) {
            newPressure -= PRESSURE_CONFIG.leakImpact;
          }
        }

        newPressure = Math.max(0, Math.min(PRESSURE_CONFIG.maxNormal, newPressure));
        pressures.set(neighborId, newPressure);
        processed.add(neighborId);
        queue.push(neighborId);
      }
    });
  }

  connectivity.isolatedNodes.forEach((nodeId) => {
    pressures.set(nodeId, 0);
  });

  const pressureValues = Array.from(pressures.values());
  const avgPressure = pressureValues.length > 0
    ? pressureValues.reduce((a, b) => a + b, 0) / pressureValues.length
    : 0;
  const minPressure = pressureValues.length > 0 ? Math.min(...pressureValues) : 0;
  const maxPressure = pressureValues.length > 0 ? Math.max(...pressureValues) : 0;

  const lowPressureNodes = Array.from(pressures.entries())
    .filter(([_, p]) => p > 0 && p < PRESSURE_CONFIG.lowPressureThreshold)
    .map(([id]) => id);

  return {
    nodePressures: pressures,
    averagePressure: avgPressure,
    minPressure,
    maxPressure,
    lowPressureNodes,
    hasLowPressure: lowPressureNodes.length > 0,
  };
}

function getNodeDistance(nodes: PipeNode[], nodeA: string, nodeB: string): number {
  const a = nodes.find((n) => n.id === nodeA);
  const b = nodes.find((n) => n.id === nodeB);
  if (!a || !b) return 1;
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)) / 100;
}

export function getPressureColor(pressure: number): string {
  if (pressure <= 0) return '#64748B';
  if (pressure < PRESSURE_CONFIG.lowPressureThreshold) return '#EF4444';
  if (pressure < PRESSURE_CONFIG.minNormal) return '#F59E0B';
  if (pressure <= PRESSURE_CONFIG.maxNormal) return '#10B981';
  return '#3B82F6';
}

export function getPressureStatus(pressure: number): 'normal' | 'low' | 'critical' | 'offline' {
  if (pressure <= 0) return 'offline';
  if (pressure < PRESSURE_CONFIG.lowPressureThreshold) return 'critical';
  if (pressure < PRESSURE_CONFIG.minNormal) return 'low';
  return 'normal';
}

export function checkLowPressureRisk(
  valveId: string,
  nodes: PipeNode[],
  connections: PipeConnection[],
  valves: Map<string, ValveState>,
  leaks: Map<string, LeakState>,
  currentConnectivity: ConnectivityResult
): boolean {
  const testValves = new Map(valves);
  testValves.set(valveId, {
    nodeId: valveId,
    isOpen: false,
    operatedAt: Date.now(),
    operator: 'system',
  });

  const testAdjacency = buildAdjacencyList(nodes, connections, testValves);
  const testConnected = new Set<string>();
  const sourceNodes = nodes.filter((n) => n.type === 'source').map((n) => n.id);
  const queue: string[] = [...sourceNodes];
  sourceNodes.forEach((id) => testConnected.add(id));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = testAdjacency.get(current) ?? [];
    neighbors.forEach((n) => {
      if (!testConnected.has(n)) {
        testConnected.add(n);
        queue.push(n);
      }
    });
  }

  const stillConnected = Array.from(currentConnectivity.connectedNodes).filter(
    (id) => testConnected.has(id)
  );

  return stillConnected.length < currentConnectivity.connectedNodes.size * 0.3;
}
