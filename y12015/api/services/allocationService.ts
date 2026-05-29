import db from '../db.js'
import { v4 as uuidv4 } from 'uuid'
import type { AllocationResult, AllocationSummary, AllocationDiff } from '../../shared/types.js'

interface RawEntry {
  id: string
  card_no: string
  scenic_spot_id: string
  scenic_spot_name: string
  entry_time: string
  swipe_serial_no: string
  is_deduplicated: number
  deduplicated_at: string | null
}

interface RawAccount {
  id: string
  card_no: string
  holder_name: string
  purchase_amount: number
  valid_from: string
  valid_to: string
}

interface RawSubsidy {
  id: string
  activity_id: string
  activity_name: string
  scenic_spot_id: string
  scenic_spot_name: string
  subsidy_amount: number
  valid_from: string
  valid_to: string
  version: number
}

interface RawRefund {
  id: string
  card_no: string
  scenic_spot_id: string
  scenic_spot_name: string
  refund_amount: number
  refund_time: string
  reason: string | null
}

interface RawAllocation {
  id: string
  version: string
  card_no: string
  scenic_spot_id: string
  scenic_spot_name: string
  entry_count: number
  base_allocation: number
  subsidy_amount: number
  refund_adjustment: number
  total_allocation: number
  calculated_at: string
}

export function getNextVersion(): string {
  const row = db.prepare(
    "SELECT version FROM allocation_results ORDER BY rowid DESC LIMIT 1"
  ).get() as { version: string } | undefined

  if (!row) return 'v1'

  const match = row.version.match(/^v(\d+)$/)
  if (!match) return 'v1'

  return `v${parseInt(match[1], 10) + 1}`
}

export function getLatestVersion(): string | null {
  const row = db.prepare(
    "SELECT version FROM allocation_results ORDER BY rowid DESC LIMIT 1"
  ).get() as { version: string } | undefined
  return row?.version ?? null
}

