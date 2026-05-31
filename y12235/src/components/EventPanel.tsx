import { Zap, Shield, TrendingDown, AlertTriangle } from 'lucide-react'
import type { EventCard, EventType } from '@/types'
import { cn } from '@/lib/utils'

interface EventPanelProps {
  events: EventCard[]
  activeEventIds: string[]
  onToggleEvent: (eventId: string) => void
}

const riskColors: Record<EventCard['riskLevel'], string> = {
  high: '#E53935',
  medium: '#FF6D00',
  low: '#43A047',
}

const eventIcons: Record<EventType, typeof Zap> = {
  rate_hike: TrendingDown,
  liquidity_crisis: Zap,
  recession: AlertTriangle,
  credit_spread: Shield,
}

export default function EventPanel({ events, activeEventIds, onToggleEvent }: EventPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-[#D4A017]" />
        <span className="text-[#D4A017]">事件面板</span>
      </h2>

      <div className="flex-1 overflow-y-auto space-y-0 pr-1">
        {events.map((evt, idx) => {
          const isActive = activeEventIds.includes(evt.id)
          const Icon = eventIcons[evt.eventType]
          const { shortEndShift, longEndShift, spreadWidening } = evt.curveImpact

          return (
            <div key={evt.id} className="relative flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className="w-3 h-3 rounded-full shrink-0 mt-3 border-2 border-[#0A1628]"
                  style={{ backgroundColor: riskColors[evt.riskLevel] }}
                />
                {idx < events.length - 1 && (
                  <div className="w-px flex-1 bg-[#1E3A5F] mt-1" />
                )}
              </div>

              <button
                type="button"
                onClick={() => onToggleEvent(evt.id)}
                className={cn(
                  'flex-1 text-left rounded-lg border mb-3 p-3 transition-all duration-300',
                  'bg-[#0F1F3A] border-[#1E3A5F]',
                  isActive
                    ? 'border-l-[#D4A017] border-l-[3px] opacity-100 shadow-[0_0_12px_rgba(212,160,23,0.15)]'
                    : 'opacity-60 hover:opacity-80'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Icon size={14} style={{ color: riskColors[evt.riskLevel] }} />
                    <span className="font-bold text-white text-sm">{evt.label}</span>
                  </div>
                  {isActive ? (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#D4A017]/20 text-[#D4A017] shrink-0">
                      已激活
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 shrink-0">点击激活</span>
                  )}
                </div>

                <p className="text-xs text-gray-400 mb-2 leading-relaxed">{evt.description}</p>

                <table className="w-full text-[11px]">
                  <tbody>
                    <tr className="border-b border-[#1E3A5F]/50">
                      <td className="py-0.5 text-gray-400 pr-2">短端位移</td>
                      <td className="py-0.5 text-right font-mono text-white">
                        {shortEndShift > 0 ? '+' : ''}{shortEndShift}bp
                      </td>
                    </tr>
                    <tr className="border-b border-[#1E3A5F]/50">
                      <td className="py-0.5 text-gray-400 pr-2">长端位移</td>
                      <td className="py-0.5 text-right font-mono text-white">
                        {longEndShift > 0 ? '+' : ''}{longEndShift}bp
                      </td>
                    </tr>
                    <tr>
                      <td className="py-0.5 text-gray-400 pr-2">信用利差</td>
                      <td className="py-0.5 text-right font-mono text-white">
                        {spreadWidening > 0 ? '+' : ''}{spreadWidening}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
