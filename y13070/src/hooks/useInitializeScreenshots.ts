import { useEffect, useRef } from 'react'
import { useReviewStore } from '@/store'
import { generateAnnotationScreenshot, generateHandoverScreenshot } from '@/utils/screenshotGenerator'

export function useInitializeScreenshots() {
  const initialized = useRef(false)

  const points = useReviewStore((s) => s.points)
  const coordSystems = useReviewStore((s) => s.coordSystems)
  const annotations = useReviewStore((s) => s.annotations)
  const mergeIssues = useReviewStore((s) => s.mergeIssues)
  const adjacencies = useReviewStore((s) => s.adjacencies)
  const screenshotArchives = useReviewStore((s) => s.screenshotArchives)
  const handoverItems = useReviewStore((s) => s.handoverItems)
  const setScreenshotDataUrl = useReviewStore((s) => s.setScreenshotDataUrl)
  const setHandoverScreenshotDataUrl = useReviewStore((s) => s.setHandoverScreenshotDataUrl)

  useEffect(() => {
    if (initialized.current) return

    const hasAllScreenshots = screenshotArchives.every((s) => s.dataUrl)
    const hasAllHandoverScreenshots = handoverItems.every((i) => i.screenshotDataUrl)

    if (hasAllScreenshots && hasAllHandoverScreenshots) {
      initialized.current = true
      return
    }

    try {
      if (!hasAllScreenshots) {
        screenshotArchives.forEach((archive) => {
          if (archive.dataUrl) return

          const annotation = annotations.find((a) => a.id === archive.annotationId)
          if (!annotation) return

          const point = points.find((p) => p.id === annotation.pointId)
          if (!point) return

          const cs = coordSystems.find((c) => c.id === point.coordSystemId)

          const pointAdjs = adjacencies.filter((a) => a.pointAId === point.id || a.pointBId === point.id)
          const mi = mergeIssues.find((m) => pointAdjs.some((a) => a.id === m.adjacencyId))

          const dataUrl = generateAnnotationScreenshot(
            annotation,
            point,
            point.name,
            cs?.name || '未知坐标系',
            mi
          )

          setScreenshotDataUrl(archive.id, dataUrl)
        })
      }

      if (!hasAllHandoverScreenshots) {
        handoverItems.forEach((item) => {
          if (item.screenshotDataUrl) return

          const annotation = annotations.find((a) => a.id === item.annotationId)
          if (!annotation) return

          const point = points.find((p) => p.id === annotation.pointId)
          if (!point) return

          const cs = coordSystems.find((c) => c.id === point.coordSystemId)

          const dataUrl = generateHandoverScreenshot(
            point,
            point.name,
            cs?.name || '未知坐标系',
            item.description
          )

          setHandoverScreenshotDataUrl(item.id, dataUrl)
        })
      }

      initialized.current = true
    } catch {
      initialized.current = true
    }
  }, [points, coordSystems, annotations, mergeIssues, adjacencies, screenshotArchives, handoverItems, setScreenshotDataUrl, setHandoverScreenshotDataUrl])
}
