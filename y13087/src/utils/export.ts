import { useReviewStore } from '@/store/useReviewStore'
import { STATUS_LABELS, STAGE_LIST } from '@/types'
import type { LightPointStatus, ReviewStage } from '@/types'

export function exportScreenshot(canvas: HTMLCanvasElement, filename: string = 'screenshot.png') {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}

export function generateReport(): string {
  const state = useReviewStore.getState()
  const { lightPoints, adjacentPairs, currentStage, comments } = state

  const stageName = STAGE_LIST.find((s) => s.id === currentStage)?.name || currentStage
  const counts = state.getStatusCounts()
  const total = lightPoints.length

  const lines: string[] = []
  lines.push('='.repeat(60))
  lines.push('博物馆展柜灯光碰撞预审报告')
  lines.push('='.repeat(60))
  lines.push(`评审阶段: ${stageName}`)
  lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`)
  lines.push(`灯光点位总数: ${total}`)
  lines.push('')

  lines.push('-'.repeat(60))
  lines.push('一、状态统计')
  lines.push('-'.repeat(60))
  lines.push(`已处理: ${counts.normal} 个 (${((counts.normal / total) * 100).toFixed(1)}%)`)
  lines.push(`待补材料: ${counts.pending_material} 个 (${((counts.pending_material / total) * 100).toFixed(1)}%)`)
  lines.push(`人工改判: ${counts.manual_review} 个 (${((counts.manual_review / total) * 100).toFixed(1)}%)`)
  lines.push('')

  lines.push('-'.repeat(60))
  lines.push('二、相邻点位异常记录')
  lines.push('-'.repeat(60))
  const unresolved = adjacentPairs.filter((ap) => !ap.isResolved)
  if (unresolved.length === 0) {
    lines.push('无')
  } else {
    unresolved.forEach((pair, idx) => {
      const pointA = lightPoints.find((lp) => lp.id === pair.pointAId)
      const pointB = lightPoints.find((lp) => lp.id === pair.pointBId)
      lines.push(`${idx + 1}. ${pointA?.name || pair.pointAId} ↔ ${pointB?.name || pair.pointBId}`)
      lines.push(`   类型: ${pair.issueType}`)
      lines.push(`   说明: ${pair.description}`)
      lines.push('')
    })
  }
  lines.push('')

  lines.push('-'.repeat(60))
  lines.push('三、待补材料明细')
  lines.push('-'.repeat(60))
  const pendingPoints = lightPoints.filter((lp) => lp.status === 'pending_material')
  if (pendingPoints.length === 0) {
    lines.push('无')
  } else {
    pendingPoints.forEach((lp, idx) => {
      const pointComments = comments.filter(
        (c) => c.lightPointId === lp.id && c.stage === currentStage
      )
      const latestComment = pointComments[0]?.content || '暂无批注'
      lines.push(`${idx + 1}. ${lp.name}`)
      lines.push(`   坐标: (${lp.position.x.toFixed(2)}, ${lp.position.y.toFixed(2)}, ${lp.position.z.toFixed(2)})`)
      lines.push(`   最新批注: ${latestComment}`)
      lines.push('')
    })
  }
  lines.push('')

  lines.push('-'.repeat(60))
  lines.push('四、人工改判明细')
  lines.push('-'.repeat(60))
  const manualPoints = lightPoints.filter((lp) => lp.status === 'manual_review')
  if (manualPoints.length === 0) {
    lines.push('无')
  } else {
    manualPoints.forEach((lp, idx) => {
      const pointComments = comments.filter(
        (c) => c.lightPointId === lp.id && c.stage === currentStage
      )
      const latestComment = pointComments[0]?.content || '暂无批注'
      lines.push(`${idx + 1}. ${lp.name}`)
      lines.push(`   坐标: (${lp.position.x.toFixed(2)}, ${lp.position.y.toFixed(2)}, ${lp.position.z.toFixed(2)})`)
      lines.push(`   最新批注: ${latestComment}`)
      lines.push('')
    })
  }

  lines.push('='.repeat(60))
  lines.push('报告结束')
  lines.push('='.repeat(60))

  return lines.join('\n')
}

export function downloadReport(reportText: string, filename: string = '预审报告.txt') {
  const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}
