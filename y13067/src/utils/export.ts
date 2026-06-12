import type { Bar, Annotation, ScreenshotMark, Collision } from '@/types'
import { useToastStore } from '@/store/useToastStore'

export interface ExportData {
  bar: Bar
  positionY: number
  collision: Collision | null
  annotations: Annotation[]
  imageData: string
  labelType: ScreenshotMark['labelType']
  note: string
  frameIndex: number
}

const LABEL_TYPE_CONFIG = {
  resolved: { label: '已处理', color: '#2ED573', bgColor: 'rgba(46, 213, 115, 0.15)' },
  pending_material: { label: '待补材料', color: '#FFA502', bgColor: 'rgba(255, 165, 2, 0.15)' },
  manual_override: { label: '人工改判', color: '#FF6B81', bgColor: 'rgba(255, 107, 129, 0.15)' },
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split('')
  const lines: string[] = []
  let currentLine = ''
  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine + words[i]
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine !== '') {
      lines.push(currentLine)
      currentLine = words[i]
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

export function capture3DScene(): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.querySelector('canvas[data-engine^="three.js"]') as HTMLCanvasElement | null
                    || document.querySelector('main canvas') as HTMLCanvasElement | null
                    || document.querySelector('canvas') as HTMLCanvasElement | null
      if (!canvas) {
        reject(new Error('未找到 3D 场景 canvas，请确保已进入场景预审页'))
        return
      }
      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true }) 
                  || canvas.getContext('webgl', { preserveDrawingBuffer: true })
            if (gl) {
              gl.flush()
              gl.finish()
            }
            const dataUrl = canvas.toDataURL('image/png', 1.0)
            if (dataUrl === 'data:,' || dataUrl.length < 100) {
              const altCanvas = document.querySelector('main canvas') as HTMLCanvasElement | null
              if (altCanvas && altCanvas !== canvas) {
                const altData = altCanvas.toDataURL('image/png', 1.0)
                if (altData.length > 100) {
                  resolve(altData)
                  return
                }
              }
              reject(new Error('canvas 内容为空，请确保 3D 场景已渲染完成后再尝试'))
            } else {
              resolve(dataUrl)
            }
          } catch (e) {
            reject(e instanceof Error ? e : new Error('截图失败'))
          }
        }, 50)
      })
    } catch (e) {
      reject(e instanceof Error ? e : new Error('截图失败'))
    }
  })
}

