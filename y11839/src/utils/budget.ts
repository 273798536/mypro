import type { BridgeMember, MaterialType, MATERIALS } from '../types';
import { calculateMemberLength } from './physics';

export function calculateMemberCost(
  member: BridgeMember,
  nodePositions: Record<string, { x: number; y: number }>,
  materials: Record<MaterialType, { unitCost: number }>
): number {
  const posA = nodePositions[member.nodeAId];
  const posB = nodePositions[member.nodeBId];
  if (!posA || !posB) return 0;

  const dx = posB.x - posA.x;
  const dy = posB.y - posA.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  return length * materials[member.materialType].unitCost;
}

export function calculateTotalBudgetUsed(
  members: BridgeMember[],
  nodePositions: Record<string, { x: number; y: number }>,
  materials: Record<MaterialType, { unitCost: number }>
): number {
  return members.reduce(
    (sum, m) => sum + calculateMemberCost(m, nodePositions, materials),
    0
  );
}

export function getBudgetStatus(
  used: number,
  total: number
): { percent: number; isOver: boolean; overAmount: number; label: string } {
  const percent = total > 0 ? (used / total) * 100 : 0;
  const isOver = used > total;
  const overAmount = Math.max(0, used - total);

  let label: string;
  if (percent <= 50) {
    label = '预算充裕';
  } else if (percent <= 80) {
    label = '预算紧张';
  } else if (percent <= 100) {
    label = '即将超支';
  } else {
    label = `已超支 ${overAmount.toFixed(0)} 单位`;
  }

  return { percent, isOver, overAmount, label };
}
