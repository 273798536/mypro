import { useEffect, useState } from 'react'
import { useGameStore } from '../../store/useGameStore'

export default function FloatingFeedback() {
  const floatingScores = useGameStore(s => s.floatingScores)

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {floatingScores.map(fs => (
        <div
          key={fs.id}
          className={`absolute animate-float-up font-display text-xl font-bold ${
            fs.type === 'correct' ? 'text-success' : 'text-danger'
          }`}
          style={{ left: fs.x, top: fs.y }}
        >
          {fs.points > 0 ? '+' : ''}{fs.points}
          {fs.type === 'correct' ? ' ✅' : ' ❌'}
        </div>
      ))}
    </div>
  )
}
