import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { minutesToTime } from '@/types'
import TugPanel from './TugPanel'
import BerthPanel from './BerthPanel'

interface DispatchModalProps {
  shipId: string
  onClose: () => void
}

export default function DispatchModal({ shipId, onClose }: DispatchModalProps) {
  const ships = useGameStore(s => s.ships)
  const dispatchShip = useGameStore(s => s.dispatchShip)
  const currentTime = useGameStore(s => s.currentTime)
  const ship = ships.find(s => s.id === shipId)

  const [selectedTugIds, setSelectedTugIds] = useState<string[]>([])
  const [selectedBerthId, setSelectedBerthId] = useState<string | null>(null)

  if (!ship) return null

  const handleToggleTug = (tugId: string) => {
    setSelectedTugIds(prev => {
      if (prev.includes(tugId)) return prev.filter(id => id !== tugId)
      if (prev.length >= ship.requiredTugs) return prev
      return [...prev, tugId]
    })
  }

  const canConfirm = selectedTugIds.length === ship.requiredTugs && selectedBerthId !== null

  const handleConfirm = () => {
    if (!canConfirm || !selectedBerthId) return
    dispatchShip(shipId, selectedTugIds, selectedBerthId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[680px] max-h-[85vh] overflow-y-auto rounded-xl border border-slate-700 bg-[#0E1A2E] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <div>
            <h2 className="text-lg font-bold text-white">调度指派</h2>
            <p className="text-xs text-slate-400">
              {ship.name} · {ship.tonnage / 10000}万吨 · 需{ship.requiredTugs}艘拖轮
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>当前时间: <span className="text-amber-400 font-mono">{minutesToTime(currentTime)}</span></div>
            <div>潮汐窗口: <span className="text-cyan-400 font-mono">{minutesToTime(ship.tideWindowStart)}-{minutesToTime(ship.tideWindowEnd)}</span></div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-300">选择拖轮（需 {ship.requiredTugs} 艘，已选 {selectedTugIds.length} 艘）</h3>
            <TugPanel
              selectedTugIds={selectedTugIds}
              onToggleTug={handleToggleTug}
              requiredTugs={ship.requiredTugs}
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-300">选择泊位</h3>
            <BerthPanel
              selectedBerthId={selectedBerthId}
              onSelectBerth={setSelectedBerthId}
              shipTonnage={ship.tonnage}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-700 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="rounded-lg bg-amber-500 px-6 py-2 text-sm font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            确认调度
          </button>
        </div>
      </div>
    </div>
  )
}
