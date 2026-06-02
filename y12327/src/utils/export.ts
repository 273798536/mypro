import * as XLSX from 'xlsx'
import type { BudgetAllocationReport, BudgetAllocationDetail, ModificationTrace, ChannelData, ConversionData, BiddingRecord } from '@/types'
import { formatCurrencyWithUnit } from './currency'
import dayjs from 'dayjs'

export interface ExportOptions {
  includeModificationTraces?: boolean
  includeSupplementaryMarks?: boolean
  includeRawData?: boolean
}

export function exportAllocationReport(
  report: BudgetAllocationReport,
  channels: ChannelData[],
  conversions: ConversionData[],
  biddingRecords: BiddingRecord[],
  options: ExportOptions = {}
) {
  const {
    includeModificationTraces = true,
    includeSupplementaryMarks = true,
    includeRawData = true
  } = options

  const wb = XLSX.utils.book_new()

  const summaryData = generateSummarySheet(report)
  const summaryWs = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, summaryWs, '预算分配汇总')

  const detailData = generateDetailSheet(report.details, includeModificationTraces)
  const detailWs = XLSX.utils.json_to_sheet(detailData)
  XLSX.utils.book_append_sheet(wb, detailWs, '分配明细')

  if (includeModificationTraces && report.modificationTraces.length > 0) {
    const traceData = generateModificationTraceSheet(report.modificationTraces)
    const traceWs = XLSX.utils.json_to_sheet(traceData)
    XLSX.utils.book_append_sheet(wb, traceWs, '人工修改痕迹')
  }

  if (includeSupplementaryMarks) {
    const supplementaryData = generateSupplementaryMarkSheet(report, conversions, biddingRecords)
    if (supplementaryData.length > 0) {
      const suppWs = XLSX.utils.json_to_sheet(supplementaryData)
      XLSX.utils.book_append_sheet(wb, suppWs, '补录记录影响')
    }
  }

  if (includeRawData) {
    const channelData = generateChannelSheet(channels)
    const channelWs = XLSX.utils.json_to_sheet(channelData)
    XLSX.utils.book_append_sheet(wb, channelWs, '渠道原始数据')

    const conversionData = generateConversionSheet(conversions)
    const conversionWs = XLSX.utils.json_to_sheet(conversionData)
    XLSX.utils.book_append_sheet(wb, conversionWs, '转化原始数据')
  }

  const fileName = `竞价广告预算分配报告_${report.reportDate}_${dayjs().format('HHmmss')}.xlsx`
  XLSX.writeFile(wb, fileName)
}

