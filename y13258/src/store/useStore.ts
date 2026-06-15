import { create } from 'zustand'
import type { Plan, ApprovalRecord, FieldPhoto, HistoryEntry, FilterState, SupplementNote } from '@/types'
import { mockPlans, mockApprovals, mockHistory, mockPhotos } from '@/data/mock'

const defaultFilter: FilterState = {
  distanceRange: [0, 20],
  costRange: [0, 3000],
  durationRange: [0, 60],
  safetyLevels: ['A', 'B', 'C'],
  coverageMin: 0,
}

interface AppState {
  plans: Plan[]
  approvals: ApprovalRecord[]
  fieldPhotos: FieldPhoto[]
  history: HistoryEntry[]
  filter: FilterState

  setFilter: (filter: Partial<FilterState>) => void
  resetFilter: () => void
  getFilteredPlans: () => Plan[]

  updateApprovalStatus: (id: string, status: 'approved' | 'rejected') => void
  addSupplementNote: (approvalId: string, content: string, author: string) => void
  triggerBoundaryCheck: (planId: string, offsetAmount: number) => void

  addFieldPhoto: (photo: Omit<FieldPhoto, 'id' | 'uploadedAt'>) => void
  applyCoordinateOffset: (photoId: string, offsetAmount: number) => void

  addHistoryEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void

  generateMarkdownReport: () => string
  generateReviewReport: () => string
}

