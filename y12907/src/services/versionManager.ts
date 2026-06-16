// 版本管理服务 - 管理提示词版本，避免"晚到半天"问题

import { PromptVersion, Sample, LabelConflict } from '../types';
import { generatePromptVersions } from './sampleGenerator';

// 版本管理服务
export class VersionManager {
  private versions: Map<string, PromptVersion>;
  private versionSamples: Map<string, Sample[]>;
  private currentVersionId: string | null;

  constructor() {
    this.versions = new Map();
    this.versionSamples = new Map();
    this.currentVersionId = null;

    // 初始化预设的版本数据（模拟真实场景）
    this.initializeDefaultVersions();
  }

  // 初始化默认版本（模拟晚到半天的场景）
  private initializeDefaultVersions(): void {
    const defaultVersions = generatePromptVersions();
    defaultVersions.forEach(version => {
      this.versions.set(version.versionId, version);
    });

    // 默认使用最新版本
    if (defaultVersions.length > 0) {
      this.currentVersionId = defaultVersions[defaultVersions.length - 1].versionId;
    }
  }

  // 获取所有版本
  getAllVersions(): PromptVersion[] {
    return Array.from(this.versions.values()).sort(
      (a, b) => new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime()
    );
  }

  // 获取版本
  getVersion(versionId: string): PromptVersion | undefined {
    return this.versions.get(versionId);
  }

  // 获取当前版本
  getCurrentVersion(): PromptVersion | null {
    if (!this.currentVersionId) return null;
    return this.versions.get(this.currentVersionId) || null;
  }

  // 设置当前版本
  setCurrentVersion(versionId: string): boolean {
    if (this.versions.has(versionId)) {
      this.currentVersionId = versionId;
      return true;
    }
    return false;
  }

  // 添加新版本
  addVersion(version: Omit<PromptVersion, 'versionId'>): PromptVersion {
    const versionId = `VER-${Date.now()}`;
    const newVersion: PromptVersion = {
      ...version,
      versionId
    };
    this.versions.set(versionId, newVersion);
    return newVersion;
  }

  // 绑定版本和样本数据
  bindVersionSamples(versionId: string, samples: Sample[]): void {
    this.versionSamples.set(versionId, [...samples]);
  }

  // 获取版本关联的样本
  getVersionSamples(versionId: string): Sample[] {
    return this.versionSamples.get(versionId) || [];
  }

  // 比较两个版本的差异
  compareVersions(versionId1: string, versionId2: string): {
    version1: PromptVersion;
    version2: PromptVersion;
    timeDiff: number; // 小时
    changes: string[];
    isLateArrival: boolean; // 是否是晚到的版本
  } | null {
    const v1 = this.versions.get(versionId1);
    const v2 = this.versions.get(versionId2);

    if (!v1 || !v2) return null;

    const time1 = new Date(v1.releasedAt).getTime();
    const time2 = new Date(v2.releasedAt).getTime();
    const timeDiff = Math.abs(time1 - time2) / (1000 * 60 * 60); // 小时

    // 检查是否是"晚到半天"的场景
    const isLateArrival = timeDiff > 8 && timeDiff < 24; // 8-24小时内

    // 合并变更说明
    const allChanges = new Set([...v1.changes, ...v2.changes]);

    return {
      version1: v1,
      version2: v2,
      timeDiff,
      changes: Array.from(allChanges),
      isLateArrival
    };
  }

  // 检测版本时间线风险（是否有版本晚到可能导致标签冲突）
  detectVersionRisks(): Array<{
    type: 'late_arrival' | 'gap' | 'out_of_order';
    message: string;
    versions: string[];
    severity: 'warning' | 'error';
  }> {
    const versions = this.getAllVersions().sort(
      (a, b) => new Date(a.releasedAt).getTime() - new Date(b.releasedAt).getTime()
    );

    const risks: Array<{
      type: 'late_arrival' | 'gap' | 'out_of_order';
      message: string;
      versions: string[];
      severity: 'warning' | 'error';
    }> = [];

    for (let i = 1; i < versions.length; i++) {
      const prev = versions[i - 1];
      const curr = versions[i];

      const prevTime = new Date(prev.releasedAt).getTime();
      const currTime = new Date(curr.releasedAt).getTime();
      const diffHours = (currTime - prevTime) / (1000 * 60 * 60);

      // 检测晚到半天的版本（12小时左右的间隔）
      if (diffHours > 8 && diffHours < 24) {
        risks.push({
          type: 'late_arrival',
          message: `版本${curr.versionNumber}晚到约${diffHours.toFixed(1)}小时，可能导致之前的标签冲突判断失效`,
          versions: [prev.versionId, curr.versionId],
          severity: 'error'
        });
      }

      // 检测间隔过长
      if (diffHours > 72) {
        risks.push({
          type: 'gap',
          message: `版本间隔过长（${(diffHours / 24).toFixed(1)}天），可能存在版本遗漏`,
          versions: [prev.versionId, curr.versionId],
          severity: 'warning'
        });
      }
    }

    return risks;
  }

  // 获取用于版本追踪页面的时间轴数据
  getTimelineData(): Array<{
    version: PromptVersion;
    time: string;
    sampleCount: number;
    hasRisk: boolean;
  }> {
    const versions = this.getAllVersions().sort(
      (a, b) => new Date(a.releasedAt).getTime() - new Date(b.releasedAt).getTime()
    );

    const risks = this.detectVersionRisks();
    const riskyVersionIds = new Set(risks.flatMap(r => r.versions));

    return versions.map(version => ({
      version,
      time: version.releasedAt,
      sampleCount: this.getVersionSamples(version.versionId).length,
      hasRisk: riskyVersionIds.has(version.versionId)
    }));
  }

  // 检查版本冲突对样本标签的影响
  checkLabelConflictsByVersion(
    oldVersionId: string,
    newVersionId: string
  ): LabelConflict[] {
    const oldSamples = this.getVersionSamples(oldVersionId);
    const newSamples = this.getVersionSamples(newVersionId);

    if (oldSamples.length === 0 || newSamples.length === 0) {
      return [];
    }

    const conflicts: LabelConflict[] = [];

    newSamples.forEach(newSample => {
      const oldSample = oldSamples.find(s => s.sampleId === newSample.sampleId);
      if (oldSample && oldSample.securityLabel !== newSample.securityLabel) {
        conflicts.push({
          conflictId: `CONFLICT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          sampleId: newSample.sampleId,
          previousLabel: oldSample.securityLabel,
          currentLabel: newSample.securityLabel,
          reason: 'prompt_version_change',
          versionDiff: `提示词版本从${this.getVersion(oldVersionId)?.versionNumber}更新到${this.getVersion(newVersionId)?.versionNumber}后，标签发生变化`
        });
      }
    });

    return conflicts;
  }
}

// 全局单例
export const versionManager = new VersionManager();

// 便捷函数
export const getAllVersions = () => versionManager.getAllVersions();
export const getCurrentVersion = () => versionManager.getCurrentVersion();
export const setCurrentVersion = (versionId: string) => versionManager.setCurrentVersion(versionId);
export const compareVersions = (v1: string, v2: string) => versionManager.compareVersions(v1, v2);
export const detectVersionRisks = () => versionManager.detectVersionRisks();
export const getTimelineData = () => versionManager.getTimelineData();
