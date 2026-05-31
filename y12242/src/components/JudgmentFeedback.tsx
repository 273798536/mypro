import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import type { Judgment, TrapHit, Verdict } from '@/types'

const VERDICT_LABEL: Record<Verdict, string> = {
  approved: '通过',
  rejected: '拒赔',
  pending_review: '待查',
}

const TRAP_LABEL: Record<string, string> = {
  waiting_period: '⏰ 等待期陷阱',
  invoice_duplicate: '📋 发票重复陷阱',
  clause_expired: '📜 条款过期陷阱',
}

interface Props {
  visible: boolean
  judgment: Judgment | null
  trapHit: TrapHit | null
  correctVerdict: Verdict | null
  correctReason: string
  onDismiss: () => void
}

export default function JudgmentFeedback({
  visible,
  judgment,
  trapHit,
  correctVerdict,
  correctReason,
  onDismiss,
}: Props) {
  if (!visible || !judgment) return null

  const isCorrect = judgment.isCorrect

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 transition-opacity duration-300">
      <div
        className="mx-4 w-full max-w-md rounded-xl p-6 shadow-2xl transition-all duration-300"
        style={{
          backgroundColor: '#1a1f2e',
          border: '1px solid #f5f0e830',
          animation: 'fadeInScale 0.3s ease-out',
        }}
      >
        <div className="flex flex-col items-center gap-4">
          {isCorrect ? (
            <>
              <CheckCircle className="h-12 w-12 text-emerald-400" />
              <h2 className="text-xl font-bold text-emerald-400">判定正确</h2>
              <p className="text-sm" style={{ color: '#f5f0e8cc' }}>
                你的裁定：{VERDICT_LABEL[judgment.verdict]}
              </p>
            </>
          ) : (
            <>
              <XCircle className="h-12 w-12 text-red-400" />
              <h2 className="text-xl font-bold text-red-400">判定错误</h2>
              <div className="text-center text-sm" style={{ color: '#f5f0e8cc' }}>
                <p>你的裁定：{VERDICT_LABEL[judgment.verdict]}</p>
                <p>
                  正确裁定：
                  <span className="font-semibold text-emerald-400">
                    {correctVerdict ? VERDICT_LABEL[correctVerdict] : '—'}
                  </span>
                </p>
              </div>
              {correctReason && (
                <p className="text-xs leading-relaxed" style={{ color: '#f5f0e899' }}>
                  {correctReason}
                </p>
              )}
            </>
          )}

          {trapHit && (
            <div
              className="w-full rounded-lg p-3"
              style={{ backgroundColor: '#f59e0b18', border: '1px solid #f59e0b40' }}
            >
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-semibold">
                  {TRAP_LABEL[trapHit.trapType] ?? trapHit.trapType}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-amber-300/80">
                {trapHit.explanation}
              </p>
            </div>
          )}

          <button
            onClick={onDismiss}
            className="mt-2 rounded-lg px-8 py-2 text-sm font-semibold transition-colors hover:opacity-90"
            style={{ backgroundColor: '#f5f0e8', color: '#1a1f2e' }}
          >
            确认
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
