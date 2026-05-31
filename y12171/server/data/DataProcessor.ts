import { v4 as uuidv4 } from 'uuid'
import { parse, format, isValid } from 'date-fns'
import type {
  SamplePack,
  LicenseAgreement,
  TrackProject,
  SampleUsage,
  DataQualityIssue
} from '../../shared/types'

export class DataProcessor {
  private issues: DataQualityIssue[] = []

  cleanSamplePack(raw: Partial<SamplePack> & { notes?: string }): SamplePack {
    const issues: DataQualityIssue[] = []
    const now = new Date().toISOString()

    const id = raw.id || uuidv4()

    if (!raw.name) {
      issues.push(this.createIssue('sample-pack', id, 'name', 'missing', 'high',
        '采样包名称缺失', '请补充采样包的官方名称'))
    }

    if (!raw.vendor) {
      issues.push(this.createIssue('sample-pack', id, 'vendor', 'missing', 'medium',
        '供应商信息缺失', '建议记录采样包的购买来源或制作方'))
    }

    let purchaseDate = raw.purchaseDate
    if (!purchaseDate) {
      issues.push(this.createIssue('sample-pack', id, 'purchaseDate', 'missing', 'medium',
        '购买日期缺失', '建议补充购买日期以便计算授权有效期'))
      purchaseDate = now
    } else if (!this.isValidDate(purchaseDate)) {
      issues.push(this.createIssue('sample-pack', id, 'purchaseDate', 'format', 'medium',
        `购买日期格式异常: ${purchaseDate}`, '建议使用 YYYY-MM-DD 格式'))
      purchaseDate = this.attemptDateFix(purchaseDate) || now
    }

    let cost = raw.cost ?? 0
    if (raw.cost === undefined || raw.cost === null) {
      issues.push(this.createIssue('sample-pack', id, 'cost', 'missing', 'low',
        '购买金额未记录', '如有需要可补充采购金额'))
    }

    let fileCount = raw.fileCount ?? 0
    if (fileCount === 0 && raw.notes) {
      const extracted = this.extractNumberFromNotes(raw.notes, ['文件', '个', '采样', 'loop'])
      if (extracted) {
        fileCount = extracted
        issues.push(this.createIssue('sample-pack', id, 'fileCount', 'inconsistent', 'low',
          `从备注中推测文件数量: ${extracted}`, '建议确认并修正准确数量'))
      }
    }

    let tags = raw.tags || []
    if (raw.notes && tags.length === 0) {
      tags = this.extractTagsFromNotes(raw.notes)
      if (tags.length > 0) {
        issues.push(this.createIssue('sample-pack', id, 'tags', 'inconsistent', 'low',
          `从备注中提取标签: ${tags.join(', ')}`, '可根据实际用途调整标签'))
      }
    }

    this.issues.push(...issues)

    return {
      id,
      name: raw.name || '未命名采样包',
      vendor: raw.vendor || '未知供应商',
      purchaseDate,
      cost,
      fileCount,
      notes: raw.notes,
      tags,
      createdAt: raw.createdAt || now,
      updatedAt: now
    }
  }

