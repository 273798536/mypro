import { create } from 'zustand'
import type { Material, ReviewItem, Note, AnomalyRecord, AuthorizationNote, FilterState, PageSummary } from './types'
import { mockMaterials, mockReviewItems, mockNotes, mockAnomalyRecords, mockAuthorizationNotes } from './data/mock'

interface ReviewStore {
  materials: Material[]
  reviewItems: ReviewItem[]
  notes: Note[]
  anomalyRecords: AnomalyRecord[]
  authorizationNotes: AuthorizationNote[]
  filters: FilterState
  showAuthModal: boolean
  expandedMaterial: string | null
  editingNote: string | null
  exportStatus: 'idle' | 'checking' | 'consistent' | 'inconsistent' | 'exported'

  updateFilter: (filters: Partial<FilterState>) => void
  addMaterial: (file: File, meta: { sourceGroup: string; sender: string }) => void
  addNote: (itemId: string, content: string, author: string) => void
  startEditNote: (itemId: string | null) => void
  addAuthorizationNote: (content: string) => void
  setShowAuthModal: (show: boolean) => void
  setExpandedMaterial: (id: string | null) => void
  exportSummary: () => void
  computeSummary: () => PageSummary
  getFilteredItems: () => ReviewItem[]
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  materials: mockMaterials,
  reviewItems: mockReviewItems,
  notes: mockNotes,
  anomalyRecords: mockAnomalyRecords,
  authorizationNotes: mockAuthorizationNotes,
  filters: {
    dateRange: null,
    songNumber: '',
    versionNumber: '',
    sourceChannel: '',
  },
  showAuthModal: false,
  expandedMaterial: null,
  editingNote: null,
  exportStatus: 'idle',

