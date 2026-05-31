import { useStore } from '@/store/index'
import { User, Box, MapPin, X, ChevronRight } from 'lucide-react'

const TYPE_CONFIG: Record<
  string,
  { icon: typeof User; color: string; borderColor: string; bg: string; label: string }
> = {
  musician_block: {
    icon: User,
    color: 'text-[#d4a855]',
    borderColor: 'border-[#d4a855]/30',
    bg: 'bg-[#d4a855]/5',
    label: '乐手遮挡',
  },
  material_block: {
    icon: Box,
    color: 'text-[#5b9bd5]',
    borderColor: 'border-[#5b9bd5]/30',
    bg: 'bg-[#5b9bd5]/5',
    label: '材料遮挡',
  },
  position_offset: {
    icon: MapPin,
    color: 'text-[#e07060]',
    borderColor: 'border-[#e07060]/30',
    bg: 'bg-[#e07060]/5',
    label: '位置偏移',
  },
}

export function OcclusionPanel() {
  const occlusions = useStore((s) => s.occlusions)
  const selectMusician = useStore((s) => s.selectMusician)
  const isOpen = useStore((s) => s.occlusionPanelOpen)
  const toggle = useStore((s) => s.toggleOcclusionPanel)

  if (!isOpen) return null

  return (
    <div className="fixed top-0 right-0 h-full w-96 bg-[#0a0e1a] border-l border-[#1e2a42] shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
      <div className="flex items-center justify-between p-4 border-b border-[#1e2a42]">
        <h2 className="text-white text-base font-semibold">声部遮挡检测</h2>
        <button
          onClick={toggle}
          className="p-1 rounded hover:bg-[#1e2a42] transition-colors"
        >
          <X className="w-5 h-5 text-[#5a6580]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {occlusions.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-emerald-400 text-sm">未检测到声部遮挡</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {occlusions.map((occ) => {
              const config = TYPE_CONFIG[occ.type]
              if (!config) return null
              const Icon = config.icon

              return (
                <button
                  key={occ.id}
                  onClick={() => selectMusician(occ.sourceId)}
                  className={`rounded-lg border ${config.borderColor} ${config.bg} p-3 text-left w-full transition-colors hover:brightness-110`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <span className={`text-xs font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </div>

                  <p className="text-white text-sm leading-relaxed mb-1.5">
                    {occ.reason}
                  </p>

                  <div className="flex items-start gap-1.5">
                    <ChevronRight className={`w-3.5 h-3.5 ${config.color} mt-0.5 shrink-0`} />
                    <p className="text-[#8a94a8] text-xs leading-relaxed">
                      {occ.suggestion}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