  cleanLicenseAgreement(raw: Partial<LicenseAgreement> & { rawContent?: string }): LicenseAgreement {
    const issues: DataQualityIssue[] = []
    const now = new Date().toISOString()

    const id = raw.id || uuidv4()
    const samplePackId = raw.samplePackId || ''

    if (!samplePackId) {
      issues.push(this.createIssue('license', id, 'samplePackId', 'missing', 'high',
        '未关联采样包', '请将此授权协议关联到具体的采样包'))
    }

    const licenseTypes = ['commercial', 'non-commercial', 'royalty-free', 'custom'] as const
    let licenseType = raw.licenseType
    if (!licenseType || !licenseTypes.includes(licenseType)) {
      if (raw.rawContent) {
        licenseType = this.inferLicenseType(raw.rawContent)
        issues.push(this.createIssue('license', id, 'licenseType', 'inconsistent', 'medium',
          `从协议内容推测授权类型: ${licenseType}`, '请与官方授权文件确认'))
      } else {
        licenseType = 'custom'
        issues.push(this.createIssue('license', id, 'licenseType', 'missing', 'high',
          '授权类型未明确', '请选择: 商用/非商用/免版税/自定义'))
      }
    }

    let validFrom = raw.validFrom
    if (!validFrom) {
      issues.push(this.createIssue('license', id, 'validFrom', 'missing', 'high',
        '授权生效日期缺失', '授权协议必须明确生效日期'))
      validFrom = now
    }

    let validUntil = raw.validUntil
    let isPerpetual = raw.isPerpetual ?? false

    if (!isPerpetual && !validUntil) {
      if (raw.rawContent?.includes('永久') || raw.rawContent?.includes('perpetual')) {
        isPerpetual = true
        issues.push(this.createIssue('license', id, 'isPerpetual', 'inconsistent', 'medium',
          '从协议内容检测到永久授权标识', '请确认是否为永久授权'))
      } else {
        issues.push(this.createIssue('license', id, 'validUntil', 'missing', 'critical',
          '授权到期日期未设置且非永久授权', '必须明确授权截止日期，否则存在重大风险'))
      }
    }

    let allowedUses = raw.allowedUses || []
    let restrictions = raw.restrictions || []
    if (raw.rawContent && (allowedUses.length === 0 || restrictions.length === 0)) {
      const extracted = this.extractUsageRules(raw.rawContent)
      if (extracted.allowed.length > 0 && allowedUses.length === 0) {
        allowedUses = extracted.allowed
        issues.push(this.createIssue('license', id, 'allowedUses', 'inconsistent', 'low',
          `从协议中提取允许用途: ${allowedUses.join(', ')}`, '请确认是否准确'))
      }
      if (extracted.restricted.length > 0 && restrictions.length === 0) {
        restrictions = extracted.restricted
        issues.push(this.createIssue('license', id, 'restrictions', 'inconsistent', 'low',
          `从协议中提取限制条款: ${restrictions.join(', ')}`, '请确认是否准确'))
      }
    }

    this.issues.push(...issues)

    return {
      id,
      samplePackId,
      licenseType,
      licenseName: raw.licenseName || '标准授权协议',
      validFrom,
      validUntil,
      isPerpetual,
      allowedUses,
      restrictions,
      attributionRequired: raw.attributionRequired ?? false,
      maxCopies: raw.maxCopies,
      territories: raw.territories,
      notes: raw.notes,
      rawContent: raw.rawContent,
      createdAt: raw.createdAt || now,
      updatedAt: now
    }
  }

  cleanTrackProject(raw: Partial<TrackProject>): TrackProject {
    const issues: DataQualityIssue[] = []
    const now = new Date().toISOString()

    const id = raw.id || uuidv4()

    if (!raw.name) {
      issues.push(this.createIssue('track', id, 'name', 'missing', 'high',
        '曲目名称缺失', '请补充曲目名称'))
    }

    if (!raw.artist) {
      issues.push(this.createIssue('track', id, 'artist', 'missing', 'medium',
        '艺术家信息缺失', '建议记录制作艺术家'))
    }

    const statuses = ['draft', 'in-progress', 'released', 'archived'] as const
    let status = raw.status
    if (!status || !statuses.includes(status)) {
      status = 'draft'
      issues.push(this.createIssue('track', id, 'status', 'format', 'low',
        '项目状态未设置，默认为草稿', '可根据实际进度更新状态'))
    }

    this.issues.push(...issues)

    return {
      id,
      name: raw.name || '未命名曲目',
      artist: raw.artist || '未知艺术家',
      album: raw.album,
      releaseDate: raw.releaseDate,
      status,
      createdAt: raw.createdAt || now,
      updatedAt: now
    }
  }

