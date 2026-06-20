import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type EntryStatus = 'aligned' | 'conflict' | 'missing_period' | 'overridden'

export interface AuthorizationEntry {
  id: string
  songName: string
  aliases: string[]
  authorizationPeriod: { start: string; end: string } | null
  revenueShareRatio: number
  status: EntryStatus
  screenshotIds: string[]
}

export interface ScreenshotRecord {
  id: string
  imageUrl: string
  sourceGroup: string
  speaker: string
  relatedSongNames: string[]
  authorizationPeriodFromNote: string | null
  revenueShareFromNote: string | null
  rawText: string
  createdAt: string
}

export interface OverrideRecord {
  id: string
  entryId: string
  fieldName: string
  oldValue: string
  newValue: string
  reason: string
  operator: string
  timestamp: string
}

export interface VersionSnapshot {
  id: string
  entries: AuthorizationEntry[]
  overrides: OverrideRecord[]
  createdAt: string
  label: string
}

export interface AliasConflict {
  alias: string
  entryIds: string[]
  sources: {
    screenshotId: string
    speaker: string
    originalPhrase: string
  }[]
}

export interface IngestResult {
  matchedEntries: string[]
  warnings: string[]
  newEntryIds: string[]
}

export interface RescanResult {
  updatedEntries: { id: string; songName: string; changes: string[] }[]
  warnings: string[]
  versionId: string
}

const MOCK_SCREENSHOTS: ScreenshotRecord[] = [
  {
    id: 'ss-001',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wechat%20group%20chat%20screenshot%20Chinese%20text%20rehearsal%20room%20discussion%20song%20list&image_size=landscape_16_9',
    sourceGroup: '琴房排练通知群',
    speaker: '张老师',
    relatedSongNames: ['夜上海', '夜上海 (复古版)'],
    authorizationPeriodFromNote: null,
    revenueShareFromNote: '夜上海 40%',
    rawText: '张老师：今晚排夜上海和夜上海复古版，分账都是40%那个档位的',
    createdAt: '2025-11-02T14:30:00',
  },
  {
    id: 'ss-002',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wechat%20chat%20screenshot%20music%20producer%20confirming%20contract%20revision%20Chinese&image_size=landscape_16_9',
    sourceGroup: '琴房排练通知群',
    speaker: '李制作人',
    relatedSongNames: ['夜上海'],
    authorizationPeriodFromNote: null,
    revenueShareFromNote: '35%',
    rawText: '李制作人：@小温 夜上海那个之前协议改过了 分账调到35%了 不是40了 你看下备忘',
    createdAt: '2025-11-05T09:15:00',
  },
  {
    id: 'ss-003',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wechat%20group%20chat%20screenshot%20Chinese%20music%20discussion%20same%20song%20different%20name&image_size=landscape_16_9',
    sourceGroup: '琴房排练通知群',
    speaker: '王哥',
    relatedSongNames: ['夜上海', '夜上海 (复古版)'],
    authorizationPeriodFromNote: null,
    revenueShareFromNote: null,
    rawText: '王哥：那个夜上海复古版其实就是夜上海嘛 老张非要加个括号…一样的曲子',
    createdAt: '2025-11-06T16:40:00',
  },
  {
    id: 'ss-004',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wechat%20chat%20screenshot%20Chinese%20authorization%20period%20note%20music%20rights&image_size=landscape_16_9',
    sourceGroup: '琴房授权对接群',
    speaker: '赵姐',
    relatedSongNames: ['雨中旋律'],
    authorizationPeriodFromNote: '2025-03-01至2026-02-28',
    revenueShareFromNote: '25%',
    rawText: '赵姐：雨中旋律那个授权我备注一下哈 到26年2月底 25%分账 老板说放备注里就行别搞太复杂',
    createdAt: '2025-10-20T11:05:00',
  },
  {
    id: 'ss-005',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wechat%20chat%20screenshot%20Chinese%20rehearsal%20room%20new%20song%20registration&image_size=landscape_16_9',
    sourceGroup: '琴房排练通知群',
    speaker: '陈助理',
    relatedSongNames: ['月光奏鸣曲', '春风十里'],
    authorizationPeriodFromNote: null,
    revenueShareFromNote: '月光30% 春风20%',
    rawText: '陈助理：新加两首 月光奏鸣曲分账30 春风十里20 授权期限回头再补',
    createdAt: '2025-11-08T10:20:00',
  },
]

