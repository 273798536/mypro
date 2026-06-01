import { MemberStatus } from '../types';
import type {
  Member,
  TransitionMatrix,
  TransitionCell,
  MarkovPrediction,
  StatusJumpReview,
  Activity,
} from '../types';

const STATUS_LEVEL: Record<MemberStatus, number> = {
  [MemberStatus.new]: 0,
  [MemberStatus.active]: 1,
  [MemberStatus.reactivated]: 1,
  [MemberStatus.at_risk]: 2,
  [MemberStatus.silent]: 3,
  [MemberStatus.churned]: 4,
};

const STATUS_ORDER: MemberStatus[] = [
  MemberStatus.new,
  MemberStatus.active,
  MemberStatus.at_risk,
  MemberStatus.silent,
  MemberStatus.churned,
];

const STATUS_LABEL: Record<MemberStatus, string> = {
  [MemberStatus.new]: '新会员',
  [MemberStatus.active]: '活跃',
  [MemberStatus.reactivated]: '回流',
  [MemberStatus.at_risk]: '高危',
  [MemberStatus.silent]: '沉默',
  [MemberStatus.churned]: '流失',
};

function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7);
}

function isAbnormalJump(from: MemberStatus, to: MemberStatus): boolean {
  const fromLevel = STATUS_LEVEL[from];
  const toLevel = STATUS_LEVEL[to];
  return Math.abs(fromLevel - toLevel) >= 2;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function calculateTransitionMatrix(
  members: Member[],
  period: string
): TransitionMatrix {
  const transitionCounts: Map<string, { count: number; memberIds: string[] }> = new Map();
  const fromCounts: Map<MemberStatus, number> = new Map();

  for (const member of members) {
    const sortedHistory = [...member.statusHistory].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    for (let i = 0; i < sortedHistory.length - 1; i++) {
      const current = sortedHistory[i];
      const next = sortedHistory[i + 1];

      if (getMonthKey(next.startDate) !== period) continue;

      const key = `${current.status}->${next.status}`;
      const existing = transitionCounts.get(key) || { count: 0, memberIds: [] };
      existing.count++;
      existing.memberIds.push(member.id);
      transitionCounts.set(key, existing);

      fromCounts.set(current.status, (fromCounts.get(current.status) || 0) + 1);
    }
  }

  const cells: TransitionCell[] = [];

  for (const from of STATUS_ORDER) {
    for (const to of STATUS_ORDER) {
      const key = `${from}->${to}`;
      const data = transitionCounts.get(key) || { count: 0, memberIds: [] };
      const totalFrom = fromCounts.get(from) || 0;
      const probability = totalFrom > 0 ? data.count / totalFrom : 0;
      const abnormal = isAbnormalJump(from, to);

      cells.push({
        fromStatus: from,
        toStatus: to,
        count: data.count,
        probability,
        isAbnormal: abnormal && data.count > 0,
        abnormalReason: abnormal && data.count > 0 ? `跨${Math.abs(STATUS_LEVEL[from] - STATUS_LEVEL[to])}个状态跳转` : undefined,
        memberIds: data.memberIds,
      });
    }

    const reactivatedKey = `${from}->reactivated`;
    const reactivatedData = transitionCounts.get(reactivatedKey) || { count: 0, memberIds: [] };
    if (reactivatedData.count > 0) {
      const totalFrom = fromCounts.get(from) || 0;
      cells.push({
        fromStatus: from,
        toStatus: MemberStatus.reactivated,
        count: reactivatedData.count,
        probability: totalFrom > 0 ? reactivatedData.count / totalFrom : 0,
        isAbnormal: false,
        memberIds: reactivatedData.memberIds,
      });
    }
  }

  for (const to of STATUS_ORDER) {
    const reactivatedFromKey = `reactivated->${to}`;
    const reactivatedFromData = transitionCounts.get(reactivatedFromKey) || { count: 0, memberIds: [] };
    if (reactivatedFromData.count > 0) {
      const totalFrom = fromCounts.get(MemberStatus.reactivated) || 0;
      cells.push({
        fromStatus: MemberStatus.reactivated,
        toStatus: to,
        count: reactivatedFromData.count,
        probability: totalFrom > 0 ? reactivatedFromData.count / totalFrom : 0,
        isAbnormal: isAbnormalJump(MemberStatus.reactivated, to) && reactivatedFromData.count > 0,
        memberIds: reactivatedFromData.memberIds,
      });
    }
  }

  return {
    batchId: generateId(),
    period,
    cells,
    statusOrder: [...STATUS_ORDER, MemberStatus.reactivated],
  };
}

export function handleMissingMonths(
  matrix: TransitionMatrix,
  missingMonths: string[]
): TransitionMatrix & { interpolationImpact: Record<string, number> } {
  if (missingMonths.length === 0) {
    return { ...matrix, interpolationImpact: {} };
  }

  const impact: Record<string, number> = {};
  const adjustedCells = matrix.cells.map(cell => ({ ...cell }));

  const allStatuses = matrix.statusOrder;
  const baseMatrix = new Map<string, number>();

  for (const cell of matrix.cells) {
    baseMatrix.set(`${cell.fromStatus}->${cell.toStatus}`, cell.probability);
  }

  const step = 1 / (missingMonths.length + 1);

  for (const cell of adjustedCells) {
    const key = `${cell.fromStatus}->${cell.toStatus}`;
    const originalProb = cell.probability;

    if (cell.fromStatus === cell.toStatus) {
      const decrease = originalProb * step * missingMonths.length * 0.1;
      cell.probability = Math.max(0, originalProb - decrease);
      impact[key] = decrease;
    } else {
      const increase = originalProb * step * missingMonths.length * 0.05;
      cell.probability = Math.min(1, originalProb + increase);
      impact[key] = increase;
    }
  }

  for (const from of allStatuses) {
    let totalProb = 0;
    const rowCells = adjustedCells.filter(c => c.fromStatus === from);
    for (const cell of rowCells) {
      totalProb += cell.probability;
    }
    if (totalProb > 0 && Math.abs(totalProb - 1) > 0.001) {
      for (const cell of rowCells) {
        cell.probability = cell.probability / totalProb;
      }
    }
  }

  return {
    ...matrix,
    cells: adjustedCells,
    interpolationImpact: impact,
  };
}

export function predictStates(
  matrix: TransitionMatrix,
  initialDist: Record<MemberStatus, number>,
  horizon: number
): MarkovPrediction {
  const statuses = matrix.statusOrder.filter(s => s !== MemberStatus.reactivated);
  const n = statuses.length;

  const P: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const cell = matrix.cells.find(
        c => c.fromStatus === statuses[i] && c.toStatus === statuses[j]
      );
      P[i][j] = cell?.probability || 0;
    }
  }

  function matrixMultiply(A: number[][], B: number[][]): number[][] {
    const result: number[][] = Array(A.length).fill(null).map(() => Array(B[0].length).fill(0));
    for (let i = 0; i < A.length; i++) {
      for (let j = 0; j < B[0].length; j++) {
        for (let k = 0; k < B.length; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return result;
  }

  function matrixPower(mat: number[][], power: number): number[][] {
    let result: number[][] = Array(mat.length).fill(null).map((_, i) =>
      Array(mat.length).fill(0).map((_, j) => (i === j ? 1 : 0))
    );
    let base = mat;
    let p = power;
    while (p > 0) {
      if (p % 2 === 1) {
        result = matrixMultiply(result, base);
      }
      base = matrixMultiply(base, base);
      p = Math.floor(p / 2);
    }
    return result;
  }

  function vectorMultiply(v: number[], mat: number[][]): number[] {
    const result: number[] = Array(mat[0].length).fill(0);
    for (let j = 0; j < mat[0].length; j++) {
      for (let i = 0; i < v.length; i++) {
        result[j] += v[i] * mat[i][j];
      }
    }
    return result;
  }

  const V0 = statuses.map(s => initialDist[s] || 0);

  const probabilities: number[][] = [];
  for (let i = 0; i < n; i++) {
    probabilities[i] = [];
    for (let j = 0; j < n; j++) {
      const cell = matrix.cells.find(c => c.fromStatus === statuses[i] && c.toStatus === statuses[j]);
      if (cell && cell.count > 0) {
        probabilities[i].push(cell.probability);
      }
    }
  }

  const variance: number[] = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (probabilities[i].length > 1) {
      const mean = probabilities[i].reduce((a, b) => a + b, 0) / probabilities[i].length;
      variance[i] = probabilities[i].reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / probabilities[i].length;
    }
  }

  const predictions: MarkovPrediction['predictions'] = [];

  for (let month = 1; month <= horizon; month++) {
    const Pn = matrixPower(P, month);
    const Vn = vectorMultiply(V0, Pn);

    const distribution: Record<MemberStatus, number> = {} as Record<MemberStatus, number>;
    const lower: Record<MemberStatus, number> = {} as Record<MemberStatus, number>;
    const upper: Record<MemberStatus, number> = {} as Record<MemberStatus, number>;

    for (let i = 0; i < n; i++) {
      const status = statuses[i];
      const prob = Vn[i];
      const stdDev = Math.sqrt(variance[i]) * Math.sqrt(month);
      distribution[status] = prob;
      lower[status] = Math.max(0, prob - 1.96 * stdDev);
      upper[status] = Math.min(1, prob + 1.96 * stdDev);
    }

    predictions.push({
      month,
      distribution,
      confidenceInterval: { lower, upper },
    });
  }

  return {
    batchId: matrix.batchId,
    predictionDate: new Date().toISOString().split('T')[0],
    horizonMonths: horizon,
    initialDistribution: initialDist,
    transitionMatrix: P,
    predictions,
  };
}

export function detectAbnormalJumps(members: Member[]): StatusJumpReview[] {
  const reviews: StatusJumpReview[] = [];

  for (const member of members) {
    const sortedHistory = [...member.statusHistory].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    for (let i = 0; i < sortedHistory.length - 1; i++) {
      const current = sortedHistory[i];
      const next = sortedHistory[i + 1];

      if (isAbnormalJump(current.status, next.status)) {
        const evidence: string[] = [];

        if (current.activities && current.activities.length > 0) {
          evidence.push(...current.activities);
        }
        if (next.activities && next.activities.length > 0) {
          evidence.push(...next.activities);
        }

        const relatedNotes = member.customerServiceNotes.filter(
          note => {
            const noteDate = new Date(note.date);
            const jumpDate = new Date(next.startDate);
            const diffDays = Math.abs(noteDate.getTime() - jumpDate.getTime()) / (1000 * 60 * 60 * 24);
            return diffDays <= 30;
          }
        );
        evidence.push(...relatedNotes.map(n => n.id));

        const fromLabel = STATUS_LABEL[current.status];
        const toLabel = STATUS_LABEL[next.status];
        const jumpLevel = Math.abs(STATUS_LEVEL[current.status] - STATUS_LEVEL[next.status]);

        const review: StatusJumpReview = {
          id: generateId(),
          memberId: member.id,
          fromStatus: current.status,
          toStatus: next.status,
          jumpDate: next.startDate,
          isApproved: null,
          evidence,
          plainLanguageExplanation: `这位会员从${fromLabel}直接跳到${toLabel}，跨${jumpLevel}个状态，需要进一步核查原因`,
        };

        reviews.push(review);
      }
    }
  }

  return reviews;
}

export function calculateChurnProbability(
  member: Member,
  matrix: TransitionMatrix
): number {
  const currentStatus = member.currentStatus;

  if (currentStatus === MemberStatus.churned) {
    return 1;
  }

  const churnCell = matrix.cells.find(
    c => c.fromStatus === currentStatus && c.toStatus === MemberStatus.churned
  );

  if (churnCell) {
    return churnCell.probability;
  }

  const statusOrder = [MemberStatus.new, MemberStatus.active, MemberStatus.at_risk, MemberStatus.silent, MemberStatus.churned];
  const n = statusOrder.length;
  const P: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const cell = matrix.cells.find(
        c => c.fromStatus === statusOrder[i] && c.toStatus === statusOrder[j]
      );
      P[i][j] = cell?.probability || 0;
    }
  }

  const currentIdx = statusOrder.indexOf(currentStatus);
  if (currentIdx === -1) {
    return 0.5;
  }

  let totalProb = 0;
  let stepProb = P[currentIdx][n - 1];
  let absorbed = Array(n).fill(0);
  absorbed[currentIdx] = 1;

  for (let step = 1; step <= 12; step++) {
    totalProb += stepProb;

    const newAbsorbed = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        newAbsorbed[j] += absorbed[i] * P[i][j];
      }
    }
    absorbed = newAbsorbed;
    stepProb = absorbed[n - 1] - totalProb;

    if (stepProb < 0.001) break;
  }

  return Math.min(1, totalProb);
}

