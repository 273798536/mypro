import { useReviewStore } from '@/store/useReviewStore'
import { useMemo } from 'react'
import type { WarehouseLocation, TimelineRecord } from '@/types'
import { Clock, AlertTriangle, MapPin } from 'lucide-react'
import { generateDescriptions } from '@/utils/generateDescription'

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

interface GroupItem {
  title: string
  locations: WarehouseLocation[]
  summary?: string
  tint?: string
}

const groupedByArea = (locs: WarehouseLocation[]): GroupItem[] => {
  const groups: Record<string, WarehouseLocation[]> = {}
  locs.forEach(loc => {
    if (!groups[loc.area]) groups[loc.area] = []
    groups[loc.area].push(loc)
  })
  return Object.entries(groups)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([area, items]) => ({
      title: area,
      locations: items.sort((a, b) => a.code.localeCompare(b.code)),
      summary: `共 ${items.length} 个库位`,
    }))
}

const groupedByHazard = (locs: WarehouseLocation[]): GroupItem[] => {
  const groups: Record<string, WarehouseLocation[]> = {}
  locs.forEach(loc => {
    const key = loc.hazardClass || '未分类'
    if (!groups[key]) groups[key] = []
    groups[key].push(loc)
  })
  const order = ['1类','2类','3类','4类','5类','6类','7类','8类','9类','未分类']
  return order
    .filter(k => groups[k])
    .map(hc => {
      const items = groups[hc].sort((a, b) => a.code.localeCompare(b.code))
      const warnCount = items.filter(l => l.status !== 'normal').length
      return {
        title: hc,
        locations: items,
        summary: `${items.length} 库位${warnCount ? '，异常 ' + warnCount : ''}`,
        tint: hc === '1类' || hc === '2类' || hc === '7类' ? 'danger' : undefined,
      }
    })
}

const groupedByTimeline = (locs: WarehouseLocation[], timelineRecords: TimelineRecord[]): GroupItem[] => {
  const withGap: WarehouseLocation[] = []
  const withoutGap: WarehouseLocation[] = []
  const noRecords: WarehouseLocation[] = []

  locs.forEach(loc => {
    const tl = timelineRecords.filter(t => t.locationId === loc.id)
    if (tl.length === 0) {
      noRecords.push(loc)
    } else if (tl.some(t => t.hasGap)) {
      withGap.push(loc)
    } else {
      withoutGap.push(loc)
    }
  })

  const byGapDuration = (a: WarehouseLocation, b: WarehouseLocation) => {
    const gapA = timelineRecords
      .filter(t => t.locationId === a.id)
      .reduce((s, t) => s + t.gapDuration, 0)
    const gapB = timelineRecords
      .filter(t => t.locationId === b.id)
      .reduce((s, t) => s + t.gapDuration, 0)
    return gapB - gapA
  }

  const result: GroupItem[] = []
  if (withGap.length > 0) {
    result.push({
      title: '⚠️ 时间轴缺段',
      locations: withGap.sort(byGapDuration),
      summary: `${withGap.length} 个库位存在缺段`,
      tint: 'danger',
    })
  }
  if (withoutGap.length > 0) {
    result.push({
      title: '✅ 记录完整',
      locations: withoutGap.sort((a, b) => a.code.localeCompare(b.code)),
      summary: `${withoutGap.length} 个库位记录连续`,
    })
  }
  if (noRecords.length > 0) {
    result.push({
      title: '❓ 无时间记录',
      locations: noRecords.sort((a, b) => a.code.localeCompare(b.code)),
      summary: `${noRecords.length} 个库位暂无记录`,
      tint: 'danger',
    })
  }
  return result
}