function generateSummarySheet(report: BudgetAllocationReport) {
  return [
    {
      '项目': '报告日期',
      '内容': report.reportDate,
      '备注': ''
    },
    {
      '项目': '生成时间',
      '内容': dayjs(report.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      '备注': ''
    },
    {
      '项目': '生成人',
      '内容': report.generatedBy,
      '备注': ''
    },
    {
      '项目': '总预算',
      '内容': formatCurrencyWithUnit(report.totalBudget, 'CNY'),
      '备注': ''
    },
    {
      '项目': '已分配预算',
      '内容': formatCurrencyWithUnit(report.allocatedBudget, 'CNY'),
      '备注': ''
    },
    {
      '项目': '剩余预算',
      '内容': formatCurrencyWithUnit(report.remainingBudget, 'CNY'),
      '备注': ''
    },
    {
      '项目': '是否有手动修改',
      '内容': report.hasManualModifications ? '是' : '否',
      '备注': report.hasManualModifications ? '详见「人工修改痕迹」工作表' : ''
    },
    {
      '项目': '是否包含补录数据',
      '内容': report.hasSupplementaryRecords ? '是' : '否',
      '备注': report.hasSupplementaryRecords ? '详见「补录记录影响」工作表' : ''
    },
    {
      '项目': '修改次数',
      '内容': report.modificationTraces.length,
      '备注': ''
    }
  ]
}

function generateDetailSheet(details: BudgetAllocationDetail[], includeModificationTraces: boolean) {
  return details.map((detail, index) => {
    const row: Record<string, any> = {
      '序号': index + 1,
      '渠道名称': detail.channelName,
      '分配预算': formatCurrencyWithUnit(detail.allocatedBudget, 'CNY'),
      '原始分配预算': includeModificationTraces ? formatCurrencyWithUnit(detail.originalAllocatedBudget, 'CNY') : undefined,
      '预算差异': includeModificationTraces ? formatCurrencyWithUnit(detail.allocatedBudget - detail.originalAllocatedBudget, 'CNY') : undefined,
      '边际收益': detail.marginalRevenue.toFixed(4),
      '原始边际收益': includeModificationTraces ? detail.originalMarginalRevenue.toFixed(4) : undefined,
      '是否手动修改': detail.isMarginalRevenueModified ? '是' : '否',
      '修改原因': detail.modificationReason || '',
      '修改人': detail.modifiedBy || '',
      '修改时间': detail.modifiedAt ? dayjs(detail.modifiedAt).format('YYYY-MM-DD HH:mm:ss') : '',
      '预期转化数': detail.expectedConversions.toFixed(2),
      '实际转化数': detail.actualConversions,
      '投资回报率(ROI)': `${(detail.roi * 100).toFixed(2)}%`,
      '优先级': detail.priority,
      '数据来源': detail.source === 'AUTO' ? '系统自动' : detail.source === 'MANUAL' ? '人工调整' : '补录数据'
    }

    if (!includeModificationTraces) {
      delete row['原始分配预算']
      delete row['预算差异']
      delete row['原始边际收益']
    }

    return row
  })
}

function generateModificationTraceSheet(traces: ModificationTrace[]) {
  return traces.map((trace, index) => ({
    '序号': index + 1,
    '修改字段': trace.fieldName === 'marginalRevenue' ? '边际收益' : trace.fieldName,
    '修改前值': trace.oldValue.toFixed(4),
    '修改后值': trace.newValue.toFixed(4),
    '变动幅度': `${(((trace.newValue - trace.oldValue) / Math.abs(trace.oldValue)) * 100).toFixed(2)}%`,
    '修改原因': trace.reason,
    '修改人': trace.modifiedBy,
    '修改时间': dayjs(trace.modifiedAt).format('YYYY-MM-DD HH:mm:ss'),
    '影响分配明细ID': trace.affectedDetailIds.join(', ')
  }))
}

function generateSupplementaryMarkSheet(report: BudgetAllocationReport, conversions: ConversionData[], biddingRecords: BiddingRecord[]) {
  const rows: Record<string, any>[] = []
  let index = 1

  const supplementaryConversions = conversions.filter(c => c.isSupplementary)
  supplementaryConversions.forEach(conv => {
    const affectedDetails = report.details.filter(d =>
      conv.affectedRecordIds.includes(d.id)
    )

    rows.push({
      '序号': index++,
      '补录类型': '转化数据',
      '补录记录ID': conv.id,
      '渠道名称': report.details.find(d => d.channelId === conv.channelId)?.channelName || '-',
      '转化日期': conv.conversionDate,
      '归因日期': conv.attributionDate,
      '转化数量': conv.conversionCount,
      '转化价值': formatCurrencyWithUnit(conv.conversionValue, conv.currencyUnit),
      '出价金额': '-',
      '延迟天数': conv.delayDays,
      '补录时间': conv.supplementaryAt ? dayjs(conv.supplementaryAt).format('YYYY-MM-DD HH:mm:ss') : '',
      '备注': conv.remark || '',
      '影响分配明细': affectedDetails.map(d => d.channelName).join('、'),
      '影响明细数量': affectedDetails.length
    })
  })

  const supplementaryBiddings = biddingRecords.filter(b => b.isSupplementary)
  supplementaryBiddings.forEach(record => {
    const affectedDetails = report.details.filter(d =>
      record.affectedAllocationIds.includes(d.id)
    )

    rows.push({
      '序号': index++,
      '补录类型': '出价记录',
      '补录记录ID': record.id,
      '渠道名称': report.details.find(d => d.channelId === record.channelId)?.channelName || '-',
      '转化日期': '-',
      '归因日期': '-',
      '转化数量': '-',
      '转化价值': '-',
      '出价金额': formatCurrencyWithUnit(record.bidAmount, record.currencyUnit),
      '延迟天数': '-',
      '补录时间': record.supplementaryAt ? dayjs(record.supplementaryAt).format('YYYY-MM-DD HH:mm:ss') : '',
      '备注': record.remark || '',
      '影响分配明细': affectedDetails.map(d => d.channelName).join('、'),
      '影响明细数量': affectedDetails.length
    })
  })

  return rows
}

function generateChannelSheet(channels: ChannelData[]) {
  return channels.map((channel, index) => ({
    '序号': index + 1,
    '渠道名称': channel.channelName,
    '渠道类型': getChannelTypeLabel(channel.channelType),
    '总预算': formatCurrencyWithUnit(channel.budget, channel.currencyUnit),
    '已花费': formatCurrencyWithUnit(channel.spentBudget, channel.currencyUnit),
    '剩余预算': formatCurrencyWithUnit(channel.remainingBudget, channel.currencyUnit),
    '日预算': formatCurrencyWithUnit(channel.dailyBudget, channel.currencyUnit),
    '开始日期': channel.startDate,
    '结束日期': channel.endDate,
    '转化率': `${(channel.conversionRate * 100).toFixed(2)}%`,
    'CPC': formatCurrencyWithUnit(channel.cpc, channel.currencyUnit),
    'CPM': formatCurrencyWithUnit(channel.cpm, channel.currencyUnit),
    '曝光量': channel.impressions.toLocaleString(),
    '点击量': channel.clicks.toLocaleString()
  }))
}

function generateConversionSheet(conversions: ConversionData[]) {
  return conversions.map((conv, index) => ({
    '序号': index + 1,
    '记录ID': conv.id,
    '转化日期': conv.conversionDate,
    '归因日期': conv.attributionDate,
    '转化数量': conv.conversionCount,
    '转化价值': formatCurrencyWithUnit(conv.conversionValue, conv.currencyUnit),
    '单价': formatCurrencyWithUnit(conv.unitPrice, conv.currencyUnit),
    '延迟天数': conv.delayDays,
    '状态': getConversionStatusLabel(conv.status),
    '是否补录': conv.isSupplementary ? '是' : '否',
    '补录时间': conv.supplementaryAt ? dayjs(conv.supplementaryAt).format('YYYY-MM-DD HH:mm:ss') : '',
    '备注': conv.remark || ''
  }))
}

function getChannelTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    SEARCH: '搜索广告',
    DISPLAY: '展示广告',
    SOCIAL: '社交广告',
    VIDEO: '视频广告',
    APP: '应用推广'
  }
  return labels[type] || type
}

function getConversionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: '待确认',
    CONFIRMED: '已确认',
    REJECTED: '已拒绝',
    DELAYED: '延迟归因'
  }
  return labels[status] || status
}
