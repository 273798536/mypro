import { useEffect, useRef } from 'react'
import { useGameStore } from '@/store/gameStore'
import ControlPanel from '@/components/ControlPanel'
import GameCanvas from '@/components/GameCanvas'
import DetailPanel from '@/components/DetailPanel'
import ScreenshotList from '@/components/ScreenshotList'
import SampleSelector from '@/components/SampleSelector'
import Legend from '@/components/Legend'
import { Wind } from 'lucide-react'

const GamePage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { loadSample, currentSample, gameState } = useGameStore()

  useEffect(() => {
    if (!currentSample && gameState.currentSampleId) {
      loadSample(gameState.currentSampleId)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-sky-50/50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Wind size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                大型机房气流路径分析系统
              </h1>
              <p className="text-xs text-slate-500">
                剖切面越界检测 · 可视化游戏化教学工具
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-500 hidden sm:block">
            选择样例 → 开始观察 → 截图记录 → 结算分析 → 导出报告
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="space-y-5">
          <ControlPanel />

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
            <div className="space-y-5 min-w-0">
              <GameCanvas ref={canvasRef} width={800} height={500} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <SampleSelector />
                <Legend />
              </div>
            </div>

            <div className="space-y-5 min-w-0">
              <DetailPanel />
              <ScreenshotList canvasRef={canvasRef} />
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-8 py-4 text-center text-xs text-slate-400">
        大型机房气流路径剖切面越界检测系统 · 教育演示版
      </footer>
    </div>
  )
}

export default GamePage
