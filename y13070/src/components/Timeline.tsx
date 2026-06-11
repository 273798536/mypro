import { useState } from 'react'
import { useReviewStore } from '@/store'

export default function Timeline() {
  const { reviewRounds, currentRoundId, setCurrentRoundId } = useReviewStore()
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className="w-full flex items-center gap-1 px-4 py-2 bg-[#1a2332]">
      {reviewRounds.map((round) => {
        const isActive = round.id === currentRoundId
        const isHovered = round.id === hoveredId
        return (
          <div
            key={round.id}
            className="relative flex-1 cursor-pointer"
            onMouseEnter={() => setHoveredId(round.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => setCurrentRoundId(round.id)}
          >
            <div
              className={`h-8 rounded flex items-center justify-center text-sm transition-all ${
                isActive
                  ? 'bg-[#60a5fa] text-white shadow-lg shadow-blue-500/20 animate-pulse'
                  : 'bg-[#2a3544] text-gray-400 hover:bg-[#3a4a5c]'
              }`}
            >
              {round.name}
            </div>
            {isHovered && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
                <div className="font-medium">{round.name}</div>
                <div className="text-gray-400">{round.startDate} ~ {round.endDate}</div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
