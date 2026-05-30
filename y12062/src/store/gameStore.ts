import { create } from 'zustand'
import { FREQUENCY_CONFIG, type FrequencyBand } from '../utils/sonarPhysics'
import {
  calculateEchoDelay,
  calculateEnergyAttenuation,
  calculateFrequencyShift,
  checkAliasing,
  calculateConfidence,
  calculateDistance,
} from '../utils/sonarPhysics'
import { levels } from '../utils/levelData'

export interface EchoData {
  obstacleId: string
  delay: number
  frequencyShift: number
  energyRatio: number
  isAliased: boolean
  arrivalOrder: number
}

export interface PulseRecord {
  id: number
  turn: number
  frequency: FrequencyBand
  frequencyHz: number
  intensity: number
  timestamp: number
  echoes: EchoData[]
  judgment: 'correct' | 'misjudged' | 'missed' | null
}

export interface DetectedObstacle {
  id: string
  truePosition: { x: number; y: number }
  detectedPosition: { x: number; y: number } | null
  confidence: number
  isCorrectlyDetected: boolean
}

export interface PathOption {
  id: number
  direction: 'left' | 'center' | 'right'
  confidence: number
  energyCost: number
  isSafe: boolean
  obstaclesOnPath: string[]
  waypoints: { x: number; y: number }[]
}

export interface ScoreData {
  judgmentAccuracy: number
  pathScore: number
  energyRemaining: number
  totalPulses: number
  correctJudgments: number
  misjudgments: number
  missedDetections: number
  collisions: number
}

export interface PathDecision {
  turn: number
  selectedPath: number | null
  pathDirection: string
  wasSafe: boolean
  confidence: number
}

export interface ObstacleConfig {
  id: string
  position: { x: number; y: number }
  size: number
  type: 'rock' | 'mine' | 'current'
  reflectivity: number
  dopplerShift: number
}

export interface EchoInterferenceConfig {
  delayJitter: number
  aliasingProbability: number
  noiseLevel: number
}

export interface PathConfig {
  direction: 'left' | 'center' | 'right'
  waypoints: { x: number; y: number }[]
  obstacleIds: string[]
  isSafe: boolean
  energyCost: number
}

export interface LevelData {
  id: number
  name: string
  description: string
  obstacles: ObstacleConfig[]
  subStartPosition: { x: number; y: number }
  goalPosition: { x: number; y: number }
  paths: PathConfig[]
  echoInterference: EchoInterferenceConfig
  initialEnergy: number
}

export type GamePhase = 'selectLevel' | 'aiming' | 'pulsing' | 'echo' | 'pathSelect' | 'result' | 'complete'

interface GameState {
  currentLevel: number | null
  levelData: LevelData | null
  energy: number
  turn: number
  pulses: PulseRecord[]
  detectedObstacles: DetectedObstacle[]
  pathOptions: PathOption[]
  selectedPath: number | null
  phase: GamePhase
  score: ScoreData
  pathDecisions: PathDecision[]
  waveAnimations: { x: number; y: number; radius: number; opacity: number }[]

  selectLevel: (levelId: number) => void
  setFrequency: (freq: FrequencyBand) => void
  selectedFrequency: FrequencyBand
  firePulse: () => void
  selectPath: (pathId: number) => void
  confirmPath: () => void
  nextTurn: () => void
  goToReview: () => void
  resetGame: () => void
  updateWaveAnimations: () => void
}

const initialScore: ScoreData = {
  judgmentAccuracy: 0,
  pathScore: 0,
  energyRemaining: 100,
  totalPulses: 0,
  correctJudgments: 0,
  misjudgments: 0,
  missedDetections: 0,
  collisions: 0,
}

