import { Node, Wire, Anomaly, NodeStatus } from '../types';

export function checkConnectivity(nodes: Node[], wires: Wire[]): Set<string> {
  const poweredNodes = new Set<string>();
  const powerSources = nodes.filter(n => n.isPowerSource);

  if (powerSources.length === 0) return poweredNodes;

  const visited = new Set<string>();
  const queue: string[] = powerSources.map(p => p.id);

  powerSources.forEach(p => {
    visited.add(p.id);
    poweredNodes.add(p.id);
  });

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const connectedWires = wires.filter(
      w => w.active && (w.fromNodeId === currentId || w.toNodeId === currentId)
    );

    for (const wire of connectedWires) {
      const neighborId = wire.fromNodeId === currentId ? wire.toNodeId : wire.fromNodeId;
      if (!visited.has(neighborId)) {
        const neighborNode = nodes.find(n => n.id === neighborId);
        if (neighborNode && neighborNode.status !== 'blocked' && neighborNode.status !== 'fault') {
          visited.add(neighborId);
          poweredNodes.add(neighborId);
          queue.push(neighborId);
        }
      }
    }
  }

  return poweredNodes;
}

export function detectShortCircuit(nodes: Node[], wires: Wire[]): Anomaly | null {
  const powerSources = nodes.filter(n => n.isPowerSource);

  for (const source of powerSources) {
    const visited = new Map<string, string[]>();
    const queue: { nodeId: string; path: string[] }[] = [{ nodeId: source.id, path: [source.id] }];
    visited.set(source.id, [source.id]);

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;
      const connectedWires = wires.filter(
        w => w.active && (w.fromNodeId === nodeId || w.toNodeId === nodeId)
      );

      for (const wire of connectedWires) {
        const neighborId = wire.fromNodeId === nodeId ? wire.toNodeId : wire.fromNodeId;
        const neighborNode = nodes.find(n => n.id === neighborId);

        if (neighborNode?.isPowerSource && neighborId !== source.id) {
          return {
            id: `anomaly-${Date.now()}`,
            type: 'short_circuit',
            severity: 'critical',
            description: `检测到短路！电源${source.label}与电源${neighborNode.label}直接连通，无负载。`,
            stepNumber: 0,
            resolved: false,
            relatedNodeIds: [source.id, neighborId],
            relatedWireIds: [wire.id],
          };
        }

        if (!visited.has(neighborId)) {
          const newPath = [...path, neighborId];
          visited.set(neighborId, newPath);
          queue.push({ nodeId: neighborId, path: newPath });
        }
      }
    }
  }

  return null;
}

export function detectOverload(nodes: Node[], wires: Wire[]): Anomaly | null {
  const poweredNodes = checkConnectivity(nodes, wires);

  for (const node of nodes) {
    if (node.isPowerSource) {
      const suppliedNodes = new Set<string>();
      const visited = new Set<string>();
      const queue: string[] = [node.id];
      visited.add(node.id);

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const connectedWires = wires.filter(
          w => w.active && (w.fromNodeId === currentId || w.toNodeId === currentId)
        );

        for (const wire of connectedWires) {
          const neighborId = wire.fromNodeId === currentId ? wire.toNodeId : wire.fromNodeId;
          if (!visited.has(neighborId) && poweredNodes.has(neighborId)) {
            const neighborNode = nodes.find(n => n.id === neighborId);
            if (neighborNode && !neighborNode.isPowerSource) {
              visited.add(neighborId);
              suppliedNodes.add(neighborId);
              queue.push(neighborId);
            }
          }
        }
      }

      if (suppliedNodes.size > node.maxLoad) {
        return {
          id: `anomaly-${Date.now()}`,
          type: 'overload',
          severity: 'error',
          description: `负载过高！电源${node.label}供电节点数(${suppliedNodes.size})超过最大负载(${node.maxLoad})。`,
          stepNumber: 0,
          resolved: false,
          relatedNodeIds: [node.id, ...Array.from(suppliedNodes)],
          relatedWireIds: [],
        };
      }
    }
  }

  return null;
}

