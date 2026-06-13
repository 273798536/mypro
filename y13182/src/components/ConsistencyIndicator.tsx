import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, RefreshCw, RotateCcw } from 'lucide-react'
import { useReplayStore } from '@/store/useReplayStore'
import type { ConsistencyCheck } from '@/types'

export default function ConsistencyIndicator() {
  const checkConsistency = useReplayStore((s) => s.checkConsistency)
  const rerun = useReplayStore((s) => s.rerun)
  const resetToDefault = useReplayStore((s) => s.resetToDefault)
  const lastRunId = useReplayStore((s) => s.lastRunId)
  const lastRunTimestamp = useReplayStore((s) => s.lastRunTimestamp)
  const [check, setCheck] = useState<ConsistencyCheck | null>(null)

  useEffect(() => {
    const result = checkConsistency()
    setCheck(result)
  }, [checkConsistency, lastRunId])

  if (!check) return null

  return (
    <div
      className={`rounded-lg border p-4 ${
        check.isConsistent
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-red-500/30 bg-red-500/5'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {check.isConsistent ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-400" />
        )}
        <span
          className={`text-sm font-semibold ${
            check.isConsistent ? 'text-emerald-300' : 'text-red-300'
          }`}
          style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
        >
          {check.isConsistent ? '状态一致' : '状态不一致'}
        </span>
      </div>

      <div
        className="mb-2 grid grid-cols-3 gap-2 text-xs"
        style={{ fontFamily: '"JetBrains Mono", monospace' }}
      >
        <div className="rounded bg-slate-800/50 px-2 py-1.5 text-center">
          <div className="text-slate-500">快照</div>
          <div className="text-slate-300">{check.snapshotCount}</div>
        </div>
        <div className="rounded bg-slate-800/50 px-2 py-1.5 text-center">
          <div className="text-slate-500">备注</div>
          <div className="text-slate-300">{check.noteCount}</div>
        </div>
        <div className="rounded bg-slate-800/50 px-2 py-1.5 text-center">
          <div className="text-slate-500">异常</div>
          <div className="text-slate-300">{check.anomalyCount}</div>
        </div>
      </div>

      {check.mismatches.length > 0 && (
        <div className="space-y-1">
          {check.mismatches.map((m, i) => (
            <div
              key={i}
              className="rounded border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-xs text-red-300"
              style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
            >
              {m}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span
          className="text-[10px] text-slate-600"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          {lastRunId} | {new Date(lastRunTimestamp).toLocaleString('zh-CN')}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => resetToDefault()}
            className="flex items-center gap-1 rounded border border-slate-600 px-2.5 py-1 text-xs text-slate-400 transition-colors hover:border-sky-500 hover:text-sky-400"
            style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
          >
            <RotateCcw className="h-3 w-3" />
            重置数据
          </button>
          <button
            onClick={() => rerun()}
            className="flex items-center gap-1 rounded border border-slate-600 px-2.5 py-1 text-xs text-slate-400 transition-colors hover:border-amber-500 hover:text-amber-400"
            style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
          >
            <RefreshCw className="h-3 w-3" />
            重跑校验
          </button>
        </div>
      </div>
    </div>
  )
}
