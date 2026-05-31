import type {
  ProjectLedger,
  TimeRecord,
  MaterialRequisition,
  InvoiceVoucher,
  ExpenseAggregation,
  ExpenseSource,
  ValidationAlert,
} from '@/types'

export function computeAggregations(
  projects: ProjectLedger[],
  timeRecords: TimeRecord[],
  materials: MaterialRequisition[],
  invoices: InvoiceVoucher[]
): ExpenseAggregation[] {
  return projects.map((project) => {
    const projectTime = timeRecords.filter((t) => t.projectId === project.id)
    const projectMaterials = materials.filter((m) => m.projectId === project.id)
    const projectInvoices = invoices.filter((i) => i.projectId === project.id)

    const laborSources: ExpenseSource[] = projectTime.map((t) => ({
      id: t.id,
      type: 'time' as const,
      amount: t.hours * t.hourlyRate,
      label: `${t.employeeName} ${t.date}`,
    }))

    const materialSources: ExpenseSource[] = projectMaterials.map((m) => ({
      id: m.id,
      type: 'material' as const,
      amount: m.quantity * m.unitPrice,
      label: `${m.materialName} x${m.quantity}`,
    }))

    const otherSources: ExpenseSource[] = projectInvoices.map((i) => ({
      id: i.id,
      type: 'invoice' as const,
      amount: i.amount,
      label: `${i.invoiceNumber || '缺发票'} ${i.category}`,
    }))

    const laborCost = laborSources.reduce((s, v) => s + v.amount, 0)
    const materialCost = materialSources.reduce((s, v) => s + v.amount, 0)
    const otherCost = otherSources.reduce((s, v) => s + v.amount, 0)

    return {
      projectId: project.id,
      laborCost,
      materialCost,
      otherCost,
      totalCost: laborCost + materialCost + otherCost,
      laborSources,
      materialSources,
      otherSources,
    }
  })
}

export function runValidation(
  projects: ProjectLedger[],
  timeRecords: TimeRecord[],
  materials: MaterialRequisition[],
  invoices: InvoiceVoucher[],
  existingAlerts: ValidationAlert[]
): ValidationAlert[] {
  const alerts: ValidationAlert[] = []
  const alertIdSet = new Set(existingAlerts.map((a) => a.id))

  const employeeProjects = new Map<string, Set<string>>()
  timeRecords.forEach((t) => {
    if (!employeeProjects.has(t.employeeName)) {
      employeeProjects.set(t.employeeName, new Set())
    }
    employeeProjects.get(t.employeeName)!.add(t.projectId)
  })

  employeeProjects.forEach((projectIds, employeeName) => {
    if (projectIds.size > 1) {
      const id = `cross_${employeeName}`
      const affectedIds = Array.from(projectIds)
      const existing = existingAlerts.find((a) => a.id === id)
      alerts.push({
        id,
        type: 'cross_project',
        severity: 'warning',
        sourceId: employeeName,
        sourceType: 'timeRecord',
        message: `人员「${employeeName}」同时出现在 ${projectIds.size} 个项目中，可能存在串账`,
        affectedProjectIds: affectedIds,
        explanation: existing?.explanation || '',
        resolved: existing?.resolved || false,
      })
      alertIdSet.delete(id)
    }
  })

  timeRecords
    .filter((t) => t.isRetroactive)
    .forEach((t) => {
      const id = `retro_${t.id}`
      const existing = existingAlerts.find((a) => a.id === id)
      alerts.push({
        id,
        type: 'retroactive_entry',
        severity: 'warning',
        sourceId: t.id,
        sourceType: 'timeRecord',
        message: `工时补录：${t.employeeName} ${t.date}（${t.hours}小时）`,
        affectedProjectIds: [t.projectId],
        explanation: existing?.explanation || t.retroactiveReason || '',
        resolved: existing?.resolved || false,
      })
      alertIdSet.delete(id)
    })

  invoices
    .filter((i) => i.isMissing)
    .forEach((i) => {
      const id = `missing_${i.id}`
      const existing = existingAlerts.find((a) => a.id === id)
      alerts.push({
        id,
        type: 'missing_invoice',
        severity: 'error',
        sourceId: i.id,
        sourceType: 'invoice',
        message: `发票缺项：${i.category} 金额 ¥${i.amount.toLocaleString()}`,
        affectedProjectIds: [i.projectId],
        explanation: existing?.explanation || i.missingReason || '',
        resolved: existing?.resolved || false,
      })
      alertIdSet.delete(id)
    })

  return alerts
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function computeDataHash(
  projects: ProjectLedger[],
  timeRecords: TimeRecord[],
  materials: MaterialRequisition[],
  invoices: InvoiceVoucher[]
): string {
  const data = JSON.stringify({ projects, timeRecords, materials, invoices })
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const chr = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return hash.toString(36)
}
