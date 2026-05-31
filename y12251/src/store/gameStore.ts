import { create } from "zustand"
import type {
  MagneticBoard,
  CurrentBar,
  TargetGate,
  Particle,
  AnomalyRecord,
  ParameterSnapshot,
  GamePhase,
  Point,
  RuleViolation,
} from "@/types"
import { LEVELS } from "@/utils/levels"
import {
  simulateTrajectory,
  checkDirectionMisjudgment,
  checkEnergyOverflow,
  checkMassDeficiency,
  checkGatePass,
  createParticleFromAngle,
  calculateLorentzForce,
} from "@/utils/physics"

interface GameState {
  currentLevelId: string | null
  phase: GamePhase
  boards: MagneticBoard[]
  bars: CurrentBar[]
  gates: TargetGate[]
  particle: Particle | null
  aimAngle: number
  trajectoryPoints: Point[]
  predictedTrajectory: Point[]
  forceDirection: Point | null
  anomalies: AnomalyRecord[]
  snapshots: ParameterSnapshot[]
  violations: RuleViolation[]
  score: number
  passed: boolean

  loadLevel: (levelId: string) => void
  setPhase: (phase: GamePhase) => void
  updateBoard: (id: string, updates: Partial<MagneticBoard>) => void
  updateBar: (id: string, updates: Partial<CurrentBar>) => void
  updateGate: (id: string, updates: Partial<TargetGate>) => void
  setAimAngle: (angle: number) => void
  launchCar: () => void
  resetLevel: () => void
  archiveAnomaly: (id: string) => void
  takeSnapshot: () => string
  rerunWithSnapshot: (snapshotId: string) => void
  updatePrediction: () => void
}

const generateId = () => Math.random().toString(36).substring(2, 10)

function runPrediction() {
  const state = useGameStore.getState()
  const level = LEVELS.find((l) => l.id === state.currentLevelId)
  if (!level || !state.particle) return

  const baseSpeed = Math.sqrt(state.particle.vx ** 2 + state.particle.vy ** 2) || 3
  const predictedParticle = createParticleFromAngle(
    baseSpeed,
    state.aimAngle,
    state.particle.charge,
    state.particle.mass,
    state.particle.x,
    state.particle.y
  )

  const activeBoard = state.boards[0]
  if (!activeBoard) {
    useGameStore.setState({ predictedTrajectory: [] })
    return
  }

  const predicted = simulateTrajectory(predictedParticle, activeBoard, 800, 0.5)
  const force = calculateLorentzForce(predictedParticle, activeBoard)

  useGameStore.setState({
    predictedTrajectory: predicted,
    forceDirection: force,
  })
}

