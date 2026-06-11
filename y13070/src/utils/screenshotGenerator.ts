import type { Point, Annotation, MergeIssue } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  normal: '#34d399',
  warning: '#fbbf24',
  error: '#e8743b',
}

interface GenerateScreenshotOptions {
  point: Point
  pointName: string
  status: string
  coordSystemName: string
  annotation?: Annotation
  mergeIssue?: MergeIssue
  version?: number
  showDeviation?: boolean
  deviationValue?: number
}

export function generateScreenshotDataUrl(options: GenerateScreenshotOptions): string {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 360
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height)
  bgGrad.addColorStop(0, '#0f1923')
  bgGrad.addColorStop(1, '#1a2332')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.strokeStyle = '#1e2d3d'
  ctx.lineWidth = 1
  for (let i = 0; i < canvas.width; i += 40) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, canvas.height)
    ctx.stroke()
  }
  for (let i = 0; i < canvas.height; i += 40) {
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(canvas.width, i)
    ctx.stroke()
  }

  const centerX = canvas.width / 2
  const centerY = canvas.height / 2 + 40

  const points = [
    { x: centerX - 180, y: centerY - 20, status: 'normal', label: 'A1' },
    { x: centerX - 90, y: centerY - 50, status: 'normal', label: 'A2' },
    { x: centerX, y: centerY, status: options.status, label: options.pointName },
    { x: centerX + 90, y: centerY + 30, status: 'normal', label: 'A4' },
    { x: centerX + 180, y: centerY - 10, status: 'normal', label: 'A5' },
  ]

  ctx.strokeStyle = '#4a6fa5'
  ctx.lineWidth = 2
  ctx.beginPath()
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  })
  ctx.stroke()

  points.forEach((p) => {
    const color = STATUS_COLORS[p.status]

    if (p.status !== 'normal') {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 24, 0, Math.PI * 2)
      ctx.fillStyle = color + '20'
      ctx.fill()
    }

    ctx.beginPath()
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.font = '12px JetBrains Mono, monospace'
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'center'
    ctx.fillText(p.label, p.x, p.y - 20)
  })

  const activePoint = points[2]

  if (options.status !== 'normal') {
    ctx.strokeStyle = STATUS_COLORS[options.status]
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(activePoint.x, activePoint.y)
    ctx.lineTo(activePoint.x, activePoint.y + 60)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#1e2d3d'
    ctx.strokeStyle = STATUS_COLORS[options.status]
    ctx.lineWidth = 1
    const boxW = 180
    const boxH = 52
    const boxX = activePoint.x - boxW / 2
    const boxY = activePoint.y + 65
    ctx.fillRect(boxX, boxY, boxW, boxH)
    ctx.strokeRect(boxX, boxY, boxW, boxH)

    ctx.font = 'bold 11px Noto Sans SC, sans-serif'
    ctx.fillStyle = '#fbbf24'
    ctx.textAlign = 'left'
    ctx.fillText('⚠ 坐标系异常', boxX + 10, boxY + 20)

    ctx.font = '10px Noto Sans SC, sans-serif'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(options.coordSystemName, boxX + 10, boxY + 38)

    if (options.deviationValue !== undefined) {
      ctx.fillStyle = '#e8743b'
      ctx.textAlign = 'right'
      ctx.fillText(`偏差 ${options.deviationValue}m`, boxX + boxW - 10, boxY + 38)
    }
  }

  if (options.mergeIssue) {
    ctx.fillStyle = 'rgba(232, 116, 59, 0.1)'
    ctx.strokeStyle = '#e8743b'
    ctx.lineWidth = 1
    const boxW = 280
    const boxH = 36
    const boxX = 12
    const boxY = canvas.height - 48
    ctx.fillRect(boxX, boxY, boxW, boxH)
    ctx.strokeRect(boxX, boxY, boxW, boxH)

    ctx.font = '10px Noto Sans SC, sans-serif'
    ctx.fillStyle = '#fbbf24'
    ctx.textAlign = 'left'
    const text = options.mergeIssue.description.length > 30
      ? options.mergeIssue.description.slice(0, 30) + '...'
      : options.mergeIssue.description
    ctx.fillText(text, boxX + 8, boxY + 15)
    ctx.fillStyle = '#60a5fa'
    const step = options.mergeIssue.actionStep.length > 32
      ? options.mergeIssue.actionStep.slice(0, 32) + '...'
      : options.mergeIssue.actionStep
    ctx.fillText('→ ' + step, boxX + 8, boxY + 30)
  }

  ctx.fillStyle = '#0f1923'
  ctx.fillRect(0, 0, canvas.width, 40)
  ctx.strokeStyle = '#2a3544'
  ctx.beginPath()
  ctx.moveTo(0, 40)
  ctx.lineTo(canvas.width, 40)
  ctx.stroke()

  ctx.font = 'bold 14px Noto Sans SC, sans-serif'
  ctx.fillStyle = '#e2e8f0'
  ctx.textAlign = 'left'
  ctx.fillText('山地索道站空间复核', 16, 26)

  ctx.font = '11px JetBrains Mono, monospace'
  ctx.fillStyle = '#64748b'
  ctx.textAlign = 'right'
  ctx.fillText(`v${options.version || 1}`, canvas.width - 16, 26)

  ctx.font = '11px Noto Sans SC, sans-serif'
  ctx.fillStyle = '#64748b'
  ctx.textAlign = 'center'
  ctx.fillText(
    new Date().toLocaleDateString('zh-CN') + ' 空间复核截图',
    canvas.width / 2,
    canvas.height - 10
  )

  return canvas.toDataURL('image/png')
}

