import { NetworkNode, NetworkEdge } from '../types';

interface PathResult {
  path: string[];
  edges: string[];
  length: number;
  riskScore: number;
}

export function findShortestPath(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  startId: string,
  endId: string
): PathResult | null {
  if (startId === endId) {
    return {
      path: [startId],
      edges: [],
      length: 0,
      riskScore: 0,
    };
  }

  const adjacencyMap = new Map<string, { target: string; edgeId: string }[]>();
  
  edges.forEach(edge => {
    if (!adjacencyMap.has(edge.source)) {
      adjacencyMap.set(edge.source, []);
    }
    if (!adjacencyMap.has(edge.target)) {
      adjacencyMap.set(edge.target, []);
    }
    adjacencyMap.get(edge.source)!.push({ target: edge.target, edgeId: edge.id });
    adjacencyMap.get(edge.target)!.push({ target: edge.source, edgeId: edge.id });
  });

  const visited = new Set<string>();
  const queue: { nodeId: string; path: string[]; edges: string[] }[] = [
    { nodeId: startId, path: [startId], edges: [] },
  ];

  while (queue.length > 0) {
    const { nodeId, path, edges: pathEdges } = queue.shift()!;
    
    if (nodeId === endId) {
      const riskScore = path.reduce((score, nodeId) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return score;
        const riskWeights = { low: 1, medium: 2, high: 4, critical: 8 };
        return score + riskWeights[node.riskLevel];
      }, 0);
      
      return {
        path,
        edges: pathEdges,
        length: path.length - 1,
        riskScore,
      };
    }

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const neighbors = adjacencyMap.get(nodeId) || [];
    neighbors.forEach(({ target, edgeId }) => {
      if (!visited.has(target)) {
        queue.push({
          nodeId: target,
          path: [...path, target],
          edges: [...pathEdges, edgeId],
        });
      }
    });
  }

  return null;
}

export function findAllPaths(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  startId: string,
  endId: string,
  maxDepth: number = 5
): PathResult[] {
  const results: PathResult[] = [];
  const adjacencyMap = new Map<string, { target: string; edgeId: string }[]>();
  
  edges.forEach(edge => {
    if (!adjacencyMap.has(edge.source)) {
      adjacencyMap.set(edge.source, []);
    }
    if (!adjacencyMap.has(edge.target)) {
      adjacencyMap.set(edge.target, []);
    }
    adjacencyMap.get(edge.source)!.push({ target: edge.target, edgeId: edge.id });
    adjacencyMap.get(edge.target)!.push({ target: edge.source, edgeId: edge.id });
  });

  function dfs(
    nodeId: string,
    currentPath: string[],
    currentEdges: string[],
    visited: Set<string>,
    depth: number
  ) {
    if (nodeId === endId && currentPath.length > 1) {
      const riskScore = currentPath.reduce((score, nId) => {
        const node = nodes.find(n => n.id === nId);
        if (!node) return score;
        const riskWeights = { low: 1, medium: 2, high: 4, critical: 8 };
        return score + riskWeights[node.riskLevel];
      }, 0);
      
      results.push({
        path: [...currentPath],
        edges: [...currentEdges],
        length: currentPath.length - 1,
        riskScore,
      });
      return;
    }

    if (depth >= maxDepth) return;

    const neighbors = adjacencyMap.get(nodeId) || [];
    neighbors.forEach(({ target, edgeId }) => {
      if (!visited.has(target)) {
        visited.add(target);
        currentPath.push(target);
        currentEdges.push(edgeId);
        dfs(target, currentPath, currentEdges, visited, depth + 1);
        currentEdges.pop();
        currentPath.pop();
        visited.delete(target);
      }
    });
  }

  const visited = new Set<string>([startId]);
  dfs(startId, [startId], [], visited, 0);

  return results.sort((a, b) => a.length - b.length || a.riskScore - b.riskScore);
}

export function expandNodeRelations(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  nodeId: string,
  depth: number = 1
): { nodes: string[]; edges: string[] } {
  const relatedNodes = new Set<string>([nodeId]);
  const relatedEdges = new Set<string>();
  const adjacencyMap = new Map<string, { target: string; edgeId: string }[]>();
  
  edges.forEach(edge => {
    if (!adjacencyMap.has(edge.source)) {
      adjacencyMap.set(edge.source, []);
    }
    if (!adjacencyMap.has(edge.target)) {
      adjacencyMap.set(edge.target, []);
    }
    adjacencyMap.get(edge.source)!.push({ target: edge.target, edgeId: edge.id });
    adjacencyMap.get(edge.target)!.push({ target: edge.source, edgeId: edge.id });
  });

  let currentLevel = [nodeId];
  for (let d = 0; d < depth; d++) {
    const nextLevel: string[] = [];
    currentLevel.forEach(currentId => {
      const neighbors = adjacencyMap.get(currentId) || [];
      neighbors.forEach(({ target, edgeId }) => {
        if (!relatedNodes.has(target)) {
          relatedNodes.add(target);
          relatedEdges.add(edgeId);
          nextLevel.push(target);
        }
      });
    });
    currentLevel = nextLevel;
  }

  return {
    nodes: Array.from(relatedNodes),
    edges: Array.from(relatedEdges),
  };
}
