import { CloudRain } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RainfallCard } from '@/types/game'

interface RainfallCardsProps {
  cards: RainfallCard[]
  currentRound: number
}

export default function RainfallCards({ cards, currentRound }: RainfallCardsProps) {
  const sorted = [...cards].sort((a, b) => a.arrivalOrder - b.arrivalOrder)

  return (
    <div className="flex gap-3">
      {sorted.map((card) => {
        const revealed = card.arrivalOrder <= currentRound
        const justArrived = card.arrivalOrder === currentRound
        const active = revealed && currentRound < card.arrivalOrder + card.duration

        return (
          <div
            key={card.id}
            className={cn(
              'w-[140px] rounded-lg p-3 text-center transition-all duration-300',
              revealed ? 'bg-blue-900 text-white' : 'bg-slate-800 text-slate-500',
              justArrived && 'animate-[flipIn_0.5s_ease-out] shadow-[0_0_12px_rgba(59,130,246,0.6)]',
              active && 'animate-pulse border-2 border-blue-400',
              !revealed && !justArrived && 'border border-slate-700',
            )}
          >
            {revealed ? (
              <>
                <CloudRain className="mx-auto mb-1 h-6 w-6 text-blue-300" />
                <div className="text-lg font-bold">{card.rainfallIntensity}mm/h</div>
                <div className="mt-1 text-xs text-blue-200">{card.description}</div>
                <span className="mt-2 inline-block rounded-full bg-blue-700 px-2 py-0.5 text-xs">
                  第{card.arrivalOrder}轮到达
                </span>
              </>
            ) : (
              <div className="flex h-24 flex-col items-center justify-center">
                <span className="text-3xl">?</span>
                <span className="mt-1 text-xs">第{card.arrivalOrder}轮</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
