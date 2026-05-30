import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Contestant,
  Score,
  Submission,
  RankingRule,
  RankingEntry,
  RankingVersion,
  TieBreakGroup,
  Appeal,
  ChangeLog,
  ChangeActionType,
} from '../types';
import { calculateRanking, generateId } from '../utils/rankingEngine';
import {
  sampleContestants,
  sampleScores,
  sampleSubmissions,
  defaultRankingRule,
  sampleRules,
} from '../data/sampleData';

interface AppStore {
  contestants: Contestant[];
  scores: Score[];
  submissions: Submission[];
  currentRanking: RankingEntry[];
  rankingVersions: RankingVersion[];
  currentRule: RankingRule;
  availableRules: RankingRule[];
  pendingTieBreaks: TieBreakGroup[];
  appeals: Appeal[];
  changeLogs: ChangeLog[];
  currentOperator: string;
  confirmedTieBreaks: Map<string, string[]>;
  currentPage: string;

  setCurrentPage: (page: string) => void;
  setCurrentOperator: (name: string) => void;
  loadSampleData: () => void;
  recalculateRanking: () => void;
  updateContestantScore: (contestantId: string, category: string, newPoints: number, reason: string) => void;
  confirmTieBreak: (groupId: string, orderedIds: string[], notes?: string) => void;
  createNewVersion: (changeType: RankingVersion['changeType'], reason: string) => void;
  submitAppeal: (contestantId: string, type: Appeal['type'], reason: string) => void;
  reviewAppeal: (appealId: string, approved: boolean, reviewerNotes?: string) => void;
  changeRankingRule: (ruleId: string, reason: string) => void;
  importData: (data: { contestants?: Contestant[]; scores?: Score[]; submissions?: Submission[] }) => void;
  clearAllData: () => void;
  getContestantById: (id: string) => Contestant | undefined;
  getScoreByContestantId: (id: string) => Score | undefined;
  getSubmissionByContestantId: (id: string) => Submission | undefined;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      contestants: [],
      scores: [],
      submissions: [],
      currentRanking: [],
      rankingVersions: [],
      currentRule: defaultRankingRule,
      availableRules: sampleRules,
      pendingTieBreaks: [],
      appeals: [],
      changeLogs: [],
      currentOperator: '裁判长',
      confirmedTieBreaks: new Map(),
      currentPage: 'dashboard',

      setCurrentPage: (page) => set({ currentPage: page }),
      setCurrentOperator: (name) => set({ currentOperator: name }),

      getContestantById: (id) => get().contestants.find((c) => c.id === id),
      getScoreByContestantId: (id) => get().scores.find((s) => s.contestantId === id),
      getSubmissionByContestantId: (id) => get().submissions.find((s) => s.contestantId === id),

      loadSampleData: () => {
        const state = get();
        const { ranking, tieBreakGroups } = calculateRanking(
          sampleContestants,
          sampleScores,
          sampleSubmissions,
          state.currentRule
        );

        const initialVersion: RankingVersion = {
          id: generateId('v'),
          version: 1,
          ruleConfig: state.currentRule,
          createdAt: new Date().toISOString(),
          createdBy: state.currentOperator,
          changeReason: '初始数据导入',
          changeType: 'initial',
          rankingSnapshot: ranking,
        };

        const initialLog: ChangeLog = {
          id: generateId('log'),
          versionId: initialVersion.id,
          actionType: 'manual_edit',
          operator: state.currentOperator,
          timestamp: new Date().toISOString(),
          description: '导入样例数据，包含8位选手成绩信息',
          affectedContestants: sampleContestants.map((c) => c.id),
        };

        set({
          contestants: sampleContestants,
          scores: sampleScores,
          submissions: sampleSubmissions,
          currentRanking: ranking,
          pendingTieBreaks: tieBreakGroups,
          rankingVersions: [initialVersion],
          changeLogs: [initialLog],
          confirmedTieBreaks: new Map(),
        });
      },

