import { useState } from 'react'
import { Plus, Pencil, Trash2, MessageSquareText, ChevronDown, ChevronUp } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { STATUS_LABELS } from '@/types'
import type { RecordStatus } from '@/types'
import ContractUpload from '@/components/ContractUpload'
import RecordForm from '@/components/RecordForm'
import SupplementaryRemarkPanel from '@/components/SupplementaryRemarkPanel'

const STATUS_COLORS: Record<RecordStatus, string> = {
  normal: 'bg-emerald-600/80 text-white',
  conflict: 'bg-red-600/80 text-white',
  pending: 'bg-yellow-600/80 text-white',
  resolved: 'bg-blue-600/80 text-white',
}

export default function Contracts() {
  const { records, openForm, deleteRecord } = useStore()
  const [expandedRemarkId, setExpandedRemarkId] = useState<string | null>(null)

  const toggleRemark = (id: string) => {
    setExpandedRemarkId((prev) => (prev === id ? null : id))
  }

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`确认删除「${name}」？`)) deleteRecord(id)
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-bold text-[#e8e8e8]">合同导入与管理</h1>

        <ContractUpload />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#e8e8e8]">记录列表</h2>
          <button
            onClick={() => openForm(null)}
            className="flex items-center gap-1 rounded-lg bg-[#f0a500] px-4 py-2 text-sm font-medium text-[#1a1a2e] shadow-[0_3px_0_#b37800]"
          >
            <Plus className="h-4 w-4" />新建记录
          </button>
        </div>

        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className="rounded-xl bg-[#2d2d44] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#e8e8e8]">{r.songName}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                    {r.contractScanName && (
                      <span className="rounded bg-[#f0a500]/20 px-1.5 py-0.5 text-xs text-[#f0a500]">
                        已上传扫描件
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#888]">
                    时码：{r.timecodeStart || '—'} → {r.timecodeEnd || '—'}
                  </p>
                  <p className="text-xs text-[#888]">
                    授权期：{r.authPeriodStart || '—'} ~ {r.authPeriodEnd || '—'}
                  </p>
                  {r.songAlias.length > 0 && (
                    <p className="text-xs text-[#888]">别名：{r.songAlias.join('、')}</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleRemark(r.id)}
                    className="rounded-lg border border-[#555] px-2.5 py-1.5 text-xs text-[#e8e8e8] hover:border-[#f0a500]/60"
                  >
                    <MessageSquareText className="inline h-3.5 w-3.5 mr-1" />
                    后补备注{r.supplementaryRemarks.length > 0 && `(${r.supplementaryRemarks.length})`}
                    {expandedRemarkId === r.id ? <ChevronUp className="ml-1 inline h-3 w-3" /> : <ChevronDown className="ml-1 inline h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => openForm(r)}
                    className="rounded-lg border border-[#555] p-1.5 text-[#e8e8e8] hover:border-[#f0a500]/60"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id, r.songName)}
                    className="rounded-lg border border-[#555] p-1.5 text-[#e8e8e8] hover:border-red-500/60 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {expandedRemarkId === r.id && (
                <div className="mt-3">
                  <SupplementaryRemarkPanel recordId={r.id} />
                </div>
              )}
            </div>
          ))}

          {records.length === 0 && (
            <p className="py-10 text-center text-sm text-[#888]">暂无记录，请上传合同或新建记录</p>
          )}
        </div>
      </div>

      <RecordForm />
    </div>
  )
}
