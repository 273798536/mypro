import type { BridgeNode, BridgeMember, MaterialType, MATERIALS } from '../types';

interface StiffnessResult {
  memberForces: Record<string, number>;
  nodeDisplacements: Record<string, { dx: number; dy: number }>;
  supportReactions: Record<string, { fx: number; fy: number }>;
  isSolvable: boolean;
  instabilityInfo: Record<string, string>;
}

function getNodeIndex(nodes: BridgeNode[], id: string): number {
  return nodes.findIndex((n) => n.id === id);
}

export function calculateMemberLength(nodeA: BridgeNode, nodeB: BridgeNode): number {
  const dx = nodeB.x - nodeA.x;
  const dy = nodeB.y - nodeA.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function solveTruss(
  nodes: BridgeNode[],
  members: BridgeMember[],
  materials: Record<MaterialType, { elasticModulus: number; allowableStress: number }>,
  externalLoads: Record<string, { fx: number; fy: number }> = {}
): StiffnessResult {
  const n = nodes.length;
  const dof = 2 * n;
  const freeDofs: number[] = [];
  const fixedDofs: number[] = [];

  for (let i = 0; i < n; i++) {
    const idxX = 2 * i;
    const idxY = 2 * i + 1;
    if (nodes[i].isFixed) {
      fixedDofs.push(idxX, idxY);
    } else {
      freeDofs.push(idxX, idxY);
    }
  }

  if (freeDofs.length === 0) {
    return {
      memberForces: {},
      nodeDisplacements: {},
      supportReactions: {},
      isSolvable: true,
      instabilityInfo: {},
    };
  }

  const K: number[][] = Array.from({ length: dof }, () => new Array(dof).fill(0));
  const F: number[] = new Array(dof).fill(0);

  for (const loadNodeId of Object.keys(externalLoads)) {
    const idx = getNodeIndex(nodes, loadNodeId);
    if (idx >= 0) {
      F[2 * idx] = externalLoads[loadNodeId].fx;
      F[2 * idx + 1] = externalLoads[loadNodeId].fy;
    }
  }

  const gravity = 0;
  for (let i = 0; i < n; i++) {
    if (!nodes[i].isFixed) {
      F[2 * i + 1] += gravity;
    }
  }

  for (const member of members) {
    const idxA = getNodeIndex(nodes, member.nodeAId);
    const idxB = getNodeIndex(nodes, member.nodeBId);
    if (idxA < 0 || idxB < 0) continue;

    const nodeA = nodes[idxA];
    const nodeB = nodes[idxB];
    const L = calculateMemberLength(nodeA, nodeB);
    if (L < 0.01) continue;

    const mat = materials[member.materialType];
    const E = mat.elasticModulus;
    const A = member.crossSection;
    const EA_L = (E * A) / L;

    const c = (nodeB.x - nodeA.x) / L;
    const s = (nodeB.y - nodeA.y) / L;

    const dofs = [2 * idxA, 2 * idxA + 1, 2 * idxB, 2 * idxB + 1];

    const ke = [
      [c * c, c * s, -c * c, -c * s],
      [c * s, s * s, -c * s, -s * s],
      [-c * c, -c * s, c * c, c * s],
      [-c * s, -s * s, c * s, s * s],
    ];

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        K[dofs[i]][dofs[j]] += EA_L * ke[i][j];
      }
    }
  }

  const freeSet = new Set(freeDofs);
  const fSize = freeDofs.length;
  const Kff: number[][] = Array.from({ length: fSize }, () => new Array(fSize).fill(0));
  const Ff: number[] = new Array(fSize).fill(0);

  for (let i = 0; i < fSize; i++) {
    Ff[i] = F[freeDofs[i]];
    for (let j = 0; j < fSize; j++) {
      Kff[i][j] = K[freeDofs[i]][freeDofs[j]];
    }
  }

  const uf = gaussianElimination(Kff, Ff);

  const instabilityInfo: Record<string, string> = {};
  const displacements: number[] = new Array(dof).fill(0);
  if (uf) {
    for (let i = 0; i < fSize; i++) {
      displacements[freeDofs[i]] = uf[i];
    }
  } else {
    for (const node of nodes) {
      if (!node.isFixed) {
        instabilityInfo[node.id] = '结构不稳定：缺少足够的约束，存在机构自由度，无法平衡外力';
      }
    }
  }

  const nodeDisplacements: Record<string, { dx: number; dy: number }> = {};
  for (let i = 0; i < n; i++) {
    nodeDisplacements[nodes[i].id] = {
      dx: displacements[2 * i],
      dy: displacements[2 * i + 1],
    };
  }

  const memberForces: Record<string, number> = {};
  for (const member of members) {
    const idxA = getNodeIndex(nodes, member.nodeAId);
    const idxB = getNodeIndex(nodes, member.nodeBId);
    if (idxA < 0 || idxB < 0) {
      memberForces[member.id] = 0;
      continue;
    }

    const nodeA = nodes[idxA];
    const nodeB = nodes[idxB];
    const L = calculateMemberLength(nodeA, nodeB);
    if (L < 0.01) {
      memberForces[member.id] = 0;
      continue;
    }

    const mat = materials[member.materialType];
    const E = mat.elasticModulus;
    const A = member.crossSection;
    const EA_L = (E * A) / L;

    const c = (nodeB.x - nodeA.x) / L;
    const s = (nodeB.y - nodeA.y) / L;

    const u1 = displacements[2 * idxA];
    const v1 = displacements[2 * idxA + 1];
    const u2 = displacements[2 * idxB];
    const v2 = displacements[2 * idxB + 1];

    const delta = -c * u1 - s * v1 + c * u2 + s * v2;
    const force = EA_L * delta;
    memberForces[member.id] = force;
  }

  const supportReactions: Record<string, { fx: number; fy: number }> = {};
  for (let i = 0; i < n; i++) {
    if (nodes[i].isFixed) {
      let fx = 0;
      let fy = 0;
      for (let j = 0; j < dof; j++) {
        fx += K[2 * i][j] * displacements[j];
        fy += K[2 * i + 1][j] * displacements[j];
      }
      fx -= F[2 * i];
      fy -= F[2 * i + 1];
      supportReactions[nodes[i].id] = { fx: -fx, fy: -fy };
    }
  }

  const isSolvable = uf !== null;

  return {
    memberForces,
    nodeDisplacements,
    supportReactions,
    isSolvable,
    instabilityInfo,
  };
}

