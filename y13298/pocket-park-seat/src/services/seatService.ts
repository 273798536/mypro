import type { SeatRecord, GisPoint, Complaint, ImportResult, ImportWarning, HistoryItem } from '../types'
import { storage } from '../utils/storage'
import { mockRecords } from '../data/mockData'

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const now = () => new Date().toLocaleString('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
}).replace(/\//g, '-')

export const seatService = {
  initMockData(): void {
    if (storage.getAll().length === 0) {
      storage.saveAll(mockRecords)
    }
  },

  getAll(): SeatRecord[] {
    return storage.getAll()
  },

  getById(id: string): SeatRecord | undefined {
    return storage.getById(id)
  },

  getByStatus(status: SeatRecord['status']): SeatRecord[] {
    return storage.getAll().filter(r => r.status === status)
  },

  getPendingConfirm(): SeatRecord[] {
    return storage.getAll().filter(r => r.status === 'pending' || r.conflictInfo?.needsConfirmation || r.needMerge)
  },

  importFromGis(gisPoints: GisPoint[], operator: string = '老曹'): ImportResult {
    const existing = storage.getAll()
    const success: SeatRecord[] = []
    const warnings: ImportWarning[] = []
    const errors: string[] = []

    for (const point of gisPoints) {
      try {
        const sameStreetRecords = existing.filter(r => r.gisPoint.street === point.street && r.status !== 'withdrawn')
        const sameGisRecords = existing.filter(r => r.gisPoint.id === point.id && r.status !== 'withdrawn')

        let schemeVersion = 1
        let conflictInfo: SeatRecord['conflictInfo'] = undefined
        let needMerge = false
        let complaints: Complaint[] = []

        if (sameGisRecords.length > 0) {
          const latest = sameGisRecords.sort((a, b) => b.schemeVersion - a.schemeVersion)[0]
          schemeVersion = latest.schemeVersion + 1
          conflictInfo = {
            type: 'old_covers_new',
            reason: `GIS点位已存在方案 v${latest.schemeVersion}（${latest.scheme}），新导入版本 v${schemeVersion} 可能覆盖原有意见，请确认`,
            affectedRange: `${point.street} 区域，涉及 ${latest.complaints.length} 条投诉记录`,
            needsConfirmation: true,
          }
          complaints = [...latest.complaints]
        }

        const streetComplaintCount = sameStreetRecords.reduce((sum, r) => sum + r.complaints.length, 0)
        if (streetComplaintCount >= 2 || sameStreetRecords.length >= 2) {
          needMerge = true
        }

        const record: SeatRecord = {
          id: generateId('rec'),
          gisPoint: point,
          scheme: `${point.name} 初步方案`,
          schemeVersion,
          status: 'pending',
          importTime: now(),
          complaints,
          needMerge,
          conflictInfo,
          history: [{
            id: generateId('h'),
            action: 'import',
            time: now(),
            operator,
            remark: conflictInfo ? '从GIS点位导入，检测到方案冲突' : '从GIS点位导入',
          }],
          materials: [],
          operator,
        }

        storage.add(record)
        success.push(record)

        if (conflictInfo) {
          warnings.push({
            type: 'conflict',
            recordId: record.id,
            message: conflictInfo.reason,
          })
        }
        if (needMerge) {
          warnings.push({
            type: 'duplicate',
            recordId: record.id,
            message: `同一街口（${point.street}）存在多条投诉，建议归并处理`,
          })
        }
      } catch (e) {
        errors.push(`点位 ${point.name} 导入失败：${(e as Error).message}`)
      }
    }

    return { success, warnings, errors }
  },

  confirmRecord(id: string, operator: string = '老曹'): SeatRecord | undefined {
    const record = storage.getById(id)
    if (!record) return undefined

    const history: HistoryItem = {
      id: generateId('h'),
      action: 'confirm',
      time: now(),
      operator,
      remark: '确认方案有效，点位无误',
    }

    return storage.update(id, {
      status: 'confirmed',
      confirmTime: now(),
      conflictInfo: undefined,
      needMerge: false,
      history: [...record.history, history],
    })
  },

  withdrawRecord(id: string, reason: string, operator: string = '老曹'): SeatRecord | undefined {
    const record = storage.getById(id)
    if (!record) return undefined

    const history: HistoryItem = {
      id: generateId('h'),
      action: 'withdraw',
      time: now(),
      operator,
      remark: `撤回：${reason}`,
    }

    return storage.update(id, {
      status: 'withdrawn',
      history: [...record.history, history],
    })
  },

  setConclusion(id: string, conclusion: string, status: SeatRecord['status'], operator: string = '老曹'): SeatRecord | undefined {
    const record = storage.getById(id)
    if (!record) return undefined

    const history: HistoryItem = {
      id: generateId('h'),
      action: 'conclude',
      time: now(),
      operator,
      remark: `出具结论：${conclusion.slice(0, 30)}...`,
    }

    return storage.update(id, {
      status,
      conclusion,
      conclusionTime: now(),
      history: [...record.history, history],
    })
  },

  mergeComplaints(id: string, complaintIds: string[], operator: string = '老曹'): SeatRecord | undefined {
    const record = storage.getById(id)
    if (!record || complaintIds.length < 2) return undefined

    const toMerge = record.complaints.filter(c => complaintIds.includes(c.id))
    const others = record.complaints.filter(c => !complaintIds.includes(c.id))

    const mergedComplaint: Complaint = {
      id: generateId('cmp'),
      content: `【归并投诉】${toMerge.map(c => c.content).join('；')}`,
      reporter: toMerge.map(c => c.reporter).join('、'),
      time: now(),
      street: record.gisPoint.street,
      merged: true,
      mergedFrom: complaintIds,
    }

    const history: HistoryItem = {
      id: generateId('h'),
      action: 'merge',
      time: now(),
      operator,
      remark: `归并 ${complaintIds.length} 条投诉`,
    }

    return storage.update(id, {
      complaints: [...others, mergedComplaint],
      needMerge: false,
      history: [...record.history, history],
    })
  },

  addMaterial(id: string, materialName: string, operator: string = '老曹'): SeatRecord | undefined {
    const record = storage.getById(id)
    if (!record) return undefined

    const history: HistoryItem = {
      id: generateId('h'),
      action: 'add_material',
      time: now(),
      operator,
      remark: `补充材料：${materialName}`,
    }

    return storage.update(id, {
      materials: [...record.materials, materialName],
      status: record.status === 'need_material' ? 'pending' : record.status,
      history: [...record.history, history],
    })
  },

  updateScheme(id: string, scheme: string, operator: string = '老曹'): SeatRecord | undefined {
    const record = storage.getById(id)
    if (!record) return undefined

    const history: HistoryItem = {
      id: generateId('h'),
      action: 'update_scheme',
      time: now(),
      operator,
      remark: `更新方案为：${scheme.slice(0, 30)}...`,
    }

    return storage.update(id, {
      scheme,
      schemeVersion: record.schemeVersion + 1,
      history: [...record.history, history],
    })
  },

  getStats() {
    const all = storage.getAll()
    return {
      total: all.length,
      confirmed: all.filter(r => r.status === 'confirmed').length,
      pending: all.filter(r => r.status === 'pending').length,
      needMaterial: all.filter(r => r.status === 'need_material').length,
      manualReview: all.filter(r => r.status === 'manual_review').length,
      withdrawn: all.filter(r => r.status === 'withdrawn').length,
      hasConflict: all.filter(r => r.conflictInfo?.needsConfirmation).length,
      needMerge: all.filter(r => r.needMerge).length,
    }
  },
}
