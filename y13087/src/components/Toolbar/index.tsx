import { useState } from 'react'
import { Download, Filter, Search, ChevronDown, Camera, FileText, Info } from 'lucide-react'
import { useReviewStore } from '@/store/useReviewStore'
import { STATUS_LABELS, STATUS_COLORS } from '@/types'
import type { LightPointStatus } from '@/types'
import { cn } from '@/lib/utils'

interface ToolbarProps {
  onExportScreenshot?: () => void
  onExportReport?: () => void
}

export function Toolbar({ onExportScreenshot, onExportReport }: ToolbarProps) {
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const filterStatus = useReviewStore((s) => s.filterStatus)
  const setFilterStatus = useReviewStore((s) => s.setFilterStatus)
  const searchQuery = useReviewStore((s) => s.searchQuery)
  const setSearchQuery = useReviewStore((s) => s.setSearchQuery)
  const filterGroup = useReviewStore((s) => s.filterGroup)
  const setFilterGroup = useReviewStore((s) => s.setFilterGroup)

  const groups = [
    { id: 'all', name: '全部组' },
    { id: 'group-a', name: 'A组' },
    { id: 'group-b', name: 'B组' },
    { id: 'group-c', name: 'C组' },
  ]

  return (
    <div className="absolute top-0 left-0 right-0 z-20">
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <div>
              <h1 className="text-white font-semibold text-sm">博物馆展柜灯光碰撞预审</h1>
              <p className="text-xs text-slate-500">2026年6月批次 · 月底封账版</p>
            </div>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors group">
            <Info size={14} />
            <span>坐标系说明</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索点位..."
              className="w-48 pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                filterStatus !== 'all' || filterGroup !== 'all'
                  ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400'
                  : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
              )}
            >
              <Filter size={16} />
              <span>筛选</span>
              <ChevronDown size={14} />
            </button>

            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-white/10 rounded-xl shadow-xl p-3 z-30">
                <div className="mb-3">
                  <div className="text-xs text-slate-500 mb-2 px-2">状态筛选</div>
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                      filterStatus === 'all'
                        ? 'bg-white/10 text-white'
                        : 'text-slate-300 hover:bg-white/5'
                    )}
                  >
                    全部状态
                  </button>
                  {(['normal', 'pending_material', 'manual_review'] as LightPointStatus[]).map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2',
                          filterStatus === status
                            ? 'bg-white/10 text-white'
                            : 'text-slate-300 hover:bg-white/5'
                        )}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[status] }}
                        />
                        {STATUS_LABELS[status]}
                      </button>
                    )
                  )}
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-2 px-2">点位组</div>
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setFilterGroup(group.id)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                        filterGroup === group.id
                          ? 'bg-white/10 text-white'
                          : 'text-slate-300 hover:bg-white/5'
                      )}
                    >
                      {group.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={16} />
              <span>导出</span>
              <ChevronDown size={14} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-white/10 rounded-xl shadow-xl p-2 z-30">
                <button
                  onClick={() => {
                    setShowExportMenu(false)
                    onExportScreenshot?.()
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-white/10 transition-colors"
                >
                  <Camera size={16} className="text-cyan-400" />
                  <span>导出截图</span>
                </button>
                <button
                  onClick={() => {
                    setShowExportMenu(false)
                    onExportReport?.()
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-white/10 transition-colors"
                >
                  <FileText size={16} className="text-emerald-400" />
                  <span>导出预审报告</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