function gaussianElimination(
  A: number[][],
  b: number[]
): number[] | null {
  const n = b.length;
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }

    if (maxVal < 1e-10) {
      if (Math.abs(aug[col][n]) > 1e-10) {
        return null;
      }
      continue;
    }

    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    const pivot = aug[col][col];
    for (let j = col; j <= n; j++) {
      aug[col][j] /= pivot;
    }

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  const x: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (Math.abs(aug[i][i]) < 1e-10) {
      x[i] = 0;
    } else {
      x[i] = aug[i][n] / aug[i][i];
    }
  }

  return x;
}

export function computeStressRatio(
  force: number,
  crossSection: number,
  allowableStress: number
): number {
  if (crossSection <= 0) return 0;
  return Math.abs(force) / (crossSection * allowableStress);
}

export function getOverloadReason(
  force: number,
  stressRatio: number,
  crossSection: number,
  allowableStress: number
): string | undefined {
  if (stressRatio <= 1.0) return undefined;

  const actualStress = Math.abs(force) / crossSection;
  const overloadPercent = ((stressRatio - 1) * 100).toFixed(1);

  if (force > 0) {
    return (
      `拉力过载：杆件承受 ${Math.abs(force).toFixed(1)} kN 拉力，` +
      `实际应力 ${actualStress.toFixed(2)} kN/cm² 超出许用应力 ${allowableStress} kN/cm²，` +
      `超出 ${overloadPercent}%。` +
      `原因：杆件截面积 ${crossSection} cm² 不足以抵抗拉伸载荷，` +
      `可增大截面积或更换高强度材料。`
    );
  } else if (force < 0) {
    const slendernessNote =
      crossSection < 3
        ? '细长杆件在受压时容易发生屈曲失稳，建议增大截面积或添加侧向支撑。'
        : '受压杆件可能发生屈曲，建议检查杆件长细比并考虑增加中间支撑。';
    return (
      `压力过载：杆件承受 ${Math.abs(force).toFixed(1)} kN 压力，` +
      `实际应力 ${actualStress.toFixed(2)} kN/cm² 超出许用应力 ${allowableStress} kN/cm²，` +
      `超出 ${overloadPercent}%。` +
      `原因：${slendernessNote}`
    );
  }

  return undefined;
}

export function checkSupportStability(
  nodeId: string,
  reaction: { fx: number; fy: number },
  nodeType: string
): { isStable: boolean; reason?: string } {
  if (nodeType !== 'support') return { isStable: true };

  const fy = reaction.fy;
  if (fy < 0) {
    return {
      isStable: false,
      reason: `支点受到向上的拉力 ${Math.abs(fy).toFixed(1)} kN，但支点只能提供向下的支撑反力，` +
        `说明该支点已被"掀离"地面。原因：桥梁整体受力不平衡，` +
        `可能一侧载荷过大导致另一侧支点脱空。建议调整杆件布置使支点始终受压。`,
    };
  }

  const fx = Math.abs(reaction.fx);
  const frictionCapacity = fy * 0.5;
  if (fx > frictionCapacity && fx > 5) {
    return {
      isStable: false,
      reason: `支点水平反力 ${fx.toFixed(1)} kN 超出摩擦力极限 ${frictionCapacity.toFixed(1)} kN，` +
        `支点可能发生水平滑动。原因：桥梁受到较大水平推力，` +
        `建议增设斜撑杆件将水平力传递到其他支点。`,
    };
  }

  return { isStable: true };
}

export function getStressColor(ratio: number): string {
  if (ratio <= 0.5) return '#2ECC71';
  if (ratio <= 0.8) return '#F1C40F';
  if (ratio <= 1.0) return '#E87722';
  return '#E74C3C';
}

export function getStressLabel(ratio: number): string {
  if (ratio <= 0.5) return '安全';
  if (ratio <= 0.8) return '正常';
  if (ratio <= 1.0) return '临界';
  return '过载';
}
