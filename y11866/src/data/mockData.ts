import type { WalletNode, TransferEdge, ChainType, RiskLevel, NodeType } from '@/types';
import { generateRandomPosition } from '@/utils/forceLayout';

const CHAINS: ChainType[] = ['ETH', 'BTC', 'SOL', 'BSC', 'Polygon'];
const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high', 'pending'];
const NODE_TYPES: NodeType[] = ['normal', 'relay', 'risk'];
const TOKENS = ['ETH', 'BTC', 'SOL', 'USDT', 'USDC', 'BNB'];

const ADDRESS_LABELS = [
  'Binance Hot Wallet',
  'Coinbase Deposit',
  'Tornado Cash Mixer',
  'Huobi Exchange',
  'Kucoin Exchange',
  'OKX Withdrawal',
  'Bybit Deposit',
  'Gate.io Wallet',
  'MEXC Exchange',
  'Bitget Hot',
  'Uniswap V3 Router',
  'SushiSwap Router',
  'PancakeSwap Router',
  'Raydium AMM',
  'Curve Fi Pool',
  'AAVE V2 Lending',
  'Compound Protocol',
  'MakerDAO Vault',
  'Lido Staking',
  'Rocket Pool',
];

function generateAddress(): string {
  const chars = '0123456789abcdef';
  let addr = '0x';
  for (let i = 0; i < 40; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr;
}

function generateTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

function weightedRandom<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function generateMockData(nodeCount = 80, edgeCount = 200): {
  nodes: WalletNode[];
  edges: TransferEdge[];
} {
  const now = Math.floor(Date.now() / 1000);
  const oneWeekAgo = now - 7 * 24 * 60 * 60;

  const nodes: WalletNode[] = [];
  const edges: TransferEdge[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const pos = generateRandomPosition();
    const type = weightedRandom<NodeType>(NODE_TYPES, [60, 25, 15]);
    const riskLevel = type === 'risk'
      ? weightedRandom<RiskLevel>(['high', 'medium', 'pending'], [50, 30, 20])
      : type === 'relay'
        ? weightedRandom<RiskLevel>(['medium', 'low', 'pending'], [40, 40, 20])
        : weightedRandom<RiskLevel>(['low', 'medium', 'pending'], [70, 20, 10]);

    const isInternal = Math.random() < 0.15;

    nodes.push({
      id: generateAddress(),
      label: i < ADDRESS_LABELS.length ? ADDRESS_LABELS[i] : `Wallet ${i + 1}`,
      chain: CHAINS[Math.floor(Math.random() * CHAINS.length)],
      txCount: Math.floor(Math.random() * 200) + 5,
      totalAmount: Math.random() * 10000000 + 1000,
      riskLevel,
      type,
      isInternal,
      clusterId: Math.floor(i / 8),
      x: pos.x,
      y: pos.y,
      z: pos.z,
      vx: 0,
      vy: 0,
      vz: 0,
    });
  }

  const existingEdges = new Set<string>();

  for (let i = 0; i < edgeCount; i++) {
    let sourceIdx: number;
    let targetIdx: number;
    let edgeKey: string;

    do {
      sourceIdx = Math.floor(Math.random() * nodes.length);
      targetIdx = Math.floor(Math.random() * nodes.length);
      edgeKey = `${sourceIdx}-${targetIdx}`;
    } while (sourceIdx === targetIdx || existingEdges.has(edgeKey));

    existingEdges.add(edgeKey);
    existingEdges.add(`${targetIdx}-${sourceIdx}`);

    const source = nodes[sourceIdx];
    const target = nodes[targetIdx];
    const isCrossChain = source.chain !== target.chain && Math.random() < 0.3;
    const isDuplicate = Math.random() < 0.08;

    const edgeRisk: RiskLevel = source.riskLevel === 'high' || target.riskLevel === 'high'
      ? 'high'
      : source.riskLevel === 'medium' || target.riskLevel === 'medium'
        ? 'medium'
        : Math.random() < 0.1 ? 'pending' : 'low';

    const isInternalMislabel = source.isInternal && target.isInternal && edgeRisk === 'high' && Math.random() < 0.3;
    const isInternalEdge = source.isInternal && target.isInternal;

    edges.push({
      id: generateTxHash(),
      source: source.id,
      target: target.id,
      amount: Math.random() * 500000 + 100,
      token: TOKENS[Math.floor(Math.random() * TOKENS.length)],
      timestamp: Math.floor(Math.random() * (now - oneWeekAgo)) + oneWeekAgo,
      chain: isCrossChain ? source.chain : source.chain,
      isCrossChain,
      isDuplicate,
      isInternal: isInternalEdge,
      riskLevel: isInternalMislabel ? 'high' : edgeRisk,
      notes: isInternalMislabel ? '疑似内部转账误标' : undefined,
    });
  }

  nodes.forEach(node => {
    const nodeEdges = edges.filter(e => e.source === node.id || e.target === node.id);
    node.txCount = nodeEdges.length;
    node.totalAmount = nodeEdges.reduce((sum, e) => sum + e.amount, 0);
  });

  return { nodes, edges };
}

export const DEFAULT_FILTERS = {
  searchAddress: '',
  amountRange: [0, 10000000] as [number, number],
  timeRange: [Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60, Math.floor(Date.now() / 1000)] as [number, number],
  riskLevels: ['low', 'medium', 'high', 'pending'] as RiskLevel[],
  chains: ['ETH', 'BTC', 'SOL', 'BSC', 'Polygon'] as ChainType[],
  showInternal: true,
  showCrossChain: true,
  minTxCount: 0,
};
