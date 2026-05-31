import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ProjectLedger,
  TimeRecord,
  MaterialRequisition,
  InvoiceVoucher,
  ExpenseAggregation,
  ValidationAlert,
  ChangeLogEntry,
  VersionSnapshot,
} from '@/types'
import {
  computeAggregations,
  runValidation,
  generateId,
  computeDataHash,
} from '@/utils/validation'

interface StoreState {
  projects: ProjectLedger[]
  timeRecords: TimeRecord[]
  materials: MaterialRequisition[]
  invoices: InvoiceVoucher[]
  aggregations: ExpenseAggregation[]
  alerts: ValidationAlert[]
  changelog: ChangeLogEntry[]
  snapshots: VersionSnapshot[]

  recalculate: () => void
  addChangeLog: (entry: Omit<ChangeLogEntry, 'id' | 'timestamp' | 'snapshotId'>) => void

  addProject: (project: Omit<ProjectLedger, 'id' | 'version'>) => void
  updateProject: (id: string, data: Partial<ProjectLedger>) => void
  deleteProject: (id: string) => void

  addTimeRecord: (record: Omit<TimeRecord, 'id' | 'version'>) => void
  updateTimeRecord: (id: string, data: Partial<TimeRecord>) => void
  deleteTimeRecord: (id: string) => void

  addMaterial: (material: Omit<MaterialRequisition, 'id' | 'version'>) => void
  updateMaterial: (id: string, data: Partial<MaterialRequisition>) => void
  deleteMaterial: (id: string) => void

  addInvoice: (invoice: Omit<InvoiceVoucher, 'id' | 'version'>) => void
  updateInvoice: (id: string, data: Partial<InvoiceVoucher>) => void
  deleteInvoice: (id: string) => void

  resolveAlert: (alertId: string, explanation: string) => void
  getProjectName: (projectId: string) => string
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      projects: [],
      timeRecords: [],
      materials: [],
      invoices: [],
      aggregations: [],
      alerts: [],
      changelog: [],
      snapshots: [],

      recalculate: () => {
        const { projects, timeRecords, materials, invoices, alerts } = get()
        const aggregations = computeAggregations(projects, timeRecords, materials, invoices)
        const newAlerts = runValidation(projects, timeRecords, materials, invoices, alerts)
        set({ aggregations, alerts: newAlerts })
      },

      addChangeLog: (entry) => {
        const { snapshots, aggregations } = get()
        const snapshotId = generateId()
        const snapshot: VersionSnapshot = {
          id: snapshotId,
          timestamp: new Date().toISOString(),
          trigger: `${entry.operation} ${entry.entityType}: ${entry.entityName}`,
          aggregations: [...aggregations],
          dataHash: computeDataHash(get().projects, get().timeRecords, get().materials, get().invoices),
        }
        const logEntry: ChangeLogEntry = {
          ...entry,
          id: generateId(),
          timestamp: new Date().toISOString(),
          snapshotId,
        }
        set((state) => ({
          changelog: [logEntry, ...state.changelog],
          snapshots: [snapshot, ...state.snapshots],
        }))
      },

      addProject: (project) => {
        const id = generateId()
        const newProject: ProjectLedger = { ...project, id, version: 1 }
        set((state) => ({ projects: [...state.projects, newProject] }))
        get().addChangeLog({
          operation: 'create',
          entityType: 'project',
          entityId: id,
          entityName: project.name,
          previousValue: null,
          newValue: newProject as unknown as Record<string, unknown>,
          affectedProjectIds: [id],
        })
        get().recalculate()
      },

