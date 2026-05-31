import { create } from 'zustand';
import type { GameStore, Difficulty, VerdictDecision, Toast } from '@/types';
import { DIFFICULTY_CONFIG } from '@/types';
import { initializeGameData } from '@/data/mockData';
import { validateClueAssociation, checkRiskTrigger, checkVerdict, calculateScore, canSubmitVerdict } from '@/utils/gameLogic';
import type { FinalReport } from '@/utils/reportGenerator';
import { generateFinalReport } from '@/utils/reportGenerator';

const initialScoreBreakdown = {
  correctAssociation: 0,
  wrongAssociation: 0,
  correctVerdict: 0,
  wrongVerdict: 0,
  timePenalty: 0,
  timeBonus: 0,
  riskDiscovered: 0,
  incompletePenalty: 0,
};

const createInitialState = () => {
  const { cases, clues, unassignedClues, risks } = initializeGameData('easy');
  
  return {
    status: 'idle' as const,
    difficulty: 'easy' as Difficulty,
    timeLimit: DIFFICULTY_CONFIG.easy.timeLimit,
    timeRemaining: DIFFICULTY_CONFIG.easy.timeLimit,
    score: 0,
    scoreBreakdown: { ...initialScoreBreakdown },
    cases,
    clues,
    unassignedClues,
    discoveredRisks: risks.filter((r) => r.isDiscovered),
    toasts: [] as Toast[],
    startTime: null as number | null,
    endTime: null as number | null,
    finalReport: null as FinalReport | null,
  };
};

