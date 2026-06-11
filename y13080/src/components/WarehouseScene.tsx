import { useReviewStore } from '@/store/useReviewStore'
import { useMemo } from 'react'
import type { WarehouseLocation } from '@/types'

const statusColors: Record<string, string> = {
  normal: 'border-green-500/60 bg-green-900/20 hover:bg-green-800/30',
  warning: 'border-danger-500/60 bg-danger-900/30 hover:bg-danger-800/40',
  danger: 'border-red-500/70 bg-red-900/40 hover:bg-red-800/50',
}

const statusGlow: Record<string, string> = {
  normal: '',
  warning: 'shadow-[0_0_15px_rgba(255,122,41,0.4)]',
  danger: 'shadow-[0_0_20px_rgba(239,68,68,0.5)]',
}

export function WarehouseScene() {
  const {
    filteredLocations,
    selectedLocationId,
    selectLocation,
    currentView,
    hasBadData,
    getLocationBadData,
  } = useReviewStore()

  const groupedLocations = useMemo(() => {
    const groups: Record<string, WarehouseLocation[]> = {}
    filteredLocations.forEach(loc => {
      const key = loc.area
      if (!groups[key]) groups[key] = []
      groups[key].push(loc)
    })
    return groups
  }, [filteredLocations])

  const getUsagePercent = (loc: WarehouseLocation) => {
    return ((loc.used / loc.capacity) * 100).toFixed(1)
  }

  const renderLocationCell = (loc: WarehouseLocation) => {
    const isSelected = selectedLocationId === loc.id
    const locBadData = getLocationBadData(loc.id)
    const hasIssue = locBadData.length > 0

    return (
      <div
        key={loc.id}
        onClick={() => selectLocation(loc.id)}
        className={`
          relative p-3 border-2 cursor-pointer transition-all duration-300
          ${statusColors[loc.status]}
          ${isSelected ? 'ring-2 ring-wharf-400 scale-105 ' + statusGlow[loc.status] : ''}
          ${hasIssue ? 'animate-pulse-slow' : ''}
        `}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs font-bold text-wharf-100">{loc.code}</span>
          <span className={`status-dot status-dot-${loc.status}`} />
        </div>

        <div className="text-xs text-steel-300 mb-1">
          {loc.hazardClass || '未分类'}
        </div>

        <div className="w-full h-1.5 bg-steel-700/50 mb-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              loc.status === 'danger' ? 'bg-red-500' :
              loc.status === 'warning' ? 'bg-danger-400' : 'bg-green-500'
            }`}
            style={{ width: `${getUsagePercent(loc)}%` }}
          />
        </div>

        <div className="font-mono text-[10px] text-steel-400">
          {loc.used}/{loc.capacity} m³
        </div>

        {hasIssue && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] 
                         font-bold rounded-full flex items-center justify-center animate-blink">
            {locBadData.length}
          </div>
        )}

        {isSelected && (
          <div className="absolute inset-0 border border-wharf-400 pointer-events-none">
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-wharf-300" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-wharf-300" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-wharf-300" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-wharf-300" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="panel flex-1 flex flex-col overflow-hidden">
      <div className="panel-header">
        <span className="panel-title">
          库区场景图
          <span className="ml-2 text-steel-400 font-normal">
            （{currentView === 'byArea' ? '按库区视角' : 
                 currentView === 'byHazard' ? '按危险等级视角' : '按时间轴视角'}）
          </span>
        </span>
        <div className="flex items-center gap-4 text-xs text-steel-400">
          <span className="flex items-center gap-1.5">
            <span className="status-dot status-dot-normal" /> 正常
          </span>
          <span className="flex items-center gap-1.5">
            <span className="status-dot status-dot-warning" /> 预警
          </span>
          <span className="flex items-center gap-1.5">
            <span className="status-dot status-dot-danger" /> 危险
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-red-500 rounded-full text-white text-[10px] 
                           flex items-center justify-center font-bold">!</span> 有异常
          </span>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto grid-bg relative scanline">
        <div className="flex gap-8 h-full">
          {Object.entries(groupedLocations).map(([area, locations]) => (
            <div key={area} className="flex flex-col">
              <div className="mb-4 flex items-center gap-3">
                <div className="w-1 h-5 bg-wharf-400" />
                <h3 className="font-mono text-base font-bold text-wharf-200">{area}</h3>
                <span className="text-xs text-steel-500">共 {locations.length} 个库位</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {locations.map(loc => renderLocationCell(loc))}
              </div>
            </div>
          ))}
        </div>

        {filteredLocations.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-steel-500">
            暂无符合条件的库位
          </div>
        )}
      </div>
    </div>
  )
}
