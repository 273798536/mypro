import { create } from "zustand"
import type {
  ReviewTask,
  TaskDetail,
  ChangeHistory,
  MaterialSource,
  TaskStatus,
  ParamUpdatePayload,
  CrackParams,
} from "@/types"
import { api } from "@/lib/api"

interface AppState {
  tasks: ReviewTask[]
  tasksLoading: boolean
  currentTask: TaskDetail | null
  currentTaskLoading: boolean
  history: ChangeHistory[]
  materials: MaterialSource[]
  selectedCrackId: string | null
  compareMode: "single" | "before" | "after" | "split"
  originalCrackSnapshot: Record<string, CrackParams>
  filters: { status?: TaskStatus; keyword?: string }
  currentUser: string

  setFilters: (f: Partial<{ status?: TaskStatus; keyword?: string }>) => void
  fetchTasks: () => Promise<void>
  fetchTaskDetail: (id: string) => Promise<void>
  fetchHistory: (id: string) => Promise<void>
  fetchMaterials: (id: string) => Promise<void>
  updateTaskStatus: (id: string, status: TaskStatus, reason?: string) => Promise<void>
  updateParam: (
    id: string,
    payload: ParamUpdatePayload & { crackId: string },
  ) => Promise<void>
  recalculateCollision: (id: string, crackId?: string) => Promise<void>
  setSelectedCrack: (crackId: string | null) => void
  setCompareMode: (mode: "single" | "before" | "after" | "split") => void
  snapshotCrack: (crack: CrackParams) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  tasks: [],
  tasksLoading: false,
  currentTask: null,
  currentTaskLoading: false,
  history: [],
  materials: [],
  selectedCrackId: null,
  compareMode: "single",
  originalCrackSnapshot: {},
  filters: {},
  currentUser: "展馆讲解员-赵",

  setFilters: (f) => {
    set({ filters: { ...get().filters, ...f } })
    get().fetchTasks()
  },

  fetchTasks: async () => {
    set({ tasksLoading: true })
    try {
      const tasks = await api.listTasks(get().filters)
      set({ tasks })
    } finally {
      set({ tasksLoading: false })
    }
  },

  fetchTaskDetail: async (id: string) => {
    set({ currentTaskLoading: true })
    try {
      const detail = await api.getTaskDetail(id)
      const firstCrack = detail.params[0]?.crackId ?? null
      set({ currentTask: detail, selectedCrackId: firstCrack, originalCrackSnapshot: {} })
    } finally {
      set({ currentTaskLoading: false })
    }
  },

  fetchHistory: async (id: string) => {
    const history = await api.getHistory(id)
    set({ history })
  },

  fetchMaterials: async (id: string) => {
    const materials = await api.getMaterials(id)
    set({ materials })
  },

  updateTaskStatus: async (id: string, status: TaskStatus, reason?: string) => {
    await api.updateTaskStatus(id, status, get().currentUser, reason)
    await get().fetchTasks()
    if (get().currentTask?.id === id) {
      set({ currentTask: { ...get().currentTask!, status } })
    }
  },

  updateParam: async (id, payload) => {
    const result = await api.updateParams(id, { ...payload, operator: get().currentUser })
    const task = get().currentTask
    if (task) {
      const params = task.params.map((p) =>
        p.crackId === result.crack.crackId ? result.crack : p,
      )
      set({ currentTask: { ...task, params } })
    }
    await get().fetchHistory(id)
  },

  recalculateCollision: async (id: string, crackId?: string) => {
    await api.recalculateCollision(id, crackId, get().currentUser)
    await get().fetchTaskDetail(id)
    await get().fetchHistory(id)
  },

  setSelectedCrack: (crackId) => set({ selectedCrackId: crackId }),
  setCompareMode: (mode) => set({ compareMode: mode }),
  snapshotCrack: (crack) =>
    set((s) => ({
      originalCrackSnapshot: { ...s.originalCrackSnapshot, [crack.crackId]: { ...crack } },
    })),
}))
