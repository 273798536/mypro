import { Shield, AlertTriangle, GitCompare } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function Header() {
  const baseline = useAppStore((s) => s.modelVersions.find((m) => m.id === s.baselineModelId))
  const candidate = useAppStore((s) => s.modelVersions.find((m) => m.id === s.candidateModelId))
  const totalRecords = useAppStore((s) => s.reviewRecords.length)
  const exceptionCount = useAppStore((s) => s.exceptionQueue.filter((e) => e.status !== 'resolved').length)

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white">
            <GitCompare size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">代码审查灰度对比</h1>
            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1">
                <Shield size={12} />
                基线 <span className="font-mono text-slate-700">{baseline?.name ?? '-'}</span>
              </span>
              <span className="text-slate-300">→</span>
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                灰度 <span className="font-mono text-slate-700">{candidate?.name ?? '-'}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-slate-500">本次评测 PR 数</div>
            <div className="text-xl font-semibold text-slate-900">{totalRecords}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 flex items-center justify-end gap-1">
              <AlertTriangle size={12} className="text-amber-500" />
              异常待确认
            </div>
            <div className="text-xl font-semibold text-amber-600">{exceptionCount}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
