import type { WarehouseLocation, ReviewComment, TimelineRecord, DescriptionTexts } from '@/types'

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    normal: '正常',
    warning: '预警',
    danger: '危险',
  }
  return map[status] || status
}

function generateAnnotation(
  location: WarehouseLocation,
  comments: ReviewComment[],
  timeline: TimelineRecord[]
): string {
  const usagePercent = ((location.used / location.capacity) * 100).toFixed(1)
  const statusText = getStatusText(location.status)
  const hasBadComments = comments.some(c => c.isIncomplete)
  const hasTimelineGaps = timeline.some(t => t.hasGap)

  let text = `${location.code}｜${location.hazardClass || '未分类'}｜使用率${usagePercent}%｜${statusText}`

  if (hasBadComments || hasTimelineGaps) {
    const issues: string[] = []
    if (hasBadComments) issues.push('批注不齐')
    if (hasTimelineGaps) issues.push('时间缺段')
    text += `｜⚠️${issues.join('+')}`
  }

  return text
}

function generateSideDetail(
  location: WarehouseLocation,
  comments: ReviewComment[],
  timeline: TimelineRecord[]
): string {
  const usagePercent = ((location.used / location.capacity) * 100).toFixed(1)
  const statusText = getStatusText(location.status)
  const latestComment = comments[0]
  const timelineToday = timeline.filter(t => t.date === '2026-06-10')
  const hasGaps = timelineToday.some(t => t.hasGap)
  const totalGapHours = timelineToday.reduce((sum, t) => sum + t.gapDuration, 0)

  let detail = `【库位信息】
编码：${location.code}
库区：${location.area}
危险等级：${location.hazardClass || '未分类'}
状态：${statusText}

【空间数据】
容量：${location.capacity} 立方米
已用：${location.used} 立方米
使用率：${usagePercent}%

【评审批注】
`
  if (comments.length > 0 && latestComment) {
    if (latestComment.isIncomplete) {
      detail += `⚠️ 批注不齐整
原始来源：${latestComment.originalSource}
缺失字段：${latestComment.missingFields.join('、')}
原始内容："${latestComment.content || '(空)'}"
`
    } else {
      detail += `评审人：${latestComment.reviewer}
日期：${latestComment.createdAt}
内容：${latestComment.content}
`
    }
  } else {
    detail += '暂无评审批注\n'
  }

  detail += `\n【时间轴记录】
`
  if (timelineToday.length > 0) {
    if (hasGaps) {
      detail += `⚠️ 存在时间缺段，累计缺段 ${totalGapHours} 小时\n`
      timelineToday.forEach(t => {
        detail += `${t.startTime}-${t.endTime} ${t.operator}${t.hasGap ? ' 【缺段】' : ''}\n`
      })
    } else {
      detail += `当日记录完整，共 ${timelineToday.length} 条记录\n`
      timelineToday.forEach(t => {
        detail += `${t.startTime}-${t.endTime} ${t.operator}\n`
      })
    }
  } else {
    detail += '当日暂无时间轴记录\n'
  }

  return detail
}

function generateScreenshotCaption(
  location: WarehouseLocation,
  comments: ReviewComment[],
  timeline: TimelineRecord[],
  viewType: string
): string {
  const usagePercent = ((location.used / location.capacity) * 100).toFixed(1)
  const statusText = getStatusText(location.status)
  const hasBadComments = comments.some(c => c.isIncomplete)
  const hasTimelineGaps = timeline.some(t => t.hasGap)
  const viewMap: Record<string, string> = {
    byArea: '按库区视角',
    byHazard: '按危险品等级视角',
    byTimeline: '按时间轴视角',
  }

  let caption = `【码头危险品库空间复核 - ${viewMap[viewType] || viewType}】\n`
  caption += `库位：${location.code} | 危险等级：${location.hazardClass || '未分类'}\n`
  caption += `空间使用率：${usagePercent}%（${location.used}/${location.capacity} m³）| 状态：${statusText}\n`

  if (hasBadComments || hasTimelineGaps) {
    caption += '【异常提示】'
    if (hasBadComments) caption += '评审批注不齐；'
    if (hasTimelineGaps) {
      const totalGap = timeline.reduce((sum, t) => sum + t.gapDuration, 0)
      caption += `时间轴缺段${totalGap}小时；`
    }
    caption += '\n详见坏数据专区。\n'
  } else {
    caption += '【复核结论】数据完整，状态正常。\n'
  }

  caption += `\n导出时间：${new Date().toLocaleString('zh-CN')}`

  return caption
}

export function generateDescriptions(
  location: WarehouseLocation | null,
  comments: ReviewComment[],
  timeline: TimelineRecord[],
  viewType: string
): DescriptionTexts {
  if (!location) {
    return {
      annotation: '请选择一个库位查看详情',
      sideDetail: '请从左侧库区场景图中选择一个库位，查看详细信息、评审批注和时间轴记录。',
      screenshotCaption: '【码头危险品库空间复核】\n未选择库位\n请在场景图中点击库位后再导出。',
    }
  }

  return {
    annotation: generateAnnotation(location, comments, timeline),
    sideDetail: generateSideDetail(location, comments, timeline),
    screenshotCaption: generateScreenshotCaption(location, comments, timeline, viewType),
  }
}
