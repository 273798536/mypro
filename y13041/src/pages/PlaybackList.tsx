import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Repeat, Eye } from 'lucide-react'
import Layout from '@/components/Layout'
import StatusBadge from '@/components/StatusBadge'
import { usePlaybackStore } from '@/store/playbackStore'
import type { PlaybackStatus } from '@/shared/types'
import { cn } from '@/lib/utils'

const DEFAULT_OPERATOR = '小周'

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  )
}

export default function PlaybackList() {
  const navigate = useNavigate()
  const { playbacks, loading, loadList } = usePlaybackStore()
  const [status, setStatus] = useState<string>('all')
  const [keyword, setKeyword] = useState<string>('')

  useEffect(() => {
    loadList({
      status: status === 'all' ? undefined : status,
      keyword: keyword || undefined,
    })
  }, [status, keyword, loadList])

  const statusOptions: { value: string; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'pending', label: '待处理' },
    { value: 'rejudged', label: '已改判' },
    { value: 'confirmed', label: '已确认' },
  ]

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1
            className="text-2xl font-bold text-deepsea-800 font-serif tracking-tight"
          >
            企业年金缴费异常回放
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Filter
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-deepsea-500/30 focus:border-deepsea-500 appearance-none cursor-pointer"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索企业名称或批次号"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-deepsea-500/30 focus:border-deepsea-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#0F2A4A] text-white">
                  <th className="text-left px-4 py-3 text-sm font-semibold">
                    企业名称
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">
                    批次号
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">
                    状态
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">
                    跑批次数
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">
                    最后操作人
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">
                    最后更新时间
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))
                ) : playbacks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-400 text-sm"
                    >
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  playbacks.map((playback, index) => (
                    <tr
                      key={playback.id}
                      className={cn(
                        'border-b border-slate-100 transition-colors duration-150 cursor-pointer group relative',
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                        'hover:bg-slate-50',
                      )}
                    >
                      <td className="px-4 py-3.5 relative">
                        <div className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-[3px] bg-amber-400 transition-all duration-150" />
                        <span className="font-semibold text-slate-800 text-sm">
                          {playback.enterpriseName}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-sm text-slate-600">
                          {playback.batchNo}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={playback.status as PlaybackStatus} />
                      </td>
                      <td className="px-4 py-3.5">
                        {playback.runCount > 1 ? (
                          <span className="inline-flex items-center gap-1 text-amber-500 font-medium text-sm">
                            <Repeat size={14} />
                            {playback.runCount}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-600">
                            {playback.runCount}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        {playback.lastOperator || DEFAULT_OPERATOR}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        {formatDateTime(playback.lastUpdatedAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => navigate(`/playback/${playback.id}`)}
                          className="inline-flex items-center gap-1 text-sm text-deepsea-600 hover:text-deepsea-800 font-medium transition-colors"
                        >
                          <Eye size={14} />
                          查看详情
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
