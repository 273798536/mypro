import { create } from 'zustand';
import { Athlete, Event, Score, TieBreakRule, Appeal, RankingResult, PendingItem, CalculationSnapshot } from '../types';
import { calculateRankings } from '../utils/rankingEngine';
import { mockAthletes, mockEvents, mockScores, mockRules, mockAppeals } from '../data/mockData';

interface AppState {
  athletes: Athlete[];
  events: Event[];
  scores: Score[];
  appeals: Appeal[];
  rules: TieBreakRule[];
  reviewedItems: Record<string, boolean>;
  calculationResult: {
    results: RankingResult[];
    timestamp: number;
    isStale: boolean;
  } | null;
  selectedAthleteId: string | null;
  selectedRank: number | null;
  snapshots: CalculationSnapshot[];
  pendingItems: PendingItem[];

  setAthletes: (athletes: Athlete[]) => void;
  setEvents: (events: Event[]) => void;
  setScores: (scores: Score[]) => void;
  setAppeals: (appeals: Appeal[]) => void;
  setRules: (rules: TieBreakRule[]) => void;
  updateEventWeight: (eventId: string, weight: number) => void;
  updateRulePriority: (ruleId: string, priority: number) => void;
  toggleRuleEnabled: (ruleId: string) => void;
  reorderRules: (rules: TieBreakRule[]) => void;
  markAsReviewed: (itemId: string) => void;
  resolveAppeal: (appealId: string, adjustedScore: number, resolution: string) => void;
  rejectAppeal: (appealId: string, resolution: string) => void;
  setForfeitScore: (scoreId: string, value: number) => void;
  selectAthlete: (athleteId: string | null) => void;
  selectRank: (rank: number | null) => void;
  calculateRankings: () => void;
  generatePendingItems: () => void;
  takeSnapshot: () => void;
  loadSnapshot: (snapshotId: string) => void;
  exportResults: () => string;
  loadMockData: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  athletes: [],
  events: [],
  scores: [],
  appeals: [],
  rules: [],
  reviewedItems: {},
  calculationResult: null,
  selectedAthleteId: null,
  selectedRank: null,
  snapshots: [],
  pendingItems: [],

  setAthletes: (athletes) => set({ athletes, calculationResult: null }),
  setEvents: (events) => set({ events, calculationResult: null }),
  setScores: (scores) => set({ scores, calculationResult: null }),
  setAppeals: (appeals) => set({ appeals, calculationResult: null }),
  setRules: (rules) => set({ rules, calculationResult: null }),

