import type { WalletNode, TransactionEdge, Anomaly, AuditTrail, Tag, Note, NetworkData } from '../types';

const generateId = (): string => Math.random().toString(36).substring(2, 15);

const generateAddress = (): string => '0x' + Math.random().toString(16).substring(2, 42);

const tagTemplates: Array<{ name: string; color: string; source: string }> = [
  { name: '交易所', color: '#00f5ff', source: 'Chainalysis' },
  { name: 'DeFi协议', color: '#9933ff', source: 'Dune Analytics' },
  { name: 'NFT市场', color: '#ff3366', source: 'Nansen' },
  { name: '鲸鱼地址', color: '#ffcc00', source: 'Arkham' },
  { name: '可疑地址', color: '#ff3366', source: '内部标记' },
  { name: '矿工', color: '#00ff88', source: 'Etherscan' },
];

const labelTemplates = [
  'Binance Hot Wallet', 'Coinbase', 'Uniswap V3', 'OpenSea', 
  'FTX Estate', 'Circle USDC', 'Tether Treasury', ' Arbitrum Foundation',
  'Optimism Foundation', 'MakerDAO', 'Aave V2', 'Compound Finance',
  'Curve Finance', 'SushiSwap', 'Lido Finance', 'Rocket Pool'
];

const generateTags = (count: number): Tag[] => {
  const shuffled = [...tagTemplates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(t => ({
    id: generateId(),
    ...t,
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
  }));
};

const generateNotes = (count: number): Note[] => {
  const noteContents = [
    '需要进一步确认来源',
    '已与交易记录核对',
    '标记为高风险地址',
    '疑似混币服务关联',
    '正常交易活动',
  ];
  return Array.from({ length: count }, () => ({
    id: generateId(),
    content: noteContents[Math.floor(Math.random() * noteContents.length)],
    author: '分析师' + Math.floor(Math.random() * 5),
    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
  }));
};

export const generateMockNetwork = (nodeCount: number = 50, edgeCount: number = 150): NetworkData => {
  const nodes: WalletNode[] = [];
  const edges: TransactionEdge[] = [];
  const now = Date.now();

  for (let i = 0; i < nodeCount; i++) {
    const isExchange = i < 5 || Math.random() < 0.1;
    const isSuspicious = !isExchange && Math.random() < 0.15;
    const statusRoll = Math.random();
    
    nodes.push({
      id: generateId(),
      address: generateAddress(),
      label: i < labelTemplates.length ? labelTemplates[i] : `Wallet ${i + 1}`,
      balance: Math.random() * 10000 + (isExchange ? 50000 : 0),
      txCount: Math.floor(Math.random() * 500) + (isExchange ? 1000 : 10),
      firstSeen: new Date(now - Math.random() * 365 * 24 * 60 * 60 * 1000),
      lastSeen: new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000),
      tags: generateTags(Math.floor(Math.random() * 3) + (isExchange ? 1 : 0)),
      notes: generateNotes(Math.floor(Math.random() * 3)),
      status: statusRoll < 0.6 ? 'untreated' : statusRoll < 0.85 ? 'corrected' : 'pending',
      isExchange,
      isSuspicious,
      importance: isExchange ? 0.9 : isSuspicious ? 0.7 : Math.random(),
    });
  }

  const nodeIds = nodes.map(n => n.id);
  const exchangeIds = nodes.filter(n => n.isExchange).map(n => n.id);
  const suspiciousIds = nodes.filter(n => n.isSuspicious).map(n => n.id);

  for (let i = 0; i < edgeCount; i++) {
    let source: string, target: string;
    
    if (i < edgeCount * 0.3 && exchangeIds.length > 0) {
      source = exchangeIds[Math.floor(Math.random() * exchangeIds.length)];
      target = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    } else if (i < edgeCount * 0.5 && suspiciousIds.length > 1) {
      source = suspiciousIds[Math.floor(Math.random() * suspiciousIds.length)];
      target = suspiciousIds[Math.floor(Math.random() * suspiciousIds.length)];
    } else {
      source = nodeIds[Math.floor(Math.random() * nodeIds.length)];
      target = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    }

    if (source === target) continue;

    edges.push({
      id: generateId(),
      source,
      target,
      amount: Math.random() * 500 + (nodes.find(n => n.id === source)?.isExchange ? 1000 : 0),
      token: 'ETH',
      timestamp: new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000),
      txHash: '0x' + Math.random().toString(16).substring(2, 66),
      blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
    });
  }

  const anomalies: Anomaly[] = detectAnomalies(nodes, edges);
  const auditTrails: AuditTrail[] = generateAuditTrails(nodes);

  return { nodes, edges, anomalies, auditTrails };
};