const MOCK_ENTRIES: AuthorizationEntry[] = [
  {
    id: 'entry-001',
    songName: '夜上海',
    aliases: ['夜上海 (复古版)'],
    authorizationPeriod: { start: '2025-01-01', end: '2025-12-31' },
    revenueShareRatio: 35,
    status: 'overridden',
    screenshotIds: ['ss-001', 'ss-002', 'ss-003'],
  },
  {
    id: 'entry-002',
    songName: '夜上海 (复古版)',
    aliases: ['夜上海'],
    authorizationPeriod: { start: '2025-01-01', end: '2025-12-31' },
    revenueShareRatio: 40,
    status: 'conflict',
    screenshotIds: ['ss-001', 'ss-003'],
  },
  {
    id: 'entry-003',
    songName: '雨中旋律',
    aliases: [],
    authorizationPeriod: { start: '2025-03-01', end: '2026-02-28' },
    revenueShareRatio: 25,
    status: 'aligned',
    screenshotIds: ['ss-004'],
  },
  {
    id: 'entry-004',
    songName: '月光奏鸣曲',
    aliases: [],
    authorizationPeriod: null,
    revenueShareRatio: 30,
    status: 'missing_period',
    screenshotIds: ['ss-005'],
  },
]

const MOCK_OVERRIDES: OverrideRecord[] = [
  {
    id: 'ovr-001',
    entryId: 'entry-001',
    fieldName: 'revenueShareRatio',
    oldValue: '40%',
    newValue: '35%',
    reason: '排练群截图 ss-002 中李制作人确认原协议已修订，分账从40%调整为35%',
    operator: '小温',
    timestamp: '2025-11-05T09:30:00',
  },
]

const MOCK_VERSIONS: VersionSnapshot[] = [
  {
    id: 'ver-001',
    entries: JSON.parse(JSON.stringify(MOCK_ENTRIES.map(e => ({ ...e, revenueShareRatio: e.id === 'entry-001' ? 40 : e.revenueShareRatio, status: e.id === 'entry-001' ? 'aligned' : e.status })))),
    overrides: [],
    createdAt: '2025-11-02T15:00:00',
    label: '初始录入',
  },
  {
    id: 'ver-002',
    entries: JSON.parse(JSON.stringify(MOCK_ENTRIES)),
    overrides: JSON.parse(JSON.stringify(MOCK_OVERRIDES)),
    createdAt: '2025-11-05T09:30:00',
    label: '小温改判：夜上海分账40%→35%',
  },
]

function parsePeriodFromNote(note: string | null): { start: string; end: string } | null {
  if (!note) return null
  const s = note.trim()

  const patterns: [RegExp, (m: RegExpMatchArray) => { start: string; end: string } | null][] = [
    [
      /(\d{4}-\d{1,2}-\d{1,2})\s*(?:至|到|~|-|—)\s*(\d{4}-\d{1,2}-\d{1,2})/,
      (m) => ({ start: m[1], end: m[2] }),
    ],
    [
      /(\d{4}年\d{1,2}月\d{1,2}日)\s*(?:至|到|~|-|—)\s*(\d{4}年\d{1,2}月\d{1,2}日)/,
      (m) => {
        const toISO = (s: string) => s.replace(/年|月/g, '-').replace(/日/g, '')
        return { start: toISO(m[1]), end: toISO(m[2]) }
      },
    ],
    [
      /(\d{1,2}月\d{1,2}日)\s*(?:至|到|~|-|—)\s*(\d{4})年(\d{1,2})月(\d{1,2})日/,
      (m) => {
        const endYear = m[3]
        const startMonth = m[1].match(/(\d+)月/)?.[1] || ''
        const startDay = m[1].match(/(\d+)日/)?.[1] || ''
        const start = `${endYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`
        const end = `${m[3]}-${m[4].padStart(2, '0')}-${m[5].padStart(2, '0')}`
        return { start, end }
      },
    ],
    [
      /到\s*(\d{4})年(\d{1,2})月(\d{1,2})日/,
      (m) => {
        const end = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
        return { start: '待定', end }
      },
    ],
    [
      /(\d{4})年\s*全年\s*有效/,
      (m) => {
        const year = m[1]
        return { start: `${year}-01-01`, end: `${year}-12-31` }
      },
    ],
  ]

  for (const [regex, handler] of patterns) {
    const match = s.match(regex)
    if (match) {
      const result = handler(match)
      if (result) return result
    }
  }
  return null
}

