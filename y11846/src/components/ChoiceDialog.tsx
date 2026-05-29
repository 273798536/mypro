import { Crosshair } from 'lucide-react'
import type { ChoicePoint } from '@/types/game'

interface ChoiceDialogProps {
  choicePoint: ChoicePoint | null
  onSelect: (index: number) => void
}

export default function ChoiceDialog({ choicePoint, onSelect }: ChoiceDialogProps) {
  if (!choicePoint) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[520px] rounded-xl bg-slate-900 border border-slate-700 shadow-[0_0_40px_rgba(6,214,160,0.15)] p-6 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Crosshair size={20} className="text-cyan-400" />
          <h3 className="text-lg font-bold text-slate-100">{choicePoint.prompt}</h3>
        </div>

        <div className="flex gap-4">
          {choicePoint.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(idx)}
              className="flex-1 flex flex-col items-start gap-3 p-4 rounded-lg bg-slate-800/80 border border-slate-600/60 text-left transition-all hover:border-[#06d6a0] hover:shadow-[0_0_20px_rgba(6,214,160,0.2)] hover:bg-slate-800 group"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-base font-semibold text-slate-100 group-hover:text-[#06d6a0] transition-colors">
                  {opt.label}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  风力 ×{opt.windMultiplier}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {opt.description}
              </p>

              <div className="w-full flex items-center gap-1 mt-1">
                <span className="text-[10px] text-slate-500">途经航点:</span>
                <span className="text-[10px] text-slate-300">
                  {opt.waypoints.map(w => w.label).join(' → ')}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
