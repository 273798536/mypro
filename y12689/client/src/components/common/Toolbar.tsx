import { RefreshCw, Download, Search, Calendar, Monitor, AlertTriangle } from 'lucide-react'
import type { Severity } from '@/types'

export type SeverityLevel = 'all' | Severity

interface ToolbarProps {
  title: string
  searchKeyword: string
  onSearchChange: (keyword: string) => void
  timeRange: string
  onTimeRangeChange: (range: string) => void
  device: string
  onDeviceChange: (device: string) => void
  severity: SeverityLevel
  onSeverityChange: (severity: SeverityLevel) => void
  onRefresh: () => void
  onExport: () => void
}

const timeRanges = [
  { value: 'today', label: '今天' },
  { value: '7days', label: '近7天' },
  { value: '30days', label: '近30天' },
  { value: 'all', label: '全部' },
]

const devices = [
  { value: 'all', label: '全部设备' },
  { value: 'device-a', label: '设备A' },
  { value: 'device-b', label: '设备B' },
  { value: 'device-c', label: '设备C' },
]

const severities: { value: SeverityLevel; label: string }[] = [
  { value: 'all', label: '全部严重程度' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]

function Toolbar({
  title,
  searchKeyword,
  onSearchChange,
  timeRange,
  onTimeRangeChange,
  device,
  onDeviceChange,
  severity,
  onSeverityChange,
  onRefresh,
  onExport,
}: ToolbarProps) {
  return (
    <div className="bg-bg-card border-b border-border">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-text-primary">{title}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-text-secondary bg-bg-dark border border-border hover:text-text-primary hover:border-primary/50 transition-colors"
            >
              <RefreshCw size={16} />
              刷新
            </button>
            <button
              onClick={onExport}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors"
            >
              <Download size={16} />
              导出报告
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              placeholder="搜索记录ID、设备编号..."
              value={searchKeyword}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-md text-sm text-text-primary bg-bg-dark border border-border placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="relative">
            <Calendar
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <select
              value={timeRange}
              onChange={(e) => onTimeRangeChange(e.target.value)}
              className="pl-9 pr-8 py-2 rounded-md text-sm text-text-primary bg-bg-dark border border-border appearance-none cursor-pointer focus:outline-none focus:border-primary/50 transition-colors"
            >
              {timeRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Monitor
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <select
              value={device}
              onChange={(e) => onDeviceChange(e.target.value)}
              className="pl-9 pr-8 py-2 rounded-md text-sm text-text-primary bg-bg-dark border border-border appearance-none cursor-pointer focus:outline-none focus:border-primary/50 transition-colors"
            >
              {devices.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <AlertTriangle
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <select
              value={severity}
              onChange={(e) => onSeverityChange(e.target.value as SeverityLevel)}
              className="pl-9 pr-8 py-2 rounded-md text-sm text-text-primary bg-bg-dark border border-border appearance-none cursor-pointer focus:outline-none focus:border-primary/50 transition-colors"
            >
              {severities.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Toolbar
