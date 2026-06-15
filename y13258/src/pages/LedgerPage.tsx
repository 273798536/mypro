import { useState } from 'react'
import { Search, ArrowRight, ChevronDown, ChevronUp, Send } from 'lucide-react'
import { useStore } from '@/store/useStore'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

const statusLabels: Record<string, string> = {
  pending: '待审',
  approved: '通过',
  rejected: '驳回',
}

const statusBadgeClass: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const borderClass: Record<string, string> = {
  pending: 'border-l-yellow-400',
  approved: 'border-l-green-500',
  rejected: 'border-l-red-500',
}

const tabs: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审' },
  { key: 'approved', label: '通过' },
  { key: 'rejected', label: '驳回' },
]

export default function LedgerPage() {
  const { approvals, updateApprovalStatus, addSupplementNote } = useStore()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expandedBoundary, setExpandedBoundary] = useState<Set<string>>(new Set())
  const [noteFormMap, setNoteFormMap] = useState<Record<string, { content: string; author: string }>>({})
  const [showNoteFormId, setShowNoteFormId] = useState<string | null>(null)

  const filtered = approvals.filter((a) => {
    const matchSearch = a.planName.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    return matchSearch && matchStatus
  })

  const toggleBoundary = (id: string) => {
    setExpandedBoundary((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getNoteForm = (id: string) => noteFormMap[id] ?? { content: '', author: '' }

  const updateNoteForm = (id: string, field: 'content' | 'author', value: string) => {
    setNoteFormMap((prev) => ({
      ...prev,
      [id]: { ...getNoteForm(id), [field]: value },
    }))
  }

  const handleAddNote = (approvalId: string) => {
    const form = getNoteForm(approvalId)
    if (!form.content.trim() || !form.author.trim()) return
    addSupplementNote(approvalId, form.content, form.author)
    setNoteFormMap((prev) => {
      const next = { ...prev }
      delete next[approvalId]
      return next
    })
    setShowNoteFormId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">审批台账</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索方案名称..."
            className="rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-[#0D7377] focus:outline-none focus:ring-1 focus:ring-[#0D7377]"
          />
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === tab.key
                ? 'bg-[#0D7377] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((approval) => (
          <div
            key={approval.id}
            className={`rounded-xl border-l-4 bg-white p-5 shadow-sm ${borderClass[approval.status]}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-800">{approval.planName}</span>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass[approval.status]}`}>
                  {statusLabels[approval.status]}
                </span>
                <span className="text-sm text-gray-400">{new Date(approval.updatedAt).toLocaleString('zh-CN')}</span>
              </div>
            </div>

            <p className="mt-2 text-sm text-gray-600">
              <span className="font-medium text-gray-700">原因:</span> {approval.reason}
            </p>

            <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
              <ArrowRight className="h-3.5 w-3.5 text-[#FF8C42]" />
              <span className="font-medium text-gray-700">下一步:</span> {approval.nextStep}
            </p>

            {approval.boundarySample && (
              <div className="mt-3">
                <button
                  onClick={() => toggleBoundary(approval.id)}
                  className="flex items-center gap-1 text-sm font-medium text-[#0D7377] hover:underline"
                >
                  {expandedBoundary.has(approval.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  边界采样
                </button>
                {expandedBoundary.has(approval.id) && (
                  <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm">
                    <p className="text-gray-600">
                      [{approval.boundarySample.originalCoord[0].toFixed(4)}, {approval.boundarySample.originalCoord[1].toFixed(4)}]
                      <ArrowRight className="mx-1 inline h-3 w-3 text-[#FF8C42]" />
                      [{approval.boundarySample.offsetCoord[0].toFixed(4)}, {approval.boundarySample.offsetCoord[1].toFixed(4)}]
                    </p>
                    <p className="mt-1 text-gray-500">{approval.boundarySample.offsetDescription}</p>
                    {approval.boundarySample.triggeredManualConfirm && (
                      <span className="mt-1 inline-block rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                        triggeredManualConfirm
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-3">
              {approval.supplementNotes.length > 0 && (
                <div className="space-y-1">
                  {approval.supplementNotes.map((note) => (
                    <div key={note.id} className="text-sm">
                      <span className="font-medium text-gray-700">{note.author}</span>
                      <span className="mx-1 text-gray-400">·</span>
                      <span className="text-gray-600">{note.content}</span>
                      <span className="ml-2 text-xs text-gray-400">{new Date(note.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                  ))}
                </div>
              )}

              {showNoteFormId === approval.id ? (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={getNoteForm(approval.id).author}
                    onChange={(e) => updateNoteForm(approval.id, 'author', e.target.value)}
                    placeholder="作者"
                    className="w-20 rounded border border-gray-200 px-2 py-1 text-sm focus:border-[#0D7377] focus:outline-none"
                  />
                  <input
                    value={getNoteForm(approval.id).content}
                    onChange={(e) => updateNoteForm(approval.id, 'content', e.target.value)}
                    placeholder="补充说明..."
                    className="flex-1 rounded border border-gray-200 px-2 py-1 text-sm focus:border-[#0D7377] focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote(approval.id)}
                  />
                  <button
                    onClick={() => handleAddNote(approval.id)}
                    className="rounded bg-[#0D7377] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#0a5c5f]"
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNoteFormId(approval.id)}
                  className="mt-1 text-xs text-[#0D7377] hover:underline"
                >
                  + 添加补充说明
                </button>
              )}
            </div>

            {approval.status === 'pending' && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => updateApprovalStatus(approval.id, 'approved')}
                  className="rounded-lg bg-green-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-600"
                >
                  通过
                </button>
                <button
                  onClick={() => updateApprovalStatus(approval.id, 'rejected')}
                  className="rounded-lg bg-red-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600"
                >
                  驳回
                </button>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400">暂无审批记录</div>
        )}
      </div>
    </div>
  )
}
