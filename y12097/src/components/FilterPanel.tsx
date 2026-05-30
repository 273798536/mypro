import { Layers, MapPin, Thermometer, Fan, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import type { ProbeStatus, FanStatus } from '@/types'
import { cn } from '@/lib/utils'

const layerOptions = [1, 2, 3, 4]
const areaOptions = ['A区', 'B区']
const probeStatusOptions: { value: ProbeStatus; label: string; color: string }[] = [
  { value: 'online', label: '在线', color: 'bg-cyan-500' },
  { value: 'offline', label: '离线', color: 'bg-red-500' },
  { value: 'overtemp', label: '超温', color: 'bg-orange-500' },
]
const fanStatusOptions: { value: FanStatus; label: string; color: string }[] = [
  { value: 'running', label: '运行', color: 'bg-blue-500' },
  { value: 'stopped', label: '停转', color: 'bg-red-500' },
]

export default function FilterPanel() {
  const { filters, toggleLayer, toggleArea, toggleProbeStatus, toggleFanStatus, resetFilters, leftPanelOpen, toggleLeftPanel } =
    useAppStore()

  return (
    <div
      className={cn(
        'absolute left-0 top-0 bottom-0 z-20 transition-all duration-300',
        leftPanelOpen ? 'w-64' : 'w-12'
      )}
    >
      <button
        onClick={toggleLeftPanel}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-12 bg-slate-800/90 border border-slate-700 rounded-r-lg flex items-center justify-center hover:bg-slate-700 transition-colors"
      >
        {leftPanelOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      <div
        className={cn(
          'h-full bg-slate-900/90 backdrop-blur-sm border-r border-slate-700 overflow-hidden transition-all duration-300',
          leftPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">参数筛选</h2>
          <button
            onClick={resetFilters}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="重置筛选"
          >
            <RotateCcw size={14} className="text-slate-400" />
          </button>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto h-[calc(100%-57px)]">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Layers size={14} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-300">层号</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {layerOptions.map((layer) => (
                <button
                  key={layer}
                  onClick={() => toggleLayer(layer)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    filters.layers.includes(layer)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  )}
                >
                  L{layer}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={14} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-300">区域</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {areaOptions.map((area) => (
                <button
                  key={area}
                  onClick={() => toggleArea(area)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    filters.areas.includes(area)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  )}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Thermometer size={14} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-300">探头状态</span>
            </div>
            <div className="space-y-2">
              {probeStatusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleProbeStatus(option.value)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all',
                    filters.probeStatuses.includes(option.value)
                      ? 'bg-slate-700 text-slate-200'
                      : 'bg-slate-800/50 text-slate-500 hover:bg-slate-700/50'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full', option.color)} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Fan size={14} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-300">风机状态</span>
            </div>
            <div className="space-y-2">
              {fanStatusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleFanStatus(option.value)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all',
                    filters.fanStatuses.includes(option.value)
                      ? 'bg-slate-700 text-slate-200'
                      : 'bg-slate-800/50 text-slate-500 hover:bg-slate-700/50'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full', option.color)} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <div className="text-xs text-slate-500">
              筛选后，3D温场、探头高亮和异常说明将同步更新
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
