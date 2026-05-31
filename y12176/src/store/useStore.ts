import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Question, KnowledgeTag, DuplicateGroup, DifficultyDrift, ExamPaper, ExamStrategy, AnswerRecord, ChangeRecord, KnowledgeCategory, DifficultyLevel, TagStatus, QuestionStatus } from '../types';
import { seedKnowledgeTags, seedQuestions, seedDuplicateGroups, seedDifficultyDrifts } from '../data/seedData';
import { detectDifficultyDrift, detectDuplicates, generateExam, calculateCorrectRate } from '../utils/algorithms';

interface StoreState {
  questions: Question[];
  knowledgeTags: KnowledgeTag[];
  duplicateGroups: DuplicateGroup[];
  difficultyDrifts: DifficultyDrift[];
  examPapers: ExamPaper[];
  currentUser: {
    id: string;
    name: string;
    role: 'teacher' | 'researcher';
  };
  filters: {
    search: string;
    categories: KnowledgeCategory[];
    difficulties: DifficultyLevel[];
    tagStatus: TagStatus[];
    status: QuestionStatus[];
  };
  selectedQuestionIds: string[];
  currentPage: string;
  selectedQuestionId: string | null;
}

interface StoreActions {
  setCurrentPage: (page: string) => void;
  setSelectedQuestionId: (id: string | null) => void;
  setFilters: (filters: Partial<StoreState['filters']>) => void;
  toggleQuestionSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  updateQuestionTags: (questionId: string, tagIds: string[]) => void;
  updateQuestionDifficulty: (questionId: string, difficulty: DifficultyLevel, remark?: string) => void;
  addAnswerRecord: (questionId: string, record: Omit<AnswerRecord, 'id' | 'questionId'>) => void;
  addChangeRecord: (questionId: string, record: Omit<ChangeRecord, 'id' | 'questionId' | 'timestamp'>) => void;
  runDuplicateDetection: () => void;
  runDifficultyDriftDetection: () => void;
  resolveDuplicate: (groupId: string, keepId: string) => void;
  resolveDrift: (driftId: string, action: 'keep' | 'adjust', newDifficulty?: DifficultyLevel) => void;
  assignDrift: (driftId: string, assignee: string) => void;
  generateExamPaper: (strategy: Omit<ExamStrategy, 'id'>) => ExamPaper;
  exportExamPaper: (examId: string, format: 'xlsx' | 'pdf') => void;
  exportData: () => string;
  importData: (data: string) => void;
  resetToSeed: () => void;
  toggleUserRole: () => void;
  getFilteredQuestions: () => Question[];
  getQuestionById: (id: string) => Question | undefined;
  getTagsForQuestion: (questionId: string) => KnowledgeTag[];
  getDriftForQuestion: (questionId: string) => DifficultyDrift | undefined;
  getDuplicateForQuestion: (questionId: string) => DuplicateGroup | undefined;
}

