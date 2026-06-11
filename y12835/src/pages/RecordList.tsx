import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Trash2, Eye } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import TypeBadge from '@/components/TypeBadge'
import ConfirmModal from '@/components/ConfirmModal'
import { useStore } from '@/store/useStore'
import type { CryoRecord } from '../../api/types'

interface Pagination { page: number; limit: number; total: number; pages: number }

export default function RecordList() {
  const navigate = useNavigate()
  const isTechnician = useStore((s) => s.role === 'technician')
  const [records, setRecords] = useState<CryoRecord[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [cellLine, setCellLine] = useState('')
  const [typeFilter, setTypeFilter] = useState<'' | 'freeze' | 'thaw'>('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (cellLine) params.set('cell_line', cellLine)
      if (typeFilter) params.set('type', typeFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (search) params.set('search', search)
      const res = await fetch(`/api/records?${params}`)
      const json = await res.json()
      if (json.success) {
        setRecords(json.data)
        setPagination(json.pagination)
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [cellLine, typeFilter, statusFilter, search])

  useEffect(() => { fetchData(1) }, [fetchData])

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/records/${deleteId}`, { method: 'DELETE' })
    setDeleteId(null)
    fetchData(pagination.page)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">培养记录</h1>
        {isTechnician && (
          <button onClick={() => navigate('/records/new')} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">
            <Plus size={16} />新增记录
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <select value={cellLine} onChange={(e) => setCellLine(e.target.value)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
          <option value="">全部细胞系</option>
          {Array.from(new Set(records.map((r) => r.cell_line))).map((cl) => <option key={cl} value={cl}>{cl}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as '' | 'freeze' | 'thaw')} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
          <option value="">全部类型</option>
          <option value="freeze">冻存</option>
          <option value="thaw">复苏</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
          <option value="">全部状态</option>
          <option value="usable">可用</option>
          <option value="review_needed">待复核</option>
          <option value="reviewed_ok">复核通过</option>
          <option value="reviewed_failed">复核未通过</option>
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索细胞系/操作者/备注" className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-sm" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="px-4 py-2.5 font-medium">日期</th>
              <th className="px-4 py-2.5 font-medium">类型</th>
              <th className="px-4 py-2.5 font-medium">细胞系</th>
              <th className="px-4 py-2.5 font-medium">代次</th>
              <th className="px-4 py-2.5 font-medium">试剂批号</th>
              <th className="px-4 py-2.5 font-medium">存活率</th>
              <th className="px-4 py-2.5 font-medium">结论</th>
              <th className="px-4 py-2.5 font-medium">状态</th>
              <th className="px-4 py-2.5 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-gray-100" /></td></tr>)
              : records.map((r) => (
                  <tr key={r.id} className="cursor-pointer border-b border-gray-50 hover:bg-gray-50" onClick={() => navigate(`/records/${r.id}`)}>
                    <td className="px-4 py-2.5">{r.date}</td>
                    <td className="px-4 py-2.5"><TypeBadge type={r.type} /></td>
                    <td className="px-4 py-2.5 font-medium">{r.cell_line}</td>
                    <td className="px-4 py-2.5">P{r.passage_number}</td>
                    <td className="px-4 py-2.5 text-gray-500">{r.reagent_batch_id.slice(0, 8)}</td>
                    <td className="px-4 py-2.5">{r.viability_rate != null ? `${r.viability_rate}%` : '-'}</td>
                    <td className="px-4 py-2.5">{r.conclusion === 'success' ? '成功' : r.conclusion === 'failed' ? '失败' : '待定'}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => navigate(`/records/${r.id}`)} className="text-teal-700 hover:underline"><Eye size={15} /></button>
                        {isTechnician && <button onClick={() => setDeleteId(r.id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={pagination.page <= 1} onClick={() => fetchData(pagination.page - 1)} className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-40">上一页</button>
          <span className="text-sm text-gray-600">{pagination.page} / {pagination.pages}</span>
          <button disabled={pagination.page >= pagination.pages} onClick={() => fetchData(pagination.page + 1)} className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-40">下一页</button>
        </div>
      )}

      <ConfirmModal open={!!deleteId} title="删除记录" message="确定要删除该冻存/复苏记录吗？此操作不可撤销。" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  )
}
