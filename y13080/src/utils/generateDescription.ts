import type { WarehouseLocation, ReviewComment, TimelineRecord, DescriptionTexts, ViewType } from '@/types'

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    normal: '正常',
    warning: '预警',
    danger: '危险',
  }
  return map[status] || status
}

function countTodayGaps(timeline: TimelineRecord[]): { count: number; hours: number } {
  const today = timeline.filter(t => t.date === '2026-06-10' && t.hasGap)
  return {
    count: today.length,
    hours: today.reduce((s, t) => s + t.gapDuration, 0),
  }
}

function countIncompleteComments(comments: ReviewComment[]): number {
  return comments.filter(c => c.isIncomplete).length
}

function generateAnnotation(
  location: WarehouseLocation,
  comments: ReviewComment[],
  timeline: TimelineRecord[],
  viewType: ViewType
): string {
  const usagePercent = ((location.used / location.capacity) * 100).toFixed(1)
  const statusText = getStatusText(location.status)
  const badCmts = countIncompleteComments(comments)
  const { count: gapCount, hours: gapHours } = countTodayGaps(timeline)

  const base: Record<ViewType, string> = {
    byArea: `${location.code}｜${location.area}｜${location.hazardClass || '未分类'}｜使用率${usagePercent}%｜${statusText}`,
    byHazard: `${location.hazardClass || '未分类'}｜${location.code}｜${location.area}｜使用率${usagePercent}%｜${statusText}`,
    byTimeline: `${location.code}｜${timeline.length > 0 ? '有记录' : '无记录'}｜缺段${gapCount}条/${gapHours.toFixed(1)}h｜${statusText}`,
  }

  const tag: string[] = []
  if (badCmts > 0) tag.push(`批注不齐×${badCmts}`)
  if (gapCount > 0) tag.push(`时间缺段${gapHours.toFixed(1)}h`)
  if (tag.length > 0) return `${base[viewType]}｜⚠️${tag.join('；')}`
  return base[viewType]
}

