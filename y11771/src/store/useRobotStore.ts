import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { JointConfig, RobotArm, Obstacle, SafetyZone, Warning, HistoryEntry } from '@/utils/kinematics'

const defaultJoints: JointConfig[] = [
  { id: 0, angle: 0, minAngle: -180, maxAngle: 180, length: 0 },
  { id: 1, angle: 30, minAngle: -90, maxAngle: 135, length: 2.0 },
  { id: 2, angle: -45, minAngle: -150, maxAngle: 150, length: 1.5 },
]

const defaultArm: RobotArm = {
  joints: defaultJoints,
  baseHeight: 0.3,
}

interface RobotStore {
  arm: RobotArm
  obstacles: Obstacle[]
  safetyZones: SafetyZone[]
  warnings: Warning[]
  history: HistoryEntry[]
  workspaceVisible: boolean
  workspaceDirty: boolean
  activeTab: 'joints' | 'obstacles' | 'history'

  setJointAngle: (jointId: number, angle: number) => void
  setJointLength: (jointId: number, length: number) => void
  setJointLimits: (jointId: number, min: number, max: number) => void
  addJoint: () => void
  removeJoint: (jointId: number) => void
  addObstacle: (obstacle: Obstacle) => void
  removeObstacle: (id: string) => void
  updateObstacle: (id: string, updates: Partial<Obstacle>) => void
  addSafetyZone: (zone: SafetyZone) => void
  removeSafetyZone: (id: string) => void
  updateSafetyZone: (id: string, updates: Partial<SafetyZone>) => void
  setWarnings: (warnings: Warning[]) => void
  addHistoryEntry: (source: HistoryEntry['source'], description: string) => void
  restoreFromHistory: (entryId: string) => void
  setWorkspaceVisible: (visible: boolean) => void
  markWorkspaceDirty: () => void
  markWorkspaceClean: () => void
  setActiveTab: (tab: 'joints' | 'obstacles' | 'history') => void
  resetToDefault: () => void
  loadFromData: (arm: RobotArm, obstacles: Obstacle[], safetyZones: SafetyZone[], history: HistoryEntry[]) => void
}

function createHistoryEntry(
  source: HistoryEntry['source'],
  description: string,
  arm: RobotArm,
  obstacles: Obstacle[],
  safetyZones: SafetyZone[],
  warnings: Warning[]
): HistoryEntry {
  return {
    id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    source,
    description,
    snapshot: {
      arm: JSON.parse(JSON.stringify(arm)),
      obstacles: JSON.parse(JSON.stringify(obstacles)),
      safetyZones: JSON.parse(JSON.stringify(safetyZones)),
    },
    warnings: [...warnings],
  }
}

