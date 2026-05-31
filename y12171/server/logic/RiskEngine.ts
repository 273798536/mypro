import { v4 as uuidv4 } from 'uuid'
import { differenceInDays, isBefore, isAfter, parseISO } from 'date-fns'
import type {
  SamplePack,
  LicenseAgreement,
  TrackProject,
  SampleUsage,
  RiskAlert,
  NameConflict,
  LicenseValidationResult
} from '../../shared/types'

export class RiskEngine {
  private today: Date

  constructor(referenceDate?: Date) {
    this.today = referenceDate || new Date()
  }

  validateLicense(
    license: LicenseAgreement,
    samplePack: SamplePack
  ): LicenseValidationResult {
    const warnings: string[] = []
    let expirationStatus: LicenseValidationResult['expirationStatus'] = 'active'
    let daysUntilExpiration: number | undefined

    if (license.isPerpetual) {
      expirationStatus = 'perpetual'
    } else if (license.validUntil) {
      const expireDate = parseISO(license.validUntil)
      daysUntilExpiration = differenceInDays(expireDate, this.today)

      if (daysUntilExpiration < 0) {
        expirationStatus = 'expired'
      } else if (daysUntilExpiration <= 30) {
        expirationStatus = 'expiring-soon'
      }
    }

    const commercialUseAllowed =
      license.licenseType === 'commercial' ||
      license.licenseType === 'royalty-free'

    if (!commercialUseAllowed) {
      warnings.push('此授权不允许商业使用')
    }

    const isValid = expirationStatus !== 'expired'

    return {
      isValid,
      expirationStatus,
      daysUntilExpiration,
      commercialUseAllowed,
      attributionRequired: license.attributionRequired,
      restrictions: license.restrictions,
      warnings
    }
  }

  generateExpirationAlerts(
    licenses: LicenseAgreement[],
    samplePacks: SamplePack[]
  ): RiskAlert[] {
    const alerts: RiskAlert[] = []
    const packMap = new Map(samplePacks.map(p => [p.id, p]))

    for (const license of licenses) {
      if (license.isPerpetual || !license.validUntil) continue

      const validation = this.validateLicense(license, packMap.get(license.samplePackId)!)
      const samplePack = packMap.get(license.samplePackId)
      const packName = samplePack?.name || '未知采样包'

      if (validation.expirationStatus === 'expired') {
        alerts.push({
          id: uuidv4(),
          type: 'expiration',
          level: 'critical',
          title: `授权已过期: ${packName}`,
          description: `${license.licenseName} 已于 ${license.validUntil} 过期，涉及 ${packName}。所有使用此采样包的曲目存在版权风险。`,
          actionableAdvice: [
            '立即停止所有相关曲目的商业发行',
            '联系供应商续期授权协议',
            '审查已发行作品是否需要下架',
            '评估替换采样的可行性'
          ],
          relatedEntityId: license.id,
          relatedEntityType: 'license',
          createdAt: new Date().toISOString()
        })
      } else if (validation.expirationStatus === 'expiring-soon') {
        alerts.push({
          id: uuidv4(),
          type: 'expiration',
          level: 'high',
          title: `授权即将过期: ${packName}`,
          description: `${license.licenseName} 将在 ${validation.daysUntilExpiration} 天后过期（${license.validUntil}），请及时处理。`,
          actionableAdvice: [
            `剩余 ${validation.daysUntilExpiration} 天，建议在两周内完成续期`,
            '提前联系供应商确认续期费用和条款',
            '检查是否有正在制作的项目使用此采样包',
            '考虑升级为永久授权以消除后续风险'
          ],
          relatedEntityId: license.id,
          relatedEntityType: 'license',
          createdAt: new Date().toISOString()
        })
      }
    }

    return alerts
  }