export async function composeExportImage(data: ExportData): Promise<string> {
  const { bar, positionY, collision, annotations, imageData, labelType, note, frameIndex } = data

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 canvas 上下文')

  canvas.width = 900
  canvas.height = 540

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, '#0D1117')
  gradient.addColorStop(1, '#161B22')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.strokeStyle = '#30363D'
  ctx.lineWidth = 1
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40)

  const config = LABEL_TYPE_CONFIG[labelType]

  ctx.fillStyle = config.bgColor
  ctx.fillRect(20, 20, canvas.width - 40, 56)

  ctx.fillStyle = '#E6EDF3'
  ctx.font = 'bold 22px "Noto Serif SC", serif'
  ctx.fillText(bar.name, 40, 58)

  ctx.fillStyle = config.color
  ctx.font = 'bold 14px "Noto Sans SC", sans-serif'
  const badgeText = `● ${config.label}`
  const badgeWidth = ctx.measureText(badgeText).width + 24
  ctx.fillStyle = config.bgColor
  ctx.strokeStyle = config.color
  ctx.lineWidth = 2
  const badgeX = canvas.width - badgeWidth - 40
  const badgeY = 32
  ctx.beginPath()
  ctx.roundRect(badgeX, badgeY, badgeWidth, 32, 8)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = config.color
  ctx.fillText(badgeText, badgeX + 12, badgeY + 22)

  const img = new window.Image()
  img.crossOrigin = 'anonymous'

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const imgBoxX = 40
      const imgBoxY = 96
      const imgBoxW = 480
      const imgBoxH = 340

      ctx.fillStyle = '#161B22'
      ctx.fillRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH)
      ctx.strokeStyle = '#30363D'
      ctx.lineWidth = 1
      ctx.strokeRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH)

      const scale = Math.min(imgBoxW / img.width, imgBoxH / img.height, 1)
      const drawW = img.width * scale
      const drawH = img.height * scale
      const drawX = imgBoxX + (imgBoxW - drawW) / 2
      const drawY = imgBoxY + (imgBoxH - drawH) / 2
      ctx.drawImage(img, drawX, drawY, drawW, drawH)

      ctx.fillStyle = '#8B949E'
      ctx.font = '11px "Noto Sans SC", sans-serif'
      ctx.fillText('Web3D 场景实时截图', imgBoxX + 8, imgBoxY + 16)

      const infoX = 540
      const infoY = 96
      const infoW = 340

      ctx.fillStyle = '#E6EDF3'
      ctx.font = 'bold 16px "Noto Serif SC", serif'
      ctx.fillText('空间位置', infoX, infoY + 24)

      ctx.fillStyle = '#161B22'
      ctx.strokeStyle = '#30363D'
      ctx.beginPath()
      ctx.roundRect(infoX, infoY + 32, infoW, 80, 8)
      ctx.fill()
      ctx.stroke()

      const coordBg = '#21262D'
      ctx.fillStyle = coordBg
      ctx.beginPath()
      ctx.roundRect(infoX + 12, infoY + 44, 100, 56, 6)
      ctx.fill()
      ctx.beginPath()
      ctx.roundRect(infoX + 120, infoY + 44, 100, 56, 6)
      ctx.fill()
      ctx.beginPath()
      ctx.roundRect(infoX + 228, infoY + 44, 100, 56, 6)
      ctx.fill()

      ctx.fillStyle = '#8B949E'
      ctx.font = '11px "Noto Sans SC", sans-serif'
      ctx.fillText('X', infoX + 24, infoY + 64)
      ctx.fillText('Y', infoX + 132, infoY + 64)
      ctx.fillText('Z', infoX + 240, infoY + 64)

      ctx.fillStyle = '#E6EDF3'
      ctx.font = 'bold 16px "JetBrains Mono", monospace'
      ctx.fillText(bar.positionX.toFixed(1), infoX + 24, infoY + 88)
      ctx.fillText(positionY.toFixed(2), infoX + 132, infoY + 88)
      ctx.fillText(bar.positionZ.toFixed(1), infoX + 240, infoY + 88)

      ctx.fillStyle = '#E6EDF3'
      ctx.font = 'bold 16px "Noto Serif SC", serif'
      ctx.fillText('备注说明', infoX, infoY + 140)

      ctx.fillStyle = '#161B22'
      ctx.strokeStyle = '#30363D'
      ctx.beginPath()
      ctx.roundRect(infoX, infoY + 148, infoW, 68, 8)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#E6EDF3'
      ctx.font = '13px "Noto Sans SC", sans-serif'
      const noteLines = wrapText(ctx, note, infoW - 24)
      noteLines.slice(0, 2).forEach((line, i) => {
        ctx.fillText(line, infoX + 12, infoY + 172 + i * 20)
      })

      if (collision) {
        ctx.fillStyle = '#FF4757'
        ctx.font = 'bold 14px "Noto Sans SC", sans-serif'
        ctx.fillText(`碰撞间距 ${collision.distance}m · 帧${frameIndex}`, infoX, infoY + 236)
      }

      if (annotations.length > 0) {
        ctx.fillStyle = '#E6EDF3'
        ctx.font = 'bold 16px "Noto Serif SC", serif'
        ctx.fillText('最新批注', infoX, infoY + 268)

        const latestAnn = annotations[annotations.length - 1]
        ctx.fillStyle = '#161B22'
        ctx.strokeStyle = '#30363D'
        ctx.beginPath()
        ctx.roundRect(infoX, infoY + 276, infoW, 56, 8)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = '#E8A838'
        ctx.font = 'bold 12px "Noto Sans SC", sans-serif'
        ctx.fillText(latestAnn.authorName, infoX + 12, infoY + 298)

        ctx.fillStyle = '#8B949E'
        ctx.font = '10px "Noto Sans SC", sans-serif'
        const dateStr = new Date(latestAnn.timestamp).toLocaleDateString('zh-CN')
        const dateWidth = ctx.measureText(dateStr).width
        ctx.fillText(dateStr, infoX + infoW - dateWidth - 12, infoY + 298)

        ctx.fillStyle = '#E6EDF3'
        ctx.font = '12px "Noto Sans SC", sans-serif'
        const annLines = wrapText(ctx, latestAnn.content, infoW - 24)
        ctx.fillText(annLines[0], infoX + 12, infoY + 318)
      }

      ctx.fillStyle = '#484F58'
      ctx.font = '11px "Noto Sans SC", sans-serif'
      const footerText = `剧院吊杆阵列碰撞预审 · 导出时间 ${new Date().toLocaleString('zh-CN')}`
      ctx.fillText(footerText, 40, canvas.height - 32)

      ctx.fillStyle = '#30363D'
      ctx.fillRect(canvas.width - 120, canvas.height - 40, 1, 20)
      ctx.fillStyle = '#484F58'
      ctx.font = '10px "JetBrains Mono", monospace'
      ctx.fillText(`F${frameIndex}`, canvas.width - 100, canvas.height - 26)

      const finalDataUrl = canvas.toDataURL('image/png', 1.0)
      resolve(finalDataUrl)
    }

    img.onerror = () => {
      reject(new Error('截图数据加载失败'))
    }

    img.src = imageData
  })
}

export function downloadImage(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export async function exportSingleObject(
  bar: Bar,
  positionY: number,
  collision: Collision | null,
  annotations: Annotation[],
  labelType: ScreenshotMark['labelType'],
  note: string,
  frameIndex: number
): Promise<string | null> {
  const toastId = useToastStore.getState().loading('正在生成截图说明', '请稍候，正在截取 3D 场景并合成说明图...')

  try {
    const imageData = await capture3DScene()
    const composed = await composeExportImage({
      bar,
      positionY,
      collision,
      annotations,
      imageData,
      labelType,
      note,
      frameIndex,
    })
    const filename = `碰撞预审_${bar.name}_F${frameIndex}_${Date.now()}.png`
    downloadImage(composed, filename)
    useToastStore.getState().updateToast(toastId, {
      type: 'success',
      title: '导出成功',
      description: `已生成 ${filename}，包含 3D 截图、空间位置与备注说明`,
    })
    return composed
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : '导出失败'
    useToastStore.getState().updateToast(toastId, {
      type: 'error',
      title: '导出失败',
      description: errMsg,
    })
    return null
  }
}
