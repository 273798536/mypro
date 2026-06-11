import { useReviewStore } from '@/store/reviewStore'
import { Camera, Grid3X3, List, Download, Loader2 } from 'lucide-react'

const selectBaseClass = 'h-9 px-3 pr-8 rounded border border-neutral-300 bg-white text-sm text-neutral-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer appearance-none bg-no-repeat bg-right bg-[length:16px_16px]'

interface FilterBarProps {
  onExportScreenshot?: () => void
  exporting?: boolean
}

function FilterBar({ onExportScreenshot, exporting }: FilterBarProps) {
  const filters = useReviewStore((s) => s.filters)
  const setFilters = useReviewStore((s) => s.setFilters)

  return (
    <div className="h-14 bg-white border-b border-neutral-200 flex items-center px-4 gap-4 shrink-0">
      <div className="flex items-center gap-3">
        <Camera className="w-5 h-5 text-primary" />
        <span className="font-semibold text-neutral-800 text-sm">空间复核工作台</span>
      </div>

      <div className="h-6 w-px bg-neutral-200" />

      <div className="flex items-center gap-2">
        <label className="text-xs text-neutral-500">楼层</label>
        <select
          value={filters.floor}
          onChange={(e) => setFilters({ floor: e.target.value })}
          className={selectBaseClass}
        >
          <option value="all">全部</option>
          <option value="1层">1层</option>
          <option value="2层">2层</option>
          <option value="3层">3层</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-neutral-500">异常类型</label>
        <select
          value={filters.anomalyType}
          onChange={(e) => setFilters({ anomalyType: e.target.value as any })}
          className={selectBaseClass}
        >
          <option value="all">全部</option>
          <option value="name_mismatch">名称不一致</option>
          <option value="floor_unit_mix">楼层单位混写</option>
          <option value="coordinate_offset">坐标偏移</option>
          <option value="none">正常</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-neutral-500">处理状态</label>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value as any })}
          className={selectBaseClass}
        >
          <option value="all">全部</option>
          <option value="pending">待复核</option>
          <option value="need_evidence">需补证据</option>
          <option value="reviewed">已复核</option>
        </select>
      </div>

      <div className="flex-1" />

      <div className="flex items-center rounded-md border border-neutral-200 overflow-hidden">
        <button
          onClick={() => setFilters({ viewMode: 'plan' })}
          className={`h-9 px-3 flex items-center gap-1.5 text-sm transition-colors ${
            filters.viewMode === 'plan'
              ? 'bg-primary text-white'
              : 'bg-white text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
          平面视图
        </button>
        <button
          onClick={() => setFilters({ viewMode: 'list' })}
          className={`h-9 px-3 flex items-center gap-1.5 text-sm transition-colors ${
            filters.viewMode === 'list'
              ? 'bg-primary text-white'
              : 'bg-white text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          <List className="w-4 h-4" />
          列表视图
        </button>
      </div>

      <button
        onClick={onExportScreenshot}
        disabled={exporting}
        className="h-9 px-4 rounded-md bg-primary text-white text-sm font-medium flex items-center gap-1.5 hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {exporting ? '导出中...' : '导出截图'}
      </button>
    </div>
  )
}

export default FilterBar
