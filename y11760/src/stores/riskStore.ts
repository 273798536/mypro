import { create } from 'zustand'
import type { RiskAlert, CircularGuarantee, SamePersonMultiEnterprise, LabelOcclusion } from '../types'
import { guaranteeContracts, persons, enterprises, riskLabels } from '../data/mockData'
import { detectCircularGuarantees } from '../engines/riskDetector'

function buildAlerts(): RiskAlert[] {
  const alerts: RiskAlert[] = []

  const circulars = detectCircularGuarantees(guaranteeContracts)
  for (const cg of circulars) {
    const entNames = cg.enterprises.map((eid) => enterprises.find((e) => e.id === eid)?.name ?? eid).join(' → ')
    alerts.push({
      type: 'circular',
      severity: cg.totalAmount > 5000 ? 'high' : 'medium',
      title: '循环担保',
      description: `检测到循环担保链：${entNames}，涉及金额${(cg.totalAmount / 10000).toFixed(0)}万元`,
      relatedNodes: cg.enterprises,
      confirmed: false,
      data: cg,
    })
  }

  const samePersonGroups: SamePersonMultiEnterprise[] = persons
    .filter((p) => p.relatedEnterprises.length >= 2)
    .map((p) => {
      const internalContracts = guaranteeContracts.filter(
        (c) => p.relatedEnterprises.includes(c.guarantorId) && p.relatedEnterprises.includes(c.guaranteedId)
      )
      return {
        personId: p.id,
        personName: p.name,
        enterpriseIds: p.relatedEnterprises,
        internalGuaranteeAmount: internalContracts.reduce((s, c) => s + c.guaranteeAmount, 0),
      }
    })

  for (const sp of samePersonGroups) {
    const entNames = sp.enterpriseIds.map((eid) => enterprises.find((e) => e.id === eid)?.name ?? eid).join('、')
    alerts.push({
      type: 'samePerson',
      severity: sp.internalGuaranteeAmount > 3000 ? 'high' : 'medium',
      title: '同人多企',
      description: `实控人${sp.personName}同时控制${entNames}，关联担保金额${(sp.internalGuaranteeAmount / 10000).toFixed(0)}万元`,
      relatedNodes: [sp.personId, ...sp.enterpriseIds],
      confirmed: false,
      data: sp,
    })
  }

  const highRiskLabels = riskLabels.filter((r) => r.severity === 'high')
  const mediumRiskLabels = riskLabels.filter((r) => r.severity === 'medium')
  for (const hr of highRiskLabels) {
    const occluder = mediumRiskLabels.find(
      (mr) => mr.targetId !== hr.targetId && Math.abs(enterprises.findIndex((e) => e.id === mr.targetId) - enterprises.findIndex((e) => e.id === hr.targetId)) <= 1
    )
    if (occluder) {
      const hrName = enterprises.find((e) => e.id === hr.targetId)?.name ?? hr.targetId
      const ocName = enterprises.find((e) => e.id === occluder.targetId)?.name ?? occluder.targetId
      alerts.push({
        type: 'occlusion',
        severity: 'medium',
        title: '风险标签遮挡',
        description: `${hrName}的高风险标签「${hr.labelType}」可能被${ocName}的中风险标签遮挡`,
        relatedNodes: [hr.targetId, occluder.targetId],
        confirmed: false,
        data: {
          highSeverityNodeId: hr.targetId,
          occludedByNodeId: occluder.targetId,
          highSeverityLabel: hr.labelType,
        },
      })
    }
  }

  return alerts
}

interface RiskStore {
  alerts: RiskAlert[]
  confirmAlert: (index: number) => void
  getUnconfirmedAlerts: () => RiskAlert[]
  getAlertsForNode: (nodeId: string) => RiskAlert[]
}

const initialAlerts = buildAlerts()

export const useRiskStore = create<RiskStore>((set, get) => ({
  alerts: initialAlerts,

  confirmAlert: (index) =>
    set((state) => ({
      alerts: state.alerts.map((a, i) => (i === index ? { ...a, confirmed: true } : a)),
    })),

  getUnconfirmedAlerts: () => get().alerts.filter((a) => !a.confirmed),

  getAlertsForNode: (nodeId) => get().alerts.filter((a) => a.relatedNodes.includes(nodeId)),
}))
