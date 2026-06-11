import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, ChevronRight, Image as ImageIcon, X } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import TypeBadge from '@/components/TypeBadge'
import ConfirmModal from '@/components/ConfirmModal'
import { useStore } from '@/store/useStore'
import type { CryoRecord, MicroPhoto, ReagentBatch, ReagentTraceResponse } from '../../api/types'

interface Detail { record: CryoRecord; photos: MicroPhoto[]; reagent?: ReagentBatch }
interface LineageNode { record: CryoRecord; children: LineageNode[] }

const photoTypeLabel: Record<string, string> = { pre_freeze: '冻存前', post_thaw: '复苏后', observation: '观察' }

function buildChain(nodes: LineageNode[]): CryoRecord[] {
  const chain: CryoRecord[] = [nodes[0]?.record].filter(Boolean)
  function walk(n: LineageNode, target: string): CryoRecord[] | null {
    if (n.record.id === target) return [n.record]
    for (const c of n.children) { const r = walk(c, target); if (r) return [n.record, ...r] }
    return null
  }
  if (nodes[0]) { const r = walk(nodes[0], chain[0]?.id); if (r) return r }
  return chain
}

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isTechnician = useStore((s) => s.role === 'technician')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [trace, setTrace] = useState<ReagentTraceResponse | null>(null)
  const [lineage, setLineage] = useState<CryoRecord[]>([])
  const [showTrace, setShowTrace] = useState(false)
  const [showPhoto, setShowPhoto] = useState<MicroPhoto | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetch(`/api/records/${id}`).then((r) => r.json()),
      fetch(`/api/lineage/${id}`).then((r) => r.json()),
    ]).then(([dJson, lJson]) => {
      if (!dJson.success) throw new Error(dJson.error)
      setDetail(dJson.data)
      if (lJson.success && lJson.data) {
        const tree = lJson.data
        setLineage([tree.root, ...flattenTree(tree.children)])
      }
    }).catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
    .finally(() => setLoading(false))
  }, [id])

  function flattenTree(nodes: LineageNode[]): CryoRecord[] {
    return nodes.flatMap((n) => [n.record, ...flattenTree(n.children)])
  }

  const fetchTrace = async () => {
    if (!detail?.reagent) return
    const res = await fetch(`/api/reagents/${detail.reagent.batch_number}/trace`)
    const json = await res.json()
    if (json.success) { setTrace(json.data); setShowTrace(true) }
  }

  const handleDelete = async () => {
    await fetch(`/api/records/${id}`, { method: 'DELETE' })
    setDeleteOpen(false)
    navigate('/records')
  }

  if (loading) return <div className="space-y-4 p-6"><div className="h-8 w-48 animate-pulse rounded bg-gray-200" /><div className="h-64 animate-pulse rounded-lg bg-gray-100" /></div>
  if (error) return <div className="p-6 text-red-600">加载失败：{error}</div>
  if (!detail) return null

  const r = detail.record
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="py-2"><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-0.5 text-sm font-medium text-gray-900">{children}</dd></div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold text-gray-900">记录详情</h1>
        {isTechnician && (
          <div className="ml-auto flex gap-2">
            <button onClick={() => navigate(`/records/${id}/edit`)} className="inline-flex items-center gap-1 rounded-lg border border-teal-700 px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-50"><Edit size={14} />编辑</button>
            <button onClick={() => setDeleteOpen(true)} className="inline-flex items-center gap-1 rounded-lg border border-red-400 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"><Trash2 size={14} />删除</button>
          </div>
        )}
      </div>

      {lineage.length > 1 && (
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <span className="font-medium text-gray-500">谱系：</span>
          {lineage.map((n, i) => (
            <span key={n.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="text-gray-400" />}
              <button onClick={() => navigate(`/records/${n.id}`)} className="text-teal-700 hover:underline">{n.cell_line} P{n.passage_number}</button>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-1 rounded-lg border border-gray-200 bg-white p-5 lg:col-span-2">
          <Field label="类型"><TypeBadge type={r.type} /></Field>
          <Field label="细胞系">{r.cell_line}</Field>
          <Field label="代次">P{r.passage_number}</Field>
          <Field label="操作者">{r.operator}</Field>
          <Field label="日期">{r.date}</Field>
          <Field label="冻存液">{r.freezing_medium || '-'}</Field>
          <Field label="试剂批号">
            {detail.reagent ? (
              <button onClick={fetchTrace} className="text-teal-700 hover:underline">{detail.reagent.batch_number}</button>
            ) : r.reagent_batch_id}
          </Field>
          <Field label="存储位置">{r.storage_location || '-'}</Field>
          <Field label="存活率">{r.viability_rate != null ? `${r.viability_rate}%` : '-'}</Field>
          <Field label="结论">{r.conclusion === 'success' ? '成功' : r.conclusion === 'failed' ? '失败' : '待定'}</Field>
          <Field label="状态"><StatusBadge status={r.status} /></Field>
          <Field label="备注">{r.notes || '-'}</Field>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">显微照片</h3>
          {detail.photos.length === 0 ? (
            <p className="text-xs text-gray-400">暂无照片</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {detail.photos.map((p) => (
                <button key={p.id} onClick={() => setShowPhoto(p)} className="group relative overflow-hidden rounded-md border border-gray-200">
                  <img src={`/${p.file_path}`} alt={p.label} className="h-24 w-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                    {p.label || photoTypeLabel[p.photo_type] || p.photo_type}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showTrace && trace && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-amber-900">试剂追溯 — {trace.batch.batch_number}</h3>
            <button onClick={() => setShowTrace(false)}><X size={16} className="text-amber-700" /></button>
          </div>
          <p className="mb-2 text-xs text-amber-700">{trace.batch.reagent_name} | 供应商: {trace.batch.supplier} | 有效期: {trace.batch.expiry_date}</p>
          <p className="mb-2 text-xs text-amber-700">成功: {trace.conclusion_summary.success} | 失败: {trace.conclusion_summary.failed} | 待定: {trace.conclusion_summary.pending}</p>
          <div className="space-y-1">
            {trace.linked_records.map((lr) => (
              <div key={lr.record.id} className="flex items-center gap-2 text-xs">
                <span className="text-gray-600">{lr.record.date}</span>
                <span className="font-medium">{lr.record.cell_line}</span>
                <span className={lr.conclusion === 'success' ? 'text-green-700' : lr.conclusion === 'failed' ? 'text-red-600' : 'text-gray-500'}>{lr.conclusion === 'success' ? '成功' : lr.conclusion === 'failed' ? '失败' : '待定'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowPhoto(null)}>
          <div className="relative max-h-[80vh] max-w-[80vh]" onClick={(e) => e.stopPropagation()}>
            <img src={`/${showPhoto.file_path}`} alt={showPhoto.label} className="max-h-[80vh] rounded-lg" />
            <button onClick={() => setShowPhoto(null)} className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow"><X size={16} /></button>
            <p className="mt-2 text-center text-sm text-white">{showPhoto.label || photoTypeLabel[showPhoto.photo_type]}</p>
          </div>
        </div>
      )}

      <ConfirmModal open={deleteOpen} title="删除记录" message="确定要删除该记录吗？此操作不可撤销。" onConfirm={handleDelete} onCancel={() => setDeleteOpen(false)} />
    </div>
  )
}
