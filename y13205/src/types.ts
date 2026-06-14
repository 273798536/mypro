export interface TrackCatalogEntry {
  id: string
  name: string
  aliases: string[]
  version: number
  latest: boolean
}

export type RecordSource = 'old_catalog' | 'normal' | 'verbal_note'

export interface ReviewRecord {
  id: string
  trackId: string
  trackName: string
  timecode: string
  version: number
  source: RecordSource
  sourceLabel: string
  conclusionImpact: string
  note: string
  catalogEntryId?: string
}

export interface NoteChangeEntry {
  id: string
  recordId: string
  oldValue: string
  newValue: string
  changedBy: string
  changedAt: string
}

export interface ReviewRunResult {
  records: ReviewRecord[]
  aliasConflicts: AliasConflict[]
  apiResponse: unknown
}

export interface AliasConflict {
  aliasName: string
  trackIds: string[]
  trackNames: string[]
  catalogEntryIds: string[]
}

export const SAMPLE_CATALOG: TrackCatalogEntry[] = [
  { id: 'c1', name: '月光奏鸣曲', aliases: ['Moonlight Sonata', '月光'], version: 3, latest: true },
  { id: 'c2', name: '致爱丽丝', aliases: ['Für Elise', '给爱丽丝'], version: 2, latest: true },
  { id: 'c3', name: '月光', aliases: ['Clair de Lune'], version: 1, latest: true },
  { id: 'c4', name: '夜曲 Op.9 No.2', aliases: ['Nocturne Op.9 No.2'], version: 4, latest: true },
]

export const SAMPLE_OLD_CATALOG: TrackCatalogEntry[] = [
  { id: 'c1', name: '月光奏鸣曲', aliases: ['Moonlight Sonata', '月光'], version: 2, latest: false },
  { id: 'c2', name: '致爱丽丝', aliases: ['Für Elise', '给爱丽丝'], version: 1, latest: false },
  { id: 'c3', name: '月光', aliases: ['Clair de Lune'], version: 1, latest: true },
  { id: 'c4', name: '夜曲 Op.9 No.2', aliases: ['Nocturne Op.9 No.2'], version: 3, latest: false },
]

export const SAMPLE_RECORDS: ReviewRecord[] = [
  {
    id: 'r1',
    trackId: 'c1',
    trackName: '月光奏鸣曲',
    timecode: '00:03:12.00',
    version: 2,
    source: 'old_catalog',
    sourceLabel: '曲目表旧版 v2',
    conclusionImpact: '版本号与当前曲目表 v3 不一致，结论引用了旧版时码，需以最新版为准',
    note: '',
    catalogEntryId: 'c1',
  },
  {
    id: 'r2',
    trackId: 'c2',
    trackName: '致爱丽丝',
    timecode: '00:08:45.00',
    version: 2,
    source: 'normal',
    sourceLabel: '正常记录',
    conclusionImpact: '版本号与曲目表一致，时码在合理区间，不影响结论',
    note: '',
    catalogEntryId: 'c2',
  },
  {
    id: 'r3',
    trackId: 'c3',
    trackName: '月光',
    timecode: '00:12:30.00',
    version: 1,
    source: 'verbal_note',
    sourceLabel: '口头备注',
    conclusionImpact: '来自口头备注，时码未经曲目表验证，需人工确认后再纳入结论',
    note: '学生说这遍是最好的',
    catalogEntryId: 'c3',
  },
  {
    id: 'r4',
    trackId: 'c4',
    trackName: '夜曲 Op.9 No.2',
    timecode: '00:17:05.00',
    version: 3,
    source: 'old_catalog',
    sourceLabel: '曲目表旧版 v3',
    conclusionImpact: '当前曲目表已更新到 v4，旧版 v3 时码偏移约 2 秒，结论需修正',
    note: '',
    catalogEntryId: 'c4',
  },
]

export function runReview(
  catalog: TrackCatalogEntry[],
  oldCatalog: TrackCatalogEntry[],
  records: ReviewRecord[]
): ReviewRunResult {
  const aliasMap = new Map<string, { trackId: string; trackName: string; catalogEntryId: string }[]>()

  for (const entry of catalog) {
    const allNames = [entry.name, ...entry.aliases]
    for (const name of allNames) {
      const key = name.toLowerCase()
      if (!aliasMap.has(key)) aliasMap.set(key, [])
      aliasMap.get(key)!.push({ trackId: entry.id, trackName: entry.name, catalogEntryId: entry.id })
    }
  }

  const aliasConflicts: AliasConflict[] = []
  for (const [aliasName, tracks] of aliasMap) {
    if (tracks.length > 1) {
      const uniqueTracks = tracks.reduce((acc, t) => {
        if (!acc.find(u => u.trackId === t.trackId)) acc.push(t)
        return acc
      }, [] as typeof tracks)
      if (uniqueTracks.length > 1) {
        aliasConflicts.push({
          aliasName,
          trackIds: uniqueTracks.map(t => t.trackId),
          trackNames: uniqueTracks.map(t => t.trackName),
          catalogEntryIds: uniqueTracks.map(t => t.catalogEntryId),
        })
      }
    }
  }

  const enriched = records.map(r => {
    const current = catalog.find(e => e.id === r.trackId)
    const old = oldCatalog.find(e => e.id === r.trackId)
    let impact = r.conclusionImpact
    if (current && r.version < current.version) {
      impact = `版本号 ${r.version} < 当前曲目表版本 ${current.version}，时码可能偏移，结论需以最新版为准`
    } else if (current && r.version === current.version) {
      impact = '版本号与曲目表一致，不影响结论'
    }
    return { ...r, conclusionImpact: impact }
  })

  return {
    records: enriched,
    aliasConflicts,
    apiResponse: {
      catalogVersion: catalog.map(e => ({ id: e.id, version: e.version, latest: e.latest })),
      processedAt: new Date().toISOString(),
      recordCount: records.length,
      conflictCount: aliasConflicts.length,
    },
  }
}