export const useStore = create<AppState>()((set, get) => ({
  plans: mockPlans,
  approvals: mockApprovals,
  fieldPhotos: mockPhotos,
  history: mockHistory,
  filter: { ...defaultFilter },

  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),

  resetFilter: () => set({ filter: { ...defaultFilter } }),

  getFilteredPlans: () => {
    const { plans, filter } = get()
    return plans.filter((plan) => {
      const [dMin, dMax] = filter.distanceRange
      const [cMin, cMax] = filter.costRange
      const [durMin, durMax] = filter.durationRange
      return (
        plan.distance >= dMin &&
        plan.distance <= dMax &&
        plan.cost >= cMin &&
        plan.cost <= cMax &&
        plan.duration >= durMin &&
        plan.duration <= durMax &&
        filter.safetyLevels.includes(plan.safetyLevel) &&
        plan.coverage >= filter.coverageMin
      )
    })
  },

  updateApprovalStatus: (id, status) => {
    const approval = get().approvals.find((a) => a.id === id)
    if (!approval) return
    const now = new Date().toISOString()
    set((state) => ({
      approvals: state.approvals.map((a) =>
        a.id === id ? { ...a, status, updatedAt: now } : a
      ),
    }))
    get().addHistoryEntry({
      planId: approval.planId,
      planName: approval.planName,
      type: 'approval',
      before: { status: approval.status },
      after: { status },
      description: `审批记录状态从 ${approval.status} 更新为 ${status}`,
      operator: '系统',
    })
  },

  addSupplementNote: (approvalId, content, author) => {
    const note: SupplementNote = {
      id: crypto.randomUUID(),
      content,
      author,
      createdAt: new Date().toISOString(),
    }
    set((state) => ({
      approvals: state.approvals.map((a) =>
        a.id === approvalId
          ? { ...a, supplementNotes: [...a.supplementNotes, note] }
          : a
      ),
    }))
  },

  triggerBoundaryCheck: (planId, offsetAmount) => {
    if (offsetAmount <= 0.003) return
    const plan = get().plans.find((p) => p.id === planId)
    if (!plan) return
    const midIndex = Math.floor(plan.route.length / 2)
    const originalCoord: [number, number] = [...plan.route[midIndex]]
    const offsetCoord: [number, number] = [
      originalCoord[0] + offsetAmount,
      originalCoord[1] + offsetAmount,
    ]
    const now = new Date().toISOString()
    const newApproval: ApprovalRecord = {
      id: crypto.randomUUID(),
      planId,
      planName: plan.name,
      status: 'pending',
      reason: `坐标偏移量 ${offsetAmount} 超过阈值 0.003，触发边界校验`,
      nextStep: '需人工确认偏移后的方案是否仍适用',
      boundarySample: {
        id: crypto.randomUUID(),
        originalCoord,
        offsetCoord,
        offsetDescription: `偏移量 ${offsetAmount} 超过阈值，自动触发边界校验`,
        triggeredManualConfirm: true,
      },
      supplementNotes: [],
      createdAt: now,
      updatedAt: now,
    }
    set((state) => ({
      approvals: [...state.approvals, newApproval],
    }))
    get().addHistoryEntry({
      planId,
      planName: plan.name,
      type: 'manual_confirm',
      before: { coord: originalCoord },
      after: { coord: offsetCoord },
      description: `方案 ${plan.name} 坐标偏移量 ${offsetAmount} 超过阈值，触发边界校验`,
      operator: '系统',
    })
  },

  addFieldPhoto: (photo) => {
    const newPhoto: FieldPhoto = {
      ...photo,
      id: crypto.randomUUID(),
      uploadedAt: new Date().toISOString(),
    }
    set((state) => ({
      fieldPhotos: [...state.fieldPhotos, newPhoto],
    }))
  },

  applyCoordinateOffset: (photoId, offsetAmount) => {
    const photo = get().fieldPhotos.find((p) => p.id === photoId)
    if (!photo) return
    const offsetCoord: [number, number] = [
      photo.coord[0] + offsetAmount,
      photo.coord[1] + offsetAmount,
    ]
    set((state) => ({
      fieldPhotos: state.fieldPhotos.map((p) =>
        p.id === photoId
          ? { ...p, offsetApplied: true, offsetCoord }
          : p
      ),
    }))
    const plan = get().plans.find((p) => p.id === photo.planId)
    get().addHistoryEntry({
      planId: photo.planId,
      planName: plan?.name ?? '',
      type: 'field_supplement',
      before: { offsetApplied: false, coord: photo.coord },
      after: { offsetApplied: true, offsetCoord },
      description: `现场照片 ${photoId} 应用了坐标偏移 ${offsetAmount}`,
      operator: '系统',
    })
  },

  addHistoryEntry: (entry) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
    set((state) => ({
      history: [...state.history, newEntry],
    }))
  },

  generateMarkdownReport: () => {
    const { plans, filter } = get()
    const filtered = get().getFilteredPlans()
    const avgCost = filtered.length > 0 ? (filtered.reduce((s, p) => s + p.cost, 0) / filtered.length).toFixed(2) : '0'
    const avgDist = filtered.length > 0 ? (filtered.reduce((s, p) => s + p.distance, 0) / filtered.length).toFixed(2) : '0'
    const avgCov = filtered.length > 0 ? (filtered.reduce((s, p) => s + p.coverage, 0) / filtered.length).toFixed(2) : '0'
    let md = '# 学校接送方案比选报告\n\n'
    md += '## 筛选条件\n\n'
    md += `- 距离范围: ${filter.distanceRange[0]} - ${filter.distanceRange[1]} km\n`
    md += `- 费用范围: ${filter.costRange[0]} - ${filter.costRange[1]} 元\n`
    md += `- 时长范围: ${filter.durationRange[0]} - ${filter.durationRange[1]} 分钟\n`
    md += `- 安全等级: ${filter.safetyLevels.join(', ')}\n`
    md += `- 最低覆盖率: ${filter.coverageMin}%\n\n`
    md += '## 统计概览\n\n'
    md += `- 方案总数: ${plans.length}\n`
    md += `- 符合条件方案数: ${filtered.length}\n`
    md += `- 平均费用: ${avgCost} 元\n`
    md += `- 平均距离: ${avgDist} km\n`
    md += `- 平均覆盖率: ${avgCov}%\n\n`
    md += '## 方案详情\n\n'
    md += '| 方案名称 | 学校 | 距离(km) | 费用(元) | 时长(分钟) | 安全等级 | 覆盖率(%) |\n'
    md += '| --- | --- | --- | --- | --- | --- | --- |\n'
    for (const p of filtered) {
      md += `| ${p.name} | ${p.school} | ${p.distance} | ${p.cost} | ${p.duration} | ${p.safetyLevel} | ${p.coverage} |\n`
    }
    md += `\n---\n\n> 报告生成时间: ${new Date().toLocaleString('zh-CN')}\n`
    return md
  },

  generateReviewReport: () => {
    const { history } = get()
    const typeCounts: Record<string, number> = {}
    for (const h of history) {
      typeCounts[h.type] = (typeCounts[h.type] || 0) + 1
    }
    const sorted = [...history].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp)
    )
    let md = '# 学校接送方案比选——复盘报告\n\n'
    md += '## 操作时间线\n\n'
    for (const h of sorted) {
      md += `- **${h.timestamp}** [${h.type}] ${h.description} (操作人: ${h.operator})\n`
    }
    md += '\n## 变更统计\n\n'
    md += '| 操作类型 | 次数 |\n'
    md += '| --- | --- |\n'
    for (const [type, count] of Object.entries(typeCounts)) {
      md += `| ${type} | ${count} |\n`
    }
    md += `\n---\n\n> 报告生成时间: ${new Date().toLocaleString('zh-CN')}\n`
    return md
  },
}))
