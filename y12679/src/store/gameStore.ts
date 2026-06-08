import { create } from 'zustand'
import type {
  GameState,
  GameStatus,
  Screenshot,
  SampleData,
  CrossSection,
  AnalysisResult,
} from '@/types'
import { sampleDataList, getSampleById } from '@/data/samples'
import {
  updateAllCrossSectionViolations,
  analyzeScreenshotForViolations,
} from '@/utils/collision'

interface GameStore {
  gameState: GameState
  currentSample: SampleData | null
  crossSections: CrossSection[]
  analysisResult: AnalysisResult | null

  loadSample: (sampleId: string) => void
  startGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  resetGame: () => void
  finishGame: () => void
  tick: (deltaTime: number) => void

  addScreenshot: (imageData: string, description: string) => void
  removeScreenshot: (id: string) => void
  updateScreenshotDescription: (id: string, description: string) => void
  updateCollisionDetection: () => void

  getAvailableSamples: () => SampleData[]
  generateAnalysis: () => AnalysisResult
}

const createInitialGameState = (): GameState => ({
  id: Math.random().toString(36).substring(2, 11),
  status: 'idle',
  startTime: null,
  endTime: null,
  currentSampleId: 'sample-success',
  screenshots: [],
  elapsedTime: 0,
  currentFrame: 0,
})

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: createInitialGameState(),
  currentSample: null,
  crossSections: [],
  analysisResult: null,

  getAvailableSamples: () => sampleDataList,

  loadSample: (sampleId: string) => {
    const sample = getSampleById(sampleId)
    if (!sample) return

    const updatedCrossSections = updateAllCrossSectionViolations(
      sample.crossSections,
      sample.airflowData.paths,
      sample.layoutData
    )

    set({
      currentSample: sample,
      crossSections: updatedCrossSections,
      gameState: {
        ...createInitialGameState(),
        currentSampleId: sampleId,
      },
      analysisResult: null,
    })
  },

  startGame: () => {
    const { gameState, currentSample } = get()
    if (!currentSample) return

    set({
      gameState: {
        ...gameState,
        status: 'running',
        startTime: new Date(),
        elapsedTime: 0,
        currentFrame: 0,
      },
    })
  },

  pauseGame: () => {
    const { gameState } = get()
    if (gameState.status !== 'running') return

    set({
      gameState: {
        ...gameState,
        status: 'paused',
      },
    })
  },

  resumeGame: () => {
    const { gameState } = get()
    if (gameState.status !== 'paused') return

    set({
      gameState: {
        ...gameState,
        status: 'running',
      },
    })
  },

  resetGame: () => {
    const { gameState, currentSample } = get()
    if (!currentSample) return

    const updatedCrossSections = updateAllCrossSectionViolations(
      currentSample.crossSections,
      currentSample.airflowData.paths,
      currentSample.layoutData
    )

    set({
      gameState: {
        ...createInitialGameState(),
        currentSampleId: gameState.currentSampleId,
      },
      crossSections: updatedCrossSections,
      analysisResult: null,
    })
  },

  finishGame: () => {
    const { gameState } = get()
    const analysis = get().generateAnalysis()

    set({
      gameState: {
        ...gameState,
        status: 'finished',
        endTime: new Date(),
      },
      analysisResult: analysis,
    })
  },

  tick: (deltaTime: number) => {
    const { gameState } = get()
    if (gameState.status !== 'running') return

    set({
      gameState: {
        ...gameState,
        elapsedTime: gameState.elapsedTime + deltaTime,
        currentFrame: gameState.currentFrame + 1,
      },
    })
  },

  addScreenshot: (imageData: string, description: string) => {
    const { gameState, crossSections } = get()

    const detectedViolations = analyzeScreenshotForViolations(
      { description },
      crossSections
    )

    const screenshot: Screenshot = {
      id: Math.random().toString(36).substring(2, 11),
      imageData,
      timestamp: new Date(),
      description,
      hasViolation: crossSections.some((cs) => cs.isViolated) || detectedViolations.length > 0,
      detectedViolations,
    }

    set({
      gameState: {
        ...gameState,
        screenshots: [...gameState.screenshots, screenshot],
      },
    })

    get().updateCollisionDetection()
  },

  removeScreenshot: (id: string) => {
    const { gameState } = get()
    set({
      gameState: {
        ...gameState,
        screenshots: gameState.screenshots.filter((s) => s.id !== id),
      },
    })
    get().updateCollisionDetection()
  },

  updateScreenshotDescription: (id: string, description: string) => {
    const { gameState, crossSections } = get()

    const updatedScreenshots = gameState.screenshots.map((s) => {
      if (s.id !== id) return s
      const detectedViolations = analyzeScreenshotForViolations(
        { description },
        crossSections
      )
      return {
        ...s,
        description,
        detectedViolations,
        hasViolation: crossSections.some((cs) => cs.isViolated) || detectedViolations.length > 0,
      }
    })

    set({
      gameState: {
        ...gameState,
        screenshots: updatedScreenshots,
      },
    })
    get().updateCollisionDetection()
  },

  updateCollisionDetection: () => {
    const { currentSample, gameState } = get()
    if (!currentSample) return

    const updatedCrossSections = updateAllCrossSectionViolations(
      currentSample.crossSections,
      currentSample.airflowData.paths,
      currentSample.layoutData
    )

    const updatedScreenshots = gameState.screenshots.map((s) => {
      const detectedViolations = analyzeScreenshotForViolations(
        { description: s.description },
        updatedCrossSections
      )
      return {
        ...s,
        detectedViolations,
        hasViolation:
          updatedCrossSections.some((cs) => cs.isViolated) ||
          detectedViolations.length > 0,
      }
    })

    set({
      crossSections: updatedCrossSections,
      gameState: {
        ...gameState,
        screenshots: updatedScreenshots,
      },
    })
  },

  generateAnalysis: (): AnalysisResult => {
    const { currentSample, crossSections, gameState } = get()
    if (!currentSample) {
      return {
        sampleId: '',
        sampleName: '',
        totalCrossSections: 0,
        violatedCount: 0,
        warningCount: 0,
        criticalCount: 0,
        violations: [],
        crossSectionDetails: [],
        screenshots: [],
        generatedAt: new Date(),
      }
    }

    const allViolations = crossSections.flatMap((cs) => cs.violations)
    const violated = crossSections.filter((cs) => cs.isViolated)
    const warnings = crossSections.filter((cs) => cs.violationType === 'warning')
    const criticals = crossSections.filter((cs) => cs.violationType === 'critical')

    return {
      sampleId: currentSample.id,
      sampleName: currentSample.name,
      totalCrossSections: crossSections.length,
      violatedCount: violated.length,
      warningCount: warnings.length,
      criticalCount: criticals.length,
      violations: allViolations,
      crossSectionDetails: crossSections.map((cs) => ({
        id: cs.id,
        name: cs.name,
        isViolated: cs.isViolated,
        violationType: cs.violationType,
        violations: cs.violations,
      })),
      screenshots: gameState.screenshots,
      generatedAt: new Date(),
    }
  },
}))