export const useRobotStore = create<RobotStore>()(
  persist(
    (set, get) => ({
      arm: JSON.parse(JSON.stringify(defaultArm)),
      obstacles: [],
      safetyZones: [],
      warnings: [],
      history: [],
      workspaceVisible: true,
      workspaceDirty: true,
      activeTab: 'joints',

      setJointAngle: (jointId, angle) => {
        const state = get()
        const joint = state.arm.joints.find(j => j.id === jointId)
        if (!joint) return
        const clampedAngle = Math.max(joint.minAngle, Math.min(joint.maxAngle, angle))
        const newJoints = state.arm.joints.map(j =>
          j.id === jointId ? { ...j, angle: clampedAngle } : j
        )
        const newArm = { ...state.arm, joints: newJoints }
        const desc = `关节${jointId} 角度 → ${clampedAngle.toFixed(1)}°`
        const entry = createHistoryEntry('manual', desc, newArm, state.obstacles, state.safetyZones, state.warnings)
        set({
          arm: newArm,
          workspaceDirty: true,
          history: [...state.history.slice(-99), entry],
        })
      },

      setJointLength: (jointId, length) => {
        const state = get()
        const newJoints = state.arm.joints.map(j =>
          j.id === jointId ? { ...j, length: Math.max(0.1, length) } : j
        )
        const newArm = { ...state.arm, joints: newJoints }
        const desc = `关节${jointId} 臂长 → ${length.toFixed(2)}`
        const entry = createHistoryEntry('manual', desc, newArm, state.obstacles, state.safetyZones, state.warnings)
        set({
          arm: newArm,
          workspaceDirty: true,
          history: [...state.history.slice(-99), entry],
        })
      },

      setJointLimits: (jointId, min, max) => {
        const state = get()
        const newJoints = state.arm.joints.map(j => {
          if (j.id !== jointId) return j
          return { ...j, minAngle: min, maxAngle: max, angle: Math.max(min, Math.min(max, j.angle)) }
        })
        const newArm = { ...state.arm, joints: newJoints }
        const desc = `关节${jointId} 限位 [${min}°, ${max}°]`
        const entry = createHistoryEntry('correction', desc, newArm, state.obstacles, state.safetyZones, state.warnings)
        set({
          arm: newArm,
          workspaceDirty: true,
          history: [...state.history.slice(-99), entry],
        })
      },

      addJoint: () => {
        const state = get()
        if (state.arm.joints.length >= 6) return
        const maxId = Math.max(...state.arm.joints.map(j => j.id))
        const newJoint: JointConfig = {
          id: maxId + 1,
          angle: 0,
          minAngle: -150,
          maxAngle: 150,
          length: 1.0,
        }
        const newArm = { ...state.arm, joints: [...state.arm.joints, newJoint] }
        const desc = `添加关节${newJoint.id}`
        const entry = createHistoryEntry('correction', desc, newArm, state.obstacles, state.safetyZones, state.warnings)
        set({
          arm: newArm,
          workspaceDirty: true,
          history: [...state.history.slice(-99), entry],
        })
      },

      removeJoint: (jointId) => {
        const state = get()
        if (state.arm.joints.length <= 2) return
        const newJoints = state.arm.joints.filter(j => j.id !== jointId)
        if (newJoints.length === state.arm.joints.length) return
        const newArm = { ...state.arm, joints: newJoints }
        const desc = `移除关节${jointId}`
        const entry = createHistoryEntry('correction', desc, newArm, state.obstacles, state.safetyZones, state.warnings)
        set({
          arm: newArm,
          workspaceDirty: true,
          history: [...state.history.slice(-99), entry],
        })
      },

      addObstacle: (obstacle) => {
        const state = get()
        const desc = `添加障碍物 ${obstacle.type}`
        const entry = createHistoryEntry('manual', desc, state.arm, [...state.obstacles, obstacle], state.safetyZones, state.warnings)
        set({
          obstacles: [...state.obstacles, obstacle],
          history: [...state.history.slice(-99), entry],
        })
      },

      removeObstacle: (id) => {
        const state = get()
        const desc = `移除障碍物 ${id}`
        const entry = createHistoryEntry('manual', desc, state.arm, state.obstacles.filter(o => o.id !== id), state.safetyZones, state.warnings)
        set({
          obstacles: state.obstacles.filter(o => o.id !== id),
          history: [...state.history.slice(-99), entry],
        })
      },

      updateObstacle: (id, updates) => {
        const state = get()
        const newObstacles = state.obstacles.map(o => o.id === id ? { ...o, ...updates } : o)
        const desc = `更新障碍物 ${id}`
        const entry = createHistoryEntry('manual', desc, state.arm, newObstacles, state.safetyZones, state.warnings)
        set({
          obstacles: newObstacles,
          history: [...state.history.slice(-99), entry],
        })
      },

      addSafetyZone: (zone) => {
        const state = get()
        const desc = `添加安全区 ${zone.type}`
        const entry = createHistoryEntry('manual', desc, state.arm, state.obstacles, [...state.safetyZones, zone], state.warnings)
        set({
          safetyZones: [...state.safetyZones, zone],
          history: [...state.history.slice(-99), entry],
        })
      },

      removeSafetyZone: (id) => {
        const state = get()
        const filtered = state.safetyZones.filter(z => z.id !== id)
        const desc = `移除安全区 ${id}`
        const entry = createHistoryEntry('manual', desc, state.arm, state.obstacles, filtered, state.warnings)
        set({
          safetyZones: filtered,
          history: [...state.history.slice(-99), entry],
        })
      },

      updateSafetyZone: (id, updates) => {
        const state = get()
        const newZones = state.safetyZones.map(z => z.id === id ? { ...z, ...updates } : z) as SafetyZone[]
        const desc = `更新安全区 ${id}`
        const entry = createHistoryEntry('manual', desc, state.arm, state.obstacles, newZones, state.warnings)
        set({
          safetyZones: newZones,
          history: [...state.history.slice(-99), entry],
        })
      },

      setWarnings: (warnings) => set({ warnings }),

      addHistoryEntry: (source, description) => {
        const state = get()
        const entry = createHistoryEntry(source, description, state.arm, state.obstacles, state.safetyZones, state.warnings)
        set({ history: [...state.history.slice(-99), entry] })
      },

      restoreFromHistory: (entryId) => {
        const state = get()
        const entry = state.history.find(h => h.id === entryId)
        if (!entry) return
        const desc = `回退到: ${entry.description}`
        const newEntry = createHistoryEntry('correction', desc, entry.snapshot.arm, entry.snapshot.obstacles, entry.snapshot.safetyZones, entry.warnings)
        set({
          arm: JSON.parse(JSON.stringify(entry.snapshot.arm)),
          obstacles: JSON.parse(JSON.stringify(entry.snapshot.obstacles)),
          safetyZones: JSON.parse(JSON.stringify(entry.snapshot.safetyZones)),
          workspaceDirty: true,
          history: [...state.history.slice(-99), newEntry],
        })
      },

      setWorkspaceVisible: (visible) => set({ workspaceVisible: visible }),
      markWorkspaceDirty: () => set({ workspaceDirty: true }),
      markWorkspaceClean: () => set({ workspaceDirty: false }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      resetToDefault: () => {
        const state = get()
        const desc = '重置为默认方案'
        const entry = createHistoryEntry('reset', desc, defaultArm, [], [], [])
        set({
          arm: JSON.parse(JSON.stringify(defaultArm)),
          obstacles: [],
          safetyZones: [],
          warnings: [],
          workspaceDirty: true,
          history: [...state.history.slice(-99), entry],
        })
      },

      loadFromData: (arm, obstacles, safetyZones, history) => {
        const state = get()
        const desc = '从文件加载方案'
        const entry = createHistoryEntry('load', desc, arm, obstacles, safetyZones, state.warnings)
        set({
          arm: JSON.parse(JSON.stringify(arm)),
          obstacles: JSON.parse(JSON.stringify(obstacles)),
          safetyZones: JSON.parse(JSON.stringify(safetyZones)),
          history: [...state.history.slice(-99), ...history, entry],
          workspaceDirty: true,
          warnings: [],
        })
      },
    }),
    {
      name: 'robot-workspace-storage',
      partialize: (state) => ({
        arm: state.arm,
        obstacles: state.obstacles,
        safetyZones: state.safetyZones,
        history: state.history.slice(-50),
        workspaceVisible: state.workspaceVisible,
      }),
    }
  )
)
