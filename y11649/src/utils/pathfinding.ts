import type { SlopeNode } from '@/types';

export const findShortestPath = (
  nodes: SlopeNode[],
  startId: string,
  endId: string
): string[] | null => {
  const nodeMap = new Map<string, SlopeNode>();
  nodes.forEach(node => nodeMap.set(node.id, node));

  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  nodes.forEach(node => {
    distances.set(node.id, Infinity);
    previous.set(node.id, null);
    unvisited.add(node.id);
  });

  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let current: string | null = null;
    let minDist = Infinity;

    for (const nodeId of unvisited) {
      const dist = distances.get(nodeId) || Infinity;
      if (dist < minDist) {
        minDist = dist;
        current = nodeId;
      }
    }

    if (current === null || current === endId) break;
    unvisited.delete(current);

    const currentNode = nodeMap.get(current);
    if (!currentNode || !currentNode.isOpen) continue;

    for (const neighborId of currentNode.connectedTo) {
      if (!unvisited.has(neighborId)) continue;

      const neighbor = nodeMap.get(neighborId);
      if (!neighbor || !neighbor.isOpen) continue;

      const alt = (distances.get(current) || 0) + 1;
      if (alt < (distances.get(neighborId) || Infinity)) {
        distances.set(neighborId, alt);
        previous.set(neighborId, current);
      }
    }
  }

  const path: string[] = [];
  let current: string | null = endId;

  while (current !== null) {
    path.unshift(current);
    current = previous.get(current) || null;
  }

  return path.length > 0 && path[0] === startId ? path : null;
};

export const calculateTravelTime = (
  nodes: SlopeNode[],
  path: string[],
  weatherModifier: number = 1
): number => {
  if (path.length < 2) return 0;

  let totalTime = 0;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  for (let i = 1; i < path.length; i++) {
    const node = nodeMap.get(path[i]);
    if (!node) continue;

    const difficultyMultiplier = {
      green: 1,
      blue: 1.5,
      black: 2,
      'double-black': 3,
    }[node.difficulty] || 1;

    totalTime += 5 * difficultyMultiplier;
  }

  return Math.ceil(totalTime / weatherModifier);
};

export const isPathOpen = (nodes: SlopeNode[], path: string[]): boolean => {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  return path.every(nodeId => {
    const node = nodeMap.get(nodeId);
    return node?.isOpen ?? false;
  });
};