export function WarehouseScene() {
  const {
    filteredLocations,
    selectedLocationId,
    selectLocation,
    currentView,
    getLocationBadData,
    timelineRecords,
    selectedLocation,
    selectedComments,
    selectedTimeline,
  } = useReviewStore()

  const descriptions = useMemo(
    () => generateDescriptions(selectedLocation, selectedComments, selectedTimeline, currentView),
    [selectedLocation, selectedComments, selectedTimeline, currentView]
  )

  const getUsagePercent = (loc: WarehouseLocation) => {
    return ((loc.used / loc.capacity) * 100).toFixed(1)
  }

  const getLocationTimeline = (locId: string): TimelineRecord[] => {
    return timelineRecords
      .filter(t => t.locationId === locId)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  const groups: GroupItem[] = useMemo(() => {
    const locs = filteredLocations
    if (currentView === 'byHazard') return groupedByHazard(locs)
    if (currentView === 'byTimeline') return groupedByTimeline(locs, timelineRecords)
    return groupedByArea(locs)
  }, [filteredLocations, currentView, timelineRecords])

  const viewTitle = {
    byArea: '按库区视角',
    byHazard: '按危险等级视角',
    byTimeline: '按时间轴视角',
  }[currentView]

  const viewIcon = currentView === 'byTimeline'
    ? <Clock size={14} className="inline mr-1" />
    : currentView === 'byHazard'
      ? <AlertTriangle size={14} className="inline mr-1" />
      : <MapPin size={14} className="inline mr-1" />

  const renderLocationCell = (loc: WarehouseLocation) => {
    const isSelected = selectedLocationId === loc.id
    const locBadData = getLocationBadData(loc.id)
    const hasIssue = locBadData.length > 0
    const locTimeline = getLocationTimeline(loc.id)
    const totalGap = locTimeline.reduce((s, t) => s + t.gapDuration, 0)
    const firstTime = locTimeline[0]?.startTime
    const lastTime = locTimeline[locTimeline.length - 1]?.endTime

    const showTimelineInfo = currentView === 'byTimeline'
    const showAreaInfo = currentView === 'byHazard'

    return (
      <div
        key={loc.id}
        onClick={() => selectLocation(loc.id)}
        className={`
          relative p-3 border-2 cursor-pointer transition-all duration-300
          ${statusColors[loc.status]}
          ${isSelected ? 'ring-2 ring-wharf-400 scale-[1.02] ' + statusGlow[loc.status] : ''}
          ${hasIssue ? 'animate-pulse-slow' : ''}
        `}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs font-bold text-wharf-100">{loc.code}</span>
          <span className={`status-dot status-dot-${loc.status}`} />
        </div>

        <div className="text-xs text-steel-300 mb-1 flex items-center justify-between">
          <span>
            {showAreaInfo ? loc.area : (loc.hazardClass || '未分类')}
          </span>
          {showTimelineInfo && totalGap > 0 && (
            <span className="text-danger-400 font-mono text-[10px]">
              -{totalGap.toFixed(1)}h
            </span>
          )}
        </div>

        {showTimelineInfo && locTimeline.length > 0 && (
          <div className="text-[10px] text-steel-400 font-mono mb-1.5">
            {firstTime}-{lastTime}
          </div>
        )}

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
          <div className="absolute inset-0 pointer-events-none">
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
            （{viewIcon}{viewTitle}）
          </span>
          <span className="ml-3 text-[11px] text-wharf-300 font-normal font-sans">
            场景标注：<span className="text-steel-200 font-mono">{descriptions.annotation}</span>
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
        <div className="flex gap-8 h-full flex-wrap">
          {groups.map(group => (
            <div key={group.title} className="flex flex-col">
              <div className="mb-4 flex items-center gap-3">
                <div className={`w-1 h-5 ${
                  group.tint === 'danger' ? 'bg-red-400' : 'bg-wharf-400'
                }`} />
                <h3 className={`font-mono text-base font-bold ${
                  group.tint === 'danger' ? 'text-red-300' : 'text-wharf-200'
                }`}>
                  {group.title}
                </h3>
                <span className="text-xs text-steel-500">{group.summary}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {group.locations.map(loc => renderLocationCell(loc))}
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