export function generatePlainLanguageExplanation(
  review: StatusJumpReview,
  member: Member,
  activities: Activity[]
): string {
  const fromLabel = STATUS_LABEL[review.fromStatus];
  const toLabel = STATUS_LABEL[review.toStatus];

  const reasons: string[] = [];
  const suggestions: string[] = [];

  const jumpDate = new Date(review.jumpDate);

  const relatedActivities = activities.filter(activity => {
    const start = new Date(activity.startDate);
    const end = new Date(activity.endDate);
    return jumpDate >= start && jumpDate <= end;
  });

  if (relatedActivities.length > 0) {
    const activityTypes = relatedActivities.map(a => {
      if (a.type === 'version_update') return `版本更新(${a.version})`;
      if (a.type === 'promotion') return '促销活动';
      if (a.type === 'event') return '事件活动';
      return '营销活动';
    });
    reasons.push(`期间发生了${activityTypes.join('、')}`);
  }

  const nearbyNotes = member.customerServiceNotes.filter(note => {
    const noteDate = new Date(note.date);
    const diffDays = Math.abs(noteDate.getTime() - jumpDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  });

  if (nearbyNotes.length > 0) {
    const complaintCount = nearbyNotes.filter(n => n.type === 'complaint').length;
    if (complaintCount > 0) {
      reasons.push(`近期有${complaintCount}次客服投诉记录`);
    } else {
      reasons.push(`近期有${nearbyNotes.length}次客服沟通记录`);
    }
  }

  if (member.tagConflict) {
    reasons.push('行为标签与系统标签存在冲突');
  }

  if (member.totalOrders === 0) {
    reasons.push('该会员从未产生订单');
  } else if (member.lastActiveDate) {
    const lastActive = new Date(member.lastActiveDate);
    const inactiveDays = (jumpDate.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
    if (inactiveDays > 30) {
      reasons.push(`跳转前已${Math.floor(inactiveDays)}天未活跃`);
    }
  }

  if (reasons.length === 0) {
    reasons.push('暂无明确行为数据支撑');
  }

  if (review.toStatus === MemberStatus.churned) {
    suggestions.push('分析流失原因，制定挽回策略');
    suggestions.push('核查是否存在系统误判');
  } else if (review.toStatus === MemberStatus.at_risk || review.toStatus === MemberStatus.silent) {
    suggestions.push('及时触达，了解用户需求');
    suggestions.push('匹配针对性的干预活动');
  } else if (review.toStatus === MemberStatus.active || review.toStatus === MemberStatus.reactivated) {
    suggestions.push('确认是否为异常数据');
    suggestions.push('分析正向跃迁的驱动因素');
  } else {
    suggestions.push('人工复核状态变更的准确性');
  }

  return `这位会员从${fromLabel}直接跳到${toLabel}，因为${reasons.join('，')}，建议${suggestions.join('、')}`;
}