export const useStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      questions: seedQuestions,
      knowledgeTags: seedKnowledgeTags,
      duplicateGroups: seedDuplicateGroups,
      difficultyDrifts: seedDifficultyDrifts,
      examPapers: [],
      currentUser: {
        id: 'user-1',
        name: '张老师',
        role: 'teacher',
      },
      filters: {
        search: '',
        categories: [],
        difficulties: [],
        tagStatus: [],
        status: [],
      },
      selectedQuestionIds: [],
      currentPage: 'dashboard',
      selectedQuestionId: null,

      setCurrentPage: (page) => set({ currentPage: page }),
      setSelectedQuestionId: (id) => set({ selectedQuestionId: id }),

      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),

      toggleQuestionSelection: (id) =>
        set((state) => ({
          selectedQuestionIds: state.selectedQuestionIds.includes(id)
            ? state.selectedQuestionIds.filter((x) => x !== id)
            : [...state.selectedQuestionIds, id],
        })),

      clearSelection: () => set({ selectedQuestionIds: [] }),

      selectAll: (ids) => set({ selectedQuestionIds: ids }),

      updateQuestion: (id, updates) =>
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === id ? { ...q, ...updates, updatedAt: Date.now() } : q
          ),
        })),

      updateQuestionTags: (questionId, tagIds) => {
        const state = get();
        const question = state.getQuestionById(questionId);
        if (!question) return;

        const oldTags = question.tags.join(',');
        const newTags = tagIds.join(',');

        if (oldTags !== newTags) {
          const newTagStatus: TagStatus = tagIds.length === 0 ? 'missing' : 'pending';
          state.addChangeRecord(questionId, {
            field: 'tags',
            oldValue: oldTags,
            newValue: newTags,
            operator: state.currentUser.name,
            remark: '更新知识点标签',
          });
          state.updateQuestion(questionId, { tags: tagIds, tagStatus: newTagStatus });
        }
      },

      updateQuestionDifficulty: (questionId, difficulty, remark) => {
        const state = get();
        const question = state.getQuestionById(questionId);
        if (!question || question.difficulty === difficulty) return;

        state.addChangeRecord(questionId, {
          field: 'difficulty',
          oldValue: question.difficulty,
          newValue: difficulty,
          operator: state.currentUser.name,
          remark: remark || '调整难度等级',
        });
        state.updateQuestion(questionId, { difficulty });
      },

      addAnswerRecord: (questionId, record) =>
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  answerRecords: [
                    ...q.answerRecords,
                    { ...record, id: `ans-${Date.now()}-${Math.random()}`, questionId },
                  ],
                  updatedAt: Date.now(),
                }
              : q
          ),
        })),

      addChangeRecord: (questionId, record) =>
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  changeHistory: [
                    ...q.changeHistory,
                    { ...record, id: `chg-${Date.now()}`, questionId, timestamp: Date.now() },
                  ],
                  updatedAt: Date.now(),
                }
              : q
          ),
        })),

      runDuplicateDetection: () => {
        const state = get();
        const newGroups = detectDuplicates(state.questions);
        set({ duplicateGroups: newGroups });
      },

      runDifficultyDriftDetection: () => {
        const state = get();
        const newDrifts = detectDifficultyDrift(state.questions);
        set({ difficultyDrifts: newDrifts });
      },

      resolveDuplicate: (groupId, keepId) =>
        set((state) => {
          const group = state.duplicateGroups.find((g) => g.id === groupId);
          if (!group) return state;

          return {
            questions: state.questions.map((q) => {
              if (q.id === keepId) {
                return { ...q, duplicateGroupId: undefined, status: 'active' as QuestionStatus };
              }
              if (group.questionIds.includes(q.id)) {
                return { ...q, duplicateGroupId: undefined, status: 'deprecated' as QuestionStatus };
              }
              return q;
            }),
            duplicateGroups: state.duplicateGroups.map((g) =>
              g.id === groupId ? { ...g, status: 'resolved' } : g
            ),
          };
        }),

      resolveDrift: (driftId, action, newDifficulty) => {
        const state = get();
        const drift = state.difficultyDrifts.find((d) => d.id === driftId);
        if (!drift) return;

        if (action === 'adjust' && newDifficulty) {
          state.updateQuestionDifficulty(
            drift.questionId,
            newDifficulty,
            '根据难度漂移检测结果调整'
          );
        }

        set((s) => ({
          difficultyDrifts: s.difficultyDrifts.map((d) =>
            d.id === driftId ? { ...d, status: 'resolved' } : d
          ),
        }));
      },

      assignDrift: (driftId, assignee) =>
        set((state) => ({
          difficultyDrifts: state.difficultyDrifts.map((d) =>
            d.id === driftId ? { ...d, assignee, status: 'reviewed' } : d
          ),
        })),

      generateExamPaper: (strategy) => {
        const state = get();
        const fullStrategy: ExamStrategy = { ...strategy, id: `strat-${Date.now()}` };
        const exam = generateExam(fullStrategy, state.questions, state.knowledgeTags);
        set((s) => ({
          examPapers: [...s.examPapers, exam],
        }));
        return exam;
      },

      exportExamPaper: () => {},

      exportData: () => {
        const state = get();
        const data = {
          questions: state.questions,
          knowledgeTags: state.knowledgeTags,
          duplicateGroups: state.duplicateGroups,
          difficultyDrifts: state.difficultyDrifts,
          examPapers: state.examPapers,
          exportedAt: Date.now(),
        };
        return JSON.stringify(data, null, 2);
      },

      importData: (dataStr) => {
        try {
          const data = JSON.parse(dataStr);
          set({
            questions: data.questions || [],
            knowledgeTags: data.knowledgeTags || [],
            duplicateGroups: data.duplicateGroups || [],
            difficultyDrifts: data.difficultyDrifts || [],
            examPapers: data.examPapers || [],
          });
        } catch (e) {
          console.error('Import failed:', e);
        }
      },

      resetToSeed: () =>
        set({
          questions: seedQuestions,
          knowledgeTags: seedKnowledgeTags,
          duplicateGroups: seedDuplicateGroups,
          difficultyDrifts: seedDifficultyDrifts,
          examPapers: [],
        }),

      toggleUserRole: () =>
        set((state) => ({
          currentUser: {
            ...state.currentUser,
            role: state.currentUser.role === 'teacher' ? 'researcher' : 'teacher',
            name: state.currentUser.role === 'teacher' ? '李教研员' : '张老师',
          },
        })),

      getFilteredQuestions: () => {
        const state = get();
        const { search, categories, difficulties, tagStatus, status } = state.filters;

        return state.questions.filter((q) => {
          if (search && !q.title.toLowerCase().includes(search.toLowerCase())) {
            return false;
          }

          if (difficulties.length > 0 && !difficulties.includes(q.difficulty)) {
            return false;
          }

          if (tagStatus.length > 0 && !tagStatus.includes(q.tagStatus)) {
            return false;
          }

          if (status.length > 0 && !status.includes(q.status)) {
            return false;
          }

          if (categories.length > 0) {
            const questionCategories = q.tags
              .map((t) => state.knowledgeTags.find((kt) => kt.id === t)?.category)
              .filter(Boolean);
            if (!questionCategories.some((c) => categories.includes(c as KnowledgeCategory))) {
              return false;
            }
          }

          return true;
        });
      },

      getQuestionById: (id) => get().questions.find((q) => q.id === id),

      getTagsForQuestion: (questionId) => {
        const state = get();
        const question = state.questions.find((q) => q.id === questionId);
        if (!question) return [];
        return question.tags
          .map((t) => state.knowledgeTags.find((kt) => kt.id === t))
          .filter(Boolean) as KnowledgeTag[];
      },

      getDriftForQuestion: (questionId) =>
        get().difficultyDrifts.find((d) => d.questionId === questionId && d.status !== 'resolved'),

      getDuplicateForQuestion: (questionId) =>
        get().duplicateGroups.find(
          (g) => g.questionIds.includes(questionId) && g.status !== 'resolved'
        ),
    }),
    {
      name: 'music-question-bank-storage',
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          return {
            ...(persistedState as object),
            examPapers: [],
          };
        }
        return persistedState as StoreState & StoreActions;
      },
    }
  )
);
