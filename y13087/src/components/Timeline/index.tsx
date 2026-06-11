import { STAGE_LIST } from '@/types'
import type { ReviewStage } from '@/types'
import { useReviewStore } from '@/store/useReviewStore'
import { cn } from '@/lib/utils'

export function Timeline() {
  const currentStage = useReviewStore((s) => s.currentStage)
  const setCurrentStage = useReviewStore((s) => s.setCurrentStage)

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl px-8 py-4 border border-white/10 shadow-xl">
        <div className="flex items-center gap-1">
          {STAGE_LIST.map((stage, index) => (
            <div key={stage.id} className="flex items-center">
              <button
                onClick={() => setCurrentStage(stage.id as ReviewStage)}
                className={cn(
                  'relative flex flex-col items-center gap-2 px-4 py-2 transition-all duration-300',
                  currentStage === stage.id ? 'scale-105' : 'opacity-60 hover:opacity-100'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                    currentStage === stage.id
                      ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                      : 'bg-white/10 text-slate-400'
                  )}
                >
                  {index + 1}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    currentStage === stage.id ? 'text-cyan-400' : 'text-slate-500'
                  )}
                >
                  {stage.name}
                </span>
                {currentStage === stage.id && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                )}
              </button>
              {index < STAGE_LIST.length - 1 && (
                <div
                  className={cn(
                    'w-16 h-0.5 mx-2',
                    STAGE_LIST.findIndex((s) => s.id === currentStage) > index
                      ? 'bg-cyan-500'
                      : 'bg-white/10'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
