import { create } from 'zustand';
import {
  Member,
  DataBatch,
  TransitionMatrix,
  Activity,
  StatusJumpReview,
  MarkovPrediction,
  InterventionSuggestion,
  ExportReport,
  MemberStatus,
  CustomerServiceNote,
} from '../types';
import { mockData } from '../data/mockData';
import {
  calculateTransitionMatrix,
  handleMissingMonths,
  predictStates,
  detectAbnormalJumps,
  calculateChurnProbability,
  generatePlainLanguageExplanation,
} from '../utils/markov';

interface StoreState {
  currentBatchId: string;
  batches: DataBatch[];
  members: Member[];
  activities: Activity[];
  transitionMatrix: TransitionMatrix | null;
  jumpReviews: StatusJumpReview[];
  predictions: MarkovPrediction[];
  suggestions: InterventionSuggestion[];
  currentReport: ExportReport | null;
  dataSourceValidated: boolean;
  loading: boolean;
}

interface StoreActions {
  setCurrentBatch: (batchId: string) => void;
  getCurrentBatch: () => DataBatch | undefined;
  getTransitionMatrix: () => TransitionMatrix | null;
  reviewJump: (reviewId: string, isApproved: boolean, comment: string, explanation: string) => void;
  addCustomerServiceNote: (memberId: string, note: Omit<CustomerServiceNote, 'id' | 'memberId'>) => void;
  generateReport: () => void;
  refreshData: () => void;
  getMembersByStatus: (status: MemberStatus) => Member[];
  getHighRiskMembers: () => Member[];
  getMemberById: (id: string) => Member | undefined;
  validateDataSource: () => boolean;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function calculateDerivedData(
  batch: DataBatch,
  members: Member[],
  activities: Activity[]
): {
  transitionMatrix: TransitionMatrix;
  jumpReviews: StatusJumpReview[];
  predictions: MarkovPrediction[];
  updatedMembers: Member[];
} {
  const period = batch.endDate.substring(0, 7);

  let matrix = calculateTransitionMatrix(members, period);

  const handledMatrix = handleMissingMonths(matrix, batch.missingMonths);
  matrix = {
    ...handledMatrix,
    batchId: batch.id,
  };

  const jumpReviews = detectAbnormalJumps(members).map(review => ({
    ...review,
    plainLanguageExplanation: generatePlainLanguageExplanation(
      review,
      members.find(m => m.id === review.memberId)!,
      activities
    ),
  }));

  const updatedMembers = members.map(member => ({
    ...member,
    churnProbability: calculateChurnProbability(member, matrix),
  }));

  const statusOrder = [
    MemberStatus.new,
    MemberStatus.active,
    MemberStatus.at_risk,
    MemberStatus.silent,
    MemberStatus.churned,
  ];

  const initialDist: Record<MemberStatus, number> = {} as Record<MemberStatus, number>;
  statusOrder.forEach(status => {
    initialDist[status] = updatedMembers.filter(m => m.currentStatus === status).length / updatedMembers.length;
  });
  initialDist[MemberStatus.reactivated] = updatedMembers.filter(m => m.currentStatus === MemberStatus.reactivated).length / updatedMembers.length;

  const predictions: MarkovPrediction[] = [];
  [1, 3, 6].forEach(horizon => {
    predictions.push(predictStates(matrix, initialDist, horizon));
  });

  return {
    transitionMatrix: matrix,
    jumpReviews,
    predictions,
    updatedMembers,
  };
}

const initialBatch = mockData.batches.find(b => b.isCurrent) || mockData.batches[0];
const initialDerived = calculateDerivedData(initialBatch, mockData.members, mockData.activities);

export const useStore = create<StoreState & StoreActions>((set, get) => ({
  currentBatchId: initialBatch.id,
  batches: mockData.batches,
  members: initialDerived.updatedMembers,
  activities: mockData.activities,
  transitionMatrix: initialDerived.transitionMatrix,
  jumpReviews: initialDerived.jumpReviews,
  predictions: initialDerived.predictions,
  suggestions: mockData.suggestions,
  currentReport: null,
  dataSourceValidated: true,
  loading: false,

  validateDataSource: () => {
    const state = get();
    const currentBatch = state.batches.find(b => b.id === state.currentBatchId);
    if (!currentBatch) return false;

    const matrixValid = state.transitionMatrix?.batchId === state.currentBatchId;
    const predictionsValid = state.predictions.every(p => p.batchId === state.currentBatchId);

    const isValid = matrixValid && predictionsValid;

    if (isValid !== state.dataSourceValidated) {
      set({ dataSourceValidated: isValid });
    }

    return isValid;
  },

  setCurrentBatch: (batchId: string) => {
    const state = get();
    const batch = state.batches.find(b => b.id === batchId);
    if (!batch) return;

    set({ loading: true, currentBatchId: batchId });

    const derived = calculateDerivedData(batch, mockData.members, state.activities);

    set({
      members: derived.updatedMembers,
      transitionMatrix: derived.transitionMatrix,
      jumpReviews: derived.jumpReviews,
      predictions: derived.predictions,
      dataSourceValidated: true,
      loading: false,
    });
  },

  getCurrentBatch: () => {
    const state = get();
    return state.batches.find(b => b.id === state.currentBatchId);
  },

  getTransitionMatrix: () => {
    const state = get();
    if (!state.validateDataSource()) {
      const currentBatch = state.getCurrentBatch();
      if (currentBatch) {
        state.setCurrentBatch(currentBatch.id);
      }
    }
    return get().transitionMatrix;
  },

  reviewJump: (reviewId: string, isApproved: boolean, comment: string, explanation: string) => {
    set(state => ({
      jumpReviews: state.jumpReviews.map(review =>
        review.id === reviewId
          ? {
              ...review,
              isApproved,
              reviewComment: comment,
              plainLanguageExplanation: explanation,
              reviewer: '系统管理员',
              reviewDate: new Date().toISOString().split('T')[0],
            }
          : review
      ),
    }));
  },

  addCustomerServiceNote: (memberId: string, note: Omit<CustomerServiceNote, 'id' | 'memberId'>) => {
    const newNote: CustomerServiceNote = {
      ...note,
      id: generateUUID(),
      memberId,
    };

    set(state => ({
      members: state.members.map(member =>
        member.id === memberId
          ? {
              ...member,
              customerServiceNotes: [...member.customerServiceNotes, newNote],
            }
          : member
      ),
    }));
  },

  generateReport: () => {
    const state = get();
    const currentBatch = state.getCurrentBatch();
    if (!currentBatch) return;

    const statusCounts: Record<MemberStatus, number> = {} as Record<MemberStatus, number>;
    Object.values(MemberStatus).forEach(status => {
      statusCounts[status as MemberStatus] = state.members.filter(
        m => m.currentStatus === status
      ).length;
    });

    const highRiskCount = state.getHighRiskMembers().length;
    const totalMembers = state.members.length;

    const pendingReviews = state.jumpReviews.filter(r => r.isApproved === null).length;
    const approvedReviews = state.jumpReviews.filter(r => r.isApproved === true).length;
    const rejectedReviews = state.jumpReviews.filter(r => r.isApproved === false).length;

    const jumpExplanations = state.jumpReviews
      .filter(r => r.plainLanguageExplanation)
      .map(r => r.plainLanguageExplanation!);

    const report: ExportReport = {
      id: generateUUID(),
      batchId: currentBatch.id,
      generatedAt: new Date().toISOString(),
      generatedBy: '系统管理员',
      title: `${currentBatch.name} - 会员流失分析报告`,
      summary: `本报告基于 ${currentBatch.startDate} 至 ${currentBatch.endDate} 的数据，对 ${totalMembers} 名会员进行了流失风险分析。当前高风险会员 ${highRiskCount} 人，待审核异常跳转 ${pendingReviews} 条。`,
      sections: [
        {
          title: '会员状态分布',
          content: `活跃会员：${statusCounts.active} 人，高危会员：${statusCounts.at_risk} 人，沉默会员：${statusCounts.silent} 人，已流失：${statusCounts.churned} 人，新会员：${statusCounts.new} 人，回流会员：${statusCounts.reactivated} 人`,
          type: 'chart',
          data: statusCounts,
        },
        {
          title: '异常跳转审核统计',
          content: `待审核：${pendingReviews} 条，已通过：${approvedReviews} 条，已拒绝：${rejectedReviews} 条`,
          type: 'table',
          data: { pendingReviews, approvedReviews, rejectedReviews },
        },
        {
          title: '流失风险评估',
          content: `高风险会员占比：${((highRiskCount / totalMembers) * 100).toFixed(2)}%，建议优先对高风险会员采取干预措施`,
          type: 'text',
        },
      ],
      jumpExplanations,
    };

    set({ currentReport: report });
  },

  refreshData: () => {
    const state = get();
    const currentBatch = state.getCurrentBatch();
    if (!currentBatch) return;

    set({ loading: true });

    const derived = calculateDerivedData(currentBatch, mockData.members, state.activities);

    set({
      members: derived.updatedMembers,
      transitionMatrix: derived.transitionMatrix,
      jumpReviews: derived.jumpReviews,
      predictions: derived.predictions,
      dataSourceValidated: true,
      loading: false,
    });
  },

  getMembersByStatus: (status: MemberStatus) => {
    return get().members.filter(m => m.currentStatus === status);
  },

  getHighRiskMembers: () => {
    return get().members.filter(m => m.churnProbability > 0.6);
  },

  getMemberById: (id: string) => {
    return get().members.find(m => m.id === id);
  },
}));

export default useStore;
