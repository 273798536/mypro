import { useEffect, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, AlertTriangle, Thermometer, Fan, Package } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { timelinePoints, generateAnomalies } from '@/data/mockData'
import type { AnomalyType } from '@/types'
import { cn } from '@/lib/utils'

const anomalyTypeConfig: Record<AnomalyType, { icon: typeof AlertTriangle; color: string; bgColor: string }> = {
  probe_offline: { icon: Thermometer, color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/50' },
  fan_stopped: { icon: Fan, color: 'text-orange-400', bgColor: 'bg-orange-500/20 border-orange-500/50' },
  product_occlusion: { icon: Package, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 border-yellow-500/50' },
}

function Timeline() {
  const { currentTimeIndex, isPlaying, setTimeIndex, togglePlay, setIsPlaying } = useAppStore()
  const progressRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now()
      const animate = (now: number) => {
        if (now - lastTimeRef.current >= 1500) {
          lastTimeRef.current = now
          setTimeIndex((prev) => {
            if (prev >= timelinePoints.length - 1) {
              setIsPlaying(false)
              return 0
            }
            return prev + 1
          })
        }
        animationRef.current = requestAnimationFrame(animate)
      }
      animationRef.current = requestAnimationFrame(animate)
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, setTimeIndex, setIsPlaying])

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newIndex = Math.round(percentage * (timelinePoints.length - 1))
    setTimeIndex(Math.max(0, Math.min(timelinePoints.length - 1, newIndex)))
    if (isPlaying) setIsPlaying(false)
  }

  const anomalyPositions = timelinePoints
    .map((point, index) => ({
      index,
      hasAnomaly: generateAnomalies(index).length > 0,
    }))
    .filter((p) => p.hasAnomaly)
    .map((p) => (p.index / (timelinePoints.length - 1)) * 100)

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setTimeIndex(0)}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          title="开始"
        >
          <SkipBack size={16} className="text-slate-400" />
        </button>
        <button
          onClick={togglePlay}
          className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white" />}
        </button>
        <button
          onClick={() => setTimeIndex(timelinePoints.length - 1)}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          title="结束"
        >
          <SkipForward size={16} className="text-slate-400" />
        </button>
      </div>

      <div className="flex-1">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{timelinePoints[0].label}</span>
          <span className="text-sm font-medium text-slate-300">
            {timelinePoints[currentTimeIndex].label}
          </span>
          <span>{timelinePoints[timelinePoints.length - 1].label}</span>
        </div>
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="relative h-2 bg-slate-700 rounded-full cursor-pointer overflow-visible"
        >
          {anomalyPositions.map((pos, i) => (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full"
              style={{ left: `calc(${pos}% - 4px)` }}
            />
          ))}
          <div
            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${(currentTimeIndex / (timelinePoints.length - 1)) * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-blue-500 transition-all"
            style={{ left: `calc(${(currentTimeIndex / (timelinePoints.length - 1)) * 100}% - 8px)` }}
          />
        </div>
      </div>
    </div>
  )
}

function AnomalyBar() {
  const { currentTimeIndex, filters, selectedAnomalyId, setSelectedAnomaly } = useAppStore()
  const anomalies = generateAnomalies(currentTimeIndex)

  const filteredAnomalies = anomalies.filter((a) => {
    if (a.type === 'probe_offline') {
      return filters.probeStatuses.includes('offline')
    }
    if (a.type === 'fan_stopped') {
      return filters.fanStatuses.includes('stopped')
    }
    return true
  })

  if (filteredAnomalies.length === 0) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        <span>当前时间点无异常</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-1">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
        <AlertTriangle size={12} className="text-amber-400" />
        异常事件 ({filteredAnomalies.length})
      </div>
      {filteredAnomalies.map((anomaly) => {
        const config = anomalyTypeConfig[anomaly.type]
        const Icon = config.icon
        return (
          <button
            key={anomaly.id}
            onClick={() => setSelectedAnomaly(selectedAnomalyId === anomaly.id ? null : anomaly.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs flex-shrink-0 transition-all',
              config.bgColor,
              selectedAnomalyId === anomaly.id && 'ring-2 ring-white/30'
            )}
          >
            <Icon size={12} className={config.color} />
            <span className={config.color}>
              {anomaly.type === 'probe_offline' && '探头离线'}
              {anomaly.type === 'fan_stopped' && '风机停转'}
              {anomaly.type === 'product_occlusion' && '货品遮挡'}
            </span>
            <span className="text-slate-500 text-[10px]">
              来源: {anomaly.sourceId}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default function BottomPanel() {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700">
      <div className="px-4 py-3 border-b border-slate-700/50">
        <AnomalyBar />
      </div>
      <div className="px-4 py-3">
        <Timeline />
      </div>
    </div>
  )
}