      recalculateRanking: () => {
        const state = get();
        const { ranking, tieBreakGroups } = calculateRanking(
          state.contestants,
          state.scores,
          state.submissions,
          state.currentRule,
          state.confirmedTieBreaks
        );

        const updatedTieBreaks = tieBreakGroups.map((g) => {
          const existing = state.pendingTieBreaks.find((pg) => pg.score === g.score && pg.contestantIds.length === g.contestantIds.length);
          return existing?.status === 'confirmed' ? { ...g, status: 'confirmed' as const } : g;
        });

        set({
          currentRanking: ranking,
          pendingTieBreaks: updatedTieBreaks,
        });
      },

      updateContestantScore: (contestantId, category, newPoints, reason) => {
        const state = get();
        const oldScores = [...state.scores];
        const scoreIndex = oldScores.findIndex((s) => s.contestantId === contestantId);

        if (scoreIndex === -1) return;

        const oldScore = oldScores[scoreIndex];
        const itemIndex = oldScore.items.findIndex((i) => i.category === category);

        if (itemIndex === -1) return;

        const oldPoints = oldScore.items[itemIndex].points;

        const newItems = [...oldScore.items];
        newItems[itemIndex] = { ...newItems[itemIndex], points: newPoints };
        const newTotal = newItems.reduce((sum, item) => sum + item.points * item.weight, 0);

        oldScores[scoreIndex] = {
          ...oldScore,
          items: newItems,
          totalScore: Math.round(newTotal * 100) / 100,
          calculatedAt: new Date().toISOString(),
        };

        const { ranking, tieBreakGroups } = calculateRanking(
          state.contestants,
          oldScores,
          state.submissions,
          state.currentRule,
          state.confirmedTieBreaks
        );

        const contestant = state.getContestantById(contestantId);
        const log: ChangeLog = {
          id: generateId('log'),
          versionId: '',
          actionType: 'score_update',
          fieldChanged: `${category}得分`,
          oldValue: String(oldPoints),
          newValue: String(newPoints),
          operator: state.currentOperator,
          timestamp: new Date().toISOString(),
          description: `${contestant?.name || contestantId}的${category}得分从${oldPoints}改为${newPoints}`,
          affectedContestants: [contestantId],
        };

        set({
          scores: oldScores,
          currentRanking: ranking,
          pendingTieBreaks: tieBreakGroups,
          changeLogs: [...state.changeLogs, log],
        });
      },

      confirmTieBreak: (groupId, orderedIds, notes) => {
        const state = get();
        const groupIndex = state.pendingTieBreaks.findIndex((g) => g.id === groupId);
        if (groupIndex === -1) return;

        const group = state.pendingTieBreaks[groupIndex];
        const newConfirmed = new Map(state.confirmedTieBreaks);
        newConfirmed.set(groupId, orderedIds);

        const updatedGroups = [...state.pendingTieBreaks];
        updatedGroups[groupIndex] = {
          ...group,
          status: 'confirmed',
          confirmedBy: state.currentOperator,
          confirmedAt: new Date().toISOString(),
        };

        const { ranking } = calculateRanking(
          state.contestants,
          state.scores,
          state.submissions,
          state.currentRule,
          newConfirmed
        );

        const names = orderedIds.map((id) => state.getContestantById(id)?.name || id).join(' → ');
        const log: ChangeLog = {
          id: generateId('log'),
          versionId: '',
          actionType: 'tiebreak_confirm',
          operator: state.currentOperator,
          timestamp: new Date().toISOString(),
          description: `确认同分排名: ${names}${notes ? ` (备注: ${notes})` : ''}`,
          affectedContestants: group.contestantIds,
        };

        set({
          pendingTieBreaks: updatedGroups,
          confirmedTieBreaks: newConfirmed,
          currentRanking: ranking,
          changeLogs: [...state.changeLogs, log],
        });
      },

      createNewVersion: (changeType, reason) => {
        const state = get();
        const newVersion: RankingVersion = {
          id: generateId('v'),
          version: state.rankingVersions.length + 1,
          ruleConfig: state.currentRule,
          createdAt: new Date().toISOString(),
          createdBy: state.currentOperator,
          changeReason: reason,
          changeType,
          rankingSnapshot: [...state.currentRanking],
        };

        set({
          rankingVersions: [...state.rankingVersions, newVersion],
        });
      },

