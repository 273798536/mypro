import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'

const platformBadge: Record<string, string> = { '短视频': 'badge-blue', 'KTV': 'badge-purple', '直播': 'badge-orange' }
const statusBadge: Record<string, string> = { 'normal': 'badge-green', 'anomaly': 'badge-red' }
const statusLabel: Record<string, string> = { 'normal': '正常', 'anomaly': '异常' }

export default function Works() {
  const { works, worksLoading, worksError, worksPagination, fetchWorks } = useStore()
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [platform, setPlatform] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => { fetchWorks() }, [fetchWorks])

  const handleSearch = () => {
    fetchWorks({ keyword, platform, status, page: 1, pageSize: worksPagination.pageSize })
  }

  const handlePageChange = (page: number) => {
    fetchWorks({ keyword, platform, status, page, pageSize: worksPagination.pageSize })
  }

  const totalPages = Math.ceil(worksPagination.total / worksPagination.pageSize)

  if (worksError) {
    return (
      <div className="card flex items-center justify-center py-12">
        <p style={{ color: 'var(--coral)' }}>加载失败：{worksError}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1.5 block text-xs" style={{ color: 'var(--text-muted)' }}>关键词搜索</label>
          <input
            className="input w-full"
            placeholder="搜索作品名称、作者..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <div className="w-36">
          <label className="mb-1.5 block text-xs" style={{ color: 'var(--text-muted)' }}>平台筛选</label>
          <select className="input w-full" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="">全部平台</option>
            <option value="short_video">短视频</option>
            <option value="ktv">KTV</option>
            <option value="live">直播</option>
          </select>
        </div>
        <div className="w-36">
          <label className="mb-1.5 block text-xs" style={{ color: 'var(--text-muted)' }}>状态筛选</label>
          <select className="input w-full" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">全部状态</option>
            <option value="normal">正常</option>
            <option value="anomaly">异常</option>
          </select>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={handleSearch}>
          <Search size={16} /> 搜索
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        {worksLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 w-full" />)}
          </div>
        ) : works.length === 0 ? (
          <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>暂无作品数据</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                <th className="px-5 py-3 font-medium">作品名称</th>
                <th className="px-5 py-3 font-medium">词作者</th>
                <th className="px-5 py-3 font-medium">曲作者</th>
                <th className="px-5 py-3 font-medium">平台分布</th>
                <th className="px-5 py-3 font-medium">版税总额</th>
                <th className="px-5 py-3 font-medium">状态</th>
                <th className="px-5 py-3 font-medium">最近修正</th>
              </tr>
            </thead>
            <tbody>
              {works.map((work) => (
                <tr
                  key={work.id}
                  className="table-row cursor-pointer"
                  onClick={() => navigate(`/works/${work.id}`)}
                >
                  <td className="px-5 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{work.title}</td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{work.lyricist}</td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{work.composer}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {work.platforms.map((p) => (
                        <span key={p} className={cn(platformBadge[p] || 'badge-blue')}>{p}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--amber-gold)' }}>¥{work.totalRoyalty.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className={cn(statusBadge[work.status])}>{statusLabel[work.status]}</span>
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{work.lastCorrection || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            共 {worksPagination.total} 条记录，第 {worksPagination.page}/{totalPages} 页
          </p>
          <div className="flex gap-2">
            <button
              className="btn-secondary text-xs"
              disabled={worksPagination.page <= 1}
              onClick={() => handlePageChange(worksPagination.page - 1)}
            >上一页</button>
            <button
              className="btn-secondary text-xs"
              disabled={worksPagination.page >= totalPages}
              onClick={() => handlePageChange(worksPagination.page + 1)}
            >下一页</button>
          </div>
        </div>
      )}
    </div>
  )
}