  detectNameConflicts(
    samplePacks: SamplePack[]
  ): NameConflict[] {
    const conflicts: NameConflict[] = []
    const nameMap = new Map<string, string[]>()

    for (const pack of samplePacks) {
      const normalizedName = pack.name.toLowerCase().trim()
      if (!nameMap.has(normalizedName)) {
        nameMap.set(normalizedName, [])
      }
      nameMap.get(normalizedName)!.push(pack.id)
    }

    for (const [name, packIds] of nameMap.entries()) {
      if (packIds.length > 1) {
        const originalPacks = samplePacks.filter(p => packIds.includes(p.id))
        const vendors = originalPacks.map(p => p.vendor).filter(Boolean)
        const uniqueVendors = [...new Set(vendors)]

        let recommendation = ''
        if (uniqueVendors.length === 1) {
          recommendation = `可能是重复记录，请检查是否为同一采样包的多次购买记录。如确实重复可合并，如为多次购买可添加版本号区分（如 V1/V2）。`
        } else {
          recommendation = `同名但来自不同供应商（${uniqueVendors.join('、')}），可能是不同版本或重名。建议在名称中添加供应商简称或年份区分，避免后续混淆。`
        }

        conflicts.push({
          sampleName: name,
          packIds,
          recommendation
        })
      }
    }

    return conflicts
  }

  generateConflictAlerts(conflicts: NameConflict[]): RiskAlert[] {
    return conflicts.map(conflict => ({
      id: uuidv4(),
      type: 'conflict',
      level: 'medium' as const,
      title: `同名采样包检测: ${conflict.sampleName}`,
      description: `发现 ${conflict.packIds.length} 个同名采样包记录，可能存在数据重复或混淆风险。`,
      actionableAdvice: [
        conflict.recommendation,
        '打开明细列表核对每个条目的购买日期和供应商',
        '确认是否为同一授权的多次续期'
      ],
      relatedEntityId: conflict.packIds[0],
      relatedEntityType: 'sample-pack' as const,
      createdAt: new Date().toISOString()
    }))
  }

  checkCommercialRestrictions(
    licenses: LicenseAgreement[],
    usages: SampleUsage[],
    tracks: TrackProject[],
    samplePacks: SamplePack[]
  ): RiskAlert[] {
    const alerts: RiskAlert[] = []
    const licenseMap = new Map(licenses.map(l => [l.samplePackId, l]))
    const trackMap = new Map(tracks.map(t => [t.id, t]))

    for (const usage of usages) {
      const license = licenseMap.get(usage.samplePackId)
      const track = trackMap.get(usage.trackProjectId)
      const samplePack = samplePacks.find(p => p.id === usage.samplePackId)

      if (!license || !track) continue

      const isReleased = track.status === 'released'
      const isCommercialProject = track.status === 'released' || track.releaseDate

      if (isCommercialProject && license.licenseType === 'non-commercial') {
        alerts.push({
          id: uuidv4(),
          type: 'restriction',
          level: 'critical',
          title: `商用限制违规: ${track.name}`,
          description: `曲目《${track.name}》${isReleased ? '已发行' : '计划发行'}，但使用的采样包「${samplePack?.name || '未知'}」仅获得非商用授权。`,
          actionableAdvice: [
            '立即将此曲目从所有发行平台下架',
            '联系供应商升级为商业授权',
            '评估替换采样或重新制作的成本',
            '如曲目收益较大，准备好与供应商谈判的预算'
          ],
          relatedEntityId: usage.id,
          relatedEntityType: 'usage',
          createdAt: new Date().toISOString()
        })
      }

      if (license.licenseType === 'non-commercial' && !isCommercialProject) {
        alerts.push({
          id: uuidv4(),
          type: 'restriction',
          level: 'medium',
          title: `非商用授权提醒: ${track.name}`,
          description: `曲目《${track.name}》目前使用非商用授权的采样，未来如计划商业发行需要提前升级授权。`,
          actionableAdvice: [
            '在项目备注中标记「非商用」状态',
            '发行前至少提前2周申请商业授权升级',
            '考虑一次性升级所有活跃项目的授权'
          ],
          relatedEntityId: usage.id,
          relatedEntityType: 'usage',
          createdAt: new Date().toISOString()
        })
      }
    }

    return alerts
  }

