import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FieldMapping, FieldMappingHistoryEntry } from '@/types'
import { generateFieldMappings, parseFieldsFromData } from '@/engine/fieldGuess'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

interface FieldMappingState {
  rawInput: string
  mappings: FieldMapping[]
  history: FieldMappingHistoryEntry[]
  setRawInput: (input: string) => void
  parseAndGenerate: () => void
  updateMapping: (id: string, updates: Partial<FieldMapping>) => void
  confirmMapping: (id: string, note?: string) => void
  rejectMapping: (id: string, note?: string) => void
  resetMappings: () => void
}

export const useFieldMappingStore = create<FieldMappingState>()(
  persist(
    (set, get) => ({
      rawInput: '',
      mappings: [],
      history: [],

      setRawInput: (input) => set({ rawInput: input }),

      parseAndGenerate: () => {
        const { rawInput } = get()
        const fields = parseFieldsFromData(rawInput)
        const mappings = generateFieldMappings(fields)
        const historyEntry: FieldMappingHistoryEntry = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          action: '解析数据并生成字段映射',
          operatorNote: `解析出 ${fields.length} 个字段`,
        }
        set(state => ({
          mappings,
          history: [...state.history, historyEntry],
        }))
      },

      updateMapping: (id, updates) => {
        set(state => {
          const before = state.mappings.find(m => m.id === id)
          const after = { ...before!, ...updates }
          const historyEntry: FieldMappingHistoryEntry = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            action: '修改字段映射',
            before,
            after,
            operatorNote: `字段"${before?.originalField}"从"${before?.guessedField}"改为"${updates.guessedField || before?.guessedField}"`,
          }
          return {
            mappings: state.mappings.map(m => m.id === id ? { ...m, ...updates } : m),
            history: [...state.history, historyEntry],
          }
        })
      },

      confirmMapping: (id, note) => {
        set(state => {
          const before = state.mappings.find(m => m.id === id)
          const historyEntry: FieldMappingHistoryEntry = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            action: '确认字段映射',
            before,
            after: { ...before!, status: 'confirmed', confirmedAt: new Date().toISOString(), note },
            operatorNote: note,
          }
          return {
            mappings: state.mappings.map(m =>
              m.id === id
                ? { ...m, status: 'confirmed' as const, confirmedAt: new Date().toISOString(), note }
                : m
            ),
            history: [...state.history, historyEntry],
          }
        })
      },

      rejectMapping: (id, note) => {
        set(state => {
          const before = state.mappings.find(m => m.id === id)
          const historyEntry: FieldMappingHistoryEntry = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            action: '拒绝字段映射',
            before,
            after: { ...before!, status: 'rejected' as const, note },
            operatorNote: note,
          }
          return {
            mappings: state.mappings.map(m =>
              m.id === id
                ? { ...m, status: 'rejected' as const, note }
                : m
            ),
            history: [...state.history, historyEntry],
          }
        })
      },

      resetMappings: () => set({ mappings: [], rawInput: '' }),
    }),
    { name: 'cutpoint-field-mappings' }
  )
)
