import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, AlertTriangle, AlertCircle, TrendingDown, ChevronRight, Filter } from 'lucide-react'
import { useAppStore, type EventItem } from '@/store'

type FilterTab = 'all' | 'anomaly' | 'duplicate' | 'dispute' | 'shortfall'

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: '待处理', color: 'bg-coral/10 text-coral' },
  in_progress: { label: '进行中', color: 'bg-amber/10 text-amber' },
  resolved: { label: '已解决', color: 'bg-emerald/10 text-emerald' },
  closed: { label: '已关闭', color: 'bg-slate_text/10 text-slate_text' },
}

const anomalyConfig: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  duplicate: { label: '重复', color: 'bg-coral/10 text-coral', icon: AlertCircle },
  dispute: { label: '争议', color: 'bg-amber/10 text-amber', icon: AlertTriangle },
  shortfall: { label: '缺口', color: 'bg-orange-500/10 text-orange-600', icon: TrendingDown },
}

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'anomaly', label: '异常' },
  { key: 'duplicate', label: '重复' },
  { key: 'dispute', label: '争议' },
  { key: 'shortfall', label: '缺口' },
]

export default function EventsPage() {
  const { events, fetchEvents, searchQuery, setSearchQuery } = useAppStore()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [searchResults, setSearchResults] = useState<EventItem[] | null>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/events/search?q=${encodeURIComponent(searchQuery.trim())}`)
      const data = await res.json()
      setSearchResults(data)
    } finally {
      setSearching(false)
    }
  }, [searchQuery])

  const displayEvents = searchResults ?? events

  const filteredEvents = activeTab === 'all'
    ? displayEvents
    : activeTab === 'anomaly'
      ? displayEvents.filter(e => e.anomaly_type !== null)
      : displayEvents.filter(e => e.anomaly_type === activeTab)

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults(null)
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-navy">事件追踪</h2>
        {searchResults && (
          <button onClick={clearSearch} className="text-sm text-amber hover:underline">
            清除搜索结果
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate_text/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="输入商票号/现金计划号/兑付申请号搜索事件..."
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:border-amber focus:ring-1 focus:ring-amber"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching}
          className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2.5 text-sm text-white hover:bg-navy/90 disabled:opacity-50"
        >
          <Filter size={14} />
          {searching ? '搜索中...' : '搜索'}
        </button>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
        {filterTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-card text-navy shadow-sm'
                : 'text-slate_text hover:text-navy'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filteredEvents.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate_text">
          {searchResults ? '未找到匹配的事件' : '暂无事件'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => {
            const st = statusConfig[event.status] ?? { label: event.status, color: 'bg-slate_text/10 text-slate_text' }
            const anom = event.anomaly_type ? anomalyConfig[event.anomaly_type] : null
            const AnomIcon = anom?.icon
            return (
              <Link
                key={event.id}
                to={`/event/${event.id}`}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate_text">{event.event_no}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>{st.label}</span>
                    {anom && AnomIcon && (
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${anom.color}`}>
                        <AnomIcon size={10} />
                        {anom.label}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm font-medium text-navy">{event.title}</p>
                  <p className="text-xs text-slate_text">
                    创建于 {new Date(event.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-slate_text/40" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