      submitAppeal: (contestantId, type, reason) => {
        const state = get();
        const appeal: Appeal = {
          id: generateId('appeal'),
          contestantId,
          type,
          reason,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        set({ appeals: [...state.appeals, appeal] });
      },

      reviewAppeal: (appealId, approved, reviewerNotes) => {
        const state = get();
        const appealIndex = state.appeals.findIndex((a) => a.id === appealId);
        if (appealIndex === -1) return;

        const appeal = state.appeals[appealIndex];
        const updatedAppeals = [...state.appeals];
        updatedAppeals[appealIndex] = {
          ...appeal,
          status: approved ? 'approved' : 'rejected',
          reviewer: state.currentOperator,
          reviewerNotes,
          resolvedAt: new Date().toISOString(),
        };

        const contestant = state.getContestantById(appeal.contestantId);
        const log: ChangeLog = {
          id: generateId('log'),
          versionId: '',
          actionType: approved ? 'appeal_approved' : 'appeal_rejected',
          operator: state.currentOperator,
          timestamp: new Date().toISOString(),
          description: `${approved ? '批准' : '驳回'}${contestant?.name || appeal.contestantId}的申诉: ${appeal.reason}`,
          affectedContestants: [appeal.contestantId],
        };

        set({
          appeals: updatedAppeals,
          changeLogs: [...state.changeLogs, log],
        });
      },

      changeRankingRule: (ruleId, reason) => {
        const state = get();
        const newRule = state.availableRules.find((r) => r.id === ruleId);
        if (!newRule) return;

        const { ranking, tieBreakGroups } = calculateRanking(
          state.contestants,
          state.scores,
          state.submissions,
          newRule,
          new Map()
        );

        const log: ChangeLog = {
          id: generateId('log'),
          versionId: '',
          actionType: 'rule_change',
          fieldChanged: '排名规则',
          oldValue: state.currentRule.name,
          newValue: newRule.name,
          operator: state.currentOperator,
          timestamp: new Date().toISOString(),
          description: `切换排名规则: ${state.currentRule.name} → ${newRule.name}`,
          affectedContestants: state.contestants.map((c) => c.id),
        };

        set({
          currentRule: newRule,
          currentRanking: ranking,
          pendingTieBreaks: tieBreakGroups,
          confirmedTieBreaks: new Map(),
          changeLogs: [...state.changeLogs, log],
        });
      },

      importData: (data) => {
        const state = get();
        const newContestants = data.contestants ? [...state.contestants, ...data.contestants] : state.contestants;
        const newScores = data.scores ? [...state.scores, ...data.scores] : state.scores;
        const newSubmissions = data.submissions ? [...state.submissions, ...data.submissions] : state.submissions;

        const { ranking, tieBreakGroups } = calculateRanking(
          newContestants,
          newScores,
          newSubmissions,
          state.currentRule,
          state.confirmedTieBreaks
        );

        const log: ChangeLog = {
          id: generateId('log'),
          versionId: '',
          actionType: 'manual_edit',
          operator: state.currentOperator,
          timestamp: new Date().toISOString(),
          description: `导入数据: ${data.contestants?.length || 0}位选手`,
          affectedContestants: data.contestants?.map((c) => c.id) || [],
        };

        set({
          contestants: newContestants,
          scores: newScores,
          submissions: newSubmissions,
          currentRanking: ranking,
          pendingTieBreaks: tieBreakGroups,
          changeLogs: [...state.changeLogs, log],
        });
      },

      clearAllData: () => {
        set({
          contestants: [],
          scores: [],
          submissions: [],
          currentRanking: [],
          rankingVersions: [],
          pendingTieBreaks: [],
          appeals: [],
          changeLogs: [],
          confirmedTieBreaks: new Map(),
        });
      },
    }),
    {
      name: 'ranking-tiebreak-storage',
      partialize: (state) => ({
        contestants: state.contestants,
        scores: state.scores,
        submissions: state.submissions,
        currentRanking: state.currentRanking,
        rankingVersions: state.rankingVersions,
        currentRule: state.currentRule,
        availableRules: state.availableRules,
        pendingTieBreaks: state.pendingTieBreaks,
        appeals: state.appeals,
        changeLogs: state.changeLogs,
        currentOperator: state.currentOperator,
      }),
    }
  )
);
