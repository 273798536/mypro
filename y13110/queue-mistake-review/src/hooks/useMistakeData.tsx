import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react'
import type { MistakeRecord, FilterOptions, SortField, SortOrder, Attachment, FieldMapping } from '../types'
import { ProcessStatus } from '../types'
import { loadMistakes, saveMistakes, resetToSeed } from '../utils/storage'
import { normalizeRawRecord, type RawImportRecord } from '../utils/fieldMapping'
import { checkUnits } from '../utils/unitEngine'

interface ImportResult {
  imported: number
  mapped: FieldMapping[]
  warnings: string[]
}

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
  addAttachment: (mistakeId: string, attachment: Attachment) => void
  importRecords: (rawRecords: RawImportRecord[], source: MistakeRecord['dataSource']) => ImportResult
  resetData: () => void
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
  const [mistakes, setMistakes] = useState<MistakeRecord[]>(() => loadMistakes())
  const [filters, setFilters] = useState<FilterOptions>({})
  const [sortField, setSortField] = useState<SortField>('queueNumber')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const persistAndSet = useCallback((next: MistakeRecord[]) => {
    saveMistakes(next)
    setMistakes(next)
  }, [])

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
    setMistakes(prev => {
      const next = prev.map(m => 
        m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
      )
      saveMistakes(next)
      return next
    })
  }, [])

  const updateMistakeStatus = useCallback((id: string, status: ProcessStatus) => {
    setMistakes(prev => {
      const next = prev.map(m =>
        m.id === id ? { ...m, status, updatedAt: new Date().toISOString() } : m
      )
      saveMistakes(next)
      return next
    })
  }, [])

  const addAttachment = useCallback((mistakeId: string, attachment: Attachment) => {
    setMistakes(prev => {
      const next = prev.map(m =>
        m.id === mistakeId
          ? { ...m, attachments: [...m.attachments, attachment], updatedAt: new Date().toISOString() }
          : m
      )
      saveMistakes(next)
      return next
    })
  }, [])

  const importRecords = useCallback((
    rawRecords: RawImportRecord[],
    source: MistakeRecord['dataSource']
  ): ImportResult => {
    const allMappings: FieldMapping[] = []
    const allWarnings: string[] = []
    const maxQueue = mistakes.reduce((max, m) => Math.max(max, m.queueNumber), 0)
    const now = new Date().toISOString()

    const newRecords: MistakeRecord[] = rawRecords.map((raw, idx) => {
      const normalized = normalizeRawRecord(raw)
      allMappings.push(...normalized.mappings)
      allWarnings.push(...normalized.warnings.map(w => `记录#${idx + 1}: ${w}`))

      const queueNumber = maxQueue + idx + 1
      const id = `imp_${Date.now()}_${idx}`
      const rawStatus = normalized.data.originalStatus
      const rawSource = normalized.data.originalDataSource
      const finalSource = rawSource || source
      const isFinalState = rawStatus === ProcessStatus.COMPLETED || rawStatus === ProcessStatus.REVIEWED || rawStatus === ProcessStatus.ARCHIVED
      const unitCheckResult = checkUnits(
        normalized.data.formulaUnit,
        normalized.data.correctAnswer?.unit,
        normalized.data.studentAnswer?.rawText
      )
      let finalStatus = rawStatus || ProcessStatus.PENDING
      const statusBeforeUnitCheck = finalStatus
      if (!isFinalState && !unitCheckResult.passed) {
        finalStatus = ProcessStatus.UNIT_CHECKING
        if (unitCheckResult.missingUnits.length > 0) {
          finalStatus = ProcessStatus.NEEDS_MANUAL_CONFIRM
        }
      }
      const record: MistakeRecord = {
        id,
        queueNumber,
        title: normalized.data.title || `导入题${queueNumber}`,
        subject: normalized.data.subject || '未指定',
        chapter: normalized.data.chapter || '未指定',
        difficulty: normalized.data.difficulty || 'medium',
        status: finalStatus,
        dataSource: finalSource,
        questionContent: normalized.data.questionContent || '',
        formula: normalized.data.formula || '',
        formulaUnit: normalized.data.formulaUnit,
        studentAnswer: normalized.data.studentAnswer,
        correctAnswer: normalized.data.correctAnswer,
        unitCheck: unitCheckResult,
        attachments: (normalized.data.attachments as Attachment[]) || [],
        createdAt: now,
        updatedAt: now,
        submittedBy: normalized.data.submittedBy,
        fieldMappingNotes: normalized.mappings.length > 0 ? normalized.mappings : undefined,
        tags: normalized.data.tags || ['导入'],
      }
      if (!isFinalState && !unitCheckResult.passed) {
        if (unitCheckResult.missingUnits.length > 0) {
          record.manualConfirm = {
            reason: `单位缺失：${unitCheckResult.missingUnits.join('、')}。导入数据中未提供完整单位信息。`,
            nextStep: '请补全缺失单位后重新校验，或人工确认答案是否正确。',
            requiredAction: '补全单位信息'
          }
        }
      }
      if (statusBeforeUnitCheck !== finalStatus) {
        allWarnings.push(`记录#${idx + 1}: 原始状态"${statusBeforeUnitCheck}"因单位校验结果调整为"${finalStatus}"`)
      }
      if (rawSource && rawSource !== source) {
        allWarnings.push(`记录#${idx + 1}: 来源采用原始记录中的"${rawSource}"，而非导入时选择的"${source}"`)
      }
      if (rawStatus && isFinalState && !unitCheckResult.passed) {
        allWarnings.push(`记录#${idx + 1}: 原始为终态"${rawStatus}"，跳过单位校验自动打回逻辑，状态保留`)
      }

      return record
    })

    setMistakes(prev => {
      const next = [...prev, ...newRecords]
      saveMistakes(next)
      return next
    })

    return {
      imported: newRecords.length,
      mapped: allMappings,
      warnings: allWarnings
    }
  }, [mistakes])

  const resetData = useCallback(() => {
    const seed = resetToSeed()
    persistAndSet(seed)
  }, [persistAndSet])

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
      addAttachment,
      importRecords,
      resetData,
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
