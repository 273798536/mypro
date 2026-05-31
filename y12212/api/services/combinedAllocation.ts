import { getDb } from '../database/init.js'
import type { AllocationMethod, UserProfile } from '../../shared/types.js'

export interface AllocationResult {
  user_no: string
  name: string
  allocated_usage: number
  ratio: number
}

export interface AllocationValidation {
  is_valid: boolean
  total_usage: number
  allocated_sum: number
  difference: number
  difference_percent: number
}

function getGroupMembers(groupId: string): UserProfile[] {
  const db = getDb()
  return db.prepare('SELECT * FROM user_profile WHERE combined_group_id = ?').all(groupId) as UserProfile[]
}

function getGroupTotalUsage(groupId: string, billingMonth: string): number {
  const db = getDb()
  const members = getGroupMembers(groupId)
  const userNos = members.map(m => m.user_no)
  if (userNos.length === 0) return 0

  const placeholders = userNos.map(() => '?').join(',')
  const row = db.prepare(
    `SELECT COALESCE(SUM(usage), 0) as total FROM payment_record WHERE billing_month = ? AND user_no IN (${placeholders})`
  ).get(billingMonth, ...userNos) as { total: number }
  return row.total
}

export function allocateByPopulation(groupId: string, totalUsage: number): AllocationResult[] {
  const members = getGroupMembers(groupId)
  const totalPopulation = members.reduce((sum, m) => sum + (m.population || 0), 0)
  if (totalPopulation === 0) return allocateByEqual(groupId, totalUsage)

  return members.map(m => {
    const ratio = (m.population || 0) / totalPopulation
    const allocatedUsage = Math.round(totalUsage * ratio * 100) / 100
    return { user_no: m.user_no, name: m.name, allocated_usage: allocatedUsage, ratio }
  })
}

export function allocateByArea(groupId: string, totalUsage: number): AllocationResult[] {
  const members = getGroupMembers(groupId)
  const totalArea = members.reduce((sum, m) => sum + (m.area || 0), 0)
  if (totalArea === 0) return allocateByEqual(groupId, totalUsage)

  return members.map(m => {
    const ratio = (m.area || 0) / totalArea
    const allocatedUsage = Math.round(totalUsage * ratio * 100) / 100
    return { user_no: m.user_no, name: m.name, allocated_usage: allocatedUsage, ratio }
  })
}

export function allocateByEqual(groupId: string, totalUsage: number): AllocationResult[] {
  const members = getGroupMembers(groupId)
  const count = members.length
  if (count === 0) return []

  const ratio = 1 / count
  const allocatedUsage = Math.round(totalUsage * ratio * 100) / 100

  return members.map(m => ({
    user_no: m.user_no,
    name: m.name,
    allocated_usage: allocatedUsage,
    ratio,
  }))
}

export function allocate(groupId: string, totalUsage: number, method: AllocationMethod): AllocationResult[] {
  switch (method) {
    case 'population':
      return allocateByPopulation(groupId, totalUsage)
    case 'area':
      return allocateByArea(groupId, totalUsage)
    case 'equal':
      return allocateByEqual(groupId, totalUsage)
  }
}

export function validateAllocation(
  groupId: string,
  allocationMethod: AllocationMethod,
  totalUsage: number
): AllocationValidation {
  const results = allocate(groupId, totalUsage, allocationMethod)
  const allocatedSum = results.reduce((sum, r) => sum + r.allocated_usage, 0)
  const difference = Math.abs(totalUsage - allocatedSum)
  const differencePercent = totalUsage > 0 ? (difference / totalUsage) * 100 : 0

  return {
    is_valid: differencePercent <= 1,
    total_usage: totalUsage,
    allocated_sum: Math.round(allocatedSum * 100) / 100,
    difference: Math.round(difference * 100) / 100,
    difference_percent: Math.round(differencePercent * 100) / 100,
  }
}
