import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ChannelData,
  ConversionData,
  BudgetAllocationReport,
  BudgetAllocationDetail,
  AlertMessage,
  Material,
  BiddingRecord,
  DataConflict,
  ModificationTrace,
  BudgetPlaybackSnapshot,
  CurrencyUnit
} from '@/types'
import { convertCurrency } from '@/utils/currency'
import {
  validateChannelData,
  validateConversionData,
  detectDataConflicts,
  isBudgetExhausted,
  isConversionDelayed
} from '@/utils/validation'

const generateId = () => Math.random().toString(36).substring(2, 11)

export const useBudgetStore = defineStore('budget', () => {
  const channels = ref<ChannelData[]>([])
  const conversions = ref<ConversionData[]>([])
  const materials = ref<Material[]>([])
  const biddingRecords = ref<BiddingRecord[]>([])
  const allocationReports = ref<BudgetAllocationReport[]>([])
  const alerts = ref<AlertMessage[]>([])
  const dataConflicts = ref<DataConflict[]>([])
  const playbackSnapshots = ref<BudgetPlaybackSnapshot[]>([])
  const currentReportId = ref<string | null>(null)
  const defaultCurrency = ref<CurrencyUnit>('CNY')
  const currentUser = ref('分析师_001')

  const activeAlerts = computed(() => alerts.value.filter(a => !a.isRead))

  const currentReport = computed(() =>
    allocationReports.value.find(r => r.id === currentReportId.value) || null
  )

  const unresolvedConflicts = computed(() =>
    dataConflicts.value.filter(c => !c.resolved)
  )

  const exhaustedChannels = computed(() =>
    channels.value.filter(c => isBudgetExhausted(c))
  )

  const delayedConversions = computed(() =>
    conversions.value.filter(c => isConversionDelayed(c))
  )

  const duplicateMaterials = computed(() =>
    materials.value.filter(m => m.isDuplicate)
  )

  const supplementaryBiddingRecords = computed(() =>
    biddingRecords.value.filter(b => b.isSupplementary)
  )

  function addChannel(channel: Omit<ChannelData, 'id' | 'createdAt' | 'updatedAt' | 'remainingBudget'>) {
    const validation = validateChannelData(channel)
    if (!validation.valid) {
      throw new Error(`渠道数据校验失败: ${validation.errors.map(e => e.message).join('; ')}`)
    }

    const newChannel: ChannelData = {
      ...channel,
      id: generateId(),
      remainingBudget: channel.budget - channel.spentBudget,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    channels.value.push(newChannel)

    checkChannelBudget(newChannel)
    detectMaterialDuplicates()
    return newChannel
  }

  function updateChannel(id: string, updates: Partial<ChannelData>) {
    const index = channels.value.findIndex(c => c.id === id)
    if (index === -1) return

    const updatedChannel = { ...channels.value[index], ...updates }
    const validation = validateChannelData(updatedChannel)
    if (!validation.valid) {
      throw new Error(`渠道数据校验失败: ${validation.errors.map(e => e.message).join('; ')}`)
    }

    if (updates.budget !== undefined || updates.spentBudget !== undefined) {
      updatedChannel.remainingBudget = updatedChannel.budget - updatedChannel.spentBudget
    }

    updatedChannel.updatedAt = new Date().toISOString()
    channels.value[index] = updatedChannel

    checkChannelBudget(updatedChannel)
    detectMaterialDuplicates()
  }

  function addConversion(conversion: Omit<ConversionData, 'id'>) {
    const validation = validateConversionData(conversion)
    if (!validation.valid) {
      throw new Error(`转化数据校验失败: ${validation.errors.map(e => e.message).join('; ')}`)
    }

    const newConversion: ConversionData = {
      ...conversion,
      id: generateId()
    }

    conversions.value.push(newConversion)

    checkConversionDelay(newConversion)
    checkDataConflicts()

    if (newConversion.isSupplementary) {
      markAffectedAllocations(newConversion)
    }

    return newConversion
  }

  function addBiddingRecord(record: Omit<BiddingRecord, 'id'>) {
    const newRecord: BiddingRecord = {
      ...record,
      id: generateId()
    }

    biddingRecords.value.push(newRecord)

    if (newRecord.isSupplementary) {
      markSupplementaryImpact(newRecord)
    }

    return newRecord
  }

  function addMaterial(material: Omit<Material, 'id' | 'isDuplicate'>) {
    const newMaterial: Material = {
      ...material,
      id: generateId(),
      isDuplicate: false
    }

    materials.value.push(newMaterial)
    detectMaterialDuplicates()
    return newMaterial
  }

  function generateAllocationReport(totalBudget: number) {
    const validChannels = channels.value.filter(c => c.budget > 0)
    const totalWeight = validChannels.reduce((sum, c) => sum + (c.conversionRate / Math.max(c.cpc, 0.01)), 0)

    const details: BudgetAllocationDetail[] = validChannels.map(channel => {
      const weight = (channel.conversionRate / Math.max(channel.cpc, 0.01)) / totalWeight
      const allocatedBudget = totalBudget * weight
      const marginalRevenue = (channel.conversionRate * channel.cpc) > 0 ? (150 / channel.cpc) : 0

      return {
        id: generateId(),
        channelId: channel.id,
        channelName: channel.channelName,
        allocatedBudget,
        originalAllocatedBudget: allocatedBudget,
        marginalRevenue,
        originalMarginalRevenue: marginalRevenue,
        isMarginalRevenueModified: false,
        expectedConversions: allocatedBudget / Math.max(channel.cpc, 0.01) * channel.conversionRate,
        actualConversions: conversions.value
          .filter(c => c.channelId === channel.id && c.status !== 'REJECTED')
          .reduce((sum, c) => sum + c.conversionCount, 0),
        roi: marginalRevenue - 1,
        priority: 1,
        source: 'AUTO'
      }
    })

    const allocatedSum = details.reduce((sum, d) => sum + d.allocatedBudget, 0)
    const hasSupplementary = supplementaryBiddingRecords.value.length > 0

    const report: BudgetAllocationReport = {
      id: generateId(),
      reportDate: new Date().toISOString().split('T')[0],
      totalBudget,
      allocatedBudget: allocatedSum,
      remainingBudget: totalBudget - allocatedSum,
      details,
      createdAt: new Date().toISOString(),
      generatedBy: currentUser.value,
      hasManualModifications: false,
      hasSupplementaryRecords: hasSupplementary,
      modificationTraces: []
    }

    allocationReports.value.push(report)
    currentReportId.value = report.id

    createPlaybackSnapshot(report.id, '初始预算分配报告生成')

    return report
  }

  function modifyMarginalRevenue(detailId: string, newValue: number, reason: string) {
    const report = currentReport.value
    if (!report) return

    const detailIndex = report.details.findIndex(d => d.id === detailId)
    if (detailIndex === -1) return

    const detail = report.details[detailIndex]
    const oldValue = detail.marginalRevenue

    detail.marginalRevenue = newValue
    detail.isMarginalRevenueModified = true
    detail.modifiedAt = new Date().toISOString()
    detail.modifiedBy = currentUser.value
    detail.modificationReason = reason
    detail.roi = newValue - 1
    detail.source = 'MANUAL'

    const trace: ModificationTrace = {
      id: generateId(),
      fieldName: 'marginalRevenue',
      oldValue,
      newValue,
      modifiedAt: new Date().toISOString(),
      modifiedBy: currentUser.value,
      reason,
      affectedDetailIds: [detailId]
    }

    report.modificationTraces.push(trace)
    report.hasManualModifications = true

    const weightSum = report.details.reduce((sum, d) => sum + d.marginalRevenue, 0)
    report.details.forEach(d => {
      const newAllocated = (d.marginalRevenue / weightSum) * report.totalBudget
      d.allocatedBudget = newAllocated
      d.expectedConversions = newAllocated / Math.max(channels.value.find(c => c.id === d.channelId)?.cpc || 1, 0.01) * (channels.value.find(c => c.id === d.channelId)?.conversionRate || 0)
    })

    report.allocatedBudget = report.details.reduce((sum, d) => sum + d.allocatedBudget, 0)
    report.remainingBudget = report.totalBudget - report.allocatedBudget

    createPlaybackSnapshot(report.id, `手动修改边际收益: ${detail.channelName}`)

    addAlert({
      type: 'MANUAL_MODIFICATION',
      level: 'INFO',
      title: '边际收益已手动修改',
      message: `渠道「${detail.channelName}」的边际收益从 ${oldValue.toFixed(4)} 被修改为 ${newValue.toFixed(4)}，原因：${reason}`,
      relatedObjectId: detailId,
      relatedObjectName: detail.channelName,
      relatedObjectType: 'ALLOCATION'
    })
  }

  function createPlaybackSnapshot(reportId: string, description: string) {
    const report = allocationReports.value.find(r => r.id === reportId)
    if (!report) return

    const snapshot: BudgetPlaybackSnapshot = {
      id: generateId(),
      snapshotTime: new Date().toISOString(),
      reportId,
      state: JSON.parse(JSON.stringify(report)),
      description
    }

    playbackSnapshots.value.push(snapshot)
  }

  function checkChannelBudget(channel: ChannelData) {
    if (isBudgetExhausted(channel)) {
      addAlert({
        type: 'BUDGET_EXHAUSTED',
        level: 'ERROR',
        title: '渠道预算即将耗尽',
        message: `渠道「${channel.channelName}」剩余预算仅为 ${channel.remainingBudget.toFixed(2)} ${channel.currencyUnit}，占总预算 ${((channel.remainingBudget / Math.max(channel.budget, 1)) * 100).toFixed(2)}%，请及时补充预算`,
        relatedObjectId: channel.id,
        relatedObjectName: channel.channelName,
        relatedObjectType: 'CHANNEL',
        data: {
          remainingBudget: channel.remainingBudget,
          totalBudget: channel.budget,
          currencyUnit: channel.currencyUnit
        }
      })
    }
  }

  function checkConversionDelay(conversion: ConversionData) {
    if (isConversionDelayed(conversion)) {
      const channel = channels.value.find(c => c.id === conversion.channelId)
      const material = materials.value.find(m => m.id === conversion.materialId)
      addAlert({
        type: 'CONVERSION_DELAYED',
        level: 'WARNING',
        title: '转化数据延迟',
        message: `渠道「${channel?.channelName || '未知渠道'}」的素材「${material?.name || '未知素材'}」存在 ${conversion.delayDays} 天转化延迟，请关注数据准确性`,
        relatedObjectId: conversion.id,
        relatedObjectName: material?.name || '转化记录',
        relatedObjectType: 'CONVERSION',
        data: {
          delayDays: conversion.delayDays,
          channelId: conversion.channelId,
          materialId: conversion.materialId
        }
      })
    }
  }

  function detectMaterialDuplicates() {
    const hashMap = new Map<string, Material[]>()
    materials.value.forEach(m => {
      m.isDuplicate = false
      m.duplicateOf = undefined
      const existing = hashMap.get(m.hash) || []
      existing.push(m)
      hashMap.set(m.hash, existing)
    })

    hashMap.forEach((group, hash) => {
      if (group.length > 1) {
        const original = group[0]
        group.slice(1).forEach(duplicate => {
          duplicate.isDuplicate = true
          duplicate.duplicateOf = original.id

          const originalChannelNames = original.channelIds
            .map(id => channels.value.find(c => c.id === id)?.channelName)
            .filter(Boolean)
            .join('、')

          addAlert({
            type: 'DUPLICATE_MATERIAL',
            level: 'WARNING',
            title: '检测到重复素材',
            message: `素材「${duplicate.name}」与「${original.name}」内容重复，已在渠道「${originalChannelNames}」使用，请确认是否为同一素材或存在重复投放`,
            relatedObjectId: duplicate.id,
            relatedObjectName: duplicate.name,
            relatedObjectType: 'MATERIAL',
            data: {
              duplicateOf: original.id,
              duplicateName: original.name,
              hash
            }
          })
        })
      }
    })
  }

  function checkDataConflicts() {
    const conflicts = detectDataConflicts(channels.value, conversions.value)
    dataConflicts.value = [...dataConflicts.value, ...conflicts]

    conflicts.forEach(conflict => {
      const channel = channels.value.find(c => c.id === conflict.channelId)
      addAlert({
        type: 'DATA_CONFLICT',
        level: 'WARNING',
        title: '数据口径冲突',
        message: `渠道「${channel?.channelName || '未知渠道'}」的${conflict.fieldName === 'conversionValue' ? '转化价值' : '转化数量'}存在数据冲突：渠道数据显示 ${conflict.sourceA.value}${conflict.sourceA.unit || ''}，转化数据显示 ${conflict.sourceB.value}${conflict.sourceB.unit || ''}，差异超过阈值，请业务同事确认口径后再处理，系统不会自动修改数据`,
        relatedObjectId: conflict.id,
        relatedObjectName: channel?.channelName || '未知渠道',
        relatedObjectType: 'CHANNEL',
        data: conflict
      })
    })
  }

  function markAffectedAllocations(conversion: ConversionData) {
    allocationReports.value.forEach(report => {
      const affectedDetails = report.details.filter(d => d.channelId === conversion.channelId)
      conversion.affectedRecordIds.push(...affectedDetails.map(d => d.id))
    })
  }

  function markSupplementaryImpact(record: BiddingRecord) {
    allocationReports.value.forEach(report => {
      const affectedDetails = report.details.filter(d => d.channelId === record.channelId)
      record.affectedAllocationIds.push(...affectedDetails.map(d => d.id))

      affectedDetails.forEach(detail => {
        addAlert({
          type: 'MANUAL_MODIFICATION',
          level: 'INFO',
          title: '补算出价记录影响明细',
          message: `补录的出价记录已影响预算分配明细：渠道「${detail.channelName}」的分配计算，请在报告中查看影响范围`,
          relatedObjectId: detail.id,
          relatedObjectName: detail.channelName,
          relatedObjectType: 'ALLOCATION',
          data: {
            biddingRecordId: record.id,
            supplementaryAt: record.supplementaryAt
          }
        })
      })
    })
  }

  function addAlert(alert: Omit<AlertMessage, 'id' | 'timestamp' | 'isRead'>) {
    const newAlert: AlertMessage = {
      ...alert,
      id: generateId(),
      timestamp: new Date().toISOString(),
      isRead: false
    }
    alerts.value.unshift(newAlert)
  }

  function markAlertRead(id: string) {
    const alert = alerts.value.find(a => a.id === id)
    if (alert) {
      alert.isRead = true
    }
  }

  function markAllAlertsRead() {
    alerts.value.forEach(a => {
      a.isRead = true
    })
  }

  function resolveConflict(id: string, resolution: string) {
    const conflict = dataConflicts.value.find(c => c.id === id)
    if (conflict) {
      conflict.resolved = true
      conflict.resolution = resolution
      conflict.resolvedAt = new Date().toISOString()
    }
  }

  function getAffectedDetailsForSupplementaryRecord(recordId: string) {
    const record = biddingRecords.value.find(b => b.id === recordId)
    if (!record || !record.isSupplementary) return []

    const affected: { reportId: string; reportDate: string; detailId: string; channelName: string }[] = []

    allocationReports.value.forEach(report => {
      report.details.forEach(detail => {
        if (record.affectedAllocationIds.includes(detail.id)) {
          affected.push({
            reportId: report.id,
            reportDate: report.reportDate,
            detailId: detail.id,
            channelName: detail.channelName
          })
        }
      })
    })

    return affected
  }

  function getPlaybackHistory(reportId: string) {
    return playbackSnapshots.value
      .filter(s => s.reportId === reportId)
      .sort((a, b) => new Date(b.snapshotTime).getTime() - new Date(a.snapshotTime).getTime())
  }

  function convertAllToCurrency(targetUnit: CurrencyUnit) {
    channels.value = channels.value.map(channel => {
      if (channel.currencyUnit === targetUnit) return channel

      const rate = convertCurrency(1, channel.currencyUnit, targetUnit)
      return {
        ...channel,
        currencyUnit: targetUnit,
        budget: channel.budget * rate,
        spentBudget: channel.spentBudget * rate,
        remainingBudget: channel.remainingBudget * rate,
        dailyBudget: channel.dailyBudget * rate,
        cpc: channel.cpc * rate,
        cpm: channel.cpm * rate
      }
    })

    conversions.value = conversions.value.map(conv => {
      if (conv.currencyUnit === targetUnit) return conv

      const rate = convertCurrency(1, conv.currencyUnit, targetUnit)
      return {
        ...conv,
        currencyUnit: targetUnit,
        conversionValue: conv.conversionValue * rate,
        unitPrice: conv.unitPrice * rate
      }
    })

    biddingRecords.value = biddingRecords.value.map(record => {
      if (record.currencyUnit === targetUnit) return record

      const rate = convertCurrency(1, record.currencyUnit, targetUnit)
      return {
        ...record,
        currencyUnit: targetUnit,
        bidAmount: record.bidAmount * rate
      }
    })

    defaultCurrency.value = targetUnit
  }

  function loadMockData() {
    const mockChannels: ChannelData[] = [
      {
        id: generateId(),
        channelName: '百度搜索-品牌词',
        channelType: 'SEARCH',
        currencyUnit: 'CNY',
        budget: 50000,
        spentBudget: 48500,
        remainingBudget: 1500,
        dailyBudget: 2000,
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        materialIds: [],
        conversionRate: 0.085,
        cpc: 2.5,
        cpm: 15,
        impressions: 1250000,
        clicks: 45000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: generateId(),
        channelName: '抖音信息流-618活动',
        channelType: 'VIDEO',
        currencyUnit: 'CNY',
        budget: 80000,
        spentBudget: 62000,
        remainingBudget: 18000,
        dailyBudget: 3000,
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        materialIds: [],
        conversionRate: 0.032,
        cpc: 1.8,
        cpm: 25,
        impressions: 5000000,
        clicks: 120000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: generateId(),
        channelName: '微信朋友圈-新品推广',
        channelType: 'SOCIAL',
        currencyUnit: 'CNY',
        budget: 30000,
        spentBudget: 28000,
        remainingBudget: 2000,
        dailyBudget: 1200,
        startDate: '2026-06-01',
        endDate: '2026-06-25',
        materialIds: [],
        conversionRate: 0.045,
        cpc: 3.2,
        cpm: 40,
        impressions: 800000,
        clicks: 25000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: generateId(),
        channelName: '小红书种草-达人合作',
        channelType: 'SOCIAL',
        currencyUnit: 'CNY',
        budget: 25000,
        spentBudget: 12000,
        remainingBudget: 13000,
        dailyBudget: 1000,
        startDate: '2026-06-10',
        endDate: '2026-07-10',
        materialIds: [],
        conversionRate: 0.068,
        cpc: 4.5,
        cpm: 35,
        impressions: 500000,
        clicks: 8000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    const mockMaterials: Material[] = [
      {
        id: generateId(),
        name: '618主视觉banner',
        hash: 'abc123def456',
        channelIds: [mockChannels[1].id],
        isDuplicate: false,
        createdAt: new Date().toISOString()
      },
      {
        id: generateId(),
        name: '618主视觉banner-副本',
        hash: 'abc123def456',
        channelIds: [mockChannels[2].id],
        isDuplicate: false,
        createdAt: new Date().toISOString()
      },
      {
        id: generateId(),
        name: '新品实拍视频',
        hash: 'xyz789uvw012',
        channelIds: [mockChannels[3].id],
        isDuplicate: false,
        createdAt: new Date().toISOString()
      }
    ]

    mockChannels[0].materialIds = [mockMaterials[0].id]
    mockChannels[1].materialIds = [mockMaterials[1].id]
    mockChannels[2].materialIds = [mockMaterials[2].id]

    const mockConversions: ConversionData[] = [
      {
        id: generateId(),
        channelId: mockChannels[0].id,
        materialId: mockMaterials[0].id,
        conversionDate: '2026-06-15',
        attributionDate: '2026-06-16',
        conversionCount: 1250,
        conversionValue: 187500,
        delayDays: 1,
        status: 'CONFIRMED',
        unitPrice: 150,
        currencyUnit: 'CNY',
        isSupplementary: false,
        affectedRecordIds: []
      },
      {
        id: generateId(),
        channelId: mockChannels[1].id,
        materialId: mockMaterials[1].id,
        conversionDate: '2026-06-10',
        attributionDate: '2026-06-20',
        conversionCount: 850,
        conversionValue: 127500,
        delayDays: 10,
        status: 'DELAYED',
        unitPrice: 150,
        currencyUnit: 'CNY',
        isSupplementary: false,
        affectedRecordIds: []
      },
      {
        id: generateId(),
        channelId: mockChannels[2].id,
        materialId: mockMaterials[2].id,
        conversionDate: '2026-06-05',
        attributionDate: '2026-06-06',
        conversionCount: 420,
        conversionValue: 63000,
        delayDays: 1,
        status: 'CONFIRMED',
        unitPrice: 150,
        currencyUnit: 'CNY',
        isSupplementary: true,
        supplementaryAt: new Date().toISOString(),
        affectedRecordIds: []
      }
    ]

    const mockBiddingRecords: BiddingRecord[] = [
      {
        id: generateId(),
        channelId: mockChannels[0].id,
        materialId: mockMaterials[0].id,
        bidAmount: 3.0,
        bidTime: '2026-06-15T10:30:00Z',
        isSupplementary: false,
        affectedAllocationIds: [],
        currencyUnit: 'CNY'
      },
      {
        id: generateId(),
        channelId: mockChannels[1].id,
        materialId: mockMaterials[1].id,
        bidAmount: 2.0,
        bidTime: '2026-06-12T14:20:00Z',
        isSupplementary: true,
        supplementaryAt: new Date().toISOString(),
        affectedAllocationIds: [],
        currencyUnit: 'CNY'
      }
    ]

    channels.value = mockChannels
    materials.value = mockMaterials
    conversions.value = mockConversions
    biddingRecords.value = mockBiddingRecords

    detectMaterialDuplicates()
    checkDataConflicts()
  }

  return {
    channels,
    conversions,
    materials,
    biddingRecords,
    allocationReports,
    alerts,
    dataConflicts,
    playbackSnapshots,
    currentReportId,
    defaultCurrency,
    currentUser,
    activeAlerts,
    currentReport,
    unresolvedConflicts,
    exhaustedChannels,
    delayedConversions,
    duplicateMaterials,
    supplementaryBiddingRecords,
    addChannel,
    updateChannel,
    addConversion,
    addBiddingRecord,
    addMaterial,
    generateAllocationReport,
    modifyMarginalRevenue,
    createPlaybackSnapshot,
    addAlert,
    markAlertRead,
    markAllAlertsRead,
    resolveConflict,
    getAffectedDetailsForSupplementaryRecord,
    getPlaybackHistory,
    convertAllToCurrency,
    loadMockData
  }
})
