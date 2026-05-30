import { create } from 'zustand'
import { GameState, OperationStep, DetectionResult, FoldLine, PaperState, Sample } from '../types'
import { createInitialPaper, foldPoint, calculateArea, calculateAngle } from '../utils/geometry'
import { detectAreaMiss, detectAngleError, detectFoldOverlap } from '../utils/detector'
import { createOperationStep, calculateTotalScore } from '../utils/tracer'

interface GameStore extends GameState {
  setPaper: (paper: Partial<PaperState>) => void
  addStep: (step: OperationStep) => void
  addDetection: (detection: DetectionResult) => void
  setCurrentStepIndex: (index: number) => void
  setScore: (score: number) => void
  setComplete: (complete: boolean) => void
  setCurrentSample: (sample: Sample | null) => void
  selectPoint: (index: number | null) => void
  performFold: (foldLine: FoldLine, direction: string) => void
  undo: () => void
  redo: () => void
  reset: () => void
  loadSample: (sample: Sample) => void
}

const createInitialState = (): GameState => {
  const initialPoints = createInitialPaper(200, 200, 120)
  const totalArea = calculateArea(initialPoints)
  
  return {
    paper: {
      points: initialPoints,
      foldedAreas: 0,
      totalArea,
      foldLines: [],
      transform: '',
      selectedPointIndex: null,
      isFolding: false
    },
    steps: [],
    currentStepIndex: -1,
    detections: [],
    score: 100,
    isComplete: false,
    currentSample: null
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),
  
  setPaper: (paper) => set((state) => ({
    paper: { ...state.paper, ...paper }
  })),
  
  addStep: (step) => set((state) => {
    const newSteps = [...state.steps, step]
    return {
      steps: newSteps,
      currentStepIndex: newSteps.length - 1
    }
  }),
  
  addDetection: (detection) => set((state) => ({
    detections: [...state.detections, detection]
  })),
  
  setCurrentStepIndex: (index) => set({ currentStepIndex: index }),
  
  setScore: (score) => set({ score }),
  
  setComplete: (isComplete) => set({ isComplete }),
  
  setCurrentSample: (currentSample) => set({ currentSample }),
  
  selectPoint: (index) => set((state) => ({
    paper: { ...state.paper, selectedPointIndex: index }
  })),
  
  performFold: (foldLine, direction) => {
    const state = get()
    const { paper, detections } = state
    
    set({ paper: { ...paper, isFolding: true } })
    
    const foldedPoints = paper.points.map(point => foldPoint(point, foldLine))
    
    const newArea = calculateArea(foldedPoints)
    const angle = calculateAngle(foldLine.start, foldLine.end)
    
    const newFoldLines = [...paper.foldLines, foldLine]
    
    const newDetections: DetectionResult[] = []
    
    const angleDetection = detectAngleError(Math.abs(angle), 90, 5)
    if (angleDetection) newDetections.push(angleDetection)
    
    const areaDetection = detectAreaMiss(newArea, paper.totalArea * 0.5, 90)
    if (areaDetection) newDetections.push(areaDetection)
    
    const overlapDetection = detectFoldOverlap(foldLine, paper.foldLines, 5)
    if (overlapDetection) newDetections.push(overlapDetection)
    
    const step = createOperationStep('fold', 'user', {
      foldLine,
      foldDirection: direction as OperationStep['foldDirection'],
      foldAngle: 90
    })
    
    const allDetections = [...detections, ...newDetections]
    const newScore = calculateTotalScore(allDetections)
    
    setTimeout(() => {
      set((state) => ({
        paper: {
          ...state.paper,
          points: foldedPoints,
          foldedAreas: newArea,
          foldLines: newFoldLines,
          isFolding: false
        },
        steps: [...state.steps, step],
        currentStepIndex: state.steps.length,
        detections: allDetections,
        score: newScore
      }))
    }, 300)
  },
  
  undo: () => {
    const state = get()
    if (state.currentStepIndex > 0) {
      set({ currentStepIndex: state.currentStepIndex - 1 })
    }
  },
  
  redo: () => {
    const state = get()
    if (state.currentStepIndex < state.steps.length - 1) {
      set({ currentStepIndex: state.currentStepIndex + 1 })
    }
  },
  
  reset: () => {
    set(createInitialState())
  },
  
  loadSample: (sample) => {
    const initial = createInitialState()
    let points = [...initial.paper.points]
    const foldLines: FoldLine[] = []
    const allDetections: DetectionResult[] = [...sample.expectedDetections]
    
    sample.steps.forEach((step) => {
      if (step.foldLine) {
        points = points.map(point => foldPoint(point, step.foldLine!))
        foldLines.push(step.foldLine)
      }
    })
    
    const finalArea = calculateArea(points)
    const finalScore = calculateTotalScore(allDetections)
    
    set({
      paper: {
        points,
        foldedAreas: finalArea,
        totalArea: initial.paper.totalArea,
        foldLines,
        transform: '',
        selectedPointIndex: null,
        isFolding: false
      },
      steps: sample.steps,
      currentStepIndex: sample.steps.length - 1,
      detections: allDetections,
      score: finalScore,
      isComplete: true,
      currentSample: sample
    })
  }
}))