      updateProject: (id, data) => {
        const prev = get().projects.find((p) => p.id === id)
        if (!prev) return
        const updated = { ...prev, ...data, version: prev.version + 1 }
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? updated : p)),
        }))
        get().addChangeLog({
          operation: 'update',
          entityType: 'project',
          entityId: id,
          entityName: updated.name,
          previousValue: prev as unknown as Record<string, unknown>,
          newValue: updated as unknown as Record<string, unknown>,
          affectedProjectIds: [id],
        })
        get().recalculate()
      },

      deleteProject: (id) => {
        const prev = get().projects.find((p) => p.id === id)
        if (!prev) return
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          timeRecords: state.timeRecords.filter((t) => t.projectId !== id),
          materials: state.materials.filter((m) => m.projectId !== id),
          invoices: state.invoices.filter((i) => i.projectId !== id),
        }))
        get().addChangeLog({
          operation: 'delete',
          entityType: 'project',
          entityId: id,
          entityName: prev.name,
          previousValue: prev as unknown as Record<string, unknown>,
          newValue: null,
          affectedProjectIds: [id],
        })
        get().recalculate()
      },

      addTimeRecord: (record) => {
        const id = generateId()
        const newRecord: TimeRecord = { ...record, id, version: 1 }
        set((state) => ({ timeRecords: [...state.timeRecords, newRecord] }))
        get().addChangeLog({
          operation: 'create',
          entityType: 'timeRecord',
          entityId: id,
          entityName: `${record.employeeName} ${record.date}`,
          previousValue: null,
          newValue: newRecord as unknown as Record<string, unknown>,
          affectedProjectIds: [record.projectId],
        })
        get().recalculate()
      },

      updateTimeRecord: (id, data) => {
        const prev = get().timeRecords.find((t) => t.id === id)
        if (!prev) return
        const updated = { ...prev, ...data, version: prev.version + 1 }
        set((state) => ({
          timeRecords: state.timeRecords.map((t) => (t.id === id ? updated : t)),
        }))
        get().addChangeLog({
          operation: 'update',
          entityType: 'timeRecord',
          entityId: id,
          entityName: `${updated.employeeName} ${updated.date}`,
          previousValue: prev as unknown as Record<string, unknown>,
          newValue: updated as unknown as Record<string, unknown>,
          affectedProjectIds: [updated.projectId],
        })
        get().recalculate()
      },

      deleteTimeRecord: (id) => {
        const prev = get().timeRecords.find((t) => t.id === id)
        if (!prev) return
        set((state) => ({
          timeRecords: state.timeRecords.filter((t) => t.id !== id),
        }))
        get().addChangeLog({
          operation: 'delete',
          entityType: 'timeRecord',
          entityId: id,
          entityName: `${prev.employeeName} ${prev.date}`,
          previousValue: prev as unknown as Record<string, unknown>,
          newValue: null,
          affectedProjectIds: [prev.projectId],
        })
        get().recalculate()
      },

      addMaterial: (material) => {
        const id = generateId()
        const newMaterial: MaterialRequisition = { ...material, id, version: 1 }
        set((state) => ({ materials: [...state.materials, newMaterial] }))
        get().addChangeLog({
          operation: 'create',
          entityType: 'material',
          entityId: id,
          entityName: material.materialName,
          previousValue: null,
          newValue: newMaterial as unknown as Record<string, unknown>,
          affectedProjectIds: [material.projectId],
        })
        get().recalculate()
      },

      updateMaterial: (id, data) => {
        const prev = get().materials.find((m) => m.id === id)
        if (!prev) return
        const updated = { ...prev, ...data, version: prev.version + 1 }
        set((state) => ({
          materials: state.materials.map((m) => (m.id === id ? updated : m)),
        }))
        get().addChangeLog({
          operation: 'update',
          entityType: 'material',
          entityId: id,
          entityName: updated.materialName,
          previousValue: prev as unknown as Record<string, unknown>,
          newValue: updated as unknown as Record<string, unknown>,
          affectedProjectIds: [updated.projectId],
        })
        get().recalculate()
      },

      deleteMaterial: (id) => {
        const prev = get().materials.find((m) => m.id === id)
        if (!prev) return
        set((state) => ({
          materials: state.materials.filter((m) => m.id !== id),
        }))
        get().addChangeLog({
          operation: 'delete',
          entityType: 'material',
          entityId: id,
          entityName: prev.materialName,
          previousValue: prev as unknown as Record<string, unknown>,
          newValue: null,
          affectedProjectIds: [prev.projectId],
        })
        get().recalculate()
      },

      addInvoice: (invoice) => {
        const id = generateId()
        const newInvoice: InvoiceVoucher = { ...invoice, id, version: 1 }
        set((state) => ({ invoices: [...state.invoices, newInvoice] }))
        get().addChangeLog({
          operation: 'create',
          entityType: 'invoice',
          entityId: id,
          entityName: invoice.invoiceNumber || `缺发票_${invoice.category}`,
          previousValue: null,
          newValue: newInvoice as unknown as Record<string, unknown>,
          affectedProjectIds: [invoice.projectId],
        })
        get().recalculate()
      },

      updateInvoice: (id, data) => {
        const prev = get().invoices.find((i) => i.id === id)
        if (!prev) return
        const updated = { ...prev, ...data, version: prev.version + 1 }
        set((state) => ({
          invoices: state.invoices.map((i) => (i.id === id ? updated : i)),
        }))
        get().addChangeLog({
          operation: 'update',
          entityType: 'invoice',
          entityId: id,
          entityName: updated.invoiceNumber || `缺发票_${updated.category}`,
          previousValue: prev as unknown as Record<string, unknown>,
          newValue: updated as unknown as Record<string, unknown>,
          affectedProjectIds: [updated.projectId],
        })
        get().recalculate()
      },

      deleteInvoice: (id) => {
        const prev = get().invoices.find((i) => i.id === id)
        if (!prev) return
        set((state) => ({
          invoices: state.invoices.filter((i) => i.id !== id),
        }))
        get().addChangeLog({
          operation: 'delete',
          entityType: 'invoice',
          entityId: id,
          entityName: prev.invoiceNumber || `缺发票_${prev.category}`,
          previousValue: prev as unknown as Record<string, unknown>,
          newValue: null,
          affectedProjectIds: [prev.projectId],
        })
        get().recalculate()
      },

      resolveAlert: (alertId, explanation) => {
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === alertId ? { ...a, resolved: true, explanation } : a
          ),
        }))
      },

      getProjectName: (projectId) => {
        const project = get().projects.find((p) => p.id === projectId)
        return project?.name || '未知项目'
      },
    }),
    {
      name: 'rd-expense-store',
    }
  )
)
