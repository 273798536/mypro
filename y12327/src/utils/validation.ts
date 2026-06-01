import type { ChannelData, ConversionData, DataConflict } from '@/types'

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
  value?: any
  expected?: any
}

export function validateChannelData(channel: Partial<ChannelData>): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  if (channel.channelName?.trim() === '') {
    errors.push({
      field: 'channelName',
      message: '渠道名称不能为空',
      code: 'CHANNEL_NAME_EMPTY'
    })
  }

  if (channel.budget !== undefined) {
    if (channel.budget < 0) {
      errors.push({
        field: 'budget',
        message: '总预算不能为负数',
        code: 'BUDGET_NEGATIVE',
        value: channel.budget
      })
    }
    if (channel.budget === 0) {
      warnings.push({
        field: 'budget',
        message: '总预算为0，请确认是否正确',
        code: 'BUDGET_ZERO',
        value: channel.budget
      })
    }
  }

  if (channel.spentBudget !== undefined && channel.budget !== undefined) {
    if (channel.spentBudget > channel.budget) {
      errors.push({
        field: 'spentBudget',
        message: '已花费预算不能超过总预算',
        code: 'SPENT_EXCEEDS_BUDGET',
        value: channel.spentBudget,
        expected: channel.budget
      })
    }
    const remainingRatio = (channel.budget - channel.spentBudget) / channel.budget
    if (remainingRatio < 0.1 && channel.budget > 0) {
      warnings.push({
        field: 'remainingBudget',
        message: '剩余预算不足10%，请注意预算耗尽风险',
        code: 'BUDGET_ALMOST_EXHAUSTED',
        value: remainingRatio
      })
    }
  }

  if (channel.dailyBudget !== undefined && channel.budget !== undefined) {
    const days = getDaysBetween(channel.startDate, channel.endDate)
    if (days > 0 && channel.dailyBudget * days > channel.budget * 1.1) {
      warnings.push({
        field: 'dailyBudget',
        message: '日预算总额超出总预算10%以上，请检查日期范围或日预算设置',
        code: 'DAILY_BUDGET_OVERRUN',
        value: channel.dailyBudget * days,
        expected: channel.budget
      })
    }
  }

  if (channel.conversionRate !== undefined) {
    if (channel.conversionRate < 0 || channel.conversionRate > 1) {
      errors.push({
        field: 'conversionRate',
        message: '转化率应在0-1之间',
        code: 'CONVERSION_RATE_INVALID',
        value: channel.conversionRate
      })
    }
  }

  if (channel.cpc !== undefined && channel.cpc < 0) {
    errors.push({
      field: 'cpc',
      message: 'CPC不能为负数',
      code: 'CPC_NEGATIVE',
      value: channel.cpc
    })
  }

  if (channel.cpm !== undefined && channel.cpm < 0) {
    errors.push({
      field: 'cpm',
      message: 'CPM不能为负数',
      code: 'CPM_NEGATIVE',
      value: channel.cpm
    })
  }

  if (channel.startDate && channel.endDate) {
    if (new Date(channel.startDate) > new Date(channel.endDate)) {
      errors.push({
        field: 'dateRange',
        message: '开始日期不能晚于结束日期',
        code: 'DATE_RANGE_INVALID',
        value: `${channel.startDate} ~ ${channel.endDate}`
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

export function validateConversionData(conversion: Partial<ConversionData>): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  if (conversion.conversionCount !== undefined && conversion.conversionCount < 0) {
    errors.push({
      field: 'conversionCount',
      message: '转化数量不能为负数',
      code: 'CONVERSION_COUNT_NEGATIVE',
      value: conversion.conversionCount
    })
  }

  if (conversion.conversionValue !== undefined && conversion.conversionValue < 0) {
    errors.push({
      field: 'conversionValue',
      message: '转化价值不能为负数',
      code: 'CONVERSION_VALUE_NEGATIVE',
      value: conversion.conversionValue
    })
  }

  if (conversion.delayDays !== undefined) {
    if (conversion.delayDays < 0) {
      errors.push({
        field: 'delayDays',
        message: '延迟天数不能为负数',
        code: 'DELAY_DAYS_NEGATIVE',
        value: conversion.delayDays
      })
    }
    if (conversion.delayDays > 30) {
      warnings.push({
        field: 'delayDays',
        message: '转化延迟超过30天，请确认数据准确性',
        code: 'DELAY_TOO_LONG',
        value: conversion.delayDays
      })
    }
  }

  if (conversion.conversionDate && conversion.attributionDate) {
    const convDate = new Date(conversion.conversionDate)
    const attrDate = new Date(conversion.attributionDate)
    if (convDate > attrDate) {
      errors.push({
        field: 'attributionDate',
        message: '归因日期不能早于转化发生日期',
        code: 'ATTRIBUTION_DATE_INVALID',
        value: conversion.attributionDate
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

export function detectDataConflicts(
  channelDataList: ChannelData[],
  conversionDataList: ConversionData[]
): DataConflict[] {
  const conflicts: DataConflict[] = []

  channelDataList.forEach(channel => {
    const channelConversions = conversionDataList.filter(c => c.channelId === channel.id)

    const totalConversionValue = channelConversions
      .filter(c => c.status !== 'REJECTED')
      .reduce((sum, c) => sum + c.conversionValue, 0)

    const expectedValue = channel.clicks * channel.conversionRate * (channelConversions[0]?.unitPrice || 0)

    const diffRatio = Math.abs(totalConversionValue - expectedValue) / Math.max(expectedValue, 1)
    if (diffRatio > 0.15) {
      conflicts.push({
        id: `conflict-${channel.id}-value`,
        fieldName: 'conversionValue',
        sourceA: {
          source: '渠道数据',
          value: expectedValue,
          unit: channel.currencyUnit
        },
        sourceB: {
          source: '转化数据',
          value: totalConversionValue,
          unit: channel.currencyUnit
        },
        channelId: channel.id,
        detectedAt: new Date().toISOString(),
        resolved: false
      })
    }

    const totalConversionCount = channelConversions
      .filter(c => c.status !== 'REJECTED')
      .reduce((sum, c) => sum + c.conversionCount, 0)

    const expectedCount = channel.clicks * channel.conversionRate
    const countDiffRatio = Math.abs(totalConversionCount - expectedCount) / Math.max(expectedCount, 1)
    if (countDiffRatio > 0.1) {
      conflicts.push({
        id: `conflict-${channel.id}-count`,
        fieldName: 'conversionCount',
        sourceA: {
          source: '渠道数据',
          value: expectedCount
        },
        sourceB: {
          source: '转化数据',
          value: totalConversionCount
        },
        channelId: channel.id,
        detectedAt: new Date().toISOString(),
        resolved: false
      })
    }
  })

  return conflicts
}

function getDaysBetween(startDate?: string, endDate?: string): number {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

export function isBudgetExhausted(channel: ChannelData, threshold: number = 0.05): boolean {
  if (channel.budget === 0) return true
  return channel.remainingBudget / channel.budget < threshold
}

export function isConversionDelayed(conversion: ConversionData, threshold: number = 7): boolean {
  return conversion.delayDays > threshold
}
