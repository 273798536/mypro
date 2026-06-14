import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Scene3D from '@/components/Scene3D/Scene3D'
import LayerPanel from '@/components/LayerPanel/LayerPanel'
import AnomalyPanel from '@/components/AnomalyPanel/AnomalyPanel'
import Toolbar from '@/components/Toolbar/Toolbar'
import ReviewBar from '@/components/ReviewBar/ReviewBar'
import PointDetail from '@/components/PointDetail/PointDetail'

export default function App() {
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  return (
    <div className="h-screen w-screen flex flex-col bg-navy-deep text-gray-100 overflow-hidden">
      <Toolbar />

      <div className="flex-1 flex min-h-0 relative">
        <div
          className={`transition-all duration-300 ease-out h-full relative flex ${
            leftOpen ? 'w-72' : 'w-0'
          }`}
        >
          {leftOpen && (
            <div className="w-full h-full border-r border-gray-border">
              <LayerPanel />
            </div>
          )}
          <button
            onClick={() => setLeftOpen((v) => !v)}
            className="absolute top-1/2 -translate-y-1/2 z-20 w-5 h-14 panel-glass rounded-r border border-l-0 border-gray-border flex items-center justify-center text-cyan-industrial hover:text-cyan-glow hover:bg-navy-mid/60 transition-colors"
            style={{ left: leftOpen ? '100%' : 0 }}
          >
            {leftOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        <div className="flex-1 relative min-w-0">
          <Scene3D />
          <div className="absolute top-3 left-3 panel-glass px-3 py-1.5 rounded text-[10px] font-mono text-gray-wait space-x-3">
            <span>鼠标左键: 旋转</span>
            <span>右键: 平移</span>
            <span>滚轮: 缩放</span>
            <span>Shift+点击: 多选</span>
          </div>
        </div>

        <div
          className={`transition-all duration-300 ease-out h-full relative flex ${
            rightOpen ? 'w-80' : 'w-0'
          }`}
        >
          <button
            onClick={() => setRightOpen((v) => !v)}
            className="absolute top-1/2 -translate-y-1/2 z-20 w-5 h-14 panel-glass rounded-l border border-r-0 border-gray-border flex items-center justify-center text-cyan-industrial hover:text-cyan-glow hover:bg-navy-mid/60 transition-colors"
            style={{ right: rightOpen ? '100%' : 0 }}
          >
            {rightOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          {rightOpen && (
            <div className="w-full h-full border-l border-gray-border">
              <AnomalyPanel />
            </div>
          )}
        </div>
      </div>

      <ReviewBar />
      <PointDetail />
    </div>
  )
}
