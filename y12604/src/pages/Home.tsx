import { useEffect } from 'react'
import CalibrationCanvas from '@/components/CalibrationCanvas'
import ControlBar from '@/components/ControlBar'
import EquipmentPanel from '@/components/EquipmentPanel'
import AnomalyBar from '@/components/AnomalyBar'
import { useGameStore } from '@/store/gameStore'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const phase = useGameStore((s) => s.phase)
  const loadFromStorage = useGameStore((s) => s.loadFromStorage)
  const navigate = useNavigate()

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  useEffect(() => {
    if (phase === 'settled') {
      navigate('/settlement')
    }
  }, [phase, navigate])

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <ControlBar />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col">
          <div className="flex-1 p-4">
            <CalibrationCanvas />
          </div>
          <div className="px-4 pb-4">
            <AnomalyBar />
          </div>
        </div>
        <div className="w-80 shrink-0 border-l border-slate-200 bg-white p-4">
          <EquipmentPanel />
        </div>
      </div>
    </div>
  )
}