export function deduplicateEntries(): number {
  const entries = db.prepare(
    "SELECT id, card_no, scenic_spot_id, entry_time, swipe_serial_no FROM entries WHERE is_deduplicated = 0 ORDER BY entry_time ASC"
  ).all() as Array<{ id: string; card_no: string; scenic_spot_id: string; entry_time: string; swipe_serial_no: string }>

  const grouped = new Map<string, Array<{ id: string; entry_time: string }>>()

  for (const e of entries) {
    const date = e.entry_time.substring(0, 10)
    const key = `${e.card_no}|${e.scenic_spot_id}|${date}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push({ id: e.id, entry_time: e.entry_time })
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const markDedup = db.prepare(
    "UPDATE entries SET is_deduplicated = 1, deduplicated_at = ? WHERE id = ?"
  )
  let duplicateCount = 0

  const transaction = db.transaction(() => {
    for (const [, group] of grouped) {
      if (group.length > 1) {
        for (let i = 1; i < group.length; i++) {
          markDedup.run(now, group[i].id)
          duplicateCount++
        }
      }
    }
  })

  transaction()
  return duplicateCount
}

export function calculateAllocation(): { version: string; results: AllocationResult[]; summary: AllocationSummary } {
  const version = getNextVersion()
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  deduplicateEntries()

  const accounts = db.prepare("SELECT * FROM accounts").all() as RawAccount[]
  const entries = db.prepare(
    "SELECT * FROM entries WHERE is_deduplicated = 0"
  ).all() as RawEntry[]
  const subsidies = db.prepare("SELECT * FROM subsidies").all() as RawSubsidy[]
  const refunds = db.prepare("SELECT * FROM refunds").all() as RawRefund[]

  const entriesByCard = new Map<string, RawEntry[]>()
  for (const e of entries) {
    if (!entriesByCard.has(e.card_no)) {
      entriesByCard.set(e.card_no, [])
    }
    entriesByCard.get(e.card_no)!.push(e)
  }

  const refundsByCard = new Map<string, RawRefund[]>()
  for (const r of refunds) {
    if (!refundsByCard.has(r.card_no)) {
      refundsByCard.set(r.card_no, [])
    }
    refundsByCard.get(r.card_no)!.push(r)
  }

  const results: AllocationResult[] = []

  const insertResult = db.prepare(
    `INSERT INTO allocation_results (id, version, card_no, scenic_spot_id, scenic_spot_name, entry_count, base_allocation, subsidy_amount, refund_adjustment, total_allocation, calculated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const transaction = db.transaction(() => {
    for (const account of accounts) {
      const cardEntries = entriesByCard.get(account.card_no) || []
      if (cardEntries.length === 0) continue

      const totalEntryCount = cardEntries.length
      const perEntryRate = account.purchase_amount / totalEntryCount

      const spotEntryMap = new Map<string, { spotName: string; count: number; entries: RawEntry[] }>()
      for (const e of cardEntries) {
        if (!spotEntryMap.has(e.scenic_spot_id)) {
          spotEntryMap.set(e.scenic_spot_id, { spotName: e.scenic_spot_name, count: 0, entries: [] })
        }
        const spot = spotEntryMap.get(e.scenic_spot_id)!
        spot.count++
        spot.entries.push(e)
      }

      const spotBaseAllocations = new Map<string, number>()
      let totalBaseForCard = 0

      for (const [spotId, spotData] of spotEntryMap) {
        const baseAlloc = Math.round(perEntryRate * spotData.count * 100) / 100
        spotBaseAllocations.set(spotId, baseAlloc)
        totalBaseForCard += baseAlloc
      }

      const cardRefunds = refundsByCard.get(account.card_no) || []
      const totalRefundForCard = cardRefunds.reduce((sum, r) => sum + r.refund_amount, 0)

      const refundAdjustments = new Map<string, number>()
      if (totalRefundForCard > 0 && totalBaseForCard > 0) {
        for (const [spotId, baseAlloc] of spotBaseAllocations) {
          const proportion = baseAlloc / totalBaseForCard
          const refundAdj = Math.round(-totalRefundForCard * proportion * 100) / 100
          refundAdjustments.set(spotId, refundAdj)
        }

        let sumRefundAdj = 0
        for (const [, adj] of refundAdjustments) {
          sumRefundAdj += adj
        }
        const roundingDiff = Math.round((-totalRefundForCard - sumRefundAdj) * 100) / 100
        if (roundingDiff !== 0) {
          const firstSpotId = spotBaseAllocations.keys().next().value!
          refundAdjustments.set(
            firstSpotId,
            Math.round((refundAdjustments.get(firstSpotId)! + roundingDiff) * 100) / 100
          )
        }
      }

      for (const [spotId, spotData] of spotEntryMap) {
        const baseAllocation = spotBaseAllocations.get(spotId) ?? 0

        let subsidyTotal = 0
        for (const entry of spotData.entries) {
          const entryDate = entry.entry_time.substring(0, 10)
          for (const sub of subsidies) {
            if (sub.scenic_spot_id === spotId && entryDate >= sub.valid_from.substring(0, 10) && entryDate <= sub.valid_to.substring(0, 10)) {
              subsidyTotal += sub.subsidy_amount
            }
          }
        }
        subsidyTotal = Math.round(subsidyTotal * 100) / 100

        const refundAdj = refundAdjustments.get(spotId) ?? 0

        const totalAllocation = Math.round((baseAllocation + subsidyTotal + refundAdj) * 100) / 100

        const result: AllocationResult = {
          id: uuidv4(),
          version,
          cardNo: account.card_no,
          scenicSpotId: spotId,
          scenicSpotName: spotData.spotName,
          entryCount: spotData.count,
          baseAllocation,
          subsidyAmount: subsidyTotal,
          refundAdjustment: refundAdj,
          totalAllocation,
          calculatedAt: now,
        }
        results.push(result)

        insertResult.run(
          result.id, result.version, result.cardNo, result.scenicSpotId,
          result.scenicSpotName, result.entryCount, result.baseAllocation,
          result.subsidyAmount, result.refundAdjustment, result.totalAllocation,
          result.calculatedAt
        )
      }
    }
  })

  transaction()

  const summary = buildSummary(version, results)

  return { version, results, summary }
}

function buildSummary(version: string, results: AllocationResult[]): AllocationSummary {
  const totalRevenue = Math.round(results.reduce((s, r) => s + r.baseAllocation, 0) * 100) / 100
  const totalSubsidy = Math.round(results.reduce((s, r) => s + r.subsidyAmount, 0) * 100) / 100
  const totalRefundAdjustment = Math.round(results.reduce((s, r) => s + r.refundAdjustment, 0) * 100) / 100
  const netAllocation = Math.round(results.reduce((s, r) => s + r.totalAllocation, 0) * 100) / 100

  const spotMap = new Map<string, { scenicSpotId: string; scenicSpotName: string; amount: number }>()
  for (const r of results) {
    if (!spotMap.has(r.scenicSpotId)) {
      spotMap.set(r.scenicSpotId, { scenicSpotId: r.scenicSpotId, scenicSpotName: r.scenicSpotName, amount: 0 })
    }
    spotMap.get(r.scenicSpotId)!.amount += r.totalAllocation
  }
  const scenicSpotBreakdown = Array.from(spotMap.values()).map(s => ({
    ...s,
    amount: Math.round(s.amount * 100) / 100,
  }))

  return {
    version,
    totalRevenue,
    totalSubsidy,
    totalRefundAdjustment,
    netAllocation,
    scenicSpotBreakdown,
  }
}

export function getAllocationResults(version?: string, scenicSpotId?: string, cardNo?: string): AllocationResult[] {
  let sql = "SELECT * FROM allocation_results WHERE 1=1"
  const params: unknown[] = []

  if (version) {
    sql += " AND version = ?"
    params.push(version)
  } else {
    const latest = getLatestVersion()
    if (latest) {
      sql += " AND version = ?"
      params.push(latest)
    }
  }

  if (scenicSpotId) {
    sql += " AND scenic_spot_id = ?"
    params.push(scenicSpotId)
  }

  if (cardNo) {
    sql += " AND card_no LIKE ?"
    params.push(`%${cardNo}%`)
  }

  sql += " ORDER BY card_no, scenic_spot_id"

  const rows = db.prepare(sql).all(...params) as RawAllocation[]
  return rows.map(r => ({
    id: r.id,
    version: r.version,
    cardNo: r.card_no,
    scenicSpotId: r.scenic_spot_id,
    scenicSpotName: r.scenic_spot_name,
    entryCount: r.entry_count,
    baseAllocation: r.base_allocation,
    subsidyAmount: r.subsidy_amount,
    refundAdjustment: r.refund_adjustment,
    totalAllocation: r.total_allocation,
    calculatedAt: r.calculated_at,
  }))
}

export function getAllocationSummary(version?: string): AllocationSummary {
  const v = version || getLatestVersion() || 'v1'
  const results = getAllocationResults(v)
  return buildSummary(v, results)
}

export function compareVersions(oldVersion: string, newVersion: string): {
  old: AllocationResult[]
  new: AllocationResult[]
  diffs: AllocationDiff[]
} {
  const oldResults = getAllocationResults(oldVersion)
  const newResults = getAllocationResults(newVersion)

  const oldMap = new Map<string, AllocationResult>()
  for (const r of oldResults) {
    oldMap.set(`${r.cardNo}-${r.scenicSpotId}`, r)
  }

  const newMap = new Map<string, AllocationResult>()
  for (const r of newResults) {
    newMap.set(`${r.cardNo}-${r.scenicSpotId}`, r)
  }

  const allKeys = new Set([...oldMap.keys(), ...newMap.keys()])
  const diffs: AllocationDiff[] = []

  for (const key of allKeys) {
    const oldR = oldMap.get(key)
    const newR = newMap.get(key)
    const cardNo = oldR?.cardNo || newR?.cardNo || ''
    const scenicSpotId = oldR?.scenicSpotId || newR?.scenicSpotId || ''
    const scenicSpotName = oldR?.scenicSpotName || newR?.scenicSpotName || ''

    const oldTotal = oldR?.totalAllocation ?? 0
    const newTotal = newR?.totalAllocation ?? 0
    const diffAmount = Math.round((newTotal - oldTotal) * 100) / 100

    if (diffAmount !== 0 || (oldR?.entryCount ?? 0) !== (newR?.entryCount ?? 0)) {
      diffs.push({
        cardNo,
        scenicSpotId,
        scenicSpotName,
        oldEntryCount: oldR?.entryCount ?? 0,
        newEntryCount: newR?.entryCount ?? 0,
        oldTotalAllocation: oldTotal,
        newTotalAllocation: newTotal,
        diffAmount,
      })
    }
  }

  return { old: oldResults, new: newResults, diffs }
}

export function getAllVersions(): string[] {
  const rows = db.prepare(
    "SELECT DISTINCT version FROM allocation_results ORDER BY rowid"
  ).all() as Array<{ version: string }>
  return rows.map(r => r.version)
}