function generateSideDetail(
  location: WarehouseLocation,
  comments: ReviewComment[],
  timeline: TimelineRecord[],
  viewType: ViewType
): string {
  const usagePercent = ((location.used / location.capacity) * 100).toFixed(1)
  const statusText = getStatusText(location.status)
  const sortedCmts = [...comments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const latestComment = sortedCmts[0]
  const timelineToday = timeline.filter(t => t.date === '2026-06-10')
  const hasGaps = timelineToday.some(t => t.hasGap)
  const totalGapHours = timelineToday.reduce((sum, t) => sum + t.gapDuration, 0)
  const badCmts = countIncompleteComments(comments)

  const viewHeader = {
    byArea: `【复核视角：按库区】\n分组依据：${location.area}\n`,
    byHazard: `【复核视角：按危险等级】\n分组依据：危险等级 ${location.hazardClass || '未分类'}\n`,
    byTimeline: `【复核视角：按时间轴】\n分组依据：${hasGaps ? '⚠️时间轴缺段' : '记录完整'}，累计缺段 ${totalGapHours} 小时\n`,
  }[viewType]

  let detail = viewHeader
  detail += `
【库位信息】
编码：${location.code}
库区：${location.area}
危险等级：${location.hazardClass || '未分类'}
状态：${statusText}

【空间数据】
容量：${location.capacity} 立方米
已用：${location.used} 立方米
使用率：${usagePercent}%

【评审批注】（共 ${comments.length} 条${badCmts ? `，不齐 ${badCmts} 条` : ''}）
`
  if (sortedCmts.length > 0) {
    sortedCmts.forEach((c, idx) => {
      detail += `\n--- 第 ${idx + 1} 条 ---\n`
      if (c.isIncomplete) {
        detail += `⚠️ 批注不齐整
原始来源：${c.originalSource}
缺失字段：${c.missingFields.join('、')}
原始内容："${c.content || '(空)'}"
评审人：${c.reviewer || '(空)'}
日期：${c.createdAt}
`
      } else {
        detail += `评审人：${c.reviewer}
日期：${c.createdAt}
内容：${c.content}
`
      }
    })
  } else {
    detail += '暂无评审批注\n'
  }

  detail += `\n【时间轴记录】（${timelineToday.length > 0 ? '共 ' + timelineToday.length + ' 条' : '当日无记录'}${hasGaps ? '，缺段累计 ' + totalGapHours + ' 小时' : ''}）\n`
  if (timelineToday.length > 0) {
    timelineToday.forEach(t => {
      detail += `${t.startTime}-${t.endTime} ${t.operator}${t.hasGap ? ' ⚠️缺段' : ''}\n`
      if (t.hasGap) detail += `   └ ${t.gapDescription}\n`
    })
  }

  return detail
}

function generateScreenshotCaption(
  location: WarehouseLocation,
  comments: ReviewComment[],
  timeline: TimelineRecord[],
  viewType: ViewType
): string {
  const usagePercent = ((location.used / location.capacity) * 100).toFixed(1)
  const statusText = getStatusText(location.status)
  const badCmts = countIncompleteComments(comments)
  const { count: gapCount, hours: gapHours } = countTodayGaps(timeline)
  const totalRecords = timeline.length

  const viewMeta: Record<ViewType, string> = {
    byArea: `【码头危险品库空间复核 - 按库区视角】
分组维度：库区（${location.area}），按库位编码排序
`,
    byHazard: `【码头危险品库空间复核 - 按危险等级视角】
分组维度：危险品等级（${location.hazardClass || '未分类'}），按 1-9 类排序；1/2/7 类高风险红标提示
`,
    byTimeline: `【码头危险品库空间复核 - 按时间轴视角】
分组维度：时间轴连续性；缺段按缺段时长降序，完整记录按库位编码排序
`,
  }

  let caption = viewMeta[viewType]
  caption += `\n┌───────── 当前库位 ─────────\n`
  caption += `│ 库位编码：${location.code}（${location.area}）\n`
  caption += `│ 危险等级：${location.hazardClass || '未分类'}    状态：${statusText}\n`
  caption += `│ 空间使用率：${usagePercent}%（${location.used}/${location.capacity} m³）\n`
  caption += `└────────────────────────────\n`

  caption += `\n【数据完整性检查】\n`
  const issues: string[] = []
  if (badCmts > 0) issues.push(`评审批注不齐 ${badCmts} 条 / 共 ${comments.length} 条`)
  else issues.push(`评审批注完整（${comments.length} 条）`)
  if (gapCount > 0) issues.push(`时间轴缺段 ${gapCount} 条 / 累计 ${gapHours.toFixed(1)} 小时 / 共 ${totalRecords} 条记录`)
  else if (totalRecords > 0) issues.push(`时间轴连续（共 ${totalRecords} 条记录）`)
  else issues.push('时间轴：当日无记录')
  issues.forEach(i => { caption += `  • ${i}\n` })

  if (badCmts + gapCount > 0) {
    caption += `\n【异常处理建议】\n`
    if (badCmts > 0) caption += `  → 评审批注：进入坏数据专区核对原始文件，补录缺失字段后再进入复核\n`
    if (gapCount > 0) caption += `  → 时间缺段：联系作业班组补录对应时段记录或说明原因；缺段>4小时不得进入正常结果\n`
    caption += `  ※ 坏数据已单独拎出，不会混入正常复核统计\n`
  } else {
    caption += `\n【复核结论】数据完整，状态正常，可进入下一步审批。\n`
  }

  caption += `\n数据来源：码头危险品库管理系统 / 评审批注表 / 作业记录表\n`
  caption += `导出时间：${new Date().toLocaleString('zh-CN')}（${viewType}）`

  return caption
}

export function generateDescriptions(
  location: WarehouseLocation | null,
  comments: ReviewComment[],
  timeline: TimelineRecord[],
  viewType: ViewType
): DescriptionTexts {
  if (!location) {
    const tip = '请从库区场景图中选择一个库位开始复核'
    return {
      annotation: tip,
      sideDetail: tip + '。当前支持三种视角：按库区、按危险等级、按时间轴。不同视角下场景图的分组和排序逻辑不同，导出的截图说明文字也会匹配对应视角。',
      screenshotCaption: `【码头危险品库空间复核 - 未选中库位】
请先在场景图中点击任一库位，再执行导出。
提示：切换顶部「按库区/按危险等级/按时间轴」可改变场景分组。
数据：${comments.length} 条评审批注，${timeline.length} 条时间记录。
导出时间：${new Date().toLocaleString('zh-CN')}`,
    }
  }

  return {
    annotation: generateAnnotation(location, comments, timeline, viewType),
    sideDetail: generateSideDetail(location, comments, timeline, viewType),
    screenshotCaption: generateScreenshotCaption(location, comments, timeline, viewType),
  }
}
