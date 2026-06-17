import type { CorrectionLog } from '../types';

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed = (this.seed + 0x6D2B79F5) >>> 0;
    let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }
}

const REASONS = [
  '人工复核后修正分数',
  '图像质量问题调整',
  '标签错误修正',
  '边界样本重新判定',
  '模型误判修正',
  'OCR识别不准确修正',
  '特征匹配错误修正',
  '上下文信息补充后调整',
  '专家组评审一致意见',
  '质检抽检发现偏差',
];

const OPERATORS = ['张工', '李工', '王工', '赵工', '陈工', '刘工', '周工', '吴工'];

export function generateMockCorrectionLogs(seed: number = 2026): CorrectionLog[] {
  const rng = new SeededRandom(seed);
  const logs: CorrectionLog[] = [];
  const total = 50;

  for (let i = 0; i < total; i++) {
    const sampleIndex = rng.nextInt(0, 499);
    const sampleId = `smp_${String(sampleIndex + 1).padStart(5, '0')}`;

    let oldScore = Math.round(rng.nextFloat(20, 98) * 10) / 10;
    const delta = rng.nextFloat(-25, 25);
    let newScore = Math.round((oldScore + delta) * 10) / 10;
    newScore = Math.max(0, Math.min(100, newScore));
    oldScore = Math.round(oldScore * 10) / 10;

    const daysAgo = rng.nextInt(0, 30);
    const hoursAgo = rng.nextInt(0, 23);
    const minutesAgo = rng.nextInt(0, 59);
    const date = new Date(2026, 5, 16, 18, 0, 0);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(date.getHours() - hoursAgo);
    date.setMinutes(date.getMinutes() - minutesAgo);

    logs.push({
      id: `log_${String(i + 1).padStart(5, '0')}`,
      sampleId,
      oldScore,
      newScore,
      reason: rng.pick(REASONS),
      operator: rng.pick(OPERATORS),
      timestamp: date.toISOString(),
    });
  }

  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  for (let i = 0; i < logs.length; i++) {
    logs[i].id = `log_${String(i + 1).padStart(5, '0')}`;
  }

  return logs;
}

export const mockCorrectionLogs: CorrectionLog[] = generateMockCorrectionLogs();

export default mockCorrectionLogs;
