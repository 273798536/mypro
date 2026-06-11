import type { Bar, ReviewComment, OverlapPair, FinalizationItem } from '@/types'

export function generateFinalizationList(
  bars: Bar[],
  comments: ReviewComment[],
  overlaps: OverlapPair[]
): FinalizationItem[] {
  const overlapBarIds = new Set<string>()
  overlaps.forEach(o => {
    overlapBarIds.add(o.barIdA)
    overlapBarIds.add(o.barIdB)
  })

  const items: FinalizationItem[] = bars.map(bar => {
    const barComments = comments.filter(c => c.barId === bar.id)
    const hasLateAttachment = barComments.some(c => c.hasLateAttachment)
    const hasNeedFix = barComments.some(c => c.status === '需修改')

    if (overlapBarIds.has(bar.id)) {
      const pair = overlaps.find(o => o.barIdA === bar.id || o.barIdB === bar.id)
      const otherBarId = pair ? (pair.barIdA === bar.id ? pair.barIdB : pair.barIdA) : null
      const otherBar = otherBarId ? bars.find(b => b.id === otherBarId) : null
      return {
        barId: bar.id,
        barName: bar.name,
        action: '补材料',
        reason: `与${otherBar?.name ?? '相邻吊杆'}空间净距仅${pair?.overlapDistance}mm，存在碰撞风险，需提交调整方案后复核`
      }
    }

    if (hasNeedFix || bar.status === 'need-fix') {
      return {
        barId: bar.id,
        barName: bar.name,
        action: '补材料',
        reason: barComments.find(c => c.status === '需修改')?.content ?? '存在未解决问题，需施工方补充材料后复核'
      }
    }

    if (bar.status === 'passed') {
      return {
        barId: bar.id,
        barName: bar.name,
        action: 'pass',
        reason: hasLateAttachment
          ? '坐标复核通过，含晚到复测记录已纳入，可放行'
          : '坐标复核通过，安装误差在规范容许范围内，可放行'
      }
    }

    if (bar.status === 'pending') {
      if (hasLateAttachment) {
        return {
          barId: bar.id,
          barName: bar.name,
          action: 'pass',
          reason: '晚到复测记录显示偏差在容许值内，建议予以放行'
        }
      }
      return {
        barId: bar.id,
        barName: bar.name,
        action: '待定',
        reason: '待林姐最终确认判断结论'
      }
    }

    return {
      barId: bar.id,
      barName: bar.name,
      action: '待定',
      reason: '状态未明确，需进一步复核'
    }
  })

  return items
}

export function summarizeFinalization(items: FinalizationItem[]) {
  return {
    pass: items.filter(i => i.action === 'pass').length,
    '补材料': items.filter(i => i.action === '补材料').length,
    '待定': items.filter(i => i.action === '待定').length
  }
}
