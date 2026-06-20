import type {
  TimecodeEntry,
  RemarkSnapshot,
  ScreenshotSnapshot,
  HistoryEntry,
  FilterState,
} from '@/types'

const AUTH_STATUS_LABEL: Record<string, string> = {
  valid: '有效',
  expiring: '临期',
  expired: '过期',
  needs_confirmation: '需人工确认',
}

const ALIGNMENT_LABEL: Record<string, string> = {
  aligned: '已对齐',
  misaligned: '异常',
  pending: '待定',
}

const REVIEW_LABEL: Record<string, string> = {
  unreviewed: '未复核',
  in_review: '复核中',
  confirmed: '已通过',
  flagged: '待确认',
}

const REMARK_TYPE_LABEL: Record<string, string> = {
  rehearsal: '排练',
  authorization: '授权',
  manual: '人工',
}

const TRIGGER_LABEL: Record<string, string> = {
  remark_added: '添加备注',
  screenshot_added: '添加截图',
  rescan: '重扫描',
  manual_override: '人工确认',
}

function buildEntryHistory(entryId: string, allHistory: HistoryEntry[]): HistoryEntry[] {
  return allHistory
    .filter((h) => h.entryId === entryId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export interface SummaryJson {
  version: string
  generatedAt: string
  toolName: string
  filter: FilterState
  overview: {
    totalEntries: number
    aligned: number
    misaligned: number
    pending: number
    authValid: number
    authExpiring: number
    authExpired: number
    authNeedsConfirmation: number
    reviewConfirmed: number
    reviewFlagged: number
  }
  entries: Array<{
    projectName: string
    timeRange: { start: string; end: string }
    splitRatio: string
    authorization: {
      startDate: string
      endDate: string
      status: string
      statusLabel: string
      confirmReason?: string
      nextStep?: string
      daysRemaining: number
    }
    alignmentStatus: string
    alignmentStatusLabel: string
    reviewStatus: string
    reviewStatusLabel: string
    createdAt: string
    updatedAt: string
    remarks: Array<{
      version: number
      type: string
      typeLabel: string
      content: string
      createdAt: string
    }>
    screenshots: Array<{
      version: number
      fileName: string
      isSupplementary: boolean
      relatedRemarkVersion?: number
      createdAt: string
    }>
    history: Array<{
      sequence: number
      trigger: string
      triggerLabel: string
      createdAt: string
      snapshot: {
        alignmentStatus: string
        alignmentStatusLabel: string
        authorizationStatus: string
        authorizationStatusLabel: string
        confirmReason?: string
        nextStep?: string
        remarks: Array<{ version: number; typeLabel: string; content: string }>
        screenshots: Array<{ version: number; fileName: string; isSupplementary: boolean }>
      }
    }>
  }>
}

export function buildSummaryJson(
  entries: TimecodeEntry[],
  history: HistoryEntry[],
  filter: FilterState
): SummaryJson {
  const overview = {
    totalEntries: entries.length,
    aligned: entries.filter((e) => e.alignmentStatus === 'aligned').length,
    misaligned: entries.filter((e) => e.alignmentStatus === 'misaligned').length,
    pending: entries.filter((e) => e.alignmentStatus === 'pending').length,
    authValid: entries.filter((e) => e.authorization.status === 'valid').length,
    authExpiring: entries.filter((e) => e.authorization.status === 'expiring').length,
    authExpired: entries.filter((e) => e.authorization.status === 'expired').length,
    authNeedsConfirmation: entries.filter((e) => e.authorization.status === 'needs_confirmation').length,
    reviewConfirmed: entries.filter((e) => e.reviewStatus === 'confirmed').length,
    reviewFlagged: entries.filter((e) => e.reviewStatus === 'flagged').length,
  }

  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    toolName: '录音棚时码分账对齐',
    filter,
    overview,
    entries: entries.map((entry) => {
      const daysRemaining = Math.ceil(
        (new Date(entry.authorization.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      const remarkVersionById = new Map(entry.remarks.map((r) => [r.id, r.version]))
      const entryHistory = buildEntryHistory(entry.id, history)

      return {
        projectName: entry.projectName,
        timeRange: entry.timeRange,
        splitRatio: entry.splitRatio,
        authorization: {
          startDate: entry.authorization.startDate,
          endDate: entry.authorization.endDate,
          status: entry.authorization.status,
          statusLabel: AUTH_STATUS_LABEL[entry.authorization.status] || entry.authorization.status,
          confirmReason: entry.authorization.confirmReason,
          nextStep: entry.authorization.nextStep,
          daysRemaining,
        },
        alignmentStatus: entry.alignmentStatus,
        alignmentStatusLabel: ALIGNMENT_LABEL[entry.alignmentStatus] || entry.alignmentStatus,
        reviewStatus: entry.reviewStatus,
        reviewStatusLabel: REVIEW_LABEL[entry.reviewStatus] || entry.reviewStatus,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        remarks: entry.remarks.map((r) => ({
          version: r.version,
          type: r.type,
          typeLabel: REMARK_TYPE_LABEL[r.type] || r.type,
          content: r.content,
          createdAt: r.createdAt,
        })),
        screenshots: entry.screenshots.map((s) => ({
          version: s.version,
          fileName: s.fileName,
          isSupplementary: s.isSupplementary,
          relatedRemarkVersion: s.relatedRemarkId ? remarkVersionById.get(s.relatedRemarkId) : undefined,
          createdAt: s.createdAt,
        })),
        history: entryHistory.map((h, idx) => ({
          sequence: idx + 1,
          trigger: h.trigger,
          triggerLabel: TRIGGER_LABEL[h.trigger] || h.trigger,
          createdAt: h.createdAt,
          snapshot: {
            alignmentStatus: h.snapshot.alignmentStatus,
            alignmentStatusLabel: ALIGNMENT_LABEL[h.snapshot.alignmentStatus] || h.snapshot.alignmentStatus,
            authorizationStatus: h.snapshot.authorization.status,
            authorizationStatusLabel: AUTH_STATUS_LABEL[h.snapshot.authorization.status] || h.snapshot.authorization.status,
            confirmReason: h.snapshot.authorization.confirmReason,
            nextStep: h.snapshot.authorization.nextStep,
            remarks: h.snapshot.remarks.map((r) => ({
              version: r.version,
              typeLabel: REMARK_TYPE_LABEL[r.type] || r.type,
              content: r.content,
            })),
            screenshots: h.snapshot.screenshots.map((s) => ({
              version: s.version,
              fileName: s.fileName,
              isSupplementary: s.isSupplementary,
            })),
          },
        })),
      }
    }),
  }
}

export function buildChecklistJson(
  entries: TimecodeEntry[],
  history: HistoryEntry[],
  filter: FilterState
) {
  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    toolName: '录音棚时码分账对齐 — 交付清单',
    filter,
    verificationNotes: [
      '每条备注均包含 version 版本号，与历史快照中的 remark.version 一一对应',
      '每张截图标记 isSupplementary（是否补充截图），可关联到对应备注版本',
      'history 数组按操作时间升序排列，可追溯当前状态是由哪次操作形成',
    ],
    items: entries.map((entry) => {
      const entryHistory = buildEntryHistory(entry.id, history)
      const remarkVersionById = new Map(entry.remarks.map((r) => [r.id, r.version]))
      return {
        projectName: entry.projectName,
        timeRange: entry.timeRange,
        splitRatio: entry.splitRatio,
        authorization: {
          startDate: entry.authorization.startDate,
          endDate: entry.authorization.endDate,
          status: entry.authorization.status,
          statusLabel: AUTH_STATUS_LABEL[entry.authorization.status] || entry.authorization.status,
          confirmReason: entry.authorization.confirmReason,
          nextStep: entry.authorization.nextStep,
        },
        alignment: {
          status: entry.alignmentStatus,
          label: ALIGNMENT_LABEL[entry.alignmentStatus] || entry.alignmentStatus,
        },
        review: {
          status: entry.reviewStatus,
          label: REVIEW_LABEL[entry.reviewStatus] || entry.reviewStatus,
        },
        remarks: entry.remarks.map((r) => ({
          version: r.version,
          type: r.type,
          typeLabel: REMARK_TYPE_LABEL[r.type] || r.type,
          content: r.content,
          createdAt: r.createdAt,
        })),
        screenshots: entry.screenshots.map((s) => ({
          version: s.version,
          fileName: s.fileName,
          isSupplementary: s.isSupplementary,
          relatedRemarkVersion: s.relatedRemarkId ? remarkVersionById.get(s.relatedRemarkId) : undefined,
          createdAt: s.createdAt,
        })),
        history: entryHistory.map((h, idx) => ({
          sequence: idx + 1,
          trigger: h.trigger,
          triggerLabel: TRIGGER_LABEL[h.trigger] || h.trigger,
          createdAt: h.createdAt,
          snapshotSummary: {
            alignment: ALIGNMENT_LABEL[h.snapshot.alignmentStatus] || h.snapshot.alignmentStatus,
            authStatus: AUTH_STATUS_LABEL[h.snapshot.authorization.status] || h.snapshot.authorization.status,
            remarkCount: h.snapshot.remarks.length,
            screenshotCount: h.snapshot.screenshots.length,
            remarkVersions: h.snapshot.remarks.map((r) => `v${r.version}`),
            screenshotVersions: h.snapshot.screenshots.map((s) => (s.isSupplementary ? `v${s.version}(补)` : `v${s.version}`)),
          },
        })),
        reviewChecklist: {
          authorizationExpiryChecked: entry.authorization.status !== 'expired' && entry.authorization.status !== 'expiring',
          alignmentPassed: entry.alignmentStatus === 'aligned',
          allRemarksReviewed: entry.remarks.length > 0,
          supplementaryScreenshotsAttached: entry.screenshots.some((s) => s.isSupplementary),
          reviewCompleted: entry.reviewStatus === 'confirmed',
        },
      }
    }),
  }
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'string' ? value : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

export function buildChecklistCsv(
  entries: TimecodeEntry[],
  history: HistoryEntry[]
): string {
  const headers = [
    '项目名称',
    '时段(起)',
    '时段(止)',
    '分账比例',
    '授权起始',
    '授权到期',
    '授权状态',
    '对齐状态',
    '复核状态',
    '确认原因',
    '下一步',
    '备注版本',
    '备注类型',
    '备注内容',
    '备注时间',
    '截图版本',
    '截图文件名',
    '是否补充截图',
    '关联备注版本',
    '历史快照序号',
    '历史操作',
    '历史时间',
    '快照对齐状态',
    '快照授权状态',
    '快照备注版本列表',
    '快照截图版本列表',
  ]

  const rows: string[][] = [headers]

  entries.forEach((entry) => {
    const remarkVersionById = new Map(entry.remarks.map((r) => [r.id, r.version]))
    const entryHistory = buildEntryHistory(entry.id, history)

    const maxRows = Math.max(
      entry.remarks.length,
      entry.screenshots.length,
      entryHistory.length,
      1
    )

    for (let i = 0; i < maxRows; i++) {
      const remark = entry.remarks[i]
      const screenshot = entry.screenshots[i]
      const hist = entryHistory[i]

      const row = [
        i === 0 ? entry.projectName : '',
        i === 0 ? entry.timeRange.start : '',
        i === 0 ? entry.timeRange.end : '',
        i === 0 ? entry.splitRatio : '',
        i === 0 ? entry.authorization.startDate : '',
        i === 0 ? entry.authorization.endDate : '',
        i === 0 ? AUTH_STATUS_LABEL[entry.authorization.status] || entry.authorization.status : '',
        i === 0 ? ALIGNMENT_LABEL[entry.alignmentStatus] || entry.alignmentStatus : '',
        i === 0 ? REVIEW_LABEL[entry.reviewStatus] || entry.reviewStatus : '',
        i === 0 ? entry.authorization.confirmReason || '' : '',
        i === 0 ? entry.authorization.nextStep || '' : '',
        remark ? `v${remark.version}` : '',
        remark ? REMARK_TYPE_LABEL[remark.type] || remark.type : '',
        remark ? remark.content : '',
        remark ? remark.createdAt : '',
        screenshot ? `v${screenshot.version}` : '',
        screenshot ? screenshot.fileName : '',
        screenshot ? (screenshot.isSupplementary ? '是' : '否') : '',
        screenshot && screenshot.relatedRemarkId
          ? (remarkVersionById.get(screenshot.relatedRemarkId) ? `v${remarkVersionById.get(screenshot.relatedRemarkId)}` : '')
          : '',
        hist ? String(i + 1) : '',
        hist ? TRIGGER_LABEL[hist.trigger] || hist.trigger : '',
        hist ? hist.createdAt : '',
        hist ? ALIGNMENT_LABEL[hist.snapshot.alignmentStatus] || hist.snapshot.alignmentStatus : '',
        hist ? AUTH_STATUS_LABEL[hist.snapshot.authorization.status] || hist.snapshot.authorization.status : '',
        hist ? hist.snapshot.remarks.map((r) => `v${r.version}`).join('|') : '',
        hist
          ? hist.snapshot.screenshots
              .map((s) => (s.isSupplementary ? `v${s.version}(补)` : `v${s.version}`))
              .join('|')
          : '',
      ]
      rows.push(row)
    }
  })

  return '\uFEFF' + rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')
}
