import { useReviewStore } from '@/store/useReviewStore'
import { areas, hazardClasses, statuses } from '@/data/mockData'
import { Camera, AlertTriangle, RefreshCw, Layers, Download, Check, X } from 'lucide-react'
import html2canvas from 'html2canvas'
import { useState } from 'react'
import type { ViewType } from '@/types'

interface TopToolbarProps {
  captureRef: React.RefObject<HTMLDivElement | null>
  onFlash?: () => void
}

type ToastState = { type: 'success' | 'error'; msg: string } | null

export function TopToolbar({ captureRef, onFlash }: TopToolbarProps) {
  const {
    currentView,
    setView,
    filters,
    setFilter,
    resetFilters,
    badDataCount,
    selectedLocation,
  } = useReviewStore()

  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  const views: { value: ViewType; label: string; icon: React.ReactNode }[] = [
    { value: 'byArea', label: '按库区', icon: <Layers size={16} /> },
    { value: 'byHazard', label: '按危险等级', icon: <AlertTriangle size={16} /> },
    { value: 'byTimeline', label: '按时间轴', icon: <RefreshCw size={16} /> },
  ]

  const showToast = (t: ToastState) => {
    setToast(t)
    if (t) setTimeout(() => setToast(null), 2600)
  }

  const viewFileLabel = {
    byArea: '按库区',
    byHazard: '按危险等级',
    byTimeline: '按时间轴',
  }[currentView]

  const handleExport = async () => {
    if (!captureRef.current) {
      showToast({ type: 'error', msg: '导出失败：找不到画面元素' })
      return
    }
    if (exporting) return

    setExporting(true)
    try {
      const target = captureRef.current
      const rect = target.getBoundingClientRect()

      const canvas = await html2canvas(target, {
        backgroundColor: '#061226',
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: Math.ceil(rect.width),
        windowHeight: Math.ceil(rect.height),
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height),
      })

      await new Promise<void>(r => {
        canvas.toBlob(blob => {
          if (!blob) {
            r()
            return
          }
          const now = new Date()
          const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
          const locPart = selectedLocation ? `_${selectedLocation.code}` : ''
          const filename = `码头危险品库空间复核_${viewFileLabel}${locPart}_${ts}.png`

          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          setTimeout(() => URL.revokeObjectURL(url), 1000)

          onFlash?.()
          showToast({ type: 'success', msg: `已导出：${filename}（${(blob.size / 1024).toFixed(1)} KB）` })
          r()
        }, 'image/png')
      })
    } catch (error) {
      console.error('导出失败:', error)
      showToast({
        type: 'error',
        msg: `导出失败：${error instanceof Error ? error.message : '未知错误'}`,
      })
    } finally {
      setExporting(false)
    }
  }

  const goToBadData = () => {
    window.location.hash = '#/bad-data'
  }

  return (
    <div className="panel flex items-center justify-between px-4 py-3 relative">
      {toast && (
        <div
          className={`absolute right-4 -bottom-14 z-50 px-4 py-2 text-sm border flex items-center gap-2 shadow-lg
            ${toast.type === 'success'
              ? 'bg-green-900/80 text-green-200 border-green-500/50'
              : 'bg-red-900/80 text-red-200 border-red-500/50'
            }`}
        >
          {toast.type === 'success' ? <Check size={16} /> : <X size={16} />}
          {toast.msg}
        </div>
      )}

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
          disabled={exporting}
          className={`btn-primary flex items-center gap-2 ${
            exporting ? 'opacity-60 cursor-wait' : ''
          }`}
        >
          {exporting ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              导出中...
            </>
          ) : (
            <>
              <Download size={16} />
              <Camera size={16} className="-ml-1" />
              导出截图
            </>
          )}
        </button>
      </div>
    </div>
  )
}
