import type { RiskLevel } from '@/types';

export const COLORS = {
  background: '#0a1628',
  backgroundLight: '#0f1f35',
  panelBg: 'rgba(15, 31, 53, 0.85)',
  panelBorder: 'rgba(6, 182, 212, 0.3)',
  node: {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    pending: '#8b5cf6',
    selected: '#06b6d4',
    normal: '#3b82f6',
    relay: '#ec4899',
  },
  edge: {
    low: 'rgba(16, 185, 129, 0.6)',
    medium: 'rgba(245, 158, 11, 0.6)',
    high: 'rgba(239, 68, 68, 0.8)',
    pending: 'rgba(139, 92, 246, 0.7)',
    modified: 'rgba(6, 182, 212, 0.9)',
    default: 'rgba(100, 116, 139, 0.4)',
  },
  glow: {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    pending: '#8b5cf6',
    selected: '#06b6d4',
  },
  text: {
    primary: '#f1f5f9',
    secondary: '#94a3b8',
    muted: '#64748b',
  },
  chain: {
    ETH: '#627eea',
    BTC: '#f7931a',
    SOL: '#14f195',
    BSC: '#f0b90b',
    Polygon: '#8247e5',
  },
} as const;

export function getNodeColor(riskLevel: RiskLevel, isSelected: boolean, isHighlighted: boolean): string {
  if (isSelected) return COLORS.node.selected;
  if (isHighlighted) return COLORS.node.selected;
  return COLORS.node[riskLevel] || COLORS.node.normal;
}

export function getEdgeColor(riskLevel: RiskLevel, isModified: boolean, isSelected: boolean, isHighlighted: boolean): string {
  if (isSelected || isHighlighted) return COLORS.edge.modified;
  if (isModified) return COLORS.edge.modified;
  return COLORS.edge[riskLevel] || COLORS.edge.default;
}

export function getGlowColor(riskLevel: RiskLevel, isSelected: boolean, isHighlighted: boolean): string {
  if (isSelected || isHighlighted) return COLORS.glow.selected;
  return COLORS.glow[riskLevel] || COLORS.node.normal;
}

export function getEdgeWidth(amount: number): number {
  return Math.max(0.5, Math.min(8, Math.log10(amount + 1) * 0.8));
}

export function getNodeRadius(txCount: number): number {
  return Math.max(0.8, Math.min(4, Math.log10(txCount + 1) * 0.6));
}

export function getChainColor(chain: string): string {
  return COLORS.chain[chain as keyof typeof COLORS.chain] || COLORS.node.normal;
}

export function getRiskLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
    pending: '待确认',
  };
  return labels[level];
}

export function formatAddress(address: string, start = 6, end = 4): string {
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function formatAmount(amount: number): string {
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(2)}B`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)}M`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(2)}K`;
  return amount.toFixed(2);
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
