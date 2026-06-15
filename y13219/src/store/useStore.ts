import { create } from 'zustand'

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

interface StoreState {
  entries: AuthorizationEntry[]
  screenshots: ScreenshotRecord[]
  overrides: OverrideRecord[]
  versions: VersionSnapshot[]
  deliverySummaryOpen: boolean
  selectedVersionA: string | null
  selectedVersionB: string | null
  conflictModalEntryId: string | null

  setEntries: (entries: AuthorizationEntry[]) => void
  addEntry: (entry: AuthorizationEntry) => void
  updateEntry: (id: string, updates: Partial<AuthorizationEntry>) => void
  overrideEntry: (entryId: string, fieldName: string, oldValue: string, newValue: string, reason: string, operator: string) => void
  addScreenshot: (screenshot: ScreenshotRecord) => void
  rescan: (label: string) => void
  getAliasConflicts: () => AliasConflict[]
  generateDeliverySummary: () => string
  setDeliverySummaryOpen: (open: boolean) => void
  setSelectedVersionA: (id: string | null) => void
  setSelectedVersionB: (id: string | null) => void
  setConflictModalEntryId: (id: string | null) => void
}

export const useStore = create<StoreState>((set, get) => ({
  entries: MOCK_ENTRIES,
  screenshots: MOCK_SCREENSHOTS,
  overrides: MOCK_OVERRIDES,
  versions: MOCK_VERSIONS,
  deliverySummaryOpen: false,
  selectedVersionA: null,
  selectedVersionB: null,
  conflictModalEntryId: null,

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
          if (updated.authorizationPeriod && updated.status === 'missing_period') {
            updated.status = 'overridden'
          }
        }
        return updated
      })
      return { entries, overrides: [...state.overrides, override] }
    })
  },

  addScreenshot: (screenshot) => set((state) => ({
    screenshots: [...state.screenshots, screenshot],
  })),

  rescan: (label) => set((state) => {
    const snapshot: VersionSnapshot = {
      id: `ver-${Date.now()}`,
      entries: JSON.parse(JSON.stringify(state.entries)),
      overrides: JSON.parse(JSON.stringify(state.overrides)),
      createdAt: new Date().toISOString(),
      label,
    }
    return { versions: [...state.versions, snapshot] }
  }),

  getAliasConflicts: () => {
    const { entries, screenshots } = get()
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
      summary += `  "${ss.rawText}"\n`
    }
    summary += '\n'

    if (overrides.length > 0) {
      summary += '── 人工改判记录 ──\n'
      for (const ovr of overrides) {
        const entry = entries.find((e) => e.id === ovr.entryId)
        summary += `[${ovr.timestamp}] ${ovr.operator}：${entry?.songName || ovr.entryId} ${ovr.fieldName} ${ovr.oldValue}→${ovr.newValue}\n`
        summary += `  原因：${ovr.reason}\n`
      }
      summary += '\n'
    }

    summary += '── 条目清单 ──\n'
    for (const entry of entries) {
      const period = entry.authorizationPeriod
        ? `${entry.authorizationPeriod.start}~${entry.authorizationPeriod.end}`
        : '未填'
      summary += `${entry.songName} | 别名：${entry.aliases.join('、') || '无'} | 期限：${period} | 分账：${entry.revenueShareRatio}% | 状态：${entry.status}\n`
    }

    return summary
  },

  setDeliverySummaryOpen: (open) => set({ deliverySummaryOpen: open }),
  setSelectedVersionA: (id) => set({ selectedVersionA: id }),
  setSelectedVersionB: (id) => set({ selectedVersionB: id }),
  setConflictModalEntryId: (id) => set({ conflictModalEntryId: id }),
}))
