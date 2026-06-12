import { create } from 'zustand';
import { ReviewRecord, RiskAlert, VersionHistory, PlanktonSample } from '@/types';
import { INITIAL_REVIEWS, INITIAL_RISKS, INITIAL_VERSIONS } from '@/utils/mockData';
import { useSampleStore } from './useSampleStore';

interface ReviewStore {
  reviews: ReviewRecord[];
  risks: RiskAlert[];
  versions: VersionHistory[];
  activeVersionId: string | null;
  isReviewMode: boolean;
  diffMode: 'none' | 'side' | 'overlay';
  setReviews: (reviews: ReviewRecord[]) => void;
  addReview: (review: ReviewRecord) => void;
  setRisks: (risks: RiskAlert[]) => void;
  resolveRisk: (riskId: string) => void;
  setVersions: (versions: VersionHistory[]) => void;
  addVersion: (version: VersionHistory) => void;
  setActiveVersion: (versionId: string | null) => void;
  setIsReviewMode: (mode: boolean) => void;
  setDiffMode: (mode: 'none' | 'side' | 'overlay') => void;
  createRevision: (
    sampleId: string,
    newCount: number,
    newRiskLevel: RiskLevel | undefined,
    note: string,
    reviewer: string,
  ) => void;
  confirmSamples: (sampleIds: string[], operator: string) => void;
  getPendingReviewCount: () => number;
  getUnresolvedRiskCount: () => number;
}

type RiskLevel = 'none' | 'low' | 'medium' | 'high';

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  reviews: INITIAL_REVIEWS,
  risks: INITIAL_RISKS,
  versions: INITIAL_VERSIONS,
  activeVersionId: null,
  isReviewMode: false,
  diffMode: 'none',

  setReviews: (reviews) => set({ reviews }),
  addReview: (review) => set((state) => ({ reviews: [...state.reviews, review] })),
  setRisks: (risks) => set({ risks }),
  resolveRisk: (riskId) =>
    set((state) => ({
      risks: state.risks.map((r) => (r.id === riskId ? { ...r, isResolved: true } : r)),
    })),
  setVersions: (versions) => set({ versions }),
  addVersion: (version) => set((state) => ({ versions: [...state.versions, version] })),
  setActiveVersion: (versionId) => set({ activeVersionId: versionId }),
  setIsReviewMode: (mode) => set({ isReviewMode: mode }),
  setDiffMode: (mode) => set({ diffMode: mode }),

  createRevision: (sampleId, newCount, newRiskLevel, note, reviewer) => {
    const { samples } = useSampleStore.getState();
    const target = samples.find((s) => s.id === sampleId);
    if (!target) return;

    const originalCount = target.originalCount ?? target.count;
    const judgmentChange =
      target.count !== newCount || (newRiskLevel !== undefined && target.riskLevel !== newRiskLevel);

    const reviewRecord: ReviewRecord = {
      id: `review-${generateId()}`,
      sampleId,
      reviewer,
      note,
      originalCount: target.count,
      revisedCount: newCount,
      judgmentChange,
      reviewedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    const updatedSample: Partial<PlanktonSample> = {
      count: newCount,
      originalCount,
      status: 'reviewed',
      notes: note,
    };
    if (newRiskLevel !== undefined) updatedSample.riskLevel = newRiskLevel;

    useSampleStore.getState().updateSample(sampleId, updatedSample);

    const diff: Record<string, { before: any; after: any }> = {
      [sampleId]: {
        before: {
          count: target.count,
          riskLevel: target.riskLevel,
          status: target.status,
        },
        after: {
          count: newCount,
          riskLevel: newRiskLevel ?? target.riskLevel,
          status: 'reviewed',
          note,
        },
      },
    };

    const newVersion: VersionHistory = {
      id: `v-${generateId()}`,
      action: 'revise',
      operator: reviewer,
      description: judgmentChange
        ? `复核修正样本 ${sampleId}：计数 ${target.count} → ${newCount}${newRiskLevel ? `，风险等级 ${target.riskLevel} → ${newRiskLevel}` : ''}，备注改变了判定`
        : `复核样本 ${sampleId}，无数值变更`,
      snapshot: JSON.parse(JSON.stringify(useSampleStore.getState().samples)),
      diff,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    set((state) => ({
      reviews: [...state.reviews, reviewRecord],
      versions: [...state.versions, newVersion],
    }));

    console.log(
      `%c[复核入口] ${reviewer} 修正样本 ${sampleId}：${target.count} → ${newCount}${judgmentChange ? '（判定已变更）' : ''}`,
      'color: #00D4AA; font-weight: bold',
    );
  },

  confirmSamples: (sampleIds, operator) => {
    sampleIds.forEach((id) => {
      useSampleStore.getState().updateSample(id, { status: 'confirmed' });
    });

    const diff: Record<string, { before: any; after: any }> = {};
    sampleIds.forEach((id) => {
      diff[id] = { before: { status: 'reviewed' }, after: { status: 'confirmed' } };
    });

    const newVersion: VersionHistory = {
      id: `v-${generateId()}`,
      action: 'confirm',
      operator,
      description: `确认 ${sampleIds.length} 条样本为最终版本`,
      snapshot: JSON.parse(JSON.stringify(useSampleStore.getState().samples)),
      diff,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    set((state) => ({ versions: [...state.versions, newVersion] }));
  },

  getPendingReviewCount: () => {
    return useSampleStore.getState().samples.filter((s) => s.status === 'pending').length;
  },

  getUnresolvedRiskCount: () => {
    return get().risks.filter((r) => !r.isResolved).length;
  },
}));
