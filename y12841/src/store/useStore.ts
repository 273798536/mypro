import { create } from 'zustand'
import type { Sample, SequencingResult, AuditLog, ReviewRecord } from '../types'
import { initialData } from '../data/mockData'

interface BioClassifierStore {
  samples: Sample[]
  sequencingResults: SequencingResult[]
  auditLogs: AuditLog[]
  currentUser: { name: string; role: 'breeder' | 'student' }
  selectedSampleId: string | null
  pathologyDrawerOpen: boolean

  setSelectedSample: (id: string | null) => void
  setPathologyDrawerOpen: (open: boolean) => void
  submitReview: (contaminationMarkId: string, decision: 'passed' | 'rejected', reason: string) => void
  getSequencingResult: (sampleId: string) => SequencingResult | undefined
  getAuditLogsForEntity: (entityType: string, entityId: string) => AuditLog[]
  getModifiedSequencingResults: () => SequencingResult[]
  addAuditLog: (log: Omit<AuditLog, 'id'>) => void
}

export const useStore = create<BioClassifierStore>((set, get) => ({
  samples: initialData.samples,
  sequencingResults: initialData.sequencingResults,
  auditLogs: initialData.auditLogs,
  currentUser: { name: '陈志远', role: 'breeder' },
  selectedSampleId: null,
  pathologyDrawerOpen: false,

  setSelectedSample: (id) => set({ selectedSampleId: id }),
  setPathologyDrawerOpen: (open) => set({ pathologyDrawerOpen: open }),

  submitReview: (contaminationMarkId, decision, reason) => {
    const { samples, auditLogs, currentUser } = get()
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

    const updatedSamples = samples.map((s) => {
      if (s.contaminationMark?.id === contaminationMarkId) {
        const beforeAnnotation = s.contaminationMark.reviewRecord?.beforeAnnotation || {
          regions: [],
          label: '无历史标注',
        }
        const afterAnnotation = s.contaminationMark.reviewRecord?.afterAnnotation || {
          regions: [...beforeAnnotation.regions, {
            id: `ar-new-${Date.now()}`,
            type: 'abnormality' as const,
            x: 50, y: 30, width: 15, height: 12,
            label: '复核新增标记',
          }],
          label: `复核后标注：${beforeAnnotation.regions.length}处原标记+1处新增`,
        }

        const reviewRecord: ReviewRecord = {
          id: `rr-${Date.now()}`,
          contaminationMarkId,
          reviewer: currentUser.name,
          reviewedAt: now,
          decision,
          reason,
          beforeAnnotation,
          afterAnnotation,
          relatedMaterials: [
            `样本清单${s.code}`,
            `病理备注${s.pathologyNotes.map((p) => p.id).join('/')}`,
            `污染记录${s.contaminationMark.id}`,
          ],
        }

        return {
          ...s,
          contaminationMark: {
            ...s.contaminationMark,
            reviewStatus: decision,
            reviewRecord,
          },
          updatedAt: now,
        }
      }
      return s
    })

    const newLog: AuditLog = {
      id: `al-${Date.now()}`,
      entityType: 'review',
      entityId: contaminationMarkId,
      action: decision === 'passed' ? '复核通过污染样本' : '复核驳回污染样本',
      operator: currentUser.name,
      operatedAt: now,
      reason,
      beforeValue: '污染样本，待复核',
      afterValue: decision === 'passed' ? '污染样本复核通过' : '污染样本复核驳回',
    }

    set({
      samples: updatedSamples,
      auditLogs: [...auditLogs, newLog],
    })
  },

  getSequencingResult: (sampleId) => {
    return get().sequencingResults.find((r) => r.sampleId === sampleId)
  },

  getAuditLogsForEntity: (entityType, entityId) => {
    return get().auditLogs.filter(
      (l) => l.entityType === entityType && l.entityId === entityId
    )
  },

  getModifiedSequencingResults: () => {
    return get().sequencingResults.filter((r) => r.previousConclusion !== null)
  },

  addAuditLog: (log) => {
    set((state) => ({
      auditLogs: [...state.auditLogs, { ...log, id: `al-${Date.now()}` }],
    }))
  },
}))
