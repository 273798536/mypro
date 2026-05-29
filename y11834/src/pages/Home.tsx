import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import { minutesToTime } from '@/types'
import PortMap from '@/components/PortMap'
import Timeline from '@/components/Timeline'
import ShipPanel from '@/components/ShipPanel'
import FeedbackBar from '@/components/FeedbackBar'
import DispatchModal from '@/components/DispatchModal'

export default function Home() {
  const navigate = useNavigate()
  const currentTime = useGameStore(s => s.currentTime)
  const phase = useGameStore(s => s.phase)
  const autoPlay = useGameStore(s => s.autoPlay)
  const advanceTime = useGameStore(s => s.advanceTime)
  const ships = useGameStore(s => s.ships)
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (phase === 'finished') {
      const timer = setTimeout(() => navigate('/report'), 1500)
      return () => clearTimeout(timer)
    }
  }, [phase, navigate])

  useEffect(() => {
    if (!autoPlay || phase !== 'playing') return
    const interval = setInterval(() => advanceTime(), 2000)
    return () => clearInterval(interval)
  }, [autoPlay, phase, advanceTime])

  const handleSelectShip = useCallback((shipId: string) => {
    setSelectedShipId(shipId)
    setShowModal(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    setSelectedShipId(null)
  }, [])

  const arrivedCount = ships.filter(s => s.status === 'arrived').length
  const dispatchedCount = ships.filter(s => s.status === 'dispatched').length
  const completedCount = ships.filter(s => s.status === 'completed').length
  const failedCount = ships.filter(s => s.status === 'failed').length

  return (
    <div className="flex h-screen flex-col bg-[#0A1628] text-white">
      <header className="flex items-center justify-between border-b border-slate-700/50 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
            ⚓
          </div>
          <h1 className="text-lg font-bold tracking-wide">港口拖轮潮汐战</h1>
          <span className="rounded bg-slate-700/50 px-2 py-0.5 text-xs text-slate-400">培训模拟</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">时间</span>
            <span className="font-mono text-lg font-bold text-amber-400">{minutesToTime(currentTime)}</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex gap-3 text-xs">
            <span className="text-blue-400">待调度 {arrivedCount}</span>
            <span className="text-cyan-400">作业中 {dispatchedCount}</span>
            <span className="text-green-400">已完成 {completedCount}</span>
            <span className="text-red-400">失败 {failedCount}</span>
          </div>
          {phase === 'finished' && (
            <button
              onClick={() => navigate('/report')}
              className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-bold text-black transition hover:bg-amber-400"
            >
              查看报告 →
            </button>
          )}
        </div>
      </header>

      <Timeline />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden p-3">
          <PortMap />
          <div className="mt-2 rounded-lg border border-slate-700/50 bg-[#0E1A2E] p-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-slate-500">调度提示:</span>
              {arrivedCount > 0 ? (
                <span className="text-amber-300">
                  点击右侧船舶卡片开始调度，注意潮汐窗口倒计时
                </span>
              ) : (
                <span>推进时间，等待船舶到达锚地</span>
              )}
            </div>
          </div>
        </div>

        <div className="w-[340px] border-l border-slate-700/50 bg-[#0C1525]">
          <ShipPanel onSelectShip={handleSelectShip} selectedShipId={selectedShipId} />
        </div>
      </div>

      <FeedbackBar />

      {showModal && selectedShipId && (
        <DispatchModal shipId={selectedShipId} onClose={handleCloseModal} />
      )}
    </div>
  )
}
