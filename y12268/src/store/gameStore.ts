import { create } from 'zustand'
import type { GameState, Difficulty, ProjectCard, EvidenceEntry, RevenueVersion, DelayRecord, Settlement, GameStatus } from '@/types/game'
import { DIFFICULTY_CONFIGS, generateProjectCards, resolveProjectOutcomes } from '@/engine/projects'
import { processTurn, calculateSettlement, checkEndCondition, calculateComprehensiveRate, calculateInterest, calculateRevenue } from '@/engine/calculations'
import {
  createInterestEvidence,
  createRevenueEvidence,
  createDelayEvidence,
  createConsistencyEvidence,
} from '@/engine/evidence'

interface GameActions {
  startGame: (difficulty: Difficulty) => void
  setBudget: (infra: number, interest: number, welfare: number) => void
  toggleProject: (projectId: string) => void
  confirmTurn: () => void
  pauseGame: () => void
  resumeGame: () => void
  restartGame: () => void
  goToSettlement: () => void
}

const initialState: GameState = {
  id: '',
  difficulty: 'normal',
  config: DIFFICULTY_CONFIGS.normal,
  currentTurn: 1,
  treasury: 0,
  debt: 0,
  satisfaction: 0,
  comprehensiveRate: 0,
  totalInfraInvestment: 0,
  status: 'idle',
  turns: [],
  snapshots: [],
  projects: [],
  currentProjects: [],
  evidenceLog: [],
  revenueVersions: [],
  delayRecords: [],
  settlement: null,
  infraInvestment: 0,
  interestPayment: 0,
  welfareSpending: 0,
  acceptedProjectIds: [],
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,

  startGame: (difficulty: Difficulty) => {
    const config = DIFFICULTY_CONFIGS[difficulty]
    const compRate = calculateComprehensiveRate(config.initialDebt, config.initialDebt, config.baseInterestRate)
    const projects = generateProjectCards(1, difficulty)
    set({
      id: `game_${Date.now()}`,
      difficulty,
      config,
      currentTurn: 1,
      treasury: config.initialTreasury,
      debt: config.initialDebt,
      satisfaction: config.initialSatisfaction,
      comprehensiveRate: compRate,
      totalInfraInvestment: 0,
      status: 'playing',
      turns: [],
      snapshots: [],
      projects: [],
      currentProjects: projects,
      evidenceLog: [],
      revenueVersions: [],
      delayRecords: [],
      settlement: null,
      infraInvestment: 0,
      interestPayment: 0,
      welfareSpending: 0,
      acceptedProjectIds: [],
    })
  },

  setBudget: (infra: number, interest: number, welfare: number) => {
    set({ infraInvestment: infra, interestPayment: interest, welfareSpending: welfare })
  },

  toggleProject: (projectId: string) => {
    const { currentProjects, acceptedProjectIds } = get()
    const newAccepted = acceptedProjectIds.includes(projectId)
      ? acceptedProjectIds.filter(id => id !== projectId)
      : [...acceptedProjectIds, projectId]

    const updatedProjects = currentProjects.map(p => ({
      ...p,
      accepted: newAccepted.includes(p.id),
    }))

    set({ acceptedProjectIds: newAccepted, currentProjects: updatedProjects })
  },

  confirmTurn: () => {
    const state = get()
    const {
      currentTurn, treasury, debt, satisfaction, comprehensiveRate, config,
      totalInfraInvestment, infraInvestment, interestPayment, welfareSpending,
      currentProjects, acceptedProjectIds, evidenceLog, revenueVersions, delayRecords,
      projects,
    } = state

    const acceptedProjects = currentProjects.filter(p => acceptedProjectIds.includes(p.id))
    const { completedProjects, delayedProjects } = resolveProjectOutcomes(acceptedProjects, currentTurn)

    const allAcceptedWithOutcomes = acceptedProjects.map(p => {
      const delayed = delayedProjects.find(dp => dp.id === p.id)
      const completed = completedProjects.find(cp => cp.id === p.id)
      if (delayed) return delayed
      if (completed) return completed
      return p
    })

    const previousInterest = state.turns.length > 0
      ? state.turns[state.turns.length - 1].interestAccrued
      : 0

    const result = processTurn(
      currentTurn, treasury, debt, satisfaction, comprehensiveRate, config,
      totalInfraInvestment, infraInvestment, interestPayment, welfareSpending,
      allAcceptedWithOutcomes, previousInterest,
    )

    const newEvidence: EvidenceEntry[] = []
    const newRevenueVersions: RevenueVersion[] = []
    const newDelayRecords: DelayRecord[] = []

    const interestEv = createInterestEvidence(
      currentTurn, debt, comprehensiveRate, result.interestAccrued,
      interestPayment, previousInterest, result.isInterestUnderpaid,
    )
    newEvidence.push(interestEv)

    const oldRevenue = state.turns.length > 0
      ? state.turns[state.turns.length - 1].revenue
      : config.baseRevenue
    if (Math.abs(result.revenue - oldRevenue) > 0.1) {
      const { evidence, version } = createRevenueEvidence(
        currentTurn, oldRevenue, result.revenue,
        `满意度${satisfaction.toFixed(0)}→${result.newSatisfaction.toFixed(0)} | 基建累计${result.newTotalInfraInvestment}`,
      )
      newEvidence.push(evidence)
      newRevenueVersions.push(version)
    }

    for (const dp of delayedProjects) {
      const { evidence, delayRecord } = createDelayEvidence(currentTurn, dp, 10)
      newEvidence.push(evidence)
      newDelayRecords.push(delayRecord)
    }

    for (const project of allAcceptedWithOutcomes) {
      if (project.type === 'infrastructure' && project.expectedReturn > 0) {
        const projectConcludesPositive = project.expectedReturn > project.cost * 0.1
        const debtConcludesNegative = result.newDebt > debt
        if (projectConcludesPositive && debtConcludesNegative) {
          const consistencyEv = createConsistencyEvidence(
            currentTurn,
            project.name,
            `项目预期回报${project.expectedReturn.toFixed(1)}万>成本${project.cost}万的10%，判定为可行`,
            `债务${debt.toFixed(1)}万→${result.newDebt.toFixed(1)}万，债务上升`,
            result.newSatisfaction,
          )
          newEvidence.push(consistencyEv)
        }
      }
    }

    const endCheck = checkEndCondition(currentTurn + 1, config.maxTurns, result.newSatisfaction, result.newDebt, config.initialDebt)

    const newStatus: GameStatus = endCheck.ended ? 'ended' : 'playing'
    const nextTurn = currentTurn + 1
    const nextProjects = endCheck.ended ? [] : generateProjectCards(nextTurn, state.difficulty)

    const allProjects = [...projects, ...allAcceptedWithOutcomes]

    set({
      currentTurn: nextTurn,
      treasury: result.newTreasury,
      debt: result.newDebt,
      satisfaction: result.newSatisfaction,
      comprehensiveRate: result.newComprehensiveRate,
      totalInfraInvestment: result.newTotalInfraInvestment,
      status: newStatus,
      turns: [...state.turns, result.turnData],
      snapshots: [...state.snapshots, result.snapshot],
      projects: allProjects,
      currentProjects: nextProjects,
      evidenceLog: [...evidenceLog, ...newEvidence],
      revenueVersions: [...revenueVersions, ...newRevenueVersions],
      delayRecords: [...delayRecords, ...newDelayRecords],
      infraInvestment: 0,
      interestPayment: 0,
      welfareSpending: 0,
      acceptedProjectIds: [],
    })
  },

  pauseGame: () => set({ status: 'paused' }),
  resumeGame: () => set({ status: 'playing' }),
  restartGame: () => set(initialState),

  goToSettlement: () => {
    const state = get()
    const settlement = calculateSettlement(
      state.config, state.turns, state.debt, state.satisfaction,
      state.totalInfraInvestment, state.projects.filter(p => p.delayed),
      state.evidenceLog,
    )
    set({ settlement, status: 'ended' })
  },
}))
