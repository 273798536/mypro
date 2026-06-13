import { AlertTriangle, CheckCircle, GitCompare, FileText, Tag } from 'lucide-react'
import { nameplateRecords, nameplateChanges, detectCaliberInconsistency } from '@/data/mock'

const sourceColor: Record<string, string> = {
  '铭牌': 'bg-amber-600/30 text-amber-300',
  '正常记录': 'bg-emerald-600/30 text-emerald-300',
  '口头说明': 'bg-rose-600/30 text-rose-300',
}

export default function Trace() {
  const caliberIssues = detectCaliberInconsistency()

  return (
    <div className="h-full overflow-y-auto bg-[#0F1724] text-slate-200 p-6 space-y-8 font-sans">
      <h1 className="text-2xl font-bold tracking-tight">材料追溯</h1>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FileText size={18} /> 铭牌变更记录
        </h2>
        <div className="rounded-lg border border-[#2A3F6A] bg-[#1B2A4A] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A3F6A] text-slate-400 text-left">
                <th className="px-4 py-2">字段</th>
                <th className="px-4 py-2">原始值</th>
                <th className="px-4 py-2">当前值</th>
                <th className="px-4 py-2">变更时间</th>
                <th className="px-4 py-2">变更人</th>
                <th className="px-4 py-2">来源</th>
              </tr>
            </thead>
            <tbody>
              {nameplateRecords.map((rec) => {
                const change = nameplateChanges.find((c) => c.recordId === rec.id)
                return (
                  <tr
                    key={rec.id}
                    className={`border-b border-[#2A3F6A]/50 ${
                      rec.changed
                        ? 'border-l-[3px] border-l-[#FF6B35] bg-[#FF6B35]/5'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-2 font-medium">{rec.fieldName}</td>
                    <td className="px-4 py-2 font-[JetBrains_Mono]">{rec.originalValue}{rec.unit}</td>
                    <td className="px-4 py-2 font-[JetBrains_Mono]">
                      {rec.changed ? (
                        <span className="text-[#FF6B35]">{rec.currentValue}{rec.unit}</span>
                      ) : (
                        <>{rec.currentValue}{rec.unit}</>
                      )}
                    </td>
                    <td className="px-4 py-2 font-[JetBrains_Mono] text-xs">{change?.changedAt ?? '—'}</td>
                    <td className="px-4 py-2">{change?.changedBy ?? '—'}</td>
                    <td className="px-4 py-2">
                      {change ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${sourceColor[change.source]}`}>
                          <Tag size={10} />{change.source}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <GitCompare size={18} /> 版本对比
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-[#2A3F6A] bg-[#1B2A4A] overflow-hidden">
            <div className="px-4 py-2 border-b border-[#2A3F6A] text-slate-400 text-sm font-medium">原始记录</div>
            <div className="p-4 space-y-2">
              {nameplateRecords.filter((r) => r.changed).map((rec) => (
                <div key={rec.id} className="font-[JetBrains_Mono] text-sm">
                  <span className="text-slate-400 mr-2">{rec.fieldName}</span>
                  <span className="line-through text-red-400">{rec.originalValue}</span>
                  <span className="text-slate-500">{rec.unit}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-[#2A3F6A] bg-[#1B2A4A] overflow-hidden">
            <div className="px-4 py-2 border-b border-[#2A3F6A] text-slate-400 text-sm font-medium">当前记录</div>
            <div className="p-4 space-y-2">
              {nameplateRecords.filter((r) => r.changed).map((rec) => {
                const change = nameplateChanges.find((c) => c.recordId === rec.id)
                return (
                  <div key={rec.id} className="font-[JetBrains_Mono] text-sm flex items-center gap-2">
                    <span className="text-slate-400">{rec.fieldName}</span>
                    <span className="text-emerald-400">{rec.currentValue}</span>
                    <span className="text-slate-500">{rec.unit}</span>
                    {change && (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${sourceColor[change.source]}`}>
                        <Tag size={8} />{change.source}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <AlertTriangle size={18} /> 口径检测
        </h2>
        {caliberIssues.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-[#FF6B35]/10 border border-[#FF6B35]/40 px-4 py-3 text-sm text-[#FF6B35]">
            <AlertTriangle size={16} />
            <span>检测到 {caliberIssues.length} 处口径不一致</span>
          </div>
        )}
        <div className="space-y-3">
          {caliberIssues.map((item, i) => (
            <div
              key={i}
              className="rounded-lg border-l-[3px] border-l-[#FF6B35] border border-[#2A3F6A] bg-[#1B2A4A] p-4 space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle size={14} className="text-[#FF6B35]" />
                {item.field}
              </div>
              <p className="text-sm text-slate-300">{item.issue}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400">冲突来源：</span>
                {item.sources.map((s) => (
                  <span key={s} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${sourceColor[s]}`}>
                    <Tag size={10} />{s}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {caliberIssues.length === 0 && (
            <div className="flex items-center gap-2 text-[#2ECC71] text-sm">
              <CheckCircle size={16} /> 所有字段口径一致，无冲突
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
