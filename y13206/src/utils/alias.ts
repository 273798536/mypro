import type { ConflictRecord, AliasDuplicateGroup } from '@/types'

export function detectAliasDuplicates(records: ConflictRecord[]): AliasDuplicateGroup[] {
  const aliasMap = new Map<string, ConflictRecord[]>()
  for (const record of records) {
    for (const alias of record.songAlias) {
      const key = alias.toLowerCase()
      const group = aliasMap.get(key) || []
      group.push(record)
      aliasMap.set(key, group)
    }
  }
  const duplicates: AliasDuplicateGroup[] = []
  for (const [alias, recs] of aliasMap) {
    if (recs.length > 1) {
      duplicates.push({ alias, records: recs })
    }
  }
  return duplicates
}

export function getDuplicateReason(group: AliasDuplicateGroup): string {
  const names = group.records.map((r) => r.songName).join('」「')
  return `别名「${group.alias}」同时出现在「${names}」中，可能是同一首曲目的不同命名，也可能只是巧合同名——需要人工确认。`
}

export function getDuplicateNextStep(group: AliasDuplicateGroup): string {
  if (group.records.every((r) => r.status === 'conflict')) {
    return '建议：这些曲目已经标记为排期冲突，请先解决时码重叠问题，再确认别名归属。'
  }
  return '建议：请确认这些曲目是否为同一作品的不同命名。如果是，请统一曲名；如果不是，请修改别名以避免混淆。'
}
