import { useMemo } from 'react'
import { useGameStore } from '@/store/gameStore'
import { X, Waves, AlertTriangle } from 'lucide-react'

interface TideTableDrawerProps {
  open: boolean
  onClose: () => void
}

const TIDE_TYPE_LABELS: Record<string, string> = {
  high: '高潮',
  low: '低潮',
  rising: '涨潮',
  falling: '退潮',
}

const TIDE_TYPE_COLORS: Record<string, string> = {
  high: 'bg-tide-cyan/20 text-tide-cyan',
  low: 'bg-fuel-red/20 text-fuel-red',
  rising: 'bg-blue-500/20 text-blue-400',
  falling: 'bg-warn-amber/20 text-warn-amber',
}

export default function TideTableDrawer({ open, onClose }: TideTableDrawerProps) {
  const ports = useGameStore(s => s.ports)
  const tideTables = useGameStore(s => s.tideTables)
  const session = useGameStore(s => s.session)

  const tableData = useMemo(() => {
    return ports.map(port => {
      const table = tideTables.find(t => t.portId === port.id)
      return {
        port,
        table,
        missingRanges: table?.missingRanges ?? [],
      }
    })
  }, [ports, tideTables])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 w-[420px] max-w-[90vw] bg-deep-sea border-l border-ocean-light/30 z-50 animate-slide-in-right flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ocean-light/20">
          <div className="flex items-center gap-2">
            <Waves size={18} className="text-tide-cyan" />
            <h2 className="font-serif-sc font-bold text-base text-slate-100">潮汐时刻表</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-ocean-mid transition-colors text-dock-gray hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {tableData.map(({ port, table, missingRanges }) => (
            <div key={port.id} className="rounded-lg border border-ocean-light/20 bg-ocean-dark/60 overflow-hidden">
              <div className="px-3 py-2 bg-ocean-mid/50 border-b border-ocean-light/15">
                <h3 className="font-serif-sc text-sm font-bold text-slate-200">{port.name}</h3>
              </div>

              <div className="px-3 py-2">
                <div className="flex gap-0.5 mb-1.5">
                  {Array.from({ length: session.totalRounds }, (_, i) => i + 1).map(round => {
                    const entry = table?.entries.find(e => e.round === round)
                    const isMissing = missingRanges.some(mr => mr.startRound <= round && mr.endRound >= round)
                    const isCurrent = round === session.currentRound

                    if (isMissing) {
                      return (
                        <div
                          key={round}
                          className={`
                            flex-1 min-w-[40px] h-10 rounded-sm border-2 border-dashed border-fuel-red/60
                            flex flex-col items-center justify-center
                            ${isCurrent ? 'ring-1 ring-warn-amber' : ''}
                            animate-blink-red
                          `}
                        >
                          <AlertTriangle size={10} className="text-fuel-red" />
                          <span className="text-[8px] text-fuel-red font-sans-sc">缺失</span>
                        </div>
                      )
                    }

                    if (!entry) {
                      return (
                        <div
                          key={round}
                          className={`flex-1 min-w-[40px] h-10 rounded-sm bg-dock-gray/10 flex flex-col items-center justify-center ${isCurrent ? 'ring-1 ring-warn-amber' : ''}`}
                        >
                          <span className="text-[9px] text-dock-gray font-sans-sc">--</span>
                        </div>
                      )
                    }

                    const isDangerous = entry.dangerous
                    const bgClass = isDangerous
                      ? 'bg-fuel-red/15 border-fuel-red/40'
                      : entry.dockable
                      ? 'bg-tide-cyan/10 border-tide-cyan/30'
                      : 'bg-warn-amber/10 border-warn-amber/30'

                    return (
                      <div
                        key={round}
                        className={`
                          flex-1 min-w-[40px] h-10 rounded-sm border ${bgClass}
                          flex flex-col items-center justify-center
                          ${isCurrent ? 'ring-2 ring-tide-cyan' : ''}
                          ${isDangerous ? 'animate-blink-amber' : ''}
                        `}
                      >
                        <span className={`text-[9px] font-sans-sc font-medium px-1 rounded ${TIDE_TYPE_COLORS[entry.type]}`}>
                          {TIDE_TYPE_LABELS[entry.type]}
                        </span>
                        <span className="text-[8px] text-slate-500 font-sans-sc">
                          Lv.{entry.level}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center gap-3 text-[9px] font-sans-sc text-dock-gray">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-tide-cyan/40" />可停靠
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-warn-amber/40" />不可停靠
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-fuel-red/40" />危险
                  </span>
                </div>

                {missingRanges.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {missingRanges.map((mr, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 px-2 py-1 rounded bg-fuel-red/10 border border-fuel-red/20">
                        <AlertTriangle size={10} className="text-fuel-red shrink-0" />
                        <span className="text-[10px] font-sans-sc text-fuel-red">
                          第{mr.startRound}-{mr.endRound}回合数据缺失：{mr.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-ocean-light/20 text-[10px] font-sans-sc text-dock-gray text-center">
          当前回合: {session.currentRound} / {session.totalRounds}
        </div>
      </div>
    </>
  )
}
