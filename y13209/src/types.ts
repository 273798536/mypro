export interface TimecodeEntry {
  id: string
  projectName: string
  timeRange: { start: string; end: string }
  splitRatio: string
  authorization: {
    startDate: string
    endDate: string
    status: 'valid' | 'expiring' | 'expired' | 'needs_confirmation'
    confirmReason?: string
    nextStep?: string
  }
  remarks: RemarkSnapshot[]
  screenshots: ScreenshotSnapshot[]
  alignmentStatus: 'aligned' | 'misaligned' | 'pending'
  reviewStatus: 'unreviewed' | 'in_review' | 'confirmed' | 'flagged'
  createdAt: string
  updatedAt: string
}

export interface RemarkSnapshot {
  id: string
  content: string
  type: 'rehearsal' | 'authorization' | 'manual'
  createdAt: string
  version: number
}

export interface ScreenshotSnapshot {
  id: string
  dataUrl: string
  fileName: string
  relatedRemarkId?: string
  createdAt: string
  version: number
  isSupplementary: boolean
}

export interface HistoryEntry {
  id: string
  entryId: string
  snapshot: {
    remarks: RemarkSnapshot[]
    screenshots: ScreenshotSnapshot[]
    alignmentStatus: string
    authorization: TimecodeEntry['authorization']
  }
  trigger: 'remark_added' | 'screenshot_added' | 'rescan' | 'manual_override'
  createdAt: string
}

export interface FilterState {
  dateRange: { start: string; end: string } | null
  project: string | null
  status: string | null
}

export type AuthorizationStatus = TimecodeEntry['authorization']['status']
export type AlignmentStatus = TimecodeEntry['alignmentStatus']
export type ReviewStatus = TimecodeEntry['reviewStatus']