  updateEventWeight: (eventId, weight) => {
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId ? { ...e, weight } : e
      ),
      calculationResult: null,
    }));
  },

  updateRulePriority: (ruleId, priority) => {
    set((state) => ({
      rules: state.rules.map((r) =>
        r.id === ruleId ? { ...r, priority } : r
      ),
      calculationResult: null,
    }));
  },

  toggleRuleEnabled: (ruleId) => {
    set((state) => ({
      rules: state.rules.map((r) =>
        r.id === ruleId ? { ...r, enabled: !r.enabled } : r
      ),
      calculationResult: null,
    }));
  },

  reorderRules: (rules) => {
    const reordered = rules.map((r, i) => ({ ...r, priority: i + 1 }));
    set({ rules: reordered, calculationResult: null });
  },

  markAsReviewed: (itemId) => {
    set((state) => ({
      reviewedItems: { ...state.reviewedItems, [itemId]: true },
      pendingItems: state.pendingItems.map((item) =>
        item.id === itemId ? { ...item, reviewed: true } : item
      ),
    }));
  },

  resolveAppeal: (appealId, adjustedScore, resolution) => {
    set((state) => {
      const appeal = state.appeals.find((a) => a.id === appealId);
      if (!appeal) return state;

      return {
        appeals: state.appeals.map((a) =>
          a.id === appealId
            ? { ...a, status: 'resolved' as const, resolution, adjustedScore }
            : a
        ),
        scores: state.scores.map((s) =>
          s.athleteId === appeal.athleteId && s.eventId === appeal.eventId
            ? { ...s, value: adjustedScore, status: 'normal' as const }
            : s
        ),
        reviewedItems: { ...state.reviewedItems, [appealId]: true },
        pendingItems: state.pendingItems.map((item) =>
          item.appealId === appealId ? { ...item, reviewed: true } : item
        ),
        calculationResult: null,
      };
    });
  },

  rejectAppeal: (appealId, resolution) => {
    set((state) => ({
      appeals: state.appeals.map((a) =>
        a.id === appealId
          ? { ...a, status: 'rejected' as const, resolution }
          : a
      ),
      reviewedItems: { ...state.reviewedItems, [appealId]: true },
      pendingItems: state.pendingItems.map((item) =>
        item.appealId === appealId ? { ...item, reviewed: true } : item
      ),
      calculationResult: null,
    }));
  },

  setForfeitScore: (scoreId, value) => {
    set((state) => ({
      scores: state.scores.map((s) =>
        s.id === scoreId ? { ...s, value, status: 'normal' as const } : s
      ),
      reviewedItems: { ...state.reviewedItems, [scoreId]: true },
      pendingItems: state.pendingItems.map((item) =>
        item.scoreId === scoreId ? { ...item, reviewed: true } : item
      ),
      calculationResult: null,
    }));
  },

  selectAthlete: (athleteId) => set({ selectedAthleteId: athleteId }),
  selectRank: (rank) => set({ selectedRank: rank }),

  calculateRankings: () => {
    const { athletes, events, scores, rules } = get();
    const results = calculateRankings(athletes, events, scores, rules);
    set({
      calculationResult: {
        results,
        timestamp: Date.now(),
        isStale: false,
      },
    });
  },

  generatePendingItems: () => {
    const { scores, appeals, athletes, events } = get();
    const pendingItems: PendingItem[] = [];

    scores.forEach((score) => {
      if (score.status === 'forfeit') {
        const athlete = athletes.find((a) => a.id === score.athleteId);
        const event = events.find((e) => e.id === score.eventId);
        pendingItems.push({
          id: `forfeit-${score.id}`,
          type: 'forfeit',
          title: `${athlete?.name || '未知选手'} - ${event?.name || '未知项目'} 弃权`,
          description: score.remark || '请确认弃权计分方式',
          athleteId: score.athleteId,
          eventId: score.eventId,
          scoreId: score.id,
          reviewed: false,
        });
      }
    });

    appeals.forEach((appeal) => {
      if (appeal.status === 'pending') {
        const athlete = athletes.find((a) => a.id === appeal.athleteId);
        const event = events.find((e) => e.id === appeal.eventId);
        pendingItems.push({
          id: `appeal-${appeal.id}`,
          type: 'appeal',
          title: `${athlete?.name || '未知选手'} - ${event?.name || '未知项目'} 申诉`,
          description: appeal.reason,
          athleteId: appeal.athleteId,
          eventId: appeal.eventId,
          appealId: appeal.id,
          reviewed: false,
        });
      }
    });

    set({ pendingItems });
  },

  takeSnapshot: () => {
    const { rules, events, calculationResult, reviewedItems } = get();
    if (!calculationResult) return;

    const snapshot: CalculationSnapshot = {
      id: `snap-${Date.now()}`,
      timestamp: Date.now(),
      rules: JSON.parse(JSON.stringify(rules)),
      events: JSON.parse(JSON.stringify(events)),
      results: JSON.parse(JSON.stringify(calculationResult.results)),
      reviewResults: JSON.parse(JSON.stringify(reviewedItems)),
    };

    set((state) => ({
      snapshots: [...state.snapshots, snapshot],
    }));
  },

  loadSnapshot: (snapshotId) => {
    const { snapshots } = get();
    const snapshot = snapshots.find((s) => s.id === snapshotId);
    if (!snapshot) return;

    set({
      rules: snapshot.rules,
      events: snapshot.events,
      reviewedItems: snapshot.reviewResults,
      calculationResult: {
        results: snapshot.results,
        timestamp: snapshot.timestamp,
        isStale: false,
      },
    });
  },

  exportResults: () => {
    const { calculationResult, athletes, events } = get();
    if (!calculationResult) return '';

    const exportData = calculationResult.results
      .sort((a, b) => a.rank - b.rank)
      .map((result) => {
        const athlete = athletes.find((a) => a.id === result.athleteId);
        return {
          名次: result.rank,
          姓名: athlete?.name || '未知',
          年级: athlete?.grade || '',
          班级: athlete?.className || '',
          加权总分: result.totalScore.toFixed(2),
          同分规则: result.tieBreakRule || '无同分',
          各项目得分: events
            .map((e) => `${e.name}: ${(result.weightedScores[e.id] || 0).toFixed(1)}`)
            .join('; '),
        };
      });

    return JSON.stringify(exportData, null, 2);
  },

  loadMockData: () => {
    set({
      athletes: mockAthletes,
      events: mockEvents,
      scores: mockScores,
      appeals: mockAppeals,
      rules: mockRules,
      calculationResult: null,
    });
    
    setTimeout(() => {
      get().generatePendingItems();
      get().calculateRankings();
    }, 100);
  },
}));
