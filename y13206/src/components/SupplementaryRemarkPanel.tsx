import { useState } from 'react'
import { Clock, User, Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'

interface Props {
  recordId: string
}

export default function SupplementaryRemarkPanel({ recordId }: Props) {
  const { records, addSupplementaryRemark } = useStore()
  const record = records.find((r) => r.id === recordId)
  const [content, setContent] = useState('')
  const [changeDescription, setChangeDescription] = useState('')
  const [operator, setOperator] = useState('')

  if (!record) return null

  const handleSubmit = () => {
    if (!content.trim() || !operator.trim()) return
    addSupplementaryRemark(recordId, content.trim(), changeDescription.trim(), operator.trim())
    setContent('')
    setChangeDescription('')
    setOperator('')
  }

  const inputCls = 'w-full rounded-lg border border-[#555] bg-[#1a1a2e] px-3 py-2 text-sm text-[#e8e8e8] placeholder:text-[#888] focus:border-[#f0a500] focus:outline-none'

  return (
    <div className="rounded-xl border-2 border-[#f0a500] bg-[#2d2d44] p-4">
      <h4 className="mb-3 text-sm font-semibold text-[#f0a500]">后补备注</h4>

      {record.supplementaryRemarks.length === 0 && (
        <p className="mb-3 text-xs text-[#888]">暂无后补备注</p>
      )}

      <div className="relative space-y-0">
        {record.supplementaryRemarks.map((sr, i) => (
          <div key={sr.id} className="relative pl-6 pb-4">
            {i < record.supplementaryRemarks.length - 1 && (
              <div className="absolute left-[7px] top-3 h-full w-px bg-[#f0a500]/40" />
            )}
            <div className="absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2 border-[#f0a500] bg-[#1a1a2e]" />
            <div className="rounded-lg bg-[#1a1a2e] p-3">
              <div className="mb-1 flex items-center gap-3 text-xs text-[#888]">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{sr.createdAt}</span>
                <span className="flex items-center gap-1"><User className="h-3 w-3" />{sr.operator}</span>
              </div>
              <p className="text-sm text-[#e8e8e8]">{sr.content}</p>
              {sr.changeDescription && (
                <p className="mt-1 rounded bg-[#f0a500]/15 px-2 py-1 text-xs text-[#f0a500]">
                  变更：{sr.changeDescription}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2 border-t border-[#555] pt-4">
        <p className="text-xs text-[#e8e8e8]/70">添加后补备注</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          placeholder="备注内容"
          className={inputCls}
        />
        <textarea
          value={changeDescription}
          onChange={(e) => setChangeDescription(e.target.value)}
          rows={2}
          placeholder="变更说明"
          className={inputCls}
        />
        <input
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
          placeholder="操作人"
          className={inputCls}
        />
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || !operator.trim()}
          className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#f0a500] py-2 text-sm font-medium text-[#1a1a2e] shadow-[0_3px_0_#b37800] disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />添加备注
        </button>
      </div>
    </div>
  )
}