  cleanSampleUsage(raw: Partial<SampleUsage>): SampleUsage {
    const issues: DataQualityIssue[] = []
    const now = new Date().toISOString()

    const id = raw.id || uuidv4()

    if (!raw.trackProjectId) {
      issues.push(this.createIssue('usage', id, 'trackProjectId', 'missing', 'high',
        '未关联曲目项目', '此采样使用记录需要关联到具体曲目'))
    }

    if (!raw.samplePackId) {
      issues.push(this.createIssue('usage', id, 'samplePackId', 'missing', 'high',
        '未关联采样包', '此采样使用记录需要关联到具体采样包'))
    }

    if (!raw.sampleFileName) {
      issues.push(this.createIssue('usage', id, 'sampleFileName', 'missing', 'medium',
        '采样文件名缺失', '建议记录使用的具体采样文件名'))
    }

    this.issues.push(...issues)

    return {
      id,
      trackProjectId: raw.trackProjectId || '',
      samplePackId: raw.samplePackId || '',
      sampleFileName: raw.sampleFileName || '未知采样',
      usageDescription: raw.usageDescription,
      duration: raw.duration,
      isModified: raw.isModified ?? false,
      createdAt: raw.createdAt || now,
      updatedAt: now
    }
  }

  getIssues(): DataQualityIssue[] {
    return [...this.issues]
  }

  clearIssues(): void {
    this.issues = []
  }

  private createIssue(
    entityType: DataQualityIssue['entityType'],
    entityId: string,
    fieldName: string,
    issueType: DataQualityIssue['issueType'],
    severity: DataQualityIssue['severity'],
    description: string,
    suggestion: string
  ): DataQualityIssue {
    return {
      id: uuidv4(),
      entityType,
      entityId,
      fieldName,
      issueType,
      severity,
      description,
      suggestion
    }
  }

  private isValidDate(dateStr: string): boolean {
    return isValid(new Date(dateStr))
  }

  private attemptDateFix(dateStr: string): string | null {
    const formats = ['yyyy-MM-dd', 'yyyy/MM/dd', 'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy年MM月dd日']
    for (const fmt of formats) {
      try {
        const parsed = parse(dateStr, fmt, new Date())
        if (isValid(parsed)) {
          return format(parsed, 'yyyy-MM-dd')
        }
      } catch {
        continue
      }
    }
    return null
  }

  private extractNumberFromNotes(notes: string, keywords: string[]): number | null {
    for (const keyword of keywords) {
      const regex = new RegExp(`(\\d+)\\s*${keyword}`, 'i')
      const match = notes.match(regex)
      if (match) return parseInt(match[1], 10)
    }
    return null
  }

  private extractTagsFromNotes(notes: string): string[] {
    const tagKeywords = ['嘻哈', '电子', '摇滚', '流行', '爵士', '古典', 'HipHop', 'EDM', 'Trap', 'Lo-Fi']
    return tagKeywords.filter(tag => notes.toLowerCase().includes(tag.toLowerCase()))
  }

  private inferLicenseType(content: string): LicenseAgreement['licenseType'] {
    const lower = content.toLowerCase()
    if (lower.includes('royalty') || lower.includes('免版税')) return 'royalty-free'
    if (lower.includes('commercial') || lower.includes('商用')) return 'commercial'
    if (lower.includes('non-commercial') || lower.includes('非商用')) return 'non-commercial'
    return 'custom'
  }

  private extractUsageRules(content: string): { allowed: string[]; restricted: string[] } {
    const allowed: string[] = []
    const restricted: string[] = []
    const lower = content.toLowerCase()

    if (lower.includes('广告') || lower.includes('advertising')) allowed.push('广告使用')
    if (lower.includes('影视') || lower.includes('film')) allowed.push('影视配乐')
    if (lower.includes('游戏') || lower.includes('game')) allowed.push('游戏配乐')
    if (lower.includes('直播') || lower.includes('stream')) allowed.push('直播背景')

    if (lower.includes('不得转售') || lower.includes('resell')) restricted.push('禁止转售采样包')
    if (lower.includes('不得用于色情') || lower.includes('pornography')) restricted.push('禁止色情内容')
    if (lower.includes('不得用于仇恨') || lower.includes('hate')) restricted.push('禁止仇恨言论')

    return { allowed, restricted }
  }
}
