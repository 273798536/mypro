import { useState } from 'react'
import { RefreshCw, ChevronDown, ChevronUp, Code, Clock } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { ApiLog } from '@/types'

interface ApiResponsePanelProps {
  complaintId: string
}

const highlightJson = (obj: unknown): JSX.Element => {
  if (obj === null) return <span className="text-gray-500">null</span>
  if (typeof obj === 'boolean') return <span className="text-purple-400">{String(obj)}</span>
  if (typeof obj === 'number') return <span className="text-blue-400">{obj}</span>
  if (typeof obj === 'string') return <span className="text-green-400">"{obj}"</span>
  if (Array.isArray(obj)) {
    return (
      <>
        [
        {obj.length > 0 && (
          <div className="ml-4">
            {obj.map((item, index) => (
              <div key={index}>
                {highlightJson(item)}
                {index < obj.length - 1 && <span className="text-fire-white/40">,</span>}
              </div>
            ))}
          </div>
        )}
        ]
      </>
    )
  }
  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>)
    return (
      <>
        {'{'}
        {entries.length > 0 && (
          <div className="ml-4">
            {entries.map(([key, value], index) => (
              <div key={key}>
                <span className="text-fire-orange">"{key}"</span>
                <span className="text-fire-white/40">: </span>
                {highlightJson(value)}
                {index < entries.length - 1 && <span className="text-fire-white/40">,</span>}
              </div>
            ))}
          </div>
        )}
        {'}'}
      </>
    )
  }
  return <span>{String(obj)}</span>
}

export default function ApiResponsePanel({ complaintId }: ApiResponsePanelProps) {
  const apiLogs = useAppStore((state) =>
    state.getApiLogsByComplaintId(complaintId)
  )
  const rerunApi = useAppStore((state) => state.rerunApi)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isRerunning, setIsRerunning] = useState(false)

  const originalLogs = apiLogs.filter((log) => !log.isRerun)
  const rerunLogs = apiLogs.filter((log) => log.isRerun)
  const latestOriginal = originalLogs[originalLogs.length - 1]
  const latestRerun = rerunLogs[rerunLogs.length - 1]

  const handleRerun = async () => {
    setIsRerunning(true)
    await new Promise((resolve) => setTimeout(resolve, 800))
    rerunApi(complaintId)
    setIsRerunning(false)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const renderLogBlock = (log: ApiLog, label: string, colorClass: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${colorClass}`}>{label}</span>
        <div className="flex items-center gap-1 text-fire-white/50 text-xs">
          <Clock size={12} />
          <span>{formatTime(log.runAt)}</span>
        </div>
      </div>
      <div className="bg-fire-deep rounded-lg border border-fire-orange/10 p-4 overflow-x-auto font-mono text-sm">
        <div className="text-fire-white/30 text-xs mb-2">// 请求参数</div>
        <div className="mb-3">{highlightJson(log.requestParams)}</div>
        <div className="text-fire-white/30 text-xs mb-2">// 返回数据</div>
        <div>{highlightJson(log.responseData)}</div>
      </div>
    </div>
  )

  return (
    <div className="bg-caliber-blue/50 rounded-xl border border-fire-orange/20 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-fire-orange/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-fire-white text-lg font-semibold flex items-center gap-2">
          <span className="w-1 h-5 bg-fire-orange rounded-full" />
          <Code size={18} className="text-fire-orange" />
          接口返回
        </h3>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleRerun()
            }}
            disabled={isRerunning}
            className="flex items-center gap-2 px-4 py-2 bg-fire-orange hover:bg-fire-orange/80 disabled:bg-fire-orange/50 text-fire-white text-sm font-medium rounded-lg transition-colors"
          >
            <RefreshCw size={16} className={isRerunning ? 'animate-spin' : ''} />
            重跑
          </button>
          <span className="text-fire-white/40">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {latestOriginal && renderLogBlock(latestOriginal, '原始调用', 'text-fire-white/70')}

          {latestRerun && (
            <div className="relative">
              <div className="absolute left-0 right-0 top-1/2 h-px bg-fire-orange/20" />
              <div className="relative z-10 flex justify-center">
                <span className="px-3 py-1 bg-caliber-blue text-fire-white/50 text-xs">对比结果</span>
              </div>
              {renderLogBlock(latestRerun, '重跑结果', 'text-success-green')}
            </div>
          )}

          {!latestOriginal && (
            <div className="text-center py-8 text-fire-white/50">
              暂无接口调用记录
            </div>
          )}
        </div>
      )}
    </div>
  )
}
