import { getExtensionById, getExtensions, getExtensionCountByContractId, createRiskFlag, getRiskFlagsByExtensionId, type RiskFlag } from '../repositories/extension.js'
import { getGuaranteesByContractId } from '../repositories/contract.js'
import db from '../db.js'

export interface DetectedRisk {
  type: string
  severity: string
  description: string
  related_entity_id: string | null
}

export function detectRisks(extensionId: string): DetectedRisk[] {
  const extension = getExtensionById(extensionId)
  if (!extension) return []

  const risks: DetectedRisk[] = []
  const contractId = extension.contract_id

  risks.push(...detectRepeatedExtension(contractId, extension.extension_no))
  risks.push(...detectOverdueCovering(contractId, extension))
  risks.push(...detectGuaranteeExpired(contractId, extension.new_end_date))

  for (const risk of risks) {
    createRiskFlag({
      extension_id: extensionId,
      type: risk.type,
      severity: risk.severity,
      description: risk.description,
      related_entity_id: risk.related_entity_id,
    })
  }

  return risks
}

function detectRepeatedExtension(contractId: string, currentExtensionNo: number): DetectedRisk[] {
  const existingCount = getExtensionCountByContractId(contractId)
  const totalCount = existingCount

  if (totalCount >= 2 || currentExtensionNo >= 2) {
    const severity = totalCount >= 3 ? 'high' : totalCount >= 2 ? 'medium' : 'low'
    return [{
      type: 'repeated_extension',
      severity,
      description: `该合同已展期${totalCount}次，本次为第${currentExtensionNo}次展期，${severity === 'high' ? '重复展期风险高' : severity === 'medium' ? '重复展期风险中等' : '存在重复展期情况'}`,
      related_entity_id: contractId,
    }]
  }
  return []
}

function detectOverdueCovering(contractId: string, extension: { original_end_date: string; new_end_date: string }): DetectedRisk[] {
  const overdueRecords = db.prepare(`
    SELECT * FROM repayment_records 
    WHERE contract_id = ? AND status = 'overdue' AND due_date < ?
    ORDER BY due_date ASC
  `).all(contractId, extension.original_end_date) as { id: string; due_date: string }[]

  if (overdueRecords.length > 0) {
    return [{
      type: 'overdue_covering',
      severity: 'high',
      description: `展期起始日期${extension.original_end_date}与逾期期间重叠，存在逾期覆盖风险，共${overdueRecords.length}条逾期记录`,
      related_entity_id: contractId,
    }]
  }
  return []
}

function detectGuaranteeExpired(contractId: string, newEndDate: string): DetectedRisk[] {
  const guarantees = getGuaranteesByContractId(contractId)
  const risks: DetectedRisk[] = []

  for (const g of guarantees) {
    if (newEndDate > g.end_date) {
      const severity = g.is_expired ? 'high' : 'medium'
      risks.push({
        type: 'guarantee_expired',
        severity,
        description: `新展期结束日期${newEndDate}超出担保人${g.guarantor_name}的担保结束日期${g.end_date}${g.is_expired ? '，且担保已过期' : ''}`,
        related_entity_id: g.id,
      })
    }
  }
  return risks
}

export function getRisksForExtension(extensionId: string): RiskFlag[] {
  return getRiskFlagsByExtensionId(extensionId)
}

export function detectRisksForExtension(extensionId: string): DetectedRisk[] {
  const existing = getRiskFlagsByExtensionId(extensionId)
  if (existing.length > 0) {
    return existing.map(f => ({
      type: f.type,
      severity: f.severity,
      description: f.description,
      related_entity_id: f.related_entity_id,
    }))
  }
  return detectRisks(extensionId)
}
