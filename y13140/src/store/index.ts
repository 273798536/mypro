import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppStoreState,
  Parameter,
  Version,
  Note,
  Screenshot,
  Anomaly,
  Snapshot,
} from '@/types';
import {
  mockParameters,
  mockVersions,
  mockNotes,
  mockScreenshots,
  mockRecords,
  mockAnomalies,
} from '@/data/mockData';

interface AppStore extends AppStoreState {
  addNote: (versionId: string, content: string, author: string) => void;
  addScreenshot: (versionId: string, dataUrl: string, description: string) => void;
  toggleRecord: (recordId: string) => void;
  highlightParam: (paramId: string | null) => void;
  setReviewExplanation: (text: string) => void;
  setReviewConclusion: (text: string) => void;
  lockSnapshot: (lockedBy: string) => string;
  unlockSnapshot: () => void;
  selectSnapshot: (id: string | null) => void;
  getVersionsByParam: (paramId: string) => Version[];
  getNotesByVersion: (versionId: string) => Note[];
  getScreenshotsByVersion: (versionId: string) => Screenshot[];
  generateMarkdown: (snapshotId: string) => string;
  reset: () => void;
}

const initialReviewExplanation = `一、参数主线
约束条件A（p1）先后经历三次变动：v1-1（教学时长调整）→ v1-2（教研会调至480，越界[240,420]）→ v1-3（运营匿名把权重从0.40拉到0.53）。p3也随v3-1权重从0.10提到0.15。

二、"看似正常"的记录＃11如何改变结论
记录＃11所有输入参数都在标注的可行域内（A=480刚好满足约束），本应是"普通错题"。
但 p1 权重 0.40 → 0.53 的变动，让这条记录的贡献占比从 36% 飙升到 59%。
结论从"保守估计（≤5600）"被拉到"激进估计（≥5800）"，而权重改动没有经过教研复核。

三、异常汇总
1. 外推越界：A=480 超出训练区间[240,420]上界 60 分钟（触发 v1-2）
2. 权重异动：p1 权重在 20:47 被匿名改动（触发 v1-3）`;

const initialReviewConclusion = `最终结论：当前 5800 的结论被权重变动放大了，应先把 p1 权重回落至教研会议确认的 0.40，再重新核算。预计回落至 5640 左右。两条异常必须在导出报告中标注原始说法，不能只保留最终值。`;

