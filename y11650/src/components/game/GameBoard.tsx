import { useEffect, useRef } from 'react'
import { useGameStore } from '../../store/useGameStore'
import GameHeader from './GameHeader'
import OrderQueue from './OrderQueue'
import PrepStation from './PrepStation'
import PickupWindow from './PickupWindow'
import FloatingFeedback from './FloatingFeedback'

export default function GameBoard() {
  const phase = useGameStore(s => s.phase)
  const tick = useGameStore(s => s.tick)
  const levelId = useGameStore(s => s.levelId)
  const lastFrameRef = useRef<number>(0)
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    if (phase !== 'playing') return

    const loop = (timestamp: number) => {
      if (lastFrameRef.current === 0) {
        lastFrameRef.current = timestamp
      }
      const dt = (timestamp - lastFrameRef.current) / 1000
      lastFrameRef.current = timestamp

      if (dt > 0 && dt < 0.5) {
        tick(dt)
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    lastFrameRef.current = 0
    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [phase, tick])

  if (phase === 'idle') {
    return null
  }

  if (phase === 'paused') {
    return (
      <div className="h-full flex flex-col gap-3 p-4">
        <GameHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center bg-white/90 rounded-2xl p-8 shadow-xl">
            <div className="font-display text-4xl text-primary mb-4">⏸️ 暂停中</div>
            <p className="text-gray-500">点击继续按钮恢复游戏</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4 min-h-screen">
      <GameHeader />

      <OrderQueue />

      <PrepStation />

      <PickupWindow />

      <FloatingFeedback />
    </div>
  )
}
