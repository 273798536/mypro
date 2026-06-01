import { create } from 'zustand'
import type { SpeedRecord, MassTable, Collision, ImportedFile } from '@/types'

interface AppState {
  speedRecords: SpeedRecord[]
  massTable: MassTable[]
  collisions: Collision[]
  importedFiles: ImportedFile[]
  selectedCollisionId: string | null
  videoNotes: string
  
  setSpeedRecords: (records: SpeedRecord[], sourceFile: string) => void
  setMassTable: (table: MassTable[], sourceFile: string) => void
  setCollisions: (collisions: Collision[]) => void
  addImportedFile: (file: ImportedFile) => void
  setSelectedCollisionId: (id: string | null) => void
  setVideoNotes: (notes: string) => void
  clearAll: () => void
  clearSpeedRecords: () => void
  clearMassTable: () => void
}

export const useAppStore = create<AppState>((set) => ({
  speedRecords: [],
  massTable: [],
  collisions: [],
  importedFiles: [],
  selectedCollisionId: null,
  videoNotes: '',

  setSpeedRecords: (records, sourceFile) => {
    set({
      speedRecords: records.map((r) => ({ ...r, sourceFile })),
    })
  },

  setMassTable: (table, sourceFile) => {
    set({
      massTable: table.map((m) => ({ ...m, sourceFile })),
    })
  },

  setCollisions: (collisions) => {
    set({ collisions })
  },

  addImportedFile: (file) => {
    set((state) => ({
      importedFiles: [...state.importedFiles, file],
    }))
  },

  setSelectedCollisionId: (id) => {
    set({ selectedCollisionId: id })
  },

  setVideoNotes: (notes) => {
    set({ videoNotes: notes })
  },

  clearAll: () => {
    set({
      speedRecords: [],
      massTable: [],
      collisions: [],
      importedFiles: [],
      selectedCollisionId: null,
      videoNotes: '',
    })
  },

  clearSpeedRecords: () => {
    set((state) => ({
      speedRecords: [],
      collisions: [],
      importedFiles: state.importedFiles.filter((f) => f.type !== 'speed'),
    }))
  },

  clearMassTable: () => {
    set((state) => ({
      massTable: [],
      collisions: [],
      importedFiles: state.importedFiles.filter((f) => f.type !== 'mass'),
    }))
  },
}))
