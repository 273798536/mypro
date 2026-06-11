import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, GitBranch, X, ArrowUp, AlertCircle } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import TypeBadge from '@/components/TypeBadge'

interface CryoRecord {
  id: string; type: 'freeze' | 'thaw'; cell_line: string; passage_number: number
  date: string; status: string; parent_record_id: string | null; notes: string
  operator: string; storage_location: string; viability_rate: number | null
  conclusion: string
}

interface LineageNode {
  record: CryoRecord; children: LineageNode[]
}

interface LineageResponse {
  root: CryoRecord; children: LineageNode[]
}

const STATUS_COLORS: Record<string, string> = {
  usable: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
  review_needed: 'border-amber-400 bg-amber-50 dark:bg-amber-900/20',
  reviewed_ok: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
  reviewed_failed: 'border-red-400 bg-red-50 dark:bg-red-900/20',
}

const NODE_DOT: Record<string, string> = {
  usable: 'bg-emerald-500', review_needed: 'bg-amber-500',
  reviewed_ok: 'bg-emerald-500', reviewed_failed: 'bg-red-500',
}

function TreeNode({ node, selectedId, onSelect }: { node: LineageNode; selectedId: string | null; onSelect: (n: LineageNode) => void }) {
  const isSelected = selectedId === node.record.id
  const color = STATUS_COLORS[node.record.status] ?? 'border-gray-300 bg-white'
  const dot = NODE_DOT[node.record.status] ?? 'bg-gray-400'

  return (
    <li className="relative flex flex-col items-center">
      <button onClick={() => onSelect(node)}
        className={`relative rounded-lg border-2 p-3 text-left transition-shadow hover:shadow-md ${color} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
        <div className={`absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full ${dot}`} />
        <div className="flex items-center gap-2">
          <TypeBadge type={node.record.type as 'freeze' | 'thaw'} />
          <StatusBadge status={node.record.status as 'usable' | 'review_needed' | 'reviewed_ok' | 'reviewed_failed'} />
        </div>
        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{node.record.cell_line}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">P{node.record.passage_number} · {node.record.date}</p>
      </button>
      {node.children.length > 0 && (
        <>
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
          <ul className="relative flex gap-6 pt-2 before:absolute before:top-0 before:h-px before:w-[calc(100%-3rem)] before:bg-gray-300 dark:before:bg-gray-600"
            style={{ left: node.children.length > 1 ? '0' : undefined }}>
            {node.children.map(child => (
              <TreeNode key={child.record.id} node={child} selectedId={selectedId} onSelect={onSelect} />
            ))}
          </ul>
        </>
      )}
    </li>
  )
}

export default function Lineage() {
  const [query, setQuery] = useState('')
  const [tree, setTree] = useState<LineageResponse | null>(null)
  const [selected, setSelected] = useState<LineageNode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const search = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setTree(null); setSelected(null)
    try {
      const res = await fetch(`/api/lineage/${encodeURIComponent(query.trim())}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || '未找到谱系数据')
      setTree(json.data)
    } catch (e: any) {
      setError(e.message || '网络请求失败')
    } finally { setLoading(false) }
  }, [query])

  const traceParent = () => {
    if (!selected || !selected.record.parent_record_id) return
    setQuery(selected.record.parent_record_id)
    setTimeout(() => {
      fetch(`/api/lineage/${encodeURIComponent(selected.record.parent_record_id!)}`)
        .then(r => r.json()).then(json => {
          if (json.success) { setTree(json.data); setSelected(null) }
        })
    }, 0)
  }

  const findNode = (nodes: LineageNode[], id: string): LineageNode | null => {
    for (const n of nodes) {
      if (n.record.id === id) return n
      const found = findNode(n.children, id)
      if (found) return found
    }
    return null
  }

  const handleSelect = (node: LineageNode) => {
    setSelected(prev => prev?.record.id === node.record.id ? null : node)
  }

  return (
    <div className="flex h-full min-h-screen animate-fade-in">
      <div className="flex-1 space-y-4 p-6 overflow-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">谱系追踪</h1>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="输入记录ID或细胞系名称..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
          </div>
          <button onClick={search} disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50">
            {loading ? '搜索中...' : '追溯'}
          </button>
        </div>

        {error && <div className="flex items-center gap-2 text-red-600"><AlertCircle className="h-4 w-4" /><span className="text-sm">{error}</span></div>}

        {tree ? (
          <div className="overflow-x-auto rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <ul className="flex justify-center">
              <TreeNode node={{ record: tree.root, children: tree.children }} selectedId={selected?.record.id ?? null} onSelect={handleSelect} />
            </ul>
          </div>
        ) : !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <GitBranch className="h-12 w-12 mb-3" />
            <p className="text-sm">输入记录ID搜索谱系关系</p>
          </div>
        )}
      </div>

      {selected && (
        <div className="w-80 border-l bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">记录详情</h3>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2"><TypeBadge type={selected.record.type as 'freeze' | 'thaw'} /><StatusBadge status={selected.record.status as 'usable' | 'review_needed' | 'reviewed_ok' | 'reviewed_failed'} /></div>
            <InfoRow label="细胞系" value={selected.record.cell_line} />
            <InfoRow label="代次" value={`P${selected.record.passage_number}`} />
            <InfoRow label="日期" value={selected.record.date} />
            <InfoRow label="操作人" value={selected.record.operator} />
            <InfoRow label="存储位置" value={selected.record.storage_location || '-'} />
            <InfoRow label="存活率" value={selected.record.viability_rate != null ? `${selected.record.viability_rate}%` : '-'} />
            <InfoRow label="结论" value={selected.record.conclusion === 'success' ? '成功' : selected.record.conclusion === 'failed' ? '失败' : '待定'} />
            <InfoRow label="备注" value={selected.record.notes || '-'} />
            <div className="flex gap-2 pt-2">
              <button onClick={() => navigate(`/records/${selected.record.id}`)}
                className="flex-1 rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary-50 dark:hover:bg-primary-900/30">
                查看完整记录
              </button>
              {selected.record.parent_record_id && (
                <button onClick={traceParent}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-800">
                  <ArrowUp className="h-3 w-3" />追溯来源
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-1 dark:border-gray-700">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  )
}
