import { create } from 'zustand'
import type { CashFlowRecord, OperationLog, StoreMeta, ImportResultItem, ImportPreview, LogType } from '@/types'
import { loadRecords, saveRecords, loadLogs, saveLogs, loadMeta, saveMeta } from '@/utils/storage'

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

interface Store {
  records: CashFlowRecord[]
  logs: OperationLog[]
  meta: StoreMeta

  init: () => void

  previewImport: (items: ImportResultItem[]) => ImportPreview

  commitImport: (items: ImportResultItem[], operator?: string) => { added: number; skipped: number }

  confirmRecord: (id: string, operator?: string) => void
  withdrawRecord: (id: string, operator?: string) => void
  updateNote: (id: string, note: string, operator?: string) => void

  addLog: (type: LogType, detail: string, operator?: string, recordId?: string) => void
  rerun: (operator?: string) => void

  exportReportAt: string | null
  markReportExported: () => void
}

export const useStore = create<Store>((set, get) => ({
  records: [],
  logs: [],
  meta: { importCounter: 0 },
  exportReportAt: null,

  init: () => {
    set({
      records: loadRecords(),
      logs: loadLogs(),
      meta: loadMeta(),
    })
  },

  previewImport: (items) => {
    const { records } = get()
    const byBatch = new Map(records.map(r => [r.batchNo, r]))
    const newItems: ImportResultItem[] = []
    const duplicates: ImportPreview['duplicates'] = []
    const reversals: ImportResultItem[] = []

    for (const it of items) {
      if (it.amount < 0) reversals.push(it)
      const existing = byBatch.get(it.batchNo)
      if (existing) {
        duplicates.push({
          existing,
          incoming: it,
          amountChanged: Math.abs(existing.amount - it.amount) > 1e-6,
        })
      } else {
        newItems.push(it)
      }
    }
    return { newItems, duplicates, reversals }
  },

  commitImport: (items, operator = '财务员') => {
    const { records, logs, meta } = get()
    const byBatch = new Map(records.map(r => [r.batchNo, r]))
    const nextCounter = meta.importCounter + 1
    const importBatch = `IMP${String(nextCounter).padStart(4, '0')}`
    const now = new Date().toISOString()

    const newRecords: CashFlowRecord[] = []
    let skipped = 0
    const appendLogs: OperationLog[] = []

    for (const it of items) {
      const existing = byBatch.get(it.batchNo)
      if (existing) {
        skipped++
        const amountChanged = Math.abs(existing.amount - it.amount) > 1e-6
        if (amountChanged) {
          appendLogs.push({
            id: uid(),
            type: 'import_skip',
            recordId: existing.id,
            detail: `重复批次 ${it.batchNo}：原金额 ${existing.amount} 与新导入 ${it.amount} 不一致，已保留原记录及备注，未覆盖`,
            operator,
            timestamp: new Date().toISOString(),
          })
        } else {
          appendLogs.push({
            id: uid(),
            type: 'import_skip',
            recordId: existing.id,
            detail: `重复批次 ${it.batchNo}：已存在，未重复入库，备注保留不变`,
            operator,
            timestamp: new Date().toISOString(),
          })
        }
        continue
      }
      const isReversal = it.amount < 0
      newRecords.push({
        id: uid(),
        batchNo: it.batchNo,
        amount: it.amount,
        status: isReversal ? 'reversal' : 'pending',
        baseStatus: 'pending',
        source: it.source,
        note: '',
        importBatch,
        importedAt: now,
        version: 1,
        isReversal,
      })
    }

    const allRecords = [...records, ...newRecords]
    const allLogs = [...logs, ...appendLogs]
    if (newRecords.length > 0) {
      allLogs.push({
        id: uid(),
        type: 'import',
        detail: `导入批次 ${importBatch}：新增 ${newRecords.length} 条${skipped > 0 ? `，跳过重复 ${skipped} 条` : ''}${newRecords.some(r => r.isReversal) ? '（含负数冲正，请关注）' : ''}`,
        operator,
        timestamp: new Date().toISOString(),
      })
    }

    const nextMeta = { ...meta, importCounter: nextCounter }
    saveRecords(allRecords)
    saveLogs(allLogs)
    saveMeta(nextMeta)
    set({ records: allRecords, logs: allLogs, meta: nextMeta })
    return { added: newRecords.length, skipped }
  },

  confirmRecord: (id, operator = '财务员') => {
    const { records, logs } = get()
    const now = new Date().toISOString()
    const updated = records.map(r =>
      r.id === id
        ? { ...r, baseStatus: 'confirmed' as const, confirmedAt: now, status: r.isReversal ? 'reversal' : 'confirmed' }
        : r,
    )
    const target = records.find(r => r.id === id)
    const nextLogs = [
      ...logs,
      {
        id: uid(),
        type: 'confirm' as LogType,
        recordId: id,
        detail: `确认记录 ${target?.batchNo ?? id}`,
        operator,
        timestamp: now,
      },
    ]
    saveRecords(updated)
    saveLogs(nextLogs)
    set({ records: updated, logs: nextLogs })
  },

  withdrawRecord: (id, operator = '财务员') => {
    const { records, logs } = get()
    const now = new Date().toISOString()
    const updated = records.map(r =>
      r.id === id
        ? { ...r, baseStatus: 'withdrawn' as const, withdrawnAt: now, status: r.isReversal ? 'reversal' : 'withdrawn' }
        : r,
    )
    const target = records.find(r => r.id === id)
    const nextLogs = [
      ...logs,
      {
        id: uid(),
        type: 'withdraw' as LogType,
        recordId: id,
        detail: `撤回记录 ${target?.batchNo ?? id}`,
        operator,
        timestamp: now,
      },
    ]
    saveRecords(updated)
    saveLogs(nextLogs)
    set({ records: updated, logs: nextLogs })
  },

  updateNote: (id, note, operator = '财务员') => {
    const { records, logs } = get()
    const target = records.find(r => r.id === id)
    if (!target) return
    const updated = records.map(r => (r.id === id ? { ...r, note, version: r.version + 1 } : r))
    const nextLogs = [
      ...logs,
      {
        id: uid(),
        type: 'note_edit' as LogType,
        recordId: id,
        detail: `更新备注 ${target.batchNo}：${note || '（清空）'}`,
        operator,
        timestamp: new Date().toISOString(),
      },
    ]
    saveRecords(updated)
    saveLogs(nextLogs)
    set({ records: updated, logs: nextLogs })
  },

  addLog: (type, detail, operator = '财务员', recordId) => {
    const { logs } = get()
    const next = [
      ...logs,
      { id: uid(), type, detail, operator, recordId, timestamp: new Date().toISOString() },
    ]
    saveLogs(next)
    set({ logs: next })
  },

  rerun: (operator = '财务员') => {
    const { records } = get()
    const now = new Date().toISOString()
    const updated = records.map(r => {
      if (r.baseStatus === 'withdrawn') return r
      const isReversal = r.amount < 0
      return {
        ...r,
        baseStatus: 'pending' as const,
        isReversal,
        status: isReversal ? 'reversal' : 'pending',
        confirmedAt: undefined,
        withdrawnAt: undefined,
      }
    })
    saveRecords(updated)
    get().addLog('rerun', '执行重跑：所有未撤回记录重置为待确认状态', operator)
    set({ records: updated })
  },

  markReportExported: () => {
    const now = new Date().toISOString()
    const { meta } = get()
    const nextMeta = { ...meta, lastReportAt: now }
    saveMeta(nextMeta)
    set({ meta: nextMeta, exportReportAt: now })
  },
}))
