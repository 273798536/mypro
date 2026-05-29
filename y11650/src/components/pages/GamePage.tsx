import { useNavigate, useParams } from 'react-router-dom'
import { useGameStore } from '../../store/useGameStore'
import { getLevelById } from '../../data/levels'
import { DISHES } from '../../data/dishes'
import { useEffect, useState } from 'react'
import GameBoard from '../game/GameBoard'

export default function GamePage() {
  const { levelId } = useParams<{ levelId: string }>()
  const navigate = useNavigate()
  const startGame = useGameStore(s => s.startGame)
  const phase = useGameStore(s => s.phase)
  const getSession = useGameStore(s => s.getSession)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (levelId && !started) {
      const level = getLevelById(levelId)
      if (level) {
        startGame(levelId)
        setStarted(true)
      } else {
        navigate('/')
      }
    }
  }, [levelId])

  useEffect(() => {
    if (phase === 'ended' && started) {
      const session = getSession()
      navigate(`/result/${session.id}`, { state: { sessionId: session.id, levelId } })
    }
  }, [phase, started])

  if (!started || phase === 'idle') {
    return (
      <div className="min-h-screen bg-cafeteria-bg flex items-center justify-center">
        <div className="text-center">
          <div className="font-display text-3xl text-primary mb-2 animate-bounce-in">🍱</div>
          <p className="text-gray-500">准备中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-cafeteria-bg">
      <GameBoard />
    </div>
  )
}
