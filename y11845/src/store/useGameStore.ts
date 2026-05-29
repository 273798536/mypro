import { create } from 'zustand';
import type { GameState, Conclusion, EvidenceLink, OperationRecord } from '@/types';
import { cases } from '@/data/cases';
import { validateLink } from '@/utils/evidenceValidator';
import { calculateScore } from '@/utils/scoringEngine';

let idCounter = 0;
function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentCaseId: null,
  clues: [],
  markedClueIds: [],
  evidenceLinks: [],
  operationHistory: [],
  userConclusion: null,
  score: null,
  isCompleted: false,
  selectedClueId: null,
  activeTab: 'songs',
  expandedMaterialId: null,

  startCase: (caseId: string) => {
    const caseData = cases.find((c) => c.id === caseId);
    if (!caseData) return;

    const record: OperationRecord = {
      id: nextId('op'),
      timestamp: Date.now(),
      type: 'VIEW_MATERIAL',
      detail: `开始调查案件: ${caseData.title}`,
      scoreImpact: 0,
    };

    set({
      currentCaseId: caseId,
      clues: caseData.clues,
      markedClueIds: [],
      evidenceLinks: [],
      operationHistory: [record],
      userConclusion: null,
      score: null,
      isCompleted: false,
      selectedClueId: null,
      activeTab: 'songs',
      expandedMaterialId: null,
    });
  },

  markClue: (clueId: string) => {
    const state = get();
    if (state.markedClueIds.includes(clueId)) return;

    const clue = state.clues.find((c) => c.id === clueId);
    const record: OperationRecord = {
      id: nextId('op'),
      timestamp: Date.now(),
      type: 'MARK_CLUE',
      detail: `标记线索: ${clue?.content || clueId}`,
      scoreImpact: 0,
      clueId,
    };

    set({
      markedClueIds: [...state.markedClueIds, clueId],
      operationHistory: [...state.operationHistory, record],
    });
  },

  unmarkClue: (clueId: string) => {
    const state = get();
    const clue = state.clues.find((c) => c.id === clueId);
    const relatedLinks = state.evidenceLinks.filter(
      (l) => l.fromClueId === clueId || l.toClueId === clueId
    );

    const record: OperationRecord = {
      id: nextId('op'),
      timestamp: Date.now(),
      type: 'UNMARK_CLUE',
      detail: `取消标记线索: ${clue?.content || clueId}`,
      scoreImpact: 0,
      clueId,
    };

    set({
      markedClueIds: state.markedClueIds.filter((id) => id !== clueId),
      evidenceLinks: state.evidenceLinks.filter(
        (l) => l.fromClueId !== clueId && l.toClueId !== clueId
      ),
      operationHistory: [...state.operationHistory, record],
    });
  },

  selectClue: (clueId: string | null) => {
    set({ selectedClueId: clueId });
  },

  createLink: (fromClueId: string, toClueId: string, relationship: string) => {
    const state = get();
    if (fromClueId === toClueId) return;

    const exists = state.evidenceLinks.some(
      (l) =>
        (l.fromClueId === fromClueId && l.toClueId === toClueId) ||
        (l.fromClueId === toClueId && l.toClueId === fromClueId)
    );
    if (exists) return;

    const caseData = cases.find((c) => c.id === state.currentCaseId);
    const fromClue = state.clues.find((c) => c.id === fromClueId);
    const toClue = state.clues.find((c) => c.id === toClueId);

    if (!caseData || !fromClue || !toClue) return;

    const validation = validateLink(fromClue, toClue, caseData.correctLinks);

    const link: EvidenceLink = {
      id: nextId('link'),
      fromClueId,
      toClueId,
      relationship,
      isValid: validation.isValid,
      scoreImpact: validation.scoreImpact,
      sourceTrace: [
        `${fromClue.sourceType}: ${fromClue.sourceId}`,
        `${toClue.sourceType}: ${toClue.sourceId}`,
      ],
    };

    const record: OperationRecord = {
      id: nextId('op'),
      timestamp: Date.now(),
      type: 'CREATE_LINK',
      detail: `关联线索: "${fromClue.content}" ↔ "${toClue.content}" (${relationship})`,
      scoreImpact: validation.scoreImpact,
      linkId: link.id,
      clueId: fromClueId,
    };

    set({
      evidenceLinks: [...state.evidenceLinks, link],
      operationHistory: [...state.operationHistory, record],
      selectedClueId: null,
    });
  },

  deleteLink: (linkId: string) => {
    const state = get();
    const link = state.evidenceLinks.find((l) => l.id === linkId);
    if (!link) return;

    const fromClue = state.clues.find((c) => c.id === link.fromClueId);
    const toClue = state.clues.find((c) => c.id === link.toClueId);

    const record: OperationRecord = {
      id: nextId('op'),
      timestamp: Date.now(),
      type: 'DELETE_LINK',
      detail: `删除关联: "${fromClue?.content}" ↔ "${toClue?.content}"`,
      scoreImpact: 0,
      linkId,
    };

    set({
      evidenceLinks: state.evidenceLinks.filter((l) => l.id !== linkId),
      operationHistory: [...state.operationHistory, record],
    });
  },

  submitConclusion: (conclusion: Conclusion) => {
    const state = get();
    const caseData = cases.find((c) => c.id === state.currentCaseId);
    if (!caseData) return;

    const score = calculateScore(caseData, state.evidenceLinks, conclusion);

    const record: OperationRecord = {
      id: nextId('op'),
      timestamp: Date.now(),
      type: 'SUBMIT_CONCLUSION',
      detail: `提交结论: ${conclusion.mainIssue} / ${conclusion.severity}`,
      scoreImpact: score.total - (state.score?.total || 0),
    };

    set({
      userConclusion: conclusion,
      score,
      isCompleted: true,
      operationHistory: [...state.operationHistory, record],
    });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setExpandedMaterialId: (id) => set({ expandedMaterialId: id }),
  resetGame: () =>
    set({
      currentCaseId: null,
      clues: [],
      markedClueIds: [],
      evidenceLinks: [],
      operationHistory: [],
      userConclusion: null,
      score: null,
      isCompleted: false,
      selectedClueId: null,
      activeTab: 'songs',
      expandedMaterialId: null,
    }),
}));
