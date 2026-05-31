import { v4 as uuidv4 } from 'uuid'
import { createHash } from 'crypto'
import type {
  SamplePack,
  LicenseAgreement,
  TrackProject,
  SampleUsage,
  VersionSnapshot,
  RiskAlert
} from '../../shared/types'

interface ChangeRecord {
  field: string
  oldValue: unknown
  newValue: unknown
}

interface EntityDiff {
  entityType: string
  entityId: string
  entityName: string
  changes: ChangeRecord[]
}

interface VersionDiff {
  added: {
    samplePacks: SamplePack[]
    licenses: LicenseAgreement[]
    tracks: TrackProject[]
    usages: SampleUsage[]
  }
  removed: {
    samplePacks: SamplePack[]
    licenses: LicenseAgreement[]
    tracks: TrackProject[]
    usages: SampleUsage[]
  }
  modified: EntityDiff[]
  riskChanges: {
    added: RiskAlert[]
    removed: RiskAlert[]
    modified: RiskAlert[]
  }
}

export class VersionTracker {
  private snapshots: VersionSnapshot[] = []
  private dataHistory: Map<string, {
    samplePacks: SamplePack[]
    licenses: LicenseAgreement[]
    tracks: TrackProject[]
    usages: SampleUsage[]
    risks: RiskAlert[]
  }> = new Map()

  createSnapshot(
    samplePacks: SamplePack[],
    licenses: LicenseAgreement[],
    tracks: TrackProject[],
    usages: SampleUsage[],
    risks: RiskAlert[],
    description: string
  ): VersionSnapshot {
    const dataHash = this.generateHash(samplePacks, licenses, tracks, usages)

    const riskSummary = {
      critical: risks.filter(r => r.level === 'critical').length,
      high: risks.filter(r => r.level === 'high').length,
      medium: risks.filter(r => r.level === 'medium').length,
      low: risks.filter(r => r.level === 'low').length
    }

    const snapshot: VersionSnapshot = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      description,
      dataHash,
      entitiesCount: {
        samplePacks: samplePacks.length,
        licenses: licenses.length,
        tracks: tracks.length,
        usages: usages.length
      },
      riskSummary
    }

    this.snapshots.push(snapshot)
    this.dataHistory.set(snapshot.id, {
      samplePacks: JSON.parse(JSON.stringify(samplePacks)),
      licenses: JSON.parse(JSON.stringify(licenses)),
      tracks: JSON.parse(JSON.stringify(tracks)),
      usages: JSON.parse(JSON.stringify(usages)),
      risks: JSON.parse(JSON.stringify(risks))
    })

