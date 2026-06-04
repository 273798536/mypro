import { create } from "zustand"
import type { Workshop } from "@/types"

interface WorkshopStore {
  workshops: Workshop[]
  currentWorkshop: Workshop | null
  loading: boolean
  fetchWorkshops: () => Promise<void>
  fetchWorkshop: (id: string) => Promise<void>
  createWorkshop: (name: string) => Promise<void>
}

export const useWorkshopStore = create<WorkshopStore>((set) => ({
  workshops: [],
  currentWorkshop: null,
  loading: false,

  fetchWorkshops: async () => {
    set({ loading: true })
    try {
      const res = await fetch("/api/workshops")
      const json = await res.json()
      set({ workshops: json.data ?? [], loading: false })
    } catch {
      set({ loading: false })
    }
  },

  fetchWorkshop: async (id: string) => {
    set({ loading: true })
    try {
      const res = await fetch(`/api/workshops/${id}`)
      const json = await res.json()
      set({ currentWorkshop: json.data ?? null, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  createWorkshop: async (name: string) => {
    set({ loading: true })
    try {
      const res = await fetch("/api/workshops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      set((state) => ({
        workshops: [...state.workshops, json.data],
        loading: false,
      }))
    } catch {
      set({ loading: false })
    }
  },
}))
