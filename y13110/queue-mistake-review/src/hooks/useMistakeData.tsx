import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react'
import type { MistakeRecord, FilterOptions, SortField, SortOrder, ProcessStatus } from '../types'
import { mockData } from '../data/mockData'

interface MistakeContextType {
  mistakes: MistakeRecord[]
  filteredMistakes: MistakeRecord[]
  filters: FilterOptions
  sortField: SortField
  sortOrder: SortOrder
  setFilters: (filters: FilterOptions) => void
  setSortField: (field: SortField) => void
  setSortOrder: (order: SortOrder) => void
  getMistakeById: (id: string) => MistakeRecord | undefined
  updateMistake: (id: string, updates: Partial<MistakeRecord>) => void
  updateMistakeStatus: (id: string, status: ProcessStatus) => void
  stats: {
    total: number
    pending: number
    unitIssue: number
    needsConfirm: number
    completed: number
    withLateAttachment: number
  }
}

const MistakeContext = createContext<MistakeContextType | undefined>(undefined)

export function MistakeProvider({ children }: { children: ReactNode }) {
  const [mistakes, setMistakes] = useState<MistakeRecord[]>(mockData)
  const [filters, setFilters] = useState<FilterOptions>({})
  const [sortField, setSortField] = useState<SortField>('queueNumber')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const filteredMistakes = useMemo(() => {
    let result = [...mistakes]

    if (filters.status && filters.status.length > 0) {
      result = result.filter(m => filters.status!.includes(m.status))
    }

    if (filters.dataSource && filters.dataSource.length > 0) {
      result = result.filter(m => filters.dataSource!.includes(m.dataSource))
    }

    if (filters.difficulty && filters.difficulty.length > 0) {
      result = result.filter(m => filters.difficulty!.includes(m.difficulty))
    }

    if (filters.hasUnitIssue !== undefined) {
      result = result.filter(m => !m.unitCheck.passed === filters.hasUnitIssue)
    }

    if (filters.hasLateAttachment !== undefined) {
      result = result.filter(m => 
        m.attachments.some(a => a.isLateArrival) === filters.hasLateAttachment
      )
    }

    if (filters.keyword && filters.keyword.trim()) {
      const kw = filters.keyword.toLowerCase()
      result = result.filter(m =>
        m.title.toLowerCase().includes(kw) ||
        m.questionContent.toLowerCase().includes(kw) ||
        m.chapter.toLowerCase().includes(kw)
      )
    }

    result.sort((a, b) => {
      let compareResult = 0
      switch (sortField) {
        case 'queueNumber':
          compareResult = a.queueNumber - b.queueNumber
          break
        case 'createdAt':
          compareResult = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'status':
          compareResult = a.status.localeCompare(b.status)
          break
        case 'difficulty':
          const diffOrder: Record<string, number> = { easy: 1, medium: 2, hard: 3 }
          compareResult = diffOrder[a.difficulty] - diffOrder[b.difficulty]
          break
      }
      return sortOrder === 'asc' ? compareResult : -compareResult
    })

    return result
  }, [mistakes, filters, sortField, sortOrder])

  const getMistakeById = useCallback((id: string) => {
    return mistakes.find(m => m.id === id)
  }, [mistakes])

  const updateMistake = useCallback((id: string, updates: Partial<MistakeRecord>) => {
    setMistakes(prev => prev.map(m => 
      m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
    ))
  }, [])

  const updateMistakeStatus = useCallback((id: string, status: ProcessStatus) => {
    setMistakes(prev => prev.map(m =>
      m.id === id ? { ...m, status, updatedAt: new Date().toISOString() } : m
    ))
  }, [])

  const stats = useMemo(() => {
    return {
      total: mistakes.length,
      pending: mistakes.filter(m => m.status === 'pending' || m.status === 'unit_checking').length,
      unitIssue: mistakes.filter(m => !m.unitCheck.passed).length,
      needsConfirm: mistakes.filter(m => m.status === 'needs_manual_confirm').length,
      completed: mistakes.filter(m => m.status === 'completed' || m.status === 'reviewed').length,
      withLateAttachment: mistakes.filter(m => m.attachments.some(a => a.isLateArrival)).length
    }
  }, [mistakes])

  return (
    <MistakeContext.Provider value={{
      mistakes,
      filteredMistakes,
      filters,
      sortField,
      sortOrder,
      setFilters,
      setSortField,
      setSortOrder,
      getMistakeById,
      updateMistake,
      updateMistakeStatus,
      stats
    }}>
      {children}
    </MistakeContext.Provider>
  )
}

export function useMistakeData() {
  const context = useContext(MistakeContext)
  if (context === undefined) {
    throw new Error('useMistakeData must be used within a MistakeProvider')
  }
  return context
}