  updateFilter: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      exportStatus: 'idle',
    }))
  },

  addMaterial: (file, meta) => {
    const currentState = get()
    const id = `mat-${Date.now()}`
    const isDirty = Math.random() > 0.6
    const dirtyTags = ['截断-底部信息不完整', '模糊-文字可辨识度低', '重复-与已有截图重叠']
    const newMaterial: Material = {
      id,
      fileName: file.name,
      sourceGroup: meta.sourceGroup,
      sender: meta.sender,
      uploadedAt: new Date().toISOString(),
      isDirty,
      dirtyTag: isDirty ? dirtyTags[Math.floor(Math.random() * dirtyTags.length)] : '',
      thumbnailUrl: '',
    }
    const reviewIdx = currentState.reviewItems.length + 1
    const newReviewItem: ReviewItem = {
      id: `rev-${Date.now()}`,
      songNumber: `EN-${String(reviewIdx).padStart(2, '0')}`,
      versionNumber: 'v1.0',
      status: 'pending',
      materialId: id,
      reviewDate: new Date().toISOString().slice(0, 10),
      alignedWith: { files: false, trackList: false, finalChecklist: false },
    }
    set({
      materials: [...currentState.materials, newMaterial],
      reviewItems: [...currentState.reviewItems, newReviewItem],
    })
  },

  addNote: (itemId, content, author) => {
    const state = get()
    const item = state.reviewItems.find((r) => r.id === itemId)
    const existingNote = state.notes.find((n) => n.itemId === itemId)
    const isOverride = existingNote !== undefined && content !== existingNote.content
    const previousJudgment = isOverride ? existingNote.content : null

    const newNote: Note = {
      id: `note-${Date.now()}`,
      itemId,
      content,
      isOverride,
      previousJudgment,
      author,
      createdAt: new Date().toISOString(),
    }

    const updates: Partial<ReviewStore> = {
      notes: [...state.notes, newNote],
      editingNote: null,
    }

    if (isOverride && item) {
      const anomalyRecord: AnomalyRecord = {
        id: `ano-${Date.now()}`,
        noteId: newNote.id,
        originalValue: previousJudgment || '',
        overrideValue: content,
        operator: author,
        occurredAt: new Date().toISOString(),
      }
      updates.anomalyRecords = [...state.anomalyRecords, anomalyRecord]
      updates.reviewItems = state.reviewItems.map((r) =>
        r.id === itemId ? { ...r, status: 'anomaly' as const } : r
      )
    }

    set(updates)
  },

  startEditNote: (itemId) => {
    set({ editingNote: itemId })
  },

  addAuthorizationNote: (content) => {
    const id = `auth-${Date.now()}`
    const newAuth: AuthorizationNote = {
      id,
      content,
      createdAt: new Date().toISOString(),
      alignmentDone: true,
    }

    set((state) => ({
      authorizationNotes: [...state.authorizationNotes, newAuth],
      reviewItems: state.reviewItems.map((item) => ({
        ...item,
        alignedWith: { files: true, trackList: true, finalChecklist: true },
      })),
      showAuthModal: false,
      exportStatus: 'idle',
    }))
  },

  setShowAuthModal: (show) => {
    set({ showAuthModal: show })
  },

  setExpandedMaterial: (id) => {
    set({ expandedMaterial: id })
  },

  exportSummary: () => {
    set({ exportStatus: 'checking' })

    setTimeout(() => {
      const state = get()
      const summary = state.computeSummary()
      const filteredItems = state.getFilteredItems()

      const isConsistent = filteredItems.every((item) => {
        const allAligned = item.alignedWith.files && item.alignedWith.trackList && item.alignedWith.finalChecklist
        const displayStatus = item.status
        if (displayStatus === 'confirmed' && !allAligned) return false
        if (displayStatus === 'anomaly') return true
        return true
      })

      if (!isConsistent) {
        set({ exportStatus: 'inconsistent' })
        return
      }

      const exportData = {
        exportTime: new Date().toISOString(),
        summary,
        items: filteredItems.map((item) => {
          const notes = state.notes.filter((n) => n.itemId === item.id)
          return {
            songNumber: item.songNumber,
            versionNumber: item.versionNumber,
            status: item.status,
            reviewDate: item.reviewDate,
            alignedWith: item.alignedWith,
            notes: notes.map((n) => ({
              content: n.content,
              isOverride: n.isOverride,
              author: n.author,
              createdAt: n.createdAt,
            })),
          }
        }),
        anomalyRecords: state.anomalyRecords,
        authorizationNotes: state.authorizationNotes,
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `返场曲版本复核_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)

      set({ exportStatus: 'exported' })
      setTimeout(() => set({ exportStatus: 'idle' }), 3000)
    }, 800)
  },

  computeSummary: () => {
    const state = get()
    const filteredItems = state.getFilteredItems()
    const lastAuth = state.authorizationNotes[state.authorizationNotes.length - 1]

    return {
      totalItems: filteredItems.length,
      confirmed: filteredItems.filter((i) => i.status === 'confirmed').length,
      pending: filteredItems.filter((i) => i.status === 'pending').length,
      anomaly: filteredItems.filter((i) => i.status === 'anomaly').length,
      lastAlignmentAt: lastAuth ? lastAuth.createdAt : null,
      filtersApplied: state.filters,
    }
  },

  getFilteredItems: () => {
    const state = get()
    let items = state.reviewItems

    if (state.filters.songNumber) {
      items = items.filter((i) =>
        i.songNumber.toLowerCase().includes(state.filters.songNumber.toLowerCase())
      )
    }

    if (state.filters.versionNumber) {
      items = items.filter((i) =>
        i.versionNumber.toLowerCase().includes(state.filters.versionNumber.toLowerCase())
      )
    }

    if (state.filters.sourceChannel) {
      const materialIds = state.materials
        .filter((m) => m.sourceGroup.includes(state.filters.sourceChannel))
        .map((m) => m.id)
      items = items.filter((i) => materialIds.includes(i.materialId))
    }

    if (state.filters.dateRange) {
      const [start, end] = state.filters.dateRange
      items = items.filter((i) => {
        const d = i.reviewDate
        return d >= start && d <= end
      })
    }

    return items
  },
}))
