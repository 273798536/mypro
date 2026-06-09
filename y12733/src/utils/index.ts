import { CondProbParam, DataStatus } from '@/types';

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeKey(condition: string, outcome: string): string {
  return `${condition.trim().toLowerCase()}::${outcome.trim().toLowerCase()}`;
}

export function calcProbability(jointCount: number, conditionCount: number): number {
  if (conditionCount <= 0) return 0;
  const p = jointCount / conditionCount;
  return Math.max(0, Math.min(1, Number(p.toFixed(4))));
}

export function formatPercent(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

export function generateExplanation(p: number, status: DataStatus, jointCount: number, conditionCount: number): string {
  const sampleNote = conditionCount < 50 ? '样本量偏少' : conditionCount >= 200 ? '数据量充足' : '样本量中等';
  if (p >= 0.7 && status === 'available') {
    return `该条件下结果出现概率较高（${formatPercent(p)}），${sampleNote}，可直接用于教学演示。`;
  }
  if (p >= 0.7 && status === 'pending') {
    return `概率偏高（${formatPercent(p)}），但状态标记为暂缓，建议复核样本代表性后再使用。`;
  }
  if (p < 0.3 && status === 'recollect') {
    return `概率极低（${formatPercent(p)}）且${sampleNote}，建议重新采集数据以避免误导。`;
  }
  if (p < 0.3) {
    return `该条件下结果较少出现（${formatPercent(p)}），${sampleNote}，讲解时应注明低概率特性。`;
  }
  if (status === 'pending') {
    return `概率处于中间区间（${formatPercent(p)}），${sampleNote}，建议复核后再使用。`;
  }
  if (status === 'recollect') {
    return `当前概率为 ${formatPercent(p)}，但数据质量存疑，需重新采集后再给出结论。`;
  }
  return `条件概率为 ${formatPercent(p)}，${sampleNote}，可结合上下文用于教学。`;
}

export function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (cells[i] ?? '').trim();
    });
    return obj;
  });
}

export function rowsToParams(rows: Array<Record<string, string>>): CondProbParam[] {
  const now = Date.now();
  return rows
    .filter((r) => r.condition && r.outcome)
    .map((r) => {
      const jointCount = Number(r.jointCount ?? r.joint_count ?? 0);
      const conditionCount = Number(r.conditionCount ?? r.condition_count ?? 0);
      const probability = calcProbability(jointCount, conditionCount);
      const status = (r.status as DataStatus) ?? 'pending';
      return {
        id: generateId(),
        condition: r.condition,
        outcome: r.outcome,
        jointCount,
        conditionCount,
        probability,
        status,
        reviewStatus: 'pending',
        explanation: generateExplanation(probability, status, jointCount, conditionCount),
        isBoundary: r.isBoundary === 'true' || probability < 0.05 || probability > 0.95,
        boundaryNote: r.boundaryNote,
        createdAt: now,
        updatedAt: now,
      };
    });
}
