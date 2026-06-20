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
  { id: 'c1', name: '贝多芬：月光奏鸣曲 第一乐章', aliases: ['Moonlight Sonata Mvt.1', '月光', '月光奏鸣曲'], version: 5, latest: true },
  { id: 'c2', name: '贝多芬：致爱丽丝', aliases: ['Für Elise', '给爱丽丝', '献给爱丽丝'], version: 3, latest: true },
  { id: 'c3', name: '德彪西：月光（贝加马斯克组曲）', aliases: ['Clair de Lune', '月光'], version: 2, latest: true },
  { id: 'c4', name: '肖邦：夜曲 Op.9 No.2 降E大调', aliases: ['Nocturne Op.9 No.2', '夜曲'], version: 6, latest: true },
  { id: 'c5', name: '李斯特：爱之梦 No.3', aliases: ['Liebestraum No.3', '爱之梦'], version: 2, latest: true },
]

export const SAMPLE_OLD_CATALOG: TrackCatalogEntry[] = [
  { id: 'c1', name: '贝多芬：月光奏鸣曲 第一乐章', aliases: ['Moonlight Sonata Mvt.1', '月光', '月光奏鸣曲'], version: 4, latest: false },
  { id: 'c2', name: '贝多芬：致爱丽丝', aliases: ['Für Elise', '给爱丽丝', '献给爱丽丝'], version: 2, latest: false },
  { id: 'c3', name: '德彪西：月光（贝加马斯克组曲）', aliases: ['Clair de Lune', '月光'], version: 2, latest: true },
  { id: 'c4', name: '肖邦：夜曲 Op.9 No.2 降E大调', aliases: ['Nocturne Op.9 No.2', '夜曲'], version: 5, latest: false },
  { id: 'c5', name: '李斯特：爱之梦 No.3', aliases: ['Liebestraum No.3', '爱之梦'], version: 1, latest: false },
]

export const SAMPLE_RECORDS: ReviewRecord[] = [
  {
    id: 'r1',
    trackId: 'c1',
    trackName: '贝多芬：月光奏鸣曲 第一乐章',
    timecode: '00:03:12.450',
    version: 4,
    source: 'old_catalog',
    sourceLabel: '曲目表旧版 v4',
    conclusionImpact: '旧版 v4 第 47 小节起少了 8 小节的反复记号，导致时码整体后移约 12 秒',
    note: '',
    catalogEntryId: 'c1',
  },
  {
    id: 'r2',
    trackId: 'c2',
    trackName: '贝多芬：致爱丽丝',
    timecode: '00:08:45.320',
    version: 3,
    source: 'normal',
    sourceLabel: '正常记录',
    conclusionImpact: '版本号与曲目表 v3 一致，时码在 ±0.2 秒容差内，不影响结论',
    note: '',
    catalogEntryId: 'c2',
  },
  {
    id: 'r3',
    trackId: 'c3',
    trackName: '德彪西：月光（贝加马斯克组曲）',
    timecode: '00:12:30.180',
    version: 2,
    source: 'verbal_note',
    sourceLabel: '口头备注',
    conclusionImpact: '来自张老师口头补充，时码未在曲目表中登记，需人工确认后再纳入结论',
    note: '张老师说这遍学生踏板处理最好',
    catalogEntryId: 'c3',
  },
  {
    id: 'r4',
    trackId: 'c4',
    trackName: '肖邦：夜曲 Op.9 No.2 降E大调',
    timecode: '00:17:05.600',
    version: 5,
    source: 'old_catalog',
    sourceLabel: '曲目表旧版 v5',
    conclusionImpact: '当前曲目表 v6 在尾声处补了 4 小节渐慢段，旧版时码偏差约 3.5 秒',
    note: '',
    catalogEntryId: 'c4',
  },
  {
    id: 'r5',
    trackId: 'c5',
    trackName: '李斯特：爱之梦 No.3',
    timecode: '00:21:18.900',
    version: 1,
    source: 'old_catalog',
    sourceLabel: '曲目表旧版 v1',
    conclusionImpact: '曲目表 v1→v2 中段和弦反复次数调整，时码偏移约 6 秒，需用最新版重算',
    note: '',
    catalogEntryId: 'c5',
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
