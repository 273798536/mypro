import { create } from 'zustand'
import type {
  UserJudgment,
  CaseReport,
  GameState,
  Case,
  Clue,
  AudioClue,
  AnswerOption,
} from '@/types'
import {
  getCaseById,
  getCluesByCaseId,
  getAudioCluesByCaseId,
  getAnswerOptionsByCaseId,
  getAnswerById,
} from '@/data/mockData'
import { analyzeClueCombination } from '@/utils/clueEngine'
import { analyzeError, calculateFinalScore } from '@/utils/errorAnalysis'
import { generateCaseReport } from '@/utils/reportGenerator'

interface GameStore extends GameState {
  currentCaseId: string | null
  selectedClueIds: string[]
  selectedAudioClueIds: string[]
  selectedAnswerId: string | null
  readClueIds: string[]
  playedAudioClueIds: string[]
  highlightedSourceId: string | null
  lastReport: CaseReport | null

  setCurrentCase: (caseId: string) => void
  resetCaseState: () => void
  toggleClueSelection: (clueId: string) => void
  toggleAudioClueSelection: (audioClueId: string) => void
  setSelectedAnswer: (answerId: string) => void
  markClueAsRead: (clueId: string) => void
  markAudioAsPlayed: (audioClueId: string) => void
  setHighlightedSource: (sourceId: string | null) => void
  submitJudgment: () => { success: boolean; report?: CaseReport }
  addScore: (points: number) => void
  markCaseSolved: (caseId: string) => void
  getCurrentCaseData: () => {
    caseData: Case | undefined
    clues: Clue[]
    audioClues: AudioClue[]
    answerOptions: AnswerOption[]
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  totalScore: 0,
  solvedCases: [],
  currentJudgment: null,
  currentCaseId: null,
  selectedClueIds: [],
  selectedAudioClueIds: [],
  selectedAnswerId: null,
  readClueIds: [],
  playedAudioClueIds: [],
  highlightedSourceId: null,
  lastReport: null,

  setCurrentCase: (caseId: string) => {
    set({
      currentCaseId: caseId,
      selectedClueIds: [],
      selectedAudioClueIds: [],
      selectedAnswerId: null,
      readClueIds: [],
      playedAudioClueIds: [],
      currentJudgment: null,
    })
  },

  resetCaseState: () => {
    set({
      selectedClueIds: [],
      selectedAudioClueIds: [],
      selectedAnswerId: null,
      currentJudgment: null,
      lastReport: null,
    })
  },

  toggleClueSelection: (clueId: string) => {
    set((state) => {
      const isSelected = state.selectedClueIds.includes(clueId)
      return {
        selectedClueIds: isSelected
          ? state.selectedClueIds.filter((id) => id !== clueId)
          : [...state.selectedClueIds, clueId],
      }
    })
  },

  toggleAudioClueSelection: (audioClueId: string) => {
    set((state) => {
      const isSelected = state.selectedAudioClueIds.includes(audioClueId)
      return {
        selectedAudioClueIds: isSelected
          ? state.selectedAudioClueIds.filter((id) => id !== audioClueId)
          : [...state.selectedAudioClueIds, audioClueId],
      }
    })
  },

  setSelectedAnswer: (answerId: string) => {
    set({ selectedAnswerId: answerId })
  },

  markClueAsRead: (clueId: string) => {
    set((state) => {
      if (state.readClueIds.includes(clueId)) return {}
      return { readClueIds: [...state.readClueIds, clueId] }
    })
  },

  markAudioAsPlayed: (audioClueId: string) => {
    set((state) => {
      if (state.playedAudioClueIds.includes(audioClueId)) return {}
      return { playedAudioClueIds: [...state.playedAudioClueIds, audioClueId] }
    })
  },

  setHighlightedSource: (sourceId: string | null) => {
    set({ highlightedSourceId: sourceId })
  },

  submitJudgment: () => {
    const state = get()
    if (!state.currentCaseId || !state.selectedAnswerId) {
      return { success: false }
    }

    const caseData = getCaseById(state.currentCaseId)
    const allClues = getCluesByCaseId(state.currentCaseId)
    const allAudioClues = getAudioCluesByCaseId(state.currentCaseId)
    const selectedAnswer = getAnswerById(state.selectedAnswerId)
    const correctAnswer = getAnswerById(caseData!.correctAnswerId)

    if (!caseData || !selectedAnswer || !correctAnswer) {
      return { success: false }
    }

    const combinationAnalysis = analyzeClueCombination(
      allClues,
      allAudioClues,
      state.selectedClueIds,
      state.selectedAudioClueIds,
      caseData.correctClueIds,
      caseData.correctAudioClueIds
    )

    const hasDuplicateClues = combinationAnalysis.duplicateClues.length > 0

    const errorAnalysis = analyzeError({
      caseId: caseData.id,
      selectedAnswer,
      correctAnswer,
      selectedClueIds: state.selectedClueIds,
      selectedAudioClueIds: state.selectedAudioClueIds,
      allClues,
      allAudioClues,
      hasDuplicateClues,
    })

    const finalScore = calculateFinalScore(
      selectedAnswer.isCorrect,
      combinationAnalysis.combinationScore,
      errorAnalysis?.type || 'other'
    )

    const userJudgment: UserJudgment = {
      id: `judgment-${Date.now()}`,
      caseId: caseData.id,
      selectedAnswerId: state.selectedAnswerId,
      selectedClueIds: state.selectedClueIds,
      selectedAudioClueIds: state.selectedAudioClueIds,
      isCorrect: selectedAnswer.isCorrect,
      score: finalScore,
      timestamp: Date.now(),
    }

    const report = generateCaseReport({
      caseData,
      userJudgment,
      correctAnswer,
      selectedAnswer,
      errorAnalysis,
      combinationAnalysis,
      allClues,
      allAudioClues,
    })

    set({
      currentJudgment: userJudgment,
      lastReport: report,
      totalScore: state.totalScore + finalScore,
      solvedCases: state.solvedCases.includes(caseData.id)
        ? state.solvedCases
        : [...state.solvedCases, caseData.id],
    })

    return { success: true, report }
  },

  addScore: (points: number) => {
    set((state) => ({ totalScore: state.totalScore + points }))
  },

  markCaseSolved: (caseId: string) => {
    set((state) => ({
      solvedCases: state.solvedCases.includes(caseId)
        ? state.solvedCases
        : [...state.solvedCases, caseId],
    }))
  },

  getCurrentCaseData: () => {
    const state = get()
    if (!state.currentCaseId) {
      return { caseData: undefined, clues: [], audioClues: [], answerOptions: [] }
    }
    return {
      caseData: getCaseById(state.currentCaseId),
      clues: getCluesByCaseId(state.currentCaseId),
      audioClues: getAudioCluesByCaseId(state.currentCaseId),
      answerOptions: getAnswerOptionsByCaseId(state.currentCaseId),
    }
  },
}))
