import { useEffect, useRef, useState } from 'react'
import { Scene3D } from '@/components/Scene3D'
import { SummaryPanel } from '@/components/SummaryPanel'
import { DetailPanel } from '@/components/DetailPanel'
import { Timeline } from '@/components/Timeline'
import { AdjacentAlert } from '@/components/AdjacentAlert'
import { Toolbar } from '@/components/Toolbar'
import { exportScreenshot, generateReport, downloadReport } from '@/utils/export'

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasReady, setCanvasReady] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setCanvasReady(true), 500)
    return () => clearTimeout(timer)
  }, [])

  const handleExportScreenshot = () => {
    const canvas = document.querySelector('canvas')
    if (canvas) {
      const timestamp = new Date().toISOString().slice(0, 10)
      exportScreenshot(canvas, `灯光碰撞预审-${timestamp}.png`)
    }
  }

  const handleExportReport = () => {
    const report = generateReport()
    const timestamp = new Date().toISOString().slice(0, 10)
    downloadReport(report, `灯光碰撞预审报告-${timestamp}.txt`)
  }

  return (
    <div className="h-screen w-screen bg-slate-950 overflow-hidden relative">
      <Toolbar
        onExportScreenshot={handleExportScreenshot}
        onExportReport={handleExportReport}
      />

      <div className="flex h-full pt-14">
        <div className="flex-shrink-0 border-r border-white/5 bg-slate-900/50">
          <SummaryPanel />
        </div>

        <div ref={containerRef} className="flex-1 relative">
          <Scene3D />
          <AdjacentAlert />
          <Timeline />
        </div>

        <div className="flex-shrink-0">
          <DetailPanel />
        </div>
      </div>

      {!canvasReady && (
        <div className="absolute inset-0 bg-slate-950 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">加载3D场景中...</p>
          </div>
        </div>
      )}
    </div>
  )
}
