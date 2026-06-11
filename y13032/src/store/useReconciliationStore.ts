import { create } from 'zustand';
import type {
  BankTransaction,
  CalculationRule,
  RemarkRecord,
  HistoryRecord,
  RenameGuideStep,
} from '@/types';
import {
  mockTransactions,
  mockCalculationRules,
  mockRemarks,
  mockHistories,
} from '@/data/mockData';
import {
  recalculateAfterRemark,
  buildConclusionForStatus,
} from '@/utils/reconciliation';

export interface SaveRemarkResult {
  oldStatus: BankTransaction['status'];
  newStatus: BankTransaction['status'];
  oldConclusion: string;
  newConclusion: string;
}

interface ReconciliationState {
  transactions: BankTransaction[];
  rules: CalculationRule[];
  remarks: RemarkRecord[];
  histories: HistoryRecord[];
  renameGuideSteps: RenameGuideStep[];
  selectedTransactionId: string | null;

  setSelectedTransaction: (id: string | null) => void;
  addRemark: (
    transactionId: string,
    content: string,
    affectedJudgments: string[]
  ) => SaveRemarkResult;
  addHistory: (
    transactionId: string,
    oldConclusion: string,
    newRemark: string,
    changeReason: string,
    oldMaterials?: string[]
  ) => void;
  toggleRenameStep: (stepId: number) => void;
  markReviewed: (transactionId: string) => void;
}

const initialRenameSteps: RenameGuideStep[] = [
  {
    id: 1,
    title: '核对原审批人工号',
    description: '进入 HR 系统查询原审批人"张建均"对应工号，确认与新名"张建军"一致。',
    checked: false,
  },
  {
    id: 2,
    title: '同步 OA 审批链历史记录',
    description: '在 OA 系统搜索该流水关联的审批单，将审批人姓名从"张建均"批量更新为"张建军"。',
    checked: false,
  },
  {
    id: 3,
    title: '更新本地对账缓存',
    description: '在本系统内点击"同步审批人姓名"，刷新该流水所有历史记录中的审批人显示。',
    checked: false,
  },
  {
    id: 4,
    title: '复核对账结论是否受影响',
    description: '检查改名后该流水的双口径判断是否仍成立；若审批层级变化需重新走审批，则在备注中说明。',
    checked: false,
  },
];

export const useReconciliationStore = create<ReconciliationState>((set, get) => ({
  transactions: mockTransactions,
  rules: mockCalculationRules,
  remarks: mockRemarks,
  histories: mockHistories,
  renameGuideSteps: initialRenameSteps,
  selectedTransactionId: null,

  setSelectedTransaction: (id) => set({ selectedTransactionId: id }),

  addRemark: (transactionId, content, affectedJudgments) => {
    const state = get();
    const tx = state.transactions.find((t) => t.id === transactionId);
    const oldStatus = tx?.status ?? 'double_caliber';
    const oldStatusTxRules = state.rules.filter((r) => r.transactionId === transactionId);
    const oldSupply = oldStatusTxRules.some(
      (r) => r.caliberName === 'supply_chain_prepayment' && r.judgmentResult === 'matched'
    );
    const oldOperating = oldStatusTxRules.some(
      (r) => r.caliberName === 'operating_expense' && r.judgmentResult === 'matched'
    );
    const oldConclusion = buildConclusionForStatus(
      oldStatus,
      tx?.amount ?? 0,
      oldSupply,
      oldOperating
    );

    const { updatedRules, newStatus, supplyMatched, operatingMatched } =
      recalculateAfterRemark(state.rules, transactionId, affectedJudgments);

    const newConclusion = buildConclusionForStatus(
      newStatus,
      tx?.amount ?? 0,
      supplyMatched,
      operatingMatched
    );

    const newRemark: RemarkRecord = {
      id: `rm-${Date.now()}`,
      transactionId,
      content,
      affectedJudgments,
      createdAt: new Date().toLocaleString('zh-CN'),
      createdBy: '小林',
    };

    set((s) => ({
      remarks: [...s.remarks, newRemark],
      rules: updatedRules,
      transactions: s.transactions.map((t) =>
        t.id === transactionId
          ? { ...t, supplementRemark: content, status: newStatus }
          : t
      ),
    }));

    return { oldStatus, newStatus, oldConclusion, newConclusion };
  },

  addHistory: (transactionId, oldConclusion, newRemark, changeReason, oldMaterials) => {
    const newHistory: HistoryRecord = {
      id: `hist-${Date.now()}`,
      transactionId,
      oldConclusion,
      newRemark,
      changeReason,
      changedBy: '小林',
      changedAt: new Date().toLocaleString('zh-CN'),
      oldMaterials,
    };
    set((state) => ({
      histories: [...state.histories, newHistory],
    }));
  },

  toggleRenameStep: (stepId) =>
    set((state) => ({
      renameGuideSteps: state.renameGuideSteps.map((s) =>
        s.id === stepId ? { ...s, checked: !s.checked } : s
      ),
    })),

  markReviewed: (transactionId) =>
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === transactionId ? { ...t, reviewed: true } : t
      ),
    })),
}));
