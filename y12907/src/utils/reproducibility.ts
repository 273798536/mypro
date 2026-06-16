// 可复现性管理器 - 确保分析结果可复现，避免"晚到半天"问题

import { ReproducibilitySnapshot, ProcessingRecord, PromptVersion } from '../types';
import { getRuleVersions } from '../data/securityRules';

// 带种子的随机数生成器
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // 线性同余生成器，保证相同种子生成相同序列
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(): number {
    return this.next();
  }

  pick<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }
}

// 可复现性管理器
export class ReproducibilityManager {
  private currentSeed: number;
  private snapshots: Map<string, ReproducibilitySnapshot>;

  constructor() {
    this.currentSeed = Date.now();
    this.snapshots = new Map();
  }

  // 生成唯一运行ID
  generateRunId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 8);
    return `RUN-${timestamp}-${random}`;
  }

  // 获取当前种子
  getCurrentSeed(): number {
    return this.currentSeed;
  }

  // 设置种子（用于复现）
  setSeed(seed: number): void {
    this.currentSeed = seed;
  }

  // 创建带种子的随机数生成器
  createSeededRandom(seed?: number): SeededRandom {
    return new SeededRandom(seed ?? this.currentSeed);
  }

  // 保存运行配置快照
  saveRunSnapshot(
    _recordId: string,
    promptVersion: PromptVersion,
    analysisConfig: ProcessingRecord['analysisConfig'],
    sampleCount: number
  ): ReproducibilitySnapshot {
    const runId = this.generateRunId();
    const snapshot: ReproducibilitySnapshot = {
      runId,
      seed: this.currentSeed,
      timestamp: new Date().toISOString(),
      analysisConfig: JSON.parse(JSON.stringify(analysisConfig)),
      ruleVersions: getRuleVersions(),
      promptVersion: JSON.parse(JSON.stringify(promptVersion)),
      sampleCount
    };

    this.snapshots.set(runId, snapshot);
    return snapshot;
  }

  // 根据运行ID获取快照
  getSnapshotByRunId(runId: string): ReproducibilitySnapshot | undefined {
    return this.snapshots.get(runId);
  }

  // 获取所有快照
  getAllSnapshots(): ReproducibilitySnapshot[] {
    return Array.from(this.snapshots.values());
  }

  // 根据运行ID复现分析（返回需要的配置）
  reproduceByRunId(runId: string): {
    seed: number;
    analysisConfig: ProcessingRecord['analysisConfig'];
    promptVersion: PromptVersion;
  } | null {
    const snapshot = this.snapshots.get(runId);
    if (!snapshot) {
      return null;
    }

    // 检查规则版本是否一致
    const currentRuleVersions = getRuleVersions();
    const hasRuleChanged = snapshot.ruleVersions.some(oldVersion => {
      const current = currentRuleVersions.find(c => c.ruleId === oldVersion.ruleId);
      return !current || current.version !== oldVersion.version;
    });

    if (hasRuleChanged) {
      console.warn('警告：安全规则版本已变更，复现结果可能与原始结果有差异');
    }

    return {
      seed: snapshot.seed,
      analysisConfig: snapshot.analysisConfig,
      promptVersion: snapshot.promptVersion
    };
  }

  // 生成可复现性验证字符串
  generateVerificationString(snapshot: ReproducibilitySnapshot): string {
    return [
      `运行ID: ${snapshot.runId}`,
      `随机种子: ${snapshot.seed}`,
      `分析时间: ${snapshot.timestamp}`,
      `提示词版本: ${snapshot.promptVersion.versionNumber}`,
      `规则版本: ${snapshot.ruleVersions.map(r => `${r.ruleId}v${r.version}`).join(', ')}`,
      `样本数量: ${snapshot.sampleCount}`,
      `检测阈值: ${snapshot.analysisConfig.detectionThreshold}`
    ].join(' | ');
  }

  // 检查两个运行是否使用相同配置
  isSameConfig(runId1: string, runId2: string): boolean {
    const s1 = this.snapshots.get(runId1);
    const s2 = this.snapshots.get(runId2);

    if (!s1 || !s2) return false;

    return (
      s1.seed === s2.seed &&
      s1.analysisConfig.detectionThreshold === s2.analysisConfig.detectionThreshold &&
      JSON.stringify(s1.ruleVersions) === JSON.stringify(s2.ruleVersions) &&
      s1.promptVersion.versionId === s2.promptVersion.versionId
    );
  }
}

// 全局单例
export const reproducibilityManager = new ReproducibilityManager();

// 便捷函数
export const generateRunId = () => reproducibilityManager.generateRunId();
export const saveSnapshot = (
  recordId: string,
  promptVersion: PromptVersion,
  analysisConfig: ProcessingRecord['analysisConfig'],
  sampleCount: number
) => reproducibilityManager.saveRunSnapshot(recordId, promptVersion, analysisConfig, sampleCount);
export const reproduceByRunId = (runId: string) => reproducibilityManager.reproduceByRunId(runId);