function parseShareRatioFromNote(note: string | null, songName: string): number | null {
  if (!note) return null
  const s = note.trim()

  const songAlias = songName
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/[（(].*?[)）]/g, '')
    .trim()

  const beforeSongPattern = new RegExp(`(?:^|\\s)${songAlias}\\s*[:：]?\\s*(\\d+(?:\\.\\d+)?)\\s*%`, 'i')
  const afterSongPattern = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*%\\s*${songAlias}`, 'i')

  let match = s.match(beforeSongPattern)
  if (match) return parseFloat(match[1])

  match = s.match(afterSongPattern)
  if (match) return parseFloat(match[1])

  const shortName = songAlias.slice(0, 2)
  const shortPattern = new RegExp(`${shortName}\\s*[:：]?\\s*(\\d+(?:\\.\\d+)?)\\s*%`)
  match = s.match(shortPattern)
  if (match) return parseFloat(match[1])

  if (s.includes(songAlias) || s.includes(shortName)) {
    const generic = s.match(/(\d+(?:\.\d+)?)%/)
    if (generic) return parseFloat(generic[1])
  }

  return null
}

function findEntryByName(name: string, entries: AuthorizationEntry[]): AuthorizationEntry | null {
  const normalized = name.trim()
  for (const entry of entries) {
    if (entry.songName === normalized) return entry
    if (entry.aliases.includes(normalized)) return entry
  }
  const cleanName = normalized.replace(/\s*\(.*?\)\s*/g, '').trim()
  for (const entry of entries) {
    const cleanEntry = entry.songName.replace(/\s*\(.*?\)\s*/g, '').trim()
    if (cleanEntry === cleanName) return entry
    if (entry.aliases.some((a) => a.replace(/\s*\(.*?\)\s*/g, '').trim() === cleanName)) return entry
  }
  return null
}

function computeEntryStatus(entry: AuthorizationEntry, hasOverride: boolean, hasConflict: boolean): EntryStatus {
  if (hasOverride) return 'overridden'
  if (hasConflict) return 'conflict'
  if (!entry.authorizationPeriod) return 'missing_period'
  return 'aligned'
}

interface StoreState {
  entries: AuthorizationEntry[]
  screenshots: ScreenshotRecord[]
  overrides: OverrideRecord[]
  versions: VersionSnapshot[]
  deliverySummaryOpen: boolean
  selectedVersionA: string | null
  selectedVersionB: string | null
  conflictModalEntryId: string | null
  lastRescanResult: RescanResult | null
  lastIngestResult: IngestResult | null

  setEntries: (entries: AuthorizationEntry[]) => void
  addEntry: (entry: AuthorizationEntry) => void
  updateEntry: (id: string, updates: Partial<AuthorizationEntry>) => void
  overrideEntry: (entryId: string, fieldName: string, oldValue: string, newValue: string, reason: string, operator: string) => void
  addScreenshot: (screenshot: ScreenshotRecord) => void
  ingestScreenshot: (screenshot: ScreenshotRecord) => IngestResult
  rescan: (label: string) => RescanResult
  getAliasConflicts: () => AliasConflict[]
  generateDeliverySummary: () => string
  setDeliverySummaryOpen: (open: boolean) => void
  setSelectedVersionA: (id: string | null) => void
  setSelectedVersionB: (id: string | null) => void
  setConflictModalEntryId: (id: string | null) => void
  setLastRescanResult: (result: RescanResult | null) => void
  setLastIngestResult: (result: IngestResult | null) => void
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
  entries: MOCK_ENTRIES,
  screenshots: MOCK_SCREENSHOTS,
  overrides: MOCK_OVERRIDES,
  versions: MOCK_VERSIONS,
  deliverySummaryOpen: false,
  selectedVersionA: null,
  selectedVersionB: null,
  conflictModalEntryId: null,
  lastRescanResult: null,
  lastIngestResult: null,

  setEntries: (entries) => set({ entries }),

  addEntry: (entry) => set((state) => ({ entries: [...state.entries, entry] })),

  updateEntry: (id, updates) => set((state) => ({
    entries: state.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
  })),

  overrideEntry: (entryId, fieldName, oldValue, newValue, reason, operator) => {
    const override: OverrideRecord = {
      id: `ovr-${Date.now()}`,
      entryId,
      fieldName,
      oldValue,
      newValue,
      reason,
      operator,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const entries = state.entries.map((e) => {
        if (e.id !== entryId) return e
        const updated = { ...e, status: 'overridden' as EntryStatus }
        if (fieldName === 'revenueShareRatio') {
          updated.revenueShareRatio = parseFloat(newValue)
        }
        if (fieldName === 'authorizationPeriod') {
          const [start, end] = newValue.split('~')
          updated.authorizationPeriod = start && end ? { start: start.trim(), end: end.trim() } : null
        }
        return updated
      })
      return { entries, overrides: [...state.overrides, override] }
    })
  },

  addScreenshot: (screenshot) => set((state) => ({
    screenshots: [...state.screenshots, screenshot],
  })),

  ingestScreenshot: (screenshot) => {
    const result: IngestResult = {
      matchedEntries: [],
      warnings: [],
      newEntryIds: [],
    }

    let processedScreenshot = { ...screenshot }
    if (!processedScreenshot.authorizationPeriodFromNote && processedScreenshot.rawText) {
      const autoPeriod = parsePeriodFromNote(processedScreenshot.rawText)
      if (autoPeriod) {
        processedScreenshot.authorizationPeriodFromNote = `${autoPeriod.start}至${autoPeriod.end}`
        result.warnings.push(`已从原始文本自动解析授权期限：${autoPeriod.start}~${autoPeriod.end}`)
      }
    }
    if (!processedScreenshot.revenueShareFromNote && processedScreenshot.rawText) {
      const ratioMatch = processedScreenshot.rawText.match(/(\d+(?:\.\d+)?)%/)
      if (ratioMatch) {
        processedScreenshot.revenueShareFromNote = `${ratioMatch[1]}%`
        result.warnings.push(`已从原始文本自动解析分账比例：${ratioMatch[1]}%`)
      }
    }

    set((state) => {
      let entries = [...state.entries]
      const screenshots = [...state.screenshots, processedScreenshot]

      for (const songName of processedScreenshot.relatedSongNames) {
        const entry = findEntryByName(songName, entries)
        if (entry) {
          if (!entry.screenshotIds.includes(processedScreenshot.id)) {
            entries = entries.map((e) =>
              e.id === entry.id
                ? { ...e, screenshotIds: [...e.screenshotIds, processedScreenshot.id] }
                : e
            )
          }
          if (!result.matchedEntries.includes(entry.songName)) {
            result.matchedEntries.push(entry.songName)
          }
        } else {
          const newEntry: AuthorizationEntry = {
            id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            songName,
            aliases: [],
            authorizationPeriod: null,
            revenueShareRatio: 0,
            status: 'missing_period',
            screenshotIds: [processedScreenshot.id],
          }
          const ratio = parseShareRatioFromNote(processedScreenshot.revenueShareFromNote, songName)
          if (ratio !== null) {
            newEntry.revenueShareRatio = ratio
          } else {
            result.warnings.push(`「${songName}」未在备注中找到分账比例`)
          }
          const period = parsePeriodFromNote(processedScreenshot.authorizationPeriodFromNote)
          if (period && period.start !== '待定') {
            newEntry.authorizationPeriod = period
            newEntry.status = 'aligned'
          } else {
            newEntry.status = 'missing_period'
          }
          entries.push(newEntry)
          result.newEntryIds.push(newEntry.id)
          result.warnings.push(`「${songName}」未匹配到现有条目，已自动新建`)
        }
      }

      if (processedScreenshot.relatedSongNames.length === 0) {
        result.warnings.push('未关联任何条目，截图仅作为存档')
      }

      return { entries, screenshots }
    })

    set({ lastIngestResult: result })
    return result
  },

  rescan: (label) => {
    const result: RescanResult = {
      updatedEntries: [],
      warnings: [],
      versionId: '',
    }

    set((state) => {
      const { entries: oldEntries, screenshots, overrides } = state
      let entries = [...oldEntries]

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        const linkedScreenshots = screenshots.filter((s) => entry.screenshotIds.includes(s.id))
        const changes: string[] = []

        if (!entry.authorizationPeriod && linkedScreenshots.length > 0) {
          for (const ss of linkedScreenshots) {
            const period = parsePeriodFromNote(ss.authorizationPeriodFromNote)
            if (period && period.start !== '待定') {
              const oldPeriod = entry.authorizationPeriod
                ? `${entry.authorizationPeriod.start}~${entry.authorizationPeriod.end}`
                : '未填写'
              entries[i] = {
                ...entries[i],
                authorizationPeriod: period,
              }
              changes.push(`授权期限：${oldPeriod}→${period.start}~${period.end}（来自截图 ${ss.id} 备注）`)
              break
            }
          }
        }

        if (entry.revenueShareRatio === 0 && linkedScreenshots.length > 0) {
          for (const ss of linkedScreenshots) {
            const ratio = parseShareRatioFromNote(ss.revenueShareFromNote, entry.songName)
            if (ratio !== null) {
              entries[i] = { ...entries[i], revenueShareRatio: ratio }
              changes.push(`分账比例：0%→${ratio}%（来自截图 ${ss.id} 备注）`)
              break
            }
          }
        }

        if (changes.length > 0) {
          result.updatedEntries.push({ id: entry.id, songName: entry.songName, changes })
        }
      }

      const conflicts = getAliasConflictsInternal(entries, screenshots)
      const conflictEntryIds = new Set(conflicts.flatMap((c) => c.entryIds))

      entries = entries.map((entry) => {
        const hasOverride = overrides.some((o) => o.entryId === entry.id)
        const hasConflict = conflictEntryIds.has(entry.id)
        const newStatus = computeEntryStatus(entry, hasOverride, hasConflict)
        if (newStatus !== entry.status) {
          const existing = result.updatedEntries.find((u) => u.id === entry.id)
          if (existing) {
            existing.changes.push(`状态：${entry.status}→${newStatus}`)
          } else {
            result.updatedEntries.push({ id: entry.id, songName: entry.songName, changes: [`状态：${entry.status}→${newStatus}`] })
          }
          return { ...entry, status: newStatus }
        }
        return entry
      })

      if (result.updatedEntries.length === 0) {
        result.warnings.push('重扫未发现需要更新的条目，所有信息保持一致')
      }

      const snapshot: VersionSnapshot = {
        id: `ver-${Date.now()}`,
        entries: JSON.parse(JSON.stringify(entries)),
        overrides: JSON.parse(JSON.stringify(overrides)),
        createdAt: new Date().toISOString(),
        label,
      }

      result.versionId = snapshot.id

      return {
        entries,
        versions: [...state.versions, snapshot],
        lastRescanResult: result,
      }
    })

    return result
  },

  getAliasConflicts: () => {
    const { entries, screenshots } = get()
    return getAliasConflictsInternal(entries, screenshots)
  },

  generateDeliverySummary: () => {
    const { entries, screenshots, overrides, versions } = get()
    const aligned = entries.filter((e) => e.status === 'aligned').length
    const conflict = entries.filter((e) => e.status === 'conflict').length
    const overridden = entries.filter((e) => e.status === 'overridden').length
    const missing = entries.filter((e) => e.status === 'missing_period').length

    let summary = '═══ 版权授权分账对齐 · 交付摘要 ═══\n\n'
    summary += `生成时间：${new Date().toLocaleString('zh-CN')}\n`
    summary += `版本数：${versions.length} | 最后版本：${versions[versions.length - 1]?.label || '-'}\n\n`

    summary += '── 对齐状态 ──\n'
    summary += `已对齐：${aligned} | 冲突：${conflict} | 已改判：${overridden} | 缺期限：${missing}\n\n`

    summary += '── 排练群截图 ──\n'
    for (const ss of screenshots) {
      summary += `[${ss.id}] ${ss.sourceGroup} · ${ss.speaker} · ${new Date(ss.createdAt).toLocaleDateString('zh-CN')}\n`
      summary += `  原文："${ss.rawText}"\n`
      if (ss.authorizationPeriodFromNote) {
        summary += `  备注期限：${ss.authorizationPeriodFromNote}\n`
      }
      if (ss.revenueShareFromNote) {
        summary += `  备注分账：${ss.revenueShareFromNote}\n`
      }
      summary += `  关联条目：${ss.relatedSongNames.join('、') || '无'}\n`
    }
    summary += '\n'

    if (overrides.length > 0) {
      summary += '── 人工改判记录 ──\n'
      for (const ovr of overrides) {
        const entry = entries.find((e) => e.id === ovr.entryId)
        summary += `[${new Date(ovr.timestamp).toLocaleString('zh-CN')}] ${ovr.operator}：${entry?.songName || ovr.entryId} ${ovr.fieldName} ${ovr.oldValue}→${ovr.newValue}\n`
        summary += `  原因：${ovr.reason}\n`
      }
      summary += '\n'
    }

    summary += '── 条目清单 ──\n'
    for (const entry of entries) {
      const period = entry.authorizationPeriod
        ? `${entry.authorizationPeriod.start}~${entry.authorizationPeriod.end}`
        : '未填'
      const statusLabel = {
        aligned: '已对齐',
        conflict: '别名冲突',
        overridden: '人工改判',
        missing_period: '缺期限',
      }[entry.status]
      summary += `${entry.songName} | 别名：${entry.aliases.join('、') || '无'} | 期限：${period} | 分账：${entry.revenueShareRatio}% | 状态：${statusLabel} | 关联截图：${entry.screenshotIds.length}张\n`
    }

    return summary
  },

  setDeliverySummaryOpen: (open) => set({ deliverySummaryOpen: open }),
  setSelectedVersionA: (id) => set({ selectedVersionA: id }),
  setSelectedVersionB: (id) => set({ selectedVersionB: id }),
  setConflictModalEntryId: (id) => set({ conflictModalEntryId: id }),
  setLastRescanResult: (result) => set({ lastRescanResult: result }),
  setLastIngestResult: (result) => set({ lastIngestResult: result }),
}),
    {
      name: 'copyright-alignment-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        entries: state.entries,
        screenshots: state.screenshots,
        overrides: state.overrides,
        versions: state.versions,
      }),
    }
  )
)

function getAliasConflictsInternal(entries: AuthorizationEntry[], screenshots: ScreenshotRecord[]): AliasConflict[] {
  const conflicts: AliasConflict[] = []
  const aliasMap = new Map<string, { entryIds: string[]; sources: AliasConflict['sources'] }>()

  const addToMap = (alias: string, entry: AuthorizationEntry) => {
    if (!aliasMap.has(alias)) {
      aliasMap.set(alias, { entryIds: [], sources: [] })
    }
    const group = aliasMap.get(alias)!
    if (!group.entryIds.includes(entry.id)) {
      group.entryIds.push(entry.id)
    }
    for (const ssId of entry.screenshotIds) {
      const ss = screenshots.find((s) => s.id === ssId)
      if (ss && ss.relatedSongNames.some((name) => name.includes(alias) || alias.includes(name))) {
        if (!group.sources.some((s) => s.screenshotId === ss.id)) {
          group.sources.push({
            screenshotId: ss.id,
            speaker: ss.speaker,
            originalPhrase: ss.rawText,
          })
        }
      }
    }
  }

  for (const entry of entries) {
    addToMap(entry.songName, entry)
    for (const alias of entry.aliases) {
      addToMap(alias, entry)
    }
  }

  for (const [alias, group] of aliasMap) {
    if (group.entryIds.length > 1) {
      conflicts.push({ alias, entryIds: [...group.entryIds], sources: group.sources })
    }
  }

  const deduped: AliasConflict[] = []
  const seen = new Set<string>()
  for (const c of conflicts) {
    const key = [...c.entryIds].sort().join('|')
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(c)
    } else {
      const existing = deduped.find((d) => [...d.entryIds].sort().join('|') === key)!
      if (existing.sources.length < c.sources.length) {
        const idx = deduped.indexOf(existing)
        deduped[idx] = c
      }
    }
  }

  return deduped
}