  checkAttributionRequirements(
    licenses: LicenseAgreement[],
    usages: SampleUsage[],
    tracks: TrackProject[],
    samplePacks: SamplePack[]
  ): RiskAlert[] {
    const alerts: RiskAlert[] = []
    const licenseMap = new Map(licenses.map(l => [l.samplePackId, l]))
    const trackMap = new Map(tracks.map(t => [t.id, t]))

    const tracksWithAttributionIssues = new Map<string, string[]>()

    for (const usage of usages) {
      const license = licenseMap.get(usage.samplePackId)
      const track = trackMap.get(usage.trackProjectId)
      const samplePack = samplePacks.find(p => p.id === usage.samplePackId)

      if (!license || !track || !samplePack) continue
      if (!license.attributionRequired) continue

      if (!tracksWithAttributionIssues.has(track.id)) {
        tracksWithAttributionIssues.set(track.id, [])
      }
      tracksWithAttributionIssues.get(track.id)!.push(samplePack.name)
    }

    for (const [trackId, packNames] of tracksWithAttributionIssues.entries()) {
      const track = trackMap.get(trackId)!
      alerts.push({
        id: uuidv4(),
        type: 'attribution',
        level: 'low',
        title: `需要署名: ${track.name}`,
        description: `曲目《${track.name}》使用了 ${packNames.length} 个需要署名的采样包`,
        actionableAdvice: [
          `涉及采样包: ${packNames.join('、')}`,
          '在专辑内页或发行描述中添加供应商署名',
          '检查每个采样包的具体署名要求',
          '可在制作备注中统一记录'
        ],
        relatedEntityId: trackId,
        relatedEntityType: 'track',
        createdAt: new Date().toISOString()
      })
    }

    return alerts
  }

  getExpiringLicensesList(
    licenses: LicenseAgreement[],
    samplePacks: SamplePack[]
  ): Array<{
    id: string
    samplePackName: string
    licenseName: string
    validUntil: string
    daysLeft: number
  }> {
    const packMap = new Map(samplePacks.map(p => [p.id, p]))
    const result: Array<{
      id: string
      samplePackName: string
      licenseName: string
      validUntil: string
      daysLeft: number
    }> = []

    for (const license of licenses) {
      if (license.isPerpetual || !license.validUntil) continue

      const validation = this.validateLicense(license, packMap.get(license.samplePackId)!)

      if (validation.expirationStatus !== 'perpetual' && validation.daysUntilExpiration !== undefined) {
        const samplePack = packMap.get(license.samplePackId)
        result.push({
          id: license.id,
          samplePackName: samplePack?.name || '未知采样包',
          licenseName: license.licenseName,
          validUntil: license.validUntil,
          daysLeft: validation.daysUntilExpiration
        })
      }
    }

    return result.sort((a, b) => a.daysLeft - b.daysLeft)
  }

  generateAllRisks(
    samplePacks: SamplePack[],
    licenses: LicenseAgreement[],
    tracks: TrackProject[],
    usages: SampleUsage[]
  ): RiskAlert[] {
    const alerts: RiskAlert[] = []

    alerts.push(...this.generateExpirationAlerts(licenses, samplePacks))

    const nameConflicts = this.detectNameConflicts(samplePacks)
    alerts.push(...this.generateConflictAlerts(nameConflicts))

    alerts.push(...this.checkCommercialRestrictions(licenses, usages, tracks, samplePacks))

    alerts.push(...this.checkAttributionRequirements(licenses, usages, tracks, samplePacks))

    return alerts.sort((a, b) => {
      const levelOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 }
      return levelOrder[a.level] - levelOrder[b.level]
    })
  }
}