const createInitialState = (): AppStoreState => ({
  parameters: mockParameters,
  versions: mockVersions,
  notes: mockNotes,
  screenshots: mockScreenshots,
  records: mockRecords,
  anomalies: mockAnomalies,
  snapshots: [],
  expandedRecords: ['r2'],
  highlightedParamId: null,
  selectedSnapshotId: null,
  isLocked: false,
  reviewExplanation: initialReviewExplanation,
  reviewConclusion: initialReviewConclusion,
});

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      addNote: (versionId, content, author) =>
        set((s) => ({
          notes: [
            ...s.notes,
            {
              id: 'n' + Date.now(),
              versionId,
              content,
              author,
              timestamp: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
            },
          ],
        })),

      addScreenshot: (versionId, dataUrl, description) =>
        set((s) => ({
          screenshots: [
            ...s.screenshots,
            {
              id: 's' + Date.now(),
              versionId,
              dataUrl,
              description,
              timestamp: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
            },
          ],
        })),

      toggleRecord: (recordId) =>
        set((s) => ({
          expandedRecords: s.expandedRecords.includes(recordId)
            ? s.expandedRecords.filter((x) => x !== recordId)
            : [...s.expandedRecords, recordId],
        })),

      highlightParam: (paramId) => set({ highlightedParamId: paramId }),

      setReviewExplanation: (text) => set({ reviewExplanation: text }),
      setReviewConclusion: (text) => set({ reviewConclusion: text }),

      lockSnapshot: (lockedBy) => {
        const state = get();
        const id = 'snap-' + Date.now();
        const snapshot: Snapshot = {
          id,
          lockTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
          lockedBy,
          paramsState: JSON.parse(JSON.stringify(state.parameters)),
          anomaliesState: JSON.parse(JSON.stringify(state.anomalies)),
          reviewState: {
            explanation: state.reviewExplanation,
            conclusion: state.reviewConclusion,
          },
          markdown: '',
        };
        const markdown = state.generateMarkdown(id);
        snapshot.markdown = markdown;
        set({
          snapshots: [...state.snapshots, snapshot],
          isLocked: true,
          selectedSnapshotId: id,
        });
        return id;
      },

      unlockSnapshot: () => set({ isLocked: false, selectedSnapshotId: null }),
      selectSnapshot: (id) => set({ selectedSnapshotId: id }),

      getVersionsByParam: (paramId) =>
        get()
          .versions.filter((v) => v.paramId === paramId)
          .sort((a, b) => b.version - a.version),

      getNotesByVersion: (versionId) =>
        get().notes.filter((n) => n.versionId === versionId),

      getScreenshotsByVersion: (versionId) =>
        get().screenshots.filter((s) => s.versionId === versionId),

      generateMarkdown: (snapshotId) => {
        const s = get();
        const snap = s.snapshots.find((x) => x.id === snapshotId);
        const p = snap?.paramsState ?? s.parameters;
        const anoms = snap?.anomaliesState ?? s.anomalies;
        const explanation = snap?.reviewState.explanation ?? s.reviewExplanation;
        const conclusion = snap?.reviewState.conclusion ?? s.reviewConclusion;

        const lines: string[] = [];
        lines.push('---');
        lines.push(`snapshot_id: ${snapshotId}`);
        lines.push(`lock_time: ${snap?.lockTime ?? '未锁定'}`);
        lines.push(`locked_by: ${snap?.lockedBy ?? '未锁定'}`);
        lines.push('---');
        lines.push('');
        lines.push('# 整数规划错题复盘 · 导出报告');
        lines.push('');
        lines.push('## 参数表（含变更痕迹）');
        lines.push('');
        p.forEach((param) => {
          const marker = param.changeCount > 0 ? `（已变更${param.changeCount}次）` : '';
          lines.push(`- **${param.name}**${marker}：当前值 ${param.currentValue} ${param.unit}，权重 ${param.currentWeight}`);
        });
        lines.push('');
        lines.push('## 错题记录');
        lines.push('');
        s.records.forEach((r) => {
          const tag = s.expandedRecords.includes(r.id) ? '[展开]' : '[折叠]';
          lines.push(`### ${tag} ${r.title}`);
          lines.push('');
          lines.push(`- 贡献占比：${r.contributionToConclusion}%`);
          lines.push(`- 影响链路：${r.impactExplanation}`);
          lines.push('');
          if (r.isSeeminglyNormal) {
            lines.push('> ✏️ **本条"看似正常但改变结论"，请重点关注权重变动带来的放大效应。**');
            lines.push('');
          }
        });
        lines.push('## 异常追踪');
        lines.push('');
        anoms.forEach((a) => {
          lines.push(`> ⚠️ **${a.title}**`);
          lines.push('>');
          lines.push(`> 原始参数说法：${a.rawStatement}`);
          lines.push('>');
          lines.push(`> 追踪说明：${a.traceNote}`);
          lines.push('');
        });
        lines.push('## 复核解释');
        lines.push('');
        lines.push(explanation);
        lines.push('');
        lines.push('## 最终结论');
        lines.push('');
        lines.push(conclusion);
        lines.push('');
        return lines.join('\n');
      },

      reset: () => set(createInitialState()),
    }),
    {
      name: 'int-planning-review-store',
      partialize: (s) => ({
        parameters: s.parameters,
        versions: s.versions,
        notes: s.notes,
        screenshots: s.screenshots,
        records: s.records,
        anomalies: s.anomalies,
        snapshots: s.snapshots,
        expandedRecords: s.expandedRecords,
        reviewExplanation: s.reviewExplanation,
        reviewConclusion: s.reviewConclusion,
      }),
    },
  ),
);
