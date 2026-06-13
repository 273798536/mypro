import { useReviewStore } from '@/store/useReviewStore'
import { STATUS_LABELS, STAGE_LIST } from '@/types'
import type { LightPointStatus, ReviewStage } from '@/types'

export function exportScreenshot(canvas: HTMLCanvasElement, filename: string = 'screenshot.png') {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
  collision_risk: '碰撞风险',
  overlap: '光束重叠',
  coordinate_mismatch: '坐标偏差',
}

export function generateReport(): string {
  const state = useReviewStore.getState()
  const { lightPoints, adjacentPairs, currentStage, comments, getStatusCounts, getPointStatus } = state

  const stageName = STAGE_LIST.find((s) => s.id === currentStage)?.name || currentStage
  const counts = getStatusCounts(currentStage)
  const total = lightPoints.length

  const lines: string[] = []
  lines.push('='.repeat(60))
  lines.push('博物馆展柜灯光碰撞预审报告')
  lines.push('='.repeat(60))
  lines.push(`评审阶段: ${stageName} (${currentStage})`)
  lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`)
  lines.push(`灯光点位总数: ${total}`)
  lines.push('')

  lines.push('-'.repeat(60))
  lines.push('一、状态统计')
  lines.push('-'.repeat(60))
  lines.push(`已处理:      ${counts.normal} 个  (${((counts.normal / total) * 100).toFixed(1)}%)`)
  lines.push(`待补材料:    ${counts.pending_material} 个  (${((counts.pending_material / total) * 100).toFixed(1)}%)`)
  lines.push(`人工改判:    ${counts.manual_review} 个  (${((counts.manual_review / total) * 100).toFixed(1)}%)`)
  lines.push('')

  lines.push('-'.repeat(60))
  lines.push('二、各阶段状态对照')
  lines.push('-'.repeat(60))
  const stages: ReviewStage[] = ['initial', 'review', 'final']
  lines.push(
    '点位名称'.padEnd(14) +
      stages.map((s) => STAGE_LIST.find((st) => st.id === s)?.name.padEnd(8)).join('')
  )
  lines.push('-'.repeat(14 + 8 * 3))
  lightPoints.forEach((lp) => {
    const stageStatuses = stages.map((s) => STATUS_LABELS[getPointStatus(lp.id, s)].padEnd(8))
    lines.push(lp.name.padEnd(14) + stageStatuses.join(''))
  })
  lines.push('')

  lines.push('-'.repeat(60))
  lines.push('三、相邻点位异常记录')
  lines.push('-'.repeat(60))
  const unresolved = adjacentPairs.filter((ap) => !ap.isResolved)
  if (unresolved.length === 0) {
    lines.push('（无）')
  } else {
    unresolved.forEach((pair, idx) => {
      const pointA = lightPoints.find((lp) => lp.id === pair.pointAId)
      const pointB = lightPoints.find((lp) => lp.id === pair.pointBId)
      lines.push(`${idx + 1}. ${pointA?.name || pair.pointAId}  ↔  ${pointB?.name || pair.pointBId}`)
      lines.push(`   类型: ${ISSUE_TYPE_LABELS[pair.issueType] || pair.issueType}`)
      lines.push(`   说明: ${pair.description}`)
      lines.push('')
    })
  }
  lines.push('')

  lines.push('-'.repeat(60))
  lines.push('四、待补材料明细（当前阶段）')
  lines.push('-'.repeat(60))
  const pendingPoints = lightPoints.filter(
    (lp) => getPointStatus(lp.id, currentStage) === 'pending_material'
  )
  if (pendingPoints.length === 0) {
    lines.push('（无）')
  } else {
    pendingPoints.forEach((lp, idx) => {
      const pointComments = comments.filter(
        (c) => c.lightPointId === lp.id && c.stage === currentStage
      )
      const latestComment = pointComments[0]?.content || '暂无批注'
      lines.push(`${idx + 1}. ${lp.name}  [${lp.id}]`)
      lines.push(
        `   坐标: (${lp.position.x.toFixed(2)}, ${lp.position.y.toFixed(2)}, ${lp.position.z.toFixed(2)})`
      )
      lines.push(`   最新批注: ${latestComment}`)
      lines.push('')
    })
  }
  lines.push('')

  lines.push('-'.repeat(60))
  lines.push('五、人工改判明细（当前阶段）')
  lines.push('-'.repeat(60))
  const manualPoints = lightPoints.filter(
    (lp) => getPointStatus(lp.id, currentStage) === 'manual_review'
  )
  if (manualPoints.length === 0) {
    lines.push('（无）')
  } else {
    manualPoints.forEach((lp, idx) => {
      const pointComments = comments.filter(
        (c) => c.lightPointId === lp.id && c.stage === currentStage
      )
      const latestComment = pointComments[0]?.content || '暂无批注'
      lines.push(`${idx + 1}. ${lp.name}  [${lp.id}]`)
      lines.push(
        `   坐标: (${lp.position.x.toFixed(2)}, ${lp.position.y.toFixed(2)}, ${lp.position.z.toFixed(2)})`
      )
      lines.push(`   最新批注: ${latestComment}`)
      lines.push('')
    })
  }

  lines.push('='.repeat(60))
  lines.push('报告结束  —  标注、侧边明细、报告均使用同一数据源')
  lines.push('='.repeat(60))

  return lines.join('\r\n')
}

export function downloadReport(reportText: string, filename?: string) {
  const timestamp = new Date().toISOString().slice(0, 10)
  const state = useReviewStore.getState()
  const stageName = STAGE_LIST.find((s) => s.id === state.currentStage)?.name || state.currentStage
  const finalFilename = filename || `灯光碰撞预审报告-${stageName}-${timestamp}.txt`

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + reportText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = finalFilename
  link.href = url
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