export const useGameStore = create<GameState>((set, get) => ({
  currentLevelId: null,
  phase: "board_arrival",
  boards: [],
  bars: [],
  gates: [],
  particle: null,
  aimAngle: 0,
  trajectoryPoints: [],
  predictedTrajectory: [],
  forceDirection: null,
  anomalies: [],
  snapshots: [],
  violations: [],
  score: 0,
  passed: false,

  updatePrediction: () => {
    runPrediction()
  },

  loadLevel: (levelId: string) => {
    const level = LEVELS.find((l) => l.id === levelId)
    if (!level) return

    const boards = level.boards.map((b) => ({ ...b, locked: false }))
    const bars = level.bars.map((b) => ({ ...b, locked: false }))
    const gates = level.gates.map((g) => ({ ...g, locked: false }))
    const particle = { ...level.particle }

    set({
      currentLevelId: levelId,
      phase: "board_arrival",
      boards,
      bars,
      gates,
      particle,
      aimAngle: level.initialAngle,
      trajectoryPoints: [],
      predictedTrajectory: [],
      forceDirection: null,
      violations: [],
      score: 0,
      passed: false,
    })

    setTimeout(() => {
      set({ phase: "current_arrival" })
    }, 1200)

    setTimeout(() => {
      set({ phase: "gate_arrival" })
    }, 2400)

    setTimeout(() => {
      const state = get()
      const activeBoard = state.boards[0]
      if (activeBoard && state.particle) {
        const force = calculateLorentzForce(state.particle, activeBoard)
        set({ forceDirection: force, phase: "aiming" })
        get().updatePrediction()
      }
    }, 3000)
  },

  setPhase: (phase: GamePhase) => set({ phase }),

  updateBoard: (id: string, updates: Partial<MagneticBoard>) => {
    set((state) => {
      if (state.phase !== "board_arrival" && state.phase !== "current_arrival" && state.phase !== "gate_arrival" && state.phase !== "aiming") return state
      const board = state.boards.find((b) => b.id === id)
      if (board?.locked) return state
      return {
        boards: state.boards.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      }
    })
    get().updatePrediction()
  },

  updateBar: (id: string, updates: Partial<CurrentBar>) => {
    set((state) => {
      if (state.phase !== "current_arrival" && state.phase !== "gate_arrival" && state.phase !== "aiming") return state
      const bar = state.bars.find((b) => b.id === id)
      if (bar?.locked) return state
      return {
        bars: state.bars.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      }
    })
    get().updatePrediction()
  },

  updateGate: (id: string, updates: Partial<TargetGate>) => {
    set((state) => {
      if (state.phase !== "gate_arrival" && state.phase !== "aiming") return state
      const gate = state.gates.find((g) => g.id === id)
      if (gate?.locked) return state
      return {
        gates: state.gates.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      }
    })
  },

  setAimAngle: (angle: number) => {
    set({ aimAngle: angle })
    get().updatePrediction()
  },

  launchCar: () => {
    const state = get()
    const level = LEVELS.find((l) => l.id === state.currentLevelId)
    if (!level || !state.particle) return

    const baseSpeed = Math.sqrt(state.particle.vx ** 2 + state.particle.vy ** 2) || 3
    const launchedParticle = createParticleFromAngle(
      baseSpeed,
      state.aimAngle,
      state.particle.charge,
      state.particle.mass,
      state.particle.x,
      state.particle.y
    )

    const activeBoard = state.boards[0]
    if (!activeBoard) return

    const trajectory = simulateTrajectory(launchedParticle, activeBoard, 800, 0.5)
    set({ phase: "running", trajectoryPoints: trajectory })

    setTimeout(() => {
      const currentState = get()
      const violations: RuleViolation[] = []

      const playerForce = {
        x: Math.cos(state.aimAngle),
        y: Math.sin(state.aimAngle),
      }
      const dirViolation = checkDirectionMisjudgment(playerForce, launchedParticle, activeBoard)
      if (dirViolation) violations.push(dirViolation)

      const energyViolation = checkEnergyOverflow(launchedParticle, level.energyLimit)
      if (energyViolation) violations.push(energyViolation)

      const massViolation = checkMassDeficiency(launchedParticle, activeBoard, 800)
      if (massViolation) violations.push(massViolation)

      const gate = currentState.gates[0]
      const gatePassed = gate ? checkGatePass(trajectory, gate) : false

      const newAnomalies: AnomalyRecord[] = violations.map((v) => ({
        id: generateId(),
        levelId: currentState.currentLevelId!,
        type: v.category === "force_direction"
          ? "direction_misjudgment" as const
          : v.category === "energy"
          ? "energy_overflow" as const
          : "mass_deficiency" as const,
        status: v.category === "force_direction" ? ("pending" as const) : ("anomaly" as const),
        ruleId: v.ruleId,
        ruleDescription: v.description,
        playerInput: v.actual,
        correctValue: v.expected,
        timestamp: Date.now(),
        snapshotId: "",
      }))

      const snapshotId = get().takeSnapshot()
      newAnomalies.forEach((a) => (a.snapshotId = snapshotId))

      set((s) => ({
        phase: "finished",
        violations,
        anomalies: [...s.anomalies, ...newAnomalies],
        passed: gatePassed && violations.length === 0,
        score: gatePassed ? Math.max(0, 100 - violations.length * 25) : 0,
      }))

      saveAnomaliesToStorage(get().anomalies)
    }, 2000)
  },

  resetLevel: () => {
    const state = get()
    if (state.currentLevelId) {
      state.loadLevel(state.currentLevelId)
    }
  },

  archiveAnomaly: (id: string) => {
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === id ? { ...a, status: "archived" as const } : a
      ),
    }))
    saveAnomaliesToStorage(get().anomalies)
  },

  takeSnapshot: () => {
    const state = get()
    const id = generateId()
    const snapshot: ParameterSnapshot = {
      id,
      levelId: state.currentLevelId || "",
      timestamp: Date.now(),
      boards: state.boards.map((b) => ({ ...b })),
      bars: state.bars.map((b) => ({ ...b })),
      gates: state.gates.map((g) => ({ ...g })),
      trajectoryPoints: [...state.trajectoryPoints],
      particle: state.particle ? { ...state.particle } : { x: 0, y: 0, vx: 0, vy: 0, charge: 1, mass: 1, angle: 0 },
    }
    set((s) => ({ snapshots: [...s.snapshots, snapshot] }))
    saveSnapshotsToStorage(get().snapshots)
    return id
  },

  rerunWithSnapshot: (snapshotId: string) => {
    const state = get()
    const snapshot = state.snapshots.find((s) => s.id === snapshotId)
    if (!snapshot) return

    get().takeSnapshot()

    set({
      boards: snapshot.boards.map((b) => ({ ...b, locked: false })),
      bars: snapshot.bars.map((b) => ({ ...b, locked: false })),
      gates: snapshot.gates.map((g) => ({ ...g, locked: false })),
      particle: { ...snapshot.particle },
      trajectoryPoints: [],
      phase: "aiming",
      violations: [],
      score: 0,
      passed: false,
    })
  },
}))

function saveAnomaliesToStorage(anomalies: AnomalyRecord[]) {
  try {
    localStorage.setItem("mfr_anomalies", JSON.stringify(anomalies))
  } catch {}
}

function saveSnapshotsToStorage(snapshots: ParameterSnapshot[]) {
  try {
    localStorage.setItem("mfr_snapshots", JSON.stringify(snapshots))
  } catch {}
}

export function loadAnomaliesFromStorage(): AnomalyRecord[] {
  try {
    const data = localStorage.getItem("mfr_anomalies")
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function loadSnapshotsFromStorage(): ParameterSnapshot[] {
  try {
    const data = localStorage.getItem("mfr_snapshots")
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}
