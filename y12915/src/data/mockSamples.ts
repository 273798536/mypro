import type { EvaluationSample, ConfidenceLevel, ReviewStatus, DataSource, ImageType } from '../types';
import { mockVersions } from './mockVersions';

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

const SOURCE_FILES = [
  'batch_2026Q2_01.csv',
  'batch_2026Q2_02.csv',
  'batch_2026Q2_03.csv',
  'batch_2026Q2_04.csv',
];

const DATA_SOURCES: DataSource[] = ['batch_a', 'batch_b', 'batch_c', 'random'];
const IMAGE_TYPES: ImageType[] = ['product', 'document', 'screenshot', 'other'];
const CORRECTION_REASONS = [
  '人工复核后修正分数',
  '图像质量问题调整',
  '标签错误修正',
  '边界样本重新判定',
  '模型误判修正',
];
const OPERATORS = ['张工', '李工', '王工', '赵工', '陈工'];
const SOURCE_NOTES = [
  '来自质检抽检批次',
  '随机抽样验证',
  '新增品类测试集',
  '边界情况样本',
  '常规生产批次',
];

type Quadrant = 'high_score_high_ci' | 'high_score_low_ci' | 'low_score_high_ci' | 'low_score_low_ci';

function assignQuadrant(rng: SeededRandom): Quadrant {
  const r = rng.next();
  if (r < 0.35) return 'high_score_high_ci';
  if (r < 0.55) return 'high_score_low_ci';
  if (r < 0.80) return 'low_score_high_ci';
  return 'low_score_low_ci';
}

function generateScore(rng: SeededRandom, quadrant: Quadrant): number {
  switch (quadrant) {
    case 'high_score_high_ci':
    case 'high_score_low_ci':
      return Math.round(rng.nextFloat(86, 98) * 10) / 10;
    case 'low_score_high_ci':
    case 'low_score_low_ci':
      return Math.round(rng.nextFloat(20, 59) * 10) / 10;
  }
}

function generateConfidenceLevel(rng: SeededRandom, quadrant: Quadrant): ConfidenceLevel {
  switch (quadrant) {
    case 'high_score_high_ci':
    case 'low_score_high_ci':
      return rng.next() < 0.85 ? 'high' : 'medium';
    case 'high_score_low_ci':
    case 'low_score_low_ci':
      return rng.next() < 0.7 ? 'low' : 'medium';
  }
}

function generateReviewStatus(quadrant: Quadrant): ReviewStatus {
  switch (quadrant) {
    case 'high_score_high_ci':
      return 'direct_use';
    case 'high_score_low_ci':
      return 'need_review';
    case 'low_score_high_ci':
      return 'rejected';
    case 'low_score_low_ci':
      return 'pending';
  }
}

function assignModelVersionId(rng: SeededRandom): string {
  const r = rng.next();
  if (r < 0.75) return 'v2.3.1';
  if (r < 0.88) return 'v2.1';
  if (r < 0.96) return 'v2';
  return 'v1';
}

export function generateMockSamples(seed: number = 42): EvaluationSample[] {
  const rng = new SeededRandom(seed);
  const samples: EvaluationSample[] = [];
  const total = 500;

  for (let i = 0; i < total; i++) {
    const originalRowNumber = i + 1;
    const quadrant = assignQuadrant(rng);
    const modelScore = generateScore(rng, quadrant);
    const confidenceLevel = generateConfidenceLevel(rng, quadrant);
    const reviewStatus = generateReviewStatus(quadrant);
    const modelVersionId = assignModelVersionId(rng);

    const hasImage = rng.next() < 0.30;
    const hasCorrection = rng.next() < 0.15;

    const sample: EvaluationSample = {
      id: `smp_${String(i + 1).padStart(5, '0')}`,
      originalRowNumber,
      sourceFileName: SOURCE_FILES[i % SOURCE_FILES.length],
      modelVersionId,
      modelScore,
      confidenceLevel,
      reviewStatus,
      batchId: `batch_${String(Math.floor(i / 50) + 1).padStart(3, '0')}`,
      dataSource: DATA_SOURCES[i % DATA_SOURCES.length],
    };

    if (hasImage) {
      const imgSeed = `img_${i}_${seed}`;
      sample.imageName = `image_${String(i + 1).padStart(5, '0')}.jpg`;
      sample.imageUrl = `https://picsum.photos/seed/${imgSeed}/400/300`;
      sample.imageType = rng.pick(IMAGE_TYPES);
    }

    if (hasCorrection) {
      const delta = rng.nextFloat(-20, 20);
      let corrected = modelScore + delta;
      corrected = Math.max(0, Math.min(100, corrected));
      sample.humanCorrectedScore = Math.round(corrected * 10) / 10;
      sample.correctionReason = rng.pick(CORRECTION_REASONS);
      sample.correctedBy = rng.pick(OPERATORS);
      const daysAgo = rng.nextInt(0, 14);
      const hoursAgo = rng.nextInt(0, 23);
      const date = new Date(2026, 5, 16);
      date.setDate(date.getDate() - daysAgo);
      date.setHours(date.getHours() - hoursAgo);
      sample.correctedAt = date.toISOString();
    }

    if (rng.next() < 0.2) {
      sample.sourceNote = rng.pick(SOURCE_NOTES);
    }

    samples.push(sample);
  }

  return samples;
}

export default generateMockSamples;