const detectAnomalies = (nodes: WalletNode[], edges: TransactionEdge[]): Anomaly[] => {
  const anomalies: Anomaly[] = [];

  const adjacencyList = new Map<string, string[]>();
  nodes.forEach(n => adjacencyList.set(n.id, []));
  edges.forEach(e => {
    adjacencyList.get(e.source)?.push(e.target);
  });

  const cycles = findCycles(adjacencyList);
  cycles.forEach((cycle, idx) => {
    anomalies.push({
      id: generateId(),
      type: 'cycle',
      description: `检测到 ${cycle.length} 个地址形成循环转账路径`,
      severity: cycle.length > 3 ? 'high' : 'medium',
      relatedEntities: cycle,
      resolved: false,
    });
  });

  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  nodes.forEach(n => {
    inDegree.set(n.id, 0);
    outDegree.set(n.id, 0);
  });
  edges.forEach(e => {
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    outDegree.set(e.source, (outDegree.get(e.source) || 0) + 1);
  });

  nodes.forEach(node => {
    const inD = inDegree.get(node.id) || 0;
    const outD = outDegree.get(node.id) || 0;
    if (!node.isExchange && inD > 15 && outD > 15 && Math.abs(inD - outD) < 5) {
      anomalies.push({
        id: generateId(),
        type: 'exchange_hub',
        description: `地址 ${node.label} 表现出交易所中转特征: 高吞吐量、平衡的流入流出`,
        severity: 'high',
        relatedEntities: [node.id],
        resolved: false,
      });
    }
  });

  nodes.forEach(node => {
    const sources = new Set(node.tags.map(t => t.source));
    if (sources.size > 1) {
      const tagNames = node.tags.map(t => t.name);
      const uniqueNames = new Set(tagNames);
      if (uniqueNames.size !== tagNames.length) {
        anomalies.push({
          id: generateId(),
          type: 'tag_conflict',
          description: `地址 ${node.label} 存在标签冲突，多个来源标记不一致`,
          severity: 'medium',
          relatedEntities: [node.id],
          resolved: false,
        });
      }
    }
  });

  return anomalies;
};

const findCycles = (adjacencyList: Map<string, string[]>): string[][] => {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  const dfs = (node: string) => {
    if (recursionStack.has(node)) {
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) {
        const cycle = path.slice(cycleStart);
        if (cycle.length >= 2 && cycle.length <= 5) {
          cycles.push([...cycle]);
        }
      }
      return;
    }

    if (visited.has(node)) return;

    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = adjacencyList.get(node) || [];
    for (const neighbor of neighbors) {
      dfs(neighbor);
    }

    path.pop();
    recursionStack.delete(node);
  };

  for (const node of adjacencyList.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles.slice(0, 5);
};

const generateAuditTrails = (nodes: WalletNode[]): AuditTrail[] => {
  const trails: AuditTrail[] = [];
  const now = Date.now();

  nodes.slice(0, 10).forEach(node => {
    trails.push({
      id: generateId(),
      entityId: node.id,
      action: 'update',
      field: 'status',
      oldValue: 'untreated',
      newValue: node.status,
      source: '人工审核',
      timestamp: new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000),
    });

    if (node.tags.length > 0) {
      trails.push({
        id: generateId(),
        entityId: node.id,
        action: 'create',
        field: 'tags',
        oldValue: null,
        newValue: node.tags[0].name,
        source: node.tags[0].source,
        timestamp: new Date(now - Math.random() * 14 * 24 * 60 * 60 * 1000),
      });
    }
  });

  return trails;
};