export const useGameStore = create<GameState>((set, get) => ({
  currentLevel: null,
  levelData: null,
  energy: 100,
  turn: 0,
  pulses: [],
  detectedObstacles: [],
  pathOptions: [],
  selectedPath: null,
  phase: 'selectLevel',
  score: { ...initialScore },
  pathDecisions: [],
  selectedFrequency: 'mid',
  waveAnimations: [],

  selectLevel: (levelId: number) => {
    const level = levels.find(l => l.id === levelId)
    if (!level) return
    set({
      currentLevel: levelId,
      levelData: level,
      energy: level.initialEnergy,
      turn: 1,
      pulses: [],
      detectedObstacles: level.obstacles.map(o => ({
        id: o.id,
        truePosition: o.position,
        detectedPosition: null,
        confidence: 0,
        isCorrectlyDetected: false,
      })),
      pathOptions: level.paths.map((p, i) => ({
        id: i,
        direction: p.direction,
        confidence: 0,
        energyCost: p.energyCost,
        isSafe: p.isSafe,
        obstaclesOnPath: [...p.obstacleIds],
        waypoints: [...p.waypoints],
      })),
      selectedPath: null,
      phase: 'aiming',
      score: { ...initialScore, energyRemaining: level.initialEnergy },
      pathDecisions: [],
      selectedFrequency: 'mid',
      waveAnimations: [],
    })
  },

  setFrequency: (freq: FrequencyBand) => {
    set({ selectedFrequency: freq })
  },

  firePulse: () => {
    const state = get()
    if (!state.levelData || state.phase !== 'aiming') return
    const freq = state.selectedFrequency
    const freqConfig = FREQUENCY_CONFIG[freq]
    const energyCost = freqConfig.energyCost

    if (state.energy < energyCost) {
      set({ phase: 'complete' })
      return
    }

    const subPos = state.levelData.subStartPosition
    const interference = state.levelData.echoInterference
    const newPulseId = state.pulses.length + 1

    const echoes: EchoData[] = []
    const obstaclePositions = state.levelData.obstacles.map(o => o.position)

    state.levelData.obstacles.forEach((obstacle, idx) => {
      const distance = calculateDistance(subPos, obstacle.position)
      const delay = calculateEchoDelay(distance, interference.delayJitter)
      const energyRatio = calculateEnergyAttenuation(distance, freq) * obstacle.reflectivity
      const freqShift = calculateFrequencyShift(freqConfig.hz, obstacle.dopplerShift)
      const otherObstacles = obstaclePositions.filter((_, i) => i !== idx)
      const isAliased = otherObstacles.some(otherPos =>
        checkAliasing(obstacle.position, otherPos, freq)
      ) && Math.random() < interference.aliasingProbability

      if (energyRatio > 0.1 || interference.noiseLevel > 0.2) {
        echoes.push({
          obstacleId: obstacle.id,
          delay: Math.round(delay * 10) / 10,
          frequencyShift: Math.round(freqShift),
          energyRatio: Math.round(energyRatio * 100) / 100,
          isAliased,
          arrivalOrder: idx + 1,
        })
      }
    })

    echoes.sort((a, b) => a.delay - b.delay)
    echoes.forEach((e, i) => { e.arrivalOrder = i + 1 })

    const pulseRecord: PulseRecord = {
      id: newPulseId,
      turn: state.turn,
      frequency: freq,
      frequencyHz: freqConfig.hz,
      intensity: 100,
      timestamp: Date.now(),
      echoes,
      judgment: null,
    }

    const newEnergy = state.energy - energyCost
    const newDetected = [...state.detectedObstacles]

    echoes.forEach(echo => {
      const det = newDetected.find(d => d.id === echo.obstacleId)
      if (det) {
        const obstacle = state.levelData!.obstacles.find(o => o.id === echo.obstacleId)
        if (obstacle) {
          const jitter = interference.noiseLevel * 30
          det.detectedPosition = {
            x: obstacle.position.x + (Math.random() - 0.5) * jitter * (echo.isAliased ? 3 : 1),
            y: obstacle.position.y + (Math.random() - 0.5) * jitter * (echo.isAliased ? 3 : 1),
          }
          det.confidence = echo.energyRatio * (echo.isAliased ? 0.4 : 1.0) * 100
          det.isCorrectlyDetected = det.detectedPosition
            ? calculateDistance(det.detectedPosition, obstacle.position) < 50
            : false
        }
      }
    })

    const newPulses = [...state.pulses, pulseRecord]
    const newPathOptions = state.levelData.paths.map((p, i) => {
      const existing = state.pathOptions[i]
      const conf = calculateConfidence(echoes, freq)
      return {
        ...existing,
        confidence: Math.round(Math.max(existing.confidence, conf)),
      }
    })

    const correctCount = newDetected.filter(d => d.isCorrectlyDetected).length
    const misjudgedCount = newDetected.filter(d => d.detectedPosition && !d.isCorrectlyDetected).length
    const missedCount = newDetected.filter(d => !d.detectedPosition).length

    set({
      pulses: newPulses,
      energy: newEnergy,
      detectedObstacles: newDetected,
      pathOptions: newPathOptions,
      phase: 'echo',
      score: {
        ...state.score,
        energyRemaining: newEnergy,
        totalPulses: newPulses.length,
        correctJudgments: correctCount,
        misjudgments: misjudgedCount,
        missedDetections: missedCount,
        judgmentAccuracy: newPulses.length > 0
          ? Math.round((correctCount / (correctCount + misjudgedCount + missedCount)) * 100)
          : 0,
      },
      waveAnimations: [{ x: subPos.x, y: subPos.y, radius: 0, opacity: 1 }],
    })

    setTimeout(() => {
      const s = get()
      if (s.phase === 'echo') {
        set({ phase: 'pathSelect' })
      }
    }, 2000)
  },

  selectPath: (pathId: number) => {
    set({ selectedPath: pathId })
  },

  confirmPath: () => {
    const state = get()
    if (state.selectedPath === null || !state.levelData) return

    const selectedPathOption = state.pathOptions[state.selectedPath]
    const wasSafe = selectedPathOption.isSafe
    const collisionPenalty = wasSafe ? 0 : 25
    const newEnergy = state.energy - selectedPathOption.energyCost - collisionPenalty

    const decision: PathDecision = {
      turn: state.turn,
      selectedPath: state.selectedPath,
      pathDirection: selectedPathOption.direction,
      wasSafe,
      confidence: selectedPathOption.confidence,
    }

    const newCollisions = wasSafe ? state.score.collisions : state.score.collisions + 1
    const pathScore = wasSafe ? Math.round(selectedPathOption.confidence) : 0

    set({
      energy: newEnergy,
      phase: 'result',
      pathDecisions: [...state.pathDecisions, decision],
      score: {
        ...state.score,
        energyRemaining: newEnergy,
        collisions: newCollisions,
        pathScore: state.score.pathScore + pathScore,
      },
    })

    if (newEnergy <= 0) {
      setTimeout(() => set({ phase: 'complete' }), 1500)
    }
  },

  nextTurn: () => {
    const state = get()
    const currentPathIdx = state.selectedPath
    if (currentPathIdx === null || !state.levelData) return

    const selectedPathOption = state.pathOptions[currentPathIdx]
    if (!selectedPathOption.isSafe) {
      set({ phase: 'complete' })
      return
    }

    const lastWaypoint = selectedPathOption.waypoints[selectedPathOption.waypoints.length - 1]
    const newLevelData = { ...state.levelData, subStartPosition: lastWaypoint }

    const goalDist = calculateDistance(lastWaypoint, state.levelData.goalPosition)
    if (goalDist < 80) {
      set({ phase: 'complete' })
      return
    }

    set({
      turn: state.turn + 1,
      levelData: newLevelData,
      selectedPath: null,
      phase: 'aiming',
      pathOptions: state.levelData.paths.map((p, i) => ({
        ...state.pathOptions[i],
        confidence: 0,
      })),
      waveAnimations: [],
    })
  },

  goToReview: () => {
    set({ phase: 'complete' })
  },

  resetGame: () => {
    set({
      currentLevel: null,
      levelData: null,
      energy: 100,
      turn: 0,
      pulses: [],
      detectedObstacles: [],
      pathOptions: [],
      selectedPath: null,
      phase: 'selectLevel',
      score: { ...initialScore },
      pathDecisions: [],
      selectedFrequency: 'mid',
      waveAnimations: [],
    })
  },

  updateWaveAnimations: () => {
    const state = get()
    const updated = state.waveAnimations
      .map(w => ({
        ...w,
        radius: w.radius + 4,
        opacity: w.opacity - 0.02,
      }))
      .filter(w => w.opacity > 0)
    set({ waveAnimations: updated })
  },
}))
