import { useReviewStore } from '@/store/useReviewStore'
import { areas, hazardClasses, statuses } from '@/data/mockData'
import { Camera, AlertTriangle, RefreshCw, Layers } from 'lucide-react'
import html2canvas from 'html2canvas'
import { useRef } from 'react'
import type { ViewType } from '@/types'

interface TopToolbarProps {
  captureRef: React.RefObject<HTMLDivElement | null>
}

export function TopToolbar({ captureRef }: TopToolbarProps) {
  const {
    currentView,
    setView,
    filters,
    setFilter,
    resetFilters,
    badDataCount,
  } = useReviewStore()

  const views: { value: ViewType; label: string; icon: React.ReactNode }[] = [
    { value: 'byArea', label: '按库区', icon: <Layers size={16} /> },
    { value: 'byHazard', label: '按危险等级', icon: <AlertTriangle size={16} /> },
    { value: 'byTimeline', label: '按时间轴', icon: <RefreshCw size={16} /> },
  ]

  const handleExport = async () => {
    if (!captureRef.current) return

    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#061226',
        scale: 2,
      })

      const link = document.createElement('a')
      link.download = `码头危险品库空间复核_${new Date().toISOString().slice(0, 10)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('导出失败:', error)
    }
  }

  const goToBadData = () => {
    window.location.hash = '#/bad-data'
  }

  return (
    <div className="panel flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-danger-400 animate-pulse" />
          <h1 className="font-mono text-lg font-bold text-wharf-100 tracking-wider">
            码头危险品库空间复核
          </h1>
          <span className="tag tag-normal">运行中</span>
        </div>

        <div className="flex items-center gap-1 ml-6">
          {views.map(view => (
            <button
              key={view.value}
              onClick={() => setView(view.value)}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-all duration-200 border
                ${currentView === view.value
                  ? 'bg-wharf-600 text-white border-wharf-400/50 shadow-[0_0_12px_rgba(47,120,207,0.3)]'
                  : 'bg-transparent text-steel-300 border-steel-700/50 hover:bg-steel-700/30 hover:text-steel-100'
                }`}
            >
              {view.icon}
              {view.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <select
            value={filters.area || ''}
            onChange={e => setFilter('area', e.target.value || undefined)}
            className="bg-wharf-900/60 border border-steel-700/50 px-3 py-2 text-sm text-steel-200 
                       focus:outline-none focus:border-wharf-500"
          >
            <option value="">全部库区</option>
            {areas.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>

          <select
            value={filters.hazardClass || ''}
            onChange={e => setFilter('hazardClass', e.target.value || undefined)}
            className="bg-wharf-900/60 border border-steel-700/50 px-3 py-2 text-sm text-steel-200 
                       focus:outline-none focus:border-wharf-500"
          >
            <option value="">全部等级</option>
            {hazardClasses.map(hc => (
              <option key={hc} value={hc}>{hc}</option>
            ))}
          </select>

          <select
            value={filters.status || ''}
            onChange={e => setFilter('status', e.target.value || undefined)}
            className="bg-wharf-900/60 border border-steel-700/50 px-3 py-2 text-sm text-steel-200 
                       focus:outline-none focus:border-wharf-500"
          >
            <option value="">全部状态</option>
            {statuses.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <button
            onClick={resetFilters}
            className="btn-ghost flex items-center gap-2"
          >
            <RefreshCw size={14} />
            重置
          </button>
        </div>

        <div className="w-px h-8 bg-steel-700/50" />

        <button
          onClick={goToBadData}
          className="relative flex items-center gap-2 px-4 py-2 bg-danger-900/40 hover:bg-danger-800/50 
                     text-danger-300 border border-danger-600/50 text-sm transition-all duration-200
                     hover:shadow-[0_0_12px_rgba(255,122,41,0.3)]"
        >
          <AlertTriangle size={16} />
          坏数据专区
          {badDataCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold 
                           rounded-full flex items-center justify-center animate-pulse">
              {badDataCount}
            </span>
          )}
        </button>

        <button
          onClick={handleExport}
          className="btn-primary flex items-center gap-2"
        >
          <Camera size={16} />
          导出截图
        </button>
      </div>
    </div>
  )
}