export function detectPathBlockage(nodes: Node[], wires: Wire[]): Anomaly | null {
  const adjacencyList = new Map<string, string[]>();

  for (const wire of wires) {
    if (!wire.active) continue;
    if (!adjacencyList.has(wire.fromNodeId)) {
      adjacencyList.set(wire.fromNodeId, []);
    }
    if (!adjacencyList.has(wire.toNodeId)) {
      adjacencyList.set(wire.toNodeId, []);
    }
    adjacencyList.get(wire.fromNodeId)!.push(wire.toNodeId);
    adjacencyList.get(wire.toNodeId)!.push(wire.fromNodeId);
  }

  for (const startNode of nodes) {
    const visited = new Map<string, string | null>();
    const stack: { nodeId: string; parentId: string | null }[] = [
      { nodeId: startNode.id, parentId: null },
    ];
    visited.set(startNode.id, null);

    while (stack.length > 0) {
      const { nodeId, parentId } = stack.pop()!;
      const neighbors = adjacencyList.get(nodeId) || [];

      for (const neighborId of neighbors) {
        if (neighborId === parentId) continue;

        if (visited.has(neighborId)) {
          const cycle: string[] = [neighborId];
          let current = nodeId;
          while (current !== neighborId && current !== null) {
            cycle.push(current);
            current = visited.get(current) || null;
          }
          cycle.push(neighborId);

          const cycleNodes = cycle.map(id => nodes.find(n => n.id === id)).filter(Boolean) as Node[];
          const hasPowerSource = cycleNodes.some(n => n.isPowerSource);

          if (!hasPowerSource && cycle.length >= 3) {
            const blockedWire = wires.find(
              w =>
                w.active &&
                ((w.fromNodeId === nodeId && w.toNodeId === neighborId) ||
                  (w.fromNodeId === neighborId && w.toNodeId === nodeId))
            );

            return {
              id: `anomaly-${Date.now()}`,
              type: 'path_blockage',
              severity: 'error',
              description: `路径堵塞！检测到闭环${cycle.join('→')}，无电源输入导致电力无法流通。`,
              stepNumber: 0,
              resolved: false,
              relatedNodeIds: cycle,
              relatedWireIds: blockedWire ? [blockedWire.id] : [],
            };
          }
        } else {
          visited.set(neighborId, nodeId);
          stack.push({ nodeId: neighborId, parentId: nodeId });
        }
      }
    }
  }

  return null;
}

export function calculatePowerFlow(nodes: Node[], wires: Wire[]): { nodes: Node[]; wires: Wire[] } {
  const poweredNodes = checkConnectivity(nodes, wires);

  const updatedNodes: Node[] = nodes.map(node => ({
    ...node,
    powered: poweredNodes.has(node.id),
    status: (node.status === 'blocked' ? 'blocked' : node.status) as NodeStatus,
  }));

  const updatedWires = wires.map(wire => {
    const fromPowered = poweredNodes.has(wire.fromNodeId);
    const toPowered = poweredNodes.has(wire.toNodeId);
    return {
      ...wire,
      hasCurrent: wire.active && fromPowered && toPowered,
    };
  });

  return { nodes: updatedNodes, wires: updatedWires };
}

export function checkWinCondition(nodes: Node[], wires: Wire[]): boolean {
  const poweredNodes = checkConnectivity(nodes, wires);
  const consumerNodes = nodes.filter(n => n.type === 'consumer');
  return consumerNodes.every(c => poweredNodes.has(c.id));
}

export function checkLoseCondition(anomalies: Anomaly[]): boolean {
  const criticalUnresolved = anomalies.filter(a => a.severity === 'critical' && !a.resolved);
  return criticalUnresolved.length > 0;
}