export function generateAnnotationScreenshot(
  annotation: Annotation,
  point: Point,
  pointName: string,
  coordSystemName: string,
  mergeIssue?: MergeIssue
): string {
  return generateScreenshotDataUrl({
    point,
    pointName,
    status: point.status,
    coordSystemName,
    annotation,
    mergeIssue,
    version: annotation.version,
  })
}

export function generateHandoverScreenshot(
  point: Point,
  pointName: string,
  coordSystemName: string,
  description: string
): string {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 180
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height)
  bgGrad.addColorStop(0, '#0f1923')
  bgGrad.addColorStop(1, '#1a2332')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.strokeStyle = '#1e2d3d'
  ctx.lineWidth = 1
  for (let i = 0; i < canvas.width; i += 20) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, canvas.height)
    ctx.stroke()
  }
  for (let i = 0; i < canvas.height; i += 20) {
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(canvas.width, i)
    ctx.stroke()
  }

  const centerX = canvas.width / 2
  const centerY = canvas.height / 2 + 10

  const color = STATUS_COLORS[point.status]
  ctx.beginPath()
  ctx.arc(centerX, centerY, 30, 0, Math.PI * 2)
  ctx.fillStyle = color + '30'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(centerX, centerY, 18, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.font = 'bold 12px Noto Sans SC, sans-serif'
  ctx.fillStyle = '#e2e8f0'
  ctx.textAlign = 'center'
  ctx.fillText(pointName, centerX, centerY - 40)

  ctx.font = '10px Noto Sans SC, sans-serif'
  ctx.fillStyle = '#64748b'
  ctx.fillText(coordSystemName, centerX, centerY - 26)

  ctx.fillStyle = '#0f1923'
  ctx.fillRect(0, canvas.height - 40, canvas.width, 40)
  ctx.font = '10px Noto Sans SC, sans-serif'
  ctx.fillStyle = '#94a3b8'
  ctx.textAlign = 'left'
  const shortDesc = description.length > 22 ? description.slice(0, 22) + '...' : description
  ctx.fillText(shortDesc, 8, canvas.height - 15)

  return canvas.toDataURL('image/png')
}
