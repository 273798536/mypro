import { CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ValidateResult {
  caseId: string
  customerName: string
  pass: boolean
  missing: string[]
}

interface ExportValidateModalProps {
  open: boolean
  onClose: () => void
  results: ValidateResult[]
  onExportConfirm?: () => void
}

export default function ExportValidateModal({ open, onClose, results, onExportConfirm }: ExportValidateModalProps) {
  if (!open) return null

  const allPass = results.every((r) => r.pass)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-lg rounded-xl border border-white/10 bg-[#1A1A2E] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 text-lg font-semibold text-[#F5F5F0]">导出校验结果</h2>

        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {results.map((r) => (
            <div
              key={r.caseId}
              className={cn(
                'rounded-lg border p-3',
                r.pass ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
              )}
            >
              <div className="flex items-center gap-2">
                {r.pass ? (
                  <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-red-400" />
                )}
                <span className="text-sm font-medium text-[#F5F5F0]">{r.customerName}</span>
              </div>
              {!r.pass && r.missing.length > 0 && (
                <div className="mt-2 ml-7 space-y-0.5">
                  {r.missing.map((m, i) => (
                    <p key={i} className="text-xs text-red-300">
                      缺少: {m}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[#F5F5F0]/70 transition hover:bg-white/5"
          >
            取消
          </button>
          {allPass ? (
            <button
              onClick={() => onExportConfirm?.()}
              className="rounded-lg bg-[#0F9B8E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d8a7e]"
            >
              全部通过，可导出
            </button>
          ) : (
            <button
              onClick={onClose}
              className="rounded-lg bg-[#E8813B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#d0732f]"
            >
              存在未通过项，请返回处理
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
