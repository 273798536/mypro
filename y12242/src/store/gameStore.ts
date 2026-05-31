import { create } from 'zustand'
import type {
  CaseData,
  GameState,
  Judgment,
  MaterialType,
  ReplayEvent,
  TrapHit,
  Verdict,
} from '@/types'
import { validateJudgment } from '@/utils/judgmentValidator'
import { checkTraps } from '@/utils/trapChecker'

interface GameStore extends GameState {
  startCase: (caseData: CaseData) => void
  submitJudgment: (materialId: string, materialType: MaterialType, verdict: Verdict, reason: string) => void
  dismissFeedback: () => void
  selectMaterial: (materialId: string | null) => void
  endGame: () => void
  tick: () => void
  resetGame: () => void
  addReplayEvent: (event: Omit<ReplayEvent, 'timestamp'>) => void
}

const initialState: GameState = {
  currentCase: null,
  judgments: [],
  trapHits: [],
  replayEvents: [],
  timeRemaining: 0,
  gameStarted: false,
  gameEnded: false,
  selectedMaterialId: null,
  feedbackModal: {
    visible: false,
    judgment: null,
    trapHit: null,
    correctVerdict: null,
    correctReason: '',
  },
  completedCases: {},
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  startCase: (caseData: CaseData) => {
    set({
      currentCase: caseData,
      judgments: [],
      trapHits: [],
      replayEvents: [],
      timeRemaining: caseData.timeLimitSeconds,
      gameStarted: true,
      gameEnded: false,
      selectedMaterialId: null,
      feedbackModal: {
        visible: false,
        judgment: null,
        trapHit: null,
        correctVerdict: null,
        correctReason: '',
      },
    })
    get().addReplayEvent({
      action: 'start_case',
      detail: `开始审查案件：${caseData.title}`,
    })
  },

  submitJudgment: (materialId, materialType, verdict, reason) => {
    const state = get()
    if (!state.currentCase || state.gameEnded) return

    const existingJudgment = state.judgments.find(j => j.materialId === materialId)
    if (existingJudgment) return

    const judgment: Judgment = {
      id: `j-${Date.now()}-${materialId}`,
      materialId,
      materialType,
      verdict,
      reason,
      timestamp: Date.now(),
      isCorrect: false,
    }

    const validation = validateJudgment(judgment, state.currentCase)
    judgment.isCorrect = validation.isCorrect
    judgment.trapId = validation.trapId

    const trapHits = checkTraps(judgment, state.currentCase.traps, [...state.judgments, judgment], state.currentCase)
    const mainTrapHit = trapHits.length > 0 ? trapHits[0] : null

    set({
      judgments: [...state.judgments, judgment],
      trapHits: [...state.trapHits, ...trapHits],
      feedbackModal: {
        visible: true,
        judgment,
        trapHit: mainTrapHit,
        correctVerdict: validation.expectedVerdict,
        correctReason: validation.correctReason,
      },
    })

    get().addReplayEvent({
      action: 'submit_judgment',
      materialId,
      materialType,
      detail: `对材料 ${materialId} 做出判定：${verdictLabel(verdict)}${!validation.isCorrect ? '（错误）' : '（正确）'}${mainTrapHit ? `，触发陷阱：${mainTrapHit.explanation}` : ''}`,
    })

    const allMaterials = getAllMaterialIds(state.currentCase)
    const newJudgments = [...state.judgments, judgment]
    if (allMaterials.every(id => newJudgments.some(j => j.materialId === id))) {
      setTimeout(() => get().endGame(), 500)
    }
  },

  dismissFeedback: () => {
    set({
      feedbackModal: {
        visible: false,
        judgment: null,
        trapHit: null,
        correctVerdict: null,
        correctReason: '',
      },
    })
  },

  selectMaterial: (materialId) => {
    set({ selectedMaterialId: materialId })
    if (materialId) {
      get().addReplayEvent({
        action: 'select_material',
        materialId,
        detail: `查看材料 ${materialId}`,
      })
    }
  },

  endGame: () => {
    const state = get()
    if (!state.currentCase) return

    const correctCount = state.judgments.filter(j => j.isCorrect).length
    const totalCount = state.judgments.length
    const trapIdentifiedCount = state.currentCase.traps.filter(
      trap => !state.trapHits.some(hit => hit.trapId === trap.id)
    ).length
    const timeUsed = state.currentCase.timeLimitSeconds - state.timeRemaining
    const score = Math.round((correctCount / Math.max(totalCount, 1)) * 100)

    set({
      gameEnded: true,
      gameStarted: false,
      completedCases: {
        ...state.completedCases,
        [state.currentCase.id]: {
          score,
          correctCount,
          totalCount,
          trapIdentifiedCount,
          timeUsed,
        },
      },
    })

    get().addReplayEvent({
      action: 'end_case',
      detail: `审查结束，得分 ${score}，正确 ${correctCount}/${totalCount}`,
    })
  },

  tick: () => {
    const state = get()
    if (!state.gameStarted || state.gameEnded) return

    const newTime = state.timeRemaining - 1
    if (newTime <= 0) {
      set({ timeRemaining: 0 })
      get().endGame()
    } else {
      set({ timeRemaining: newTime })
    }
  },

  resetGame: () => {
    set(initialState)
  },

  addReplayEvent: (event) => {
    const state = get()
    set({
      replayEvents: [
        ...state.replayEvents,
        { ...event, timestamp: Date.now() },
      ],
    })
  },
}))

function verdictLabel(verdict: Verdict): string {
  const map: Record<string, string> = {
    approved: '通过',
    rejected: '拒赔',
    pending_review: '待查',
  }
  return map[verdict] || verdict
}

function getAllMaterialIds(caseData: CaseData): string[] {
  return [
    ...caseData.policyCards.map(m => m.id),
    ...caseData.medicalRecords.map(m => m.id),
    ...caseData.invoices.map(m => m.id),
    ...caseData.clauses.map(m => m.id),
  ]
}
