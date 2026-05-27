import { create } from 'zustand'
import type { DataRevision } from '../types'
import { dataRevisions as initialRevisions } from '../data/mockData'

interface TraceStore {
  revisions: DataRevision[]
  addRevision: (revision: Omit<DataRevision, 'id' | 'timestamp'>) => void
  getRevisionsForEntity: (entityId: string) => DataRevision[]
}

export const useTraceStore = create<TraceStore>((set, get) => ({
  revisions: [...initialRevisions],

  addRevision: (revision) =>
    set((state) => ({
      revisions: [
        ...state.revisions,
        {
          ...revision,
          id: `rev-${state.revisions.length + 1}`,
          timestamp: new Date().toISOString(),
        },
      ],
    })),

  getRevisionsForEntity: (entityId) => get().revisions.filter((r) => r.targetEntityId === entityId),
}))
