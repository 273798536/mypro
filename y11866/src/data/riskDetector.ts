import type { WalletNode, TransferEdge, PendingItem, DenseCluster } from '@/types';

function groupBy<T, K extends keyof T>(arr: T[], key: K | ((item: T) => string)): Record<string, T[]> {
  return arr.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

function detectDenseClusters(
  nodes: WalletNode[],
  edges: TransferEdge[],
  threshold = 8
): DenseCluster[] {
  const clusters: DenseCluster[] = [];
  const visited = new Set<string>();

  const adjacency: Record<string, Set<string>> = {};
  nodes.forEach(n => { adjacency[n.id] = new Set(); });

  edges.forEach(e => {
    adjacency[e.source]?.add(e.target);
    adjacency[e.target]?.add(e.source);
  });

  function bfs(startId: string): DenseCluster {
    const queue = [startId];
    const nodeIds: string[] = [];
    const edgeIds: string[] = [];
    const localVisited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (localVisited.has(current)) continue;
      localVisited.add(current);
      visited.add(current);
      nodeIds.push(current);

      const neighbors = adjacency[current] || new Set();
      neighbors.forEach(neighbor => {
        if (!localVisited.has(neighbor)) {
          queue.push(neighbor);
        }
      });
    }

    edges.forEach(e => {
      if (localVisited.has(e.source) && localVisited.has(e.target)) {
        edgeIds.push(e.id);
      }
    });

    return { nodeIds, edgeIds };
  }

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const cluster = bfs(node.id);
      if (cluster.nodeIds.length >= threshold) {
        clusters.push(cluster);
      }
    }
  });

  return clusters;
}

export function detectPendingItems(
  nodes: WalletNode[],
  edges: TransferEdge[]
): PendingItem[] {
  const items: PendingItem[] = [];

  edges
    .filter(e => e.riskLevel === 'high' && e.isInternal === false)
    .forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      if (sourceNode?.isInternal && targetNode?.isInternal) {
        items.push({
          id: `internal_${edge.id}`,
          type: 'internal_mislabel',
          description: `内部转账 ${edge.id.slice(2, 10)} 被误标为高风险`,
          relatedNodeIds: [edge.source, edge.target],
          relatedEdgeIds: [edge.id],
        });
      }
    });

  const edgeGroups = groupBy(edges, e => `${e.source}-${e.target}-${Math.floor(e.amount / 100)}`);
  Object.entries(edgeGroups)
    .filter(([, group]) => group.length > 1 && group.some(e => e.isCrossChain))
    .forEach(([key, group]) => {
      items.push({
        id: `duplicate_${key}`,
        type: 'cross_chain_duplicate',
        description: `检测到 ${group.length} 笔跨链重复交易`,
        relatedNodeIds: [...new Set(group.flatMap(e => [e.source, e.target]))],
        relatedEdgeIds: group.map(e => e.id),
      });
    });

  const clusters = detectDenseClusters(nodes, edges, 8);
  clusters.forEach((cluster, idx) => {
    items.push({
      id: `dense_${idx}`,
      type: 'dense_cluster',
      description: `聚类包含 ${cluster.nodeIds.length} 个地址，连接过于密集`,
      relatedNodeIds: cluster.nodeIds,
      relatedEdgeIds: cluster.edgeIds,
    });
  });

  return items;
}

export function filterData(
  nodes: WalletNode[],
  edges: TransferEdge[],
  filters: {
    searchAddress: string;
    amountRange: [number, number];
    timeRange: [number, number];
    riskLevels: string[];
    chains: string[];
    showInternal: boolean;
    showCrossChain: boolean;
    minTxCount: number;
  }
): { filteredNodes: WalletNode[]; filteredEdges: TransferEdge[] } {
  let filteredEdges = edges.filter(edge => {
    if (edge.amount < filters.amountRange[0] || edge.amount > filters.amountRange[1]) return false;
    if (edge.timestamp < filters.timeRange[0] || edge.timestamp > filters.timeRange[1]) return false;
    if (!filters.riskLevels.includes(edge.riskLevel)) return false;
    if (!filters.chains.includes(edge.chain)) return false;
    if (!filters.showCrossChain && edge.isCrossChain) return false;
    return true;
  });

  const relatedNodeIds = new Set<string>();
  filteredEdges.forEach(e => {
    relatedNodeIds.add(e.source);
    relatedNodeIds.add(e.target);
  });

  let filteredNodes = nodes.filter(node => {
    if (!relatedNodeIds.has(node.id) && !filters.searchAddress) return false;
    if (filters.searchAddress) {
      const searchLower = filters.searchAddress.toLowerCase();
      const matchesSearch = node.id.toLowerCase().includes(searchLower) ||
        node.label.toLowerCase().includes(searchLower);
      if (!matchesSearch && !relatedNodeIds.has(node.id)) return false;
    }
    if (!filters.riskLevels.includes(node.riskLevel)) return false;
    if (!filters.chains.includes(node.chain)) return false;
    if (node.txCount < filters.minTxCount) return false;
    if (!filters.showInternal && node.isInternal) return false;
    return true;
  });

  const finalNodeIds = new Set(filteredNodes.map(n => n.id));
  filteredEdges = filteredEdges.filter(e =>
    finalNodeIds.has(e.source) && finalNodeIds.has(e.target)
  );

  return { filteredNodes, filteredEdges };
}
