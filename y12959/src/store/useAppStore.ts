import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, PermissionKey, ConflictSeverity, ConflictStatus, ExplanationContextType, ExplanationContextData, FilterPreset, ResolveStep, ResolveStatus } from '../types'

export { type ExplanationContextType }

export interface ExplanationContext {
  type: ExplanationContextType | null
  data: ExplanationContextData | null
}

export interface ResolveProgress {
  step: ResolveStep
  status: ResolveStatus
}

type ResolveStepInner = 'permit' | 'backup' | 'rollback' | 'done'
type ResolveStatusInner = 'pending' | 'active' | 'completed' | 'error'

interface AppState {
  currentUser: User
  filterPresets: FilterPreset[]
  selectedConflictIds: string[]
  explanationContext: ExplanationContext
  resolveProgress: ResolveProgress

  setUser: (user: User) => void
  toggleConflictId: (id: string) => void
  clearSelectedIds: () => void
  setExplanationContext: (type: ExplanationContextType | null, data: ExplanationContextData | null) => void
  setResolveStep: (step: ResolveStepInner, status: ResolveStatusInner) => void
  resetResolveProgress: () => void
}

const defaultUser: User = {
  id: 'u_002',
  username: 'lisi',
  displayName: '李四（运维）',
  roleIds: ['role_ops'],
  effectivePermissions: [
    'conflict:view',
    'conflict:resolve',
    'conflict:assign',
    'backup:create',
    'rollback:update',
    'history:view',
    'history:audit_chain',
    'export:run',
  ] as PermissionKey[],
  lastPermissionChangeAt: new Date(Date.now() - 22 * 24 * 3600 * 1000).toISOString(),
}

const initialFilterPresets: FilterPreset[] = [
  {
    id: 'preset_critical_pending',
    name: '高危待处理',
    description: '严重度为 critical 且未处理的冲突',
    params: { severity: ['critical'] as ConflictSeverity[], status: ['pending', 'in_progress'] as ConflictStatus[], sortBy: 'lastExecuteTime' },
  },
  {
    id: 'preset_unavailable_month',
    name: '本月不可用记录',
    description: '标记为 unavailable 的冲突，月底转交重点',
    params: { status: ['unavailable'] as ConflictStatus[], sortBy: 'createdAt' },
  },
  {
    id: 'preset_my_assign',
    name: '分配给我的',
    description: 'assignee 为当前登录用户',
    params: { assignee: 'u_002', status: ['pending', 'in_progress'] as ConflictStatus[], sortBy: 'severity' },
  },
]

const initialResolveProgress: ResolveProgress = {
  step: 'permit',
  status: 'pending',
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: defaultUser,
      filterPresets: initialFilterPresets,
      selectedConflictIds: [],
      explanationContext: { type: null, data: null },
      resolveProgress: initialResolveProgress,

      setUser: (user: User) => set({ currentUser: user }),

      toggleConflictId: (id: string) =>
        set((state) => ({
          selectedConflictIds: state.selectedConflictIds.includes(id)
            ? state.selectedConflictIds.filter((i) => i !== id)
            : [...state.selectedConflictIds, id],
        })),

      clearSelectedIds: () =>
        set({
          selectedConflictIds: [],
        }),

      setExplanationContext: (type: ExplanationContextType | null, data: ExplanationContextData | null) =>
        set({
          explanationContext: { type, data },
        }),

      setResolveStep: (step: ResolveStepInner, status: ResolveStatusInner) =>
        set({
          resolveProgress: { step, status },
        }),

      resetResolveProgress: () =>
        set({
          resolveProgress: initialResolveProgress,
        }),
    }),
    {
      name: 'idcr_app_store',
      partialize: (state) => ({
        selectedConflictIds: state.selectedConflictIds,
        explanationContext: state.explanationContext,
        currentUser: state.currentUser,
      }),
    }
  )
)
