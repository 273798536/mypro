import { ref, computed } from 'vue'
import html2canvas from 'html2canvas'
import type { ScreenshotRecord, FilterCriteria, Bar, Hotspot } from '@/types'
import { mockScreenshots } from '@/mock/data'
import { useStorage } from './useStorage'

interface CaptureOptions {
  canvasElement: HTMLElement | null
  title: string
  bars: Bar[]
  filter: FilterCriteria
  hoverBarId: string | null
  canvasWidth: number
  canvasHeight: number
  pad: number
}

export function useScreenshot() {
  const { data: screenshots } = useStorage<ScreenshotRecord[]>('review:screenshots', mockScreenshots)
  const selectedShotId = ref<string | null>(null)
  const isCapturing = ref(false)
  const captureError = ref<string | null>(null)

  const sortedScreenshots = computed(() =>
    [...screenshots.value].sort((a, b) => b.capturedAt - a.capturedAt)
  )

  const selectedShot = computed(() =>
    screenshots.value.find(s => s.id === selectedShotId.value) || null
  )

  const hasRealScreenshots = computed(() =>
    screenshots.value.some(s => s.imageUrl && s.imageUrl.startsWith('data:image/'))
  )

  async function captureCurrentView(options: CaptureOptions): Promise<ScreenshotRecord | null> {
    const { canvasElement, title, bars, filter, hoverBarId, canvasWidth, canvasHeight, pad } = options

    if (!canvasElement) {
      captureError.value = '找不到画布元素，截图失败'
      return null
    }

    isCapturing.value = true
    captureError.value = null

    try {
      const xMax = Math.max(...bars.map(b => b.x)) + 500
      const yMax = Math.max(...bars.map(b => b.y)) + 500
      const toCanvasX = (x: number) => pad + (x / xMax) * (canvasWidth - pad * 2)
      const toCanvasY = (y: number) => canvasHeight - pad - (y / yMax) * (canvasHeight - pad * 2)
      const barHeight = (z: number) => Math.max(20, Math.min(120, (z / 10000) * 120))

      const canvas = await html2canvas(canvasElement, {
        backgroundColor: '#E0F2FE',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        ignoreElements: (el) => {
          if (el.classList?.contains('screenshot-ignore')) return true
          if (el.classList?.contains('tooltip-float')) return true
          return false
        }
      })

      const imageUrl = canvas.toDataURL('image/png', 0.9)

      if (!imageUrl || imageUrl.length < 100) {
        throw new Error('截图生成失败，图像数据为空')
      }

      const linked = hoverBarId ? [hoverBarId] : bars.map(b => b.id).slice(0, 5)

      const hotspotAreas: Hotspot[] = bars
        .filter(b => linked.includes(b.id))
        .map(b => {
          const barW = b.length > 8000 ? 48 : b.length > 5000 ? 36 : 24
          const cx = toCanvasX(b.x)
          const cy = toCanvasY(b.y) - barHeight(b.z) / 2
          return {
            barId: b.id,
            x: Math.max(0, (cx - barW / 2 - 4) / canvasWidth),
            y: Math.max(0, (cy - barHeight(b.z) / 2 - 4) / canvasHeight),
            width: Math.min(1, (barW + 8) / canvasWidth),
            height: Math.min(1, (barHeight(b.z) + 8) / canvasHeight)
          }
        })

      const record: ScreenshotRecord = {
        id: `shot-${Date.now()}`,
        imageUrl,
        title,
        capturedAt: Date.now(),
        filterSnapshot: { ...filter, appliedAt: Date.now() },
        linkedBarIds: linked,
        hotspotAreas
      }

      const imageSizeKB = Math.round(imageUrl.length / 1024)
      if (imageSizeKB > 5000) {
        console.warn(`截图体积较大: ${imageSizeKB}KB，建议控制画布尺寸`)
      }

      screenshots.value.push(record)
      return record
    } catch (err) {
      console.error('截图失败:', err)
      captureError.value = err instanceof Error ? err.message : '未知错误'
      return null
    } finally {
      isCapturing.value = false
    }
  }

  function deleteShot(id: string) {
    const idx = screenshots.value.findIndex(s => s.id === id)
    if (idx >= 0) {
      screenshots.value.splice(idx, 1)
      if (selectedShotId.value === id) {
        selectedShotId.value = null
      }
    }
  }

  function selectShot(id: string | null) {
    selectedShotId.value = id
  }

  function clearError() {
    captureError.value = null
  }

  return {
    screenshots,
    sortedScreenshots,
    selectedShot,
    selectedShotId,
    isCapturing,
    captureError,
    hasRealScreenshots,
    captureCurrentView,
    selectShot,
    deleteShot,
    clearError
  }
}