export const useGameStore = create<GameStore & { finalReport: FinalReport | null }>((set, get) => ({
  ...createInitialState(),

  startGame: (difficulty: Difficulty) => {
    const config = DIFFICULTY_CONFIG[difficulty];
    const { cases, clues, unassignedClues } = initializeGameData(difficulty);
    
    set({
      status: 'playing',
      difficulty,
      timeLimit: config.timeLimit,
      timeRemaining: config.timeLimit,
      score: 0,
      scoreBreakdown: { ...initialScoreBreakdown },
      cases,
      clues,
      unassignedClues,
      discoveredRisks: [],
      toasts: [],
      startTime: Date.now(),
      endTime: null,
      finalReport: null,
    });
  },

  pauseGame: () => {
    if (get().status === 'playing') {
      set({ status: 'paused' });
    }
  },

  resumeGame: () => {
    if (get().status === 'paused') {
      set({ status: 'playing' });
    }
  },

  restartGame: () => {
    const state = get();
    state.startGame(state.difficulty);
  },

  tick: () => {
    const state = get();
    if (state.status !== 'playing') return;

    const newTimeRemaining = state.timeRemaining - 1;
    const timePenalty = -0.1;
    
    const newBreakdown = {
      ...state.scoreBreakdown,
      timePenalty: state.scoreBreakdown.timePenalty + timePenalty,
    };
    
    const newScore = calculateScore(newBreakdown);

    if (newTimeRemaining <= 0) {
      set({
        timeRemaining: 0,
        scoreBreakdown: newBreakdown,
        score: newScore,
      });
      get().finishGame();
    } else {
      set({
        timeRemaining: newTimeRemaining,
        scoreBreakdown: newBreakdown,
        score: newScore,
      });
    }
  },

  assignClue: (clueId: string, caseId: string) => {
    const state = get();
    const clue = state.clues.find((c) => c.id === clueId);
    if (!clue) return;

    const isCorrect = validateClueAssociation(clue, caseId);
    
    let newBreakdown = { ...state.scoreBreakdown };
    let newCases = [...state.cases];
    let newUnassignedClues = [...state.unassignedClues];
    let newDiscoveredRisks = [...state.discoveredRisks];

    if (isCorrect) {
      newBreakdown.correctAssociation += 10;
      
      const updatedClue = { ...clue, currentCaseId: caseId };
      newUnassignedClues = newUnassignedClues.filter((c) => c.id !== clueId);
      
      newCases = newCases.map((c) => {
        if (c.id === caseId) {
          const existingClueIndex = c.clues.findIndex((cl) => cl.id === clueId);
          let newCaseClues;
          if (existingClueIndex >= 0) {
            newCaseClues = [...c.clues];
            newCaseClues[existingClueIndex] = updatedClue;
          } else {
            newCaseClues = [...c.clues, updatedClue];
          }
          return { ...c, clues: newCaseClues };
        }
        return c;
      });

      const allRisks = state.cases.flatMap((c) => c.risks);
      const triggeredRisk = checkRiskTrigger(clue, allRisks);
      if (triggeredRisk && !triggeredRisk.isDiscovered) {
        newBreakdown.riskDiscovered += 20;
        
        const updatedRisk = { ...triggeredRisk, isDiscovered: true, discoveredAt: Date.now() };
        newDiscoveredRisks = [...newDiscoveredRisks, updatedRisk];
        
        newCases = newCases.map((c) => {
          if (c.id === caseId) {
            return {
              ...c,
              risks: c.risks.map((r) => 
                r.id === triggeredRisk.id ? updatedRisk : r
              ),
            };
          }
          return c;
        });

        get().addToast('warning', `⚠️ 发现风险：${triggeredRisk.title}`);
      }

      get().addToast('success', '✅ 线索关联正确！+10分');
    } else {
      newBreakdown.wrongAssociation -= 5;
      get().addToast('error', '❌ 线索归错案件了！-5分');
    }

    const newScore = calculateScore(newBreakdown);
    
    set({
      scoreBreakdown: newBreakdown,
      score: newScore,
      cases: newCases,
      unassignedClues: newUnassignedClues,
      discoveredRisks: newDiscoveredRisks,
    });
  },

  unassignClue: (clueId: string) => {
    const state = get();
    const clue = state.clues.find((c) => c.id === clueId);
    if (!clue || !clue.currentCaseId) return;

    let newCases = state.cases.map((c) => {
      if (c.id === clue.currentCaseId) {
        return {
          ...c,
          clues: c.clues.map((cl) =>
            cl.id === clueId ? { ...cl, currentCaseId: null } : cl
          ),
        };
      }
      return c;
    });

    const updatedClue = { ...clue, currentCaseId: null };
    const newUnassignedClues = [...state.unassignedClues, updatedClue];

    set({
      cases: newCases,
      unassignedClues: newUnassignedClues,
    });
  },

  submitVerdict: (caseId: string, verdict: VerdictDecision) => {
    const state = get();
    const caseItem = state.cases.find((c) => c.id === caseId);
    if (!caseItem || caseItem.isCompleted) return;

    if (!canSubmitVerdict(caseItem)) {
      get().addToast('warning', '⚠️ 证据不足，还不能做出判定！');
      return;
    }

    const { isCorrect, explanation } = checkVerdict(caseItem, verdict);
    
    let newBreakdown = { ...state.scoreBreakdown };
    if (isCorrect) {
      newBreakdown.correctVerdict += 50;
      get().addToast('success', `✅ ${explanation}`);
    } else {
      newBreakdown.wrongVerdict -= 30;
      get().addToast('error', `❌ ${explanation}`);
    }

    const newCases = state.cases.map((c) => {
      if (c.id === caseId) {
        return {
          ...c,
          userVerdict: verdict,
          isCompleted: true,
          completedAt: Date.now(),
        };
      }
      return c;
    });

    const newScore = calculateScore(newBreakdown);
    const allCompleted = newCases.every((c) => c.isCompleted);

    set({
      scoreBreakdown: newBreakdown,
      score: newScore,
      cases: newCases,
    });

    if (allCompleted) {
      const timeBonus = get().timeRemaining * 0.5;
      const finalBreakdown = {
        ...newBreakdown,
        timeBonus,
      };
      const finalScore = calculateScore(finalBreakdown);
      
      set({
        scoreBreakdown: finalBreakdown,
        score: finalScore,
      });
      
      get().finishGame();
    }
  },

  finishGame: () => {
    const state = get();
    
    let newBreakdown = { ...state.scoreBreakdown };
    const incompleteCases = state.cases.filter((c) => !c.isCompleted);
    if (incompleteCases.length > 0) {
      newBreakdown.incompletePenalty = -100 * incompleteCases.length;
    }

    const finalScore = calculateScore(newBreakdown);

    const report = generateFinalReport(
      state.cases,
      finalScore,
      newBreakdown,
      state.difficulty,
      state.timeLimit,
      state.timeRemaining
    );

    set({
      status: 'finished',
      endTime: Date.now(),
      scoreBreakdown: newBreakdown,
      score: finalScore,
      finalReport: report,
    });
  },

  addToast: (type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    const toast: Toast = { id, type, message, duration: 3000 };
    
    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    setTimeout(() => {
      get().removeToast(id);
    }, toast.duration);
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