    return snapshot
  }

  getSnapshots(): VersionSnapshot[] {
    return [...this.snapshots].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  getSnapshotData(snapshotId: string) {
    return this.dataHistory.get(snapshotId)
  }

  compareVersions(snapshotId1: string, snapshotId2: string): VersionDiff | null {
    const data1 = this.dataHistory.get(snapshotId1)
    const data2 = this.dataHistory.get(snapshotId2)

    if (!data1 || !data2) return null

    const diff: VersionDiff = {
      added: {
        samplePacks: [],
        licenses: [],
        tracks: [],
        usages: []
      },
      removed: {
        samplePacks: [],
        licenses: [],
        tracks: [],
        usages: []
      },
      modified: [],
      riskChanges: {
        added: [],
        removed: [],
        modified: []
      }
    }

    this.compareEntityArray(data1.samplePacks, data2.samplePacks, diff, 'samplePacks', 'name')
    this.compareEntityArray(data1.licenses, data2.licenses, diff, 'licenses', 'licenseName')
    this.compareEntityArray(data1.tracks, data2.tracks, diff, 'tracks', 'name')
    this.compareEntityArray(data1.usages, data2.usages, diff, 'usages', 'sampleFileName')

    diff.riskChanges = this.compareRisks(data1.risks, data2.risks)

    return diff
  }

  private compareEntityArray<T extends { id: string }>(
    oldArray: T[],
    newArray: T[],
    diff: VersionDiff,
    key: keyof VersionDiff['added'],
    nameField: keyof T
  ) {
    const oldMap = new Map(oldArray.map(e => [e.id, e]))
    const newMap = new Map(newArray.map(e => [e.id, e]))

    for (const item of newArray) {
      if (!oldMap.has(item.id)) {
        ;(diff.added[key] as T[]).push(item)
      } else {
        const oldItem = oldMap.get(item.id)!
        const changes = this.compareObjects(oldItem, item)
        if (changes.length > 0) {
          diff.modified.push({
            entityType: key,
            entityId: item.id,
            entityName: String(item[nameField] || item.id),
            changes
          })
        }
      }
    }

    for (const item of oldArray) {
      if (!newMap.has(item.id)) {
        ;(diff.removed[key] as T[]).push(item)
      }
    }
  }

  private compareObjects<T extends object>(obj1: T, obj2: T): ChangeRecord[] {
    const changes: ChangeRecord[] = []
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)])

    for (const key of allKeys) {
      if (key === 'updatedAt' || key === 'createdAt') continue

      const val1 = (obj1 as Record<string, unknown>)[key]
      const val2 = (obj2 as Record<string, unknown>)[key]

      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        changes.push({
          field: key,
          oldValue: val1,
          newValue: val2
        })
      }
    }

    return changes
  }

  private compareRisks(risks1: RiskAlert[], risks2: RiskAlert[]): VersionDiff['riskChanges'] {
    const result: VersionDiff['riskChanges'] = {
      added: [],
      removed: [],
      modified: []
    }

    const riskKey = (r: RiskAlert) => `${r.type}-${r.relatedEntityId}`
    const map1 = new Map(risks1.map(r => [riskKey(r), r]))
    const map2 = new Map(risks2.map(r => [riskKey(r), r]))

    for (const risk of risks2) {
      const key = riskKey(risk)
      if (!map1.has(key)) {
        result.added.push(risk)
      } else {
        const oldRisk = map1.get(key)!
        if (oldRisk.level !== risk.level || oldRisk.title !== risk.title) {
          result.modified.push(risk)
        }
      }
    }

    for (const risk of risks1) {
      const key = riskKey(risk)
      if (!map2.has(key)) {
        result.removed.push(risk)
      }
    }

    return result
  }

  private generateHash(
    samplePacks: SamplePack[],
    licenses: LicenseAgreement[],
    tracks: TrackProject[],
    usages: SampleUsage[]
  ): string {
    const data = JSON.stringify({
      samplePacks: samplePacks.map(p => ({ id: p.id, updatedAt: p.updatedAt })),
      licenses: licenses.map(l => ({ id: l.id, updatedAt: l.updatedAt })),
      tracks: tracks.map(t => ({ id: t.id, updatedAt: t.updatedAt })),
      usages: usages.map(u => ({ id: u.id, updatedAt: u.updatedAt }))
    })

    return createHash('sha256').update(data).digest('hex').slice(0, 16)
  }

  exportToJSON(snapshotId: string): string | null {
    const data = this.dataHistory.get(snapshotId)
    if (!data) return null
    return JSON.stringify(data, null, 2)
  }

  exportRiskReport(snapshotId: string): string | null {
    const data = this.dataHistory.get(snapshotId)
    if (!data) return null

    const snapshot = this.snapshots.find(s => s.id === snapshotId)
    if (!snapshot) return null

    const lines = [
      `采样包授权台账 - 风险报告`,
      `生成时间: ${snapshot.timestamp}`,
      `快照描述: ${snapshot.description}`,
      ``,
      `=== 风险概览 ===`,
      `严重风险: ${snapshot.riskSummary.critical}`,
      `高风险: ${snapshot.riskSummary.high}`,
      `中风险: ${snapshot.riskSummary.medium}`,
      `低风险: ${snapshot.riskSummary.low}`,
      ``,
      `=== 风险明细 ===`,
      ''
    ]

    for (const risk of data.risks) {
      lines.push(`[${risk.level.toUpperCase()}] ${risk.title}`)
      lines.push(`  类型: ${risk.type}`)
      lines.push(`  描述: ${risk.description}`)
      lines.push(`  建议:`)
      for (const advice of risk.actionableAdvice) {
        lines.push(`    - ${advice}`)
      }
      lines.push('')
    }

    return lines.join('\n')
  }
}
