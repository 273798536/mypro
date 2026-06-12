import { useStore } from '@/store'
import {
  AlertOctagon,
  ArrowRightLeft,
  RotateCcw,
  FileText,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'

export default function AnomalyPage() {
  const { data, setActiveTab, setHighlightedRow } = useStore()

  return (
    <div className="p-8 space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold text-white">
          异常审查 / ANOMALY
        </h2>
        <p className="text-sm text-industrial-600 mt-1 font-mono">
          方向符号错误单独拎出 · 撤回记录时间线 · 后补说明
        </p>
      </header>

      {/* Symbol Error Section - prominently displayed */}
      <div className="bg-status-red/5 border-2 border-status-red/30 rounded-lg overflow-hidden">
        <div className="px-5 py-4 bg-status-red/10 border-b border-status-red/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-status-red/20 flex items-center justify-center">
            <AlertOctagon className="w-6 h-6 text-status-red" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-bold text-status-red text-lg">
              ⚠ 方向符号错误专区 · 已单独拎出
            </h3>
            <p className="text-xs font-mono text-industrial-600 mt-0.5">
              算法值班最怕符号写反被揉进正常结果 — 以下记录已排除出统计结果
            </p>
          </div>
          <span className="px-3 py-1 bg-status-red text-white rounded font-display font-bold text-sm">
            {data?.symbol_errors.length || 0} 条
          </span>
        </div>

        <div className="p-5 space-y-4">
          {data?.symbol_errors.map((err) => (
            <div
              key={err.id}
              className="bg-industrial-900 border border-status-red/30 rounded-lg p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-status-red/20 flex items-center justify-center">
                    <ArrowRightLeft className="w-4 h-4 text-status-red" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-white">
                      {err.param_name}
                    </p>
                    <button
                      onClick={() => {
                        setHighlightedRow(err.nameplate_row)
                        setActiveTab('nameplate')
                      }}
                      className="text-xs font-mono text-warning-500 hover:text-warning-400 flex items-center gap-1 mt-0.5"
                    >
                      关联铭牌行 #{err.nameplate_row}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-industrial-800 rounded px-4 py-2">
                  <div className="text-center">
                    <p className="text-xs font-mono text-industrial-600">原值(错)</p>
                    <p className="font-display font-bold text-lg text-status-red line-through">
                      {err.original_value > 0 ? '+' : ''}
                      {err.original_value}
                    </p>
                  </div>
                  <ArrowRightLeft className="w-5 h-5 text-warning-500" />
                  <div className="text-center">
                    <p className="text-xs font-mono text-industrial-600">修正值</p>
                    <p className="font-display font-bold text-lg text-status-green">
                      {err.corrected_value > 0 ? '+' : ''}
                      {err.corrected_value}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-industrial-800/50 rounded p-3">
                  <p className="text-xs font-mono text-industrial-600 uppercase tracking-wider mb-1">
                    方向说明
                  </p>
                  <p className="text-sm font-mono text-warning-500">{err.direction}</p>
                </div>
                <div className="bg-industrial-800/50 rounded p-3">
                  <p className="text-xs font-mono text-industrial-600 uppercase tracking-wider mb-1">
                    影响范围
                  </p>
                  <p className="text-sm font-mono text-status-red">{err.impact_scope}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Withdraw Records Timeline */}
      <div className="bg-industrial-900/50 border border-grid-line rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-grid-line flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-warning-500/20 flex items-center justify-center">
            <RotateCcw className="w-6 h-6 text-warning-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-bold text-white">
              撤回记录时间线
            </h3>
            <p className="text-xs font-mono text-industrial-600 mt-0.5">
              含撤回原因与后补说明，设备铭牌行已对应标记
            </p>
          </div>
          <span className="px-3 py-1 bg-warning-500/20 text-warning-500 rounded font-display font-bold text-sm border border-warning-500/30">
            {data?.withdraw_records.length || 0} 条
          </span>
        </div>

        <div className="p-5">
          <div className="relative pl-8">
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-grid-line" />
            {data?.withdraw_records.map((rec, idx) => (
              <div
                key={rec.id}
                className="relative pb-8 last:pb-0"
              >
                <div className="absolute -left-[22px] top-1 w-5 h-5 rounded-full bg-industrial-900 border-2 border-warning-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-warning-500" />
                </div>
                {rec.supplementary_note && (
                  <div className="absolute -left-[18px] top-10 w-3 h-3 rounded-full bg-industrial-900 border-2 border-status-green flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-status-green" />
                  </div>
                )}

                <div className="bg-industrial-800 rounded-lg border border-grid-line overflow-hidden">
                  <div className="px-4 py-3 border-b border-grid-line flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-warning-500/20 text-warning-500 text-xs font-mono rounded border border-warning-500/30">
                        WITHDRAW
                      </span>
                      <span className="font-mono text-sm text-white">{rec.related_device}</span>
                    </div>
                    <span className="font-mono text-xs text-industrial-600">
                      {rec.timestamp}
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs font-mono text-industrial-600 uppercase tracking-wider mb-1">
                        撤回原因
                      </p>
                      <p className="font-mono text-sm text-white">{rec.reason}</p>
                    </div>
                    {rec.supplementary_note && (
                      <div className="bg-status-green/5 border border-status-green/20 rounded p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-3 h-3 text-status-green" />
                          <p className="text-xs font-mono text-status-green uppercase tracking-wider">
                            后补说明
                          </p>
                        </div>
                        <p className="font-mono text-sm text-white/90">
                          {rec.supplementary_note}
                        </p>
                      </div>
                    )}
                    <p className="text-xs font-mono text-industrial-600">
                      操作人: {rec.operator}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bad data reference */}
      {data?.nameplate.filter((r) => r.bad_data_flag).length! > 0 && (
        <div className="bg-industrial-900/50 border border-grid-line rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-grid-line flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-status-yellow/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-status-yellow" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white">坏数据索引</h3>
              <p className="text-xs font-mono text-industrial-600 mt-0.5">
                指向设备铭牌中的原始行
              </p>
            </div>
          </div>
          <div className="p-5 space-y-2">
            {data?.nameplate
              .filter((r) => r.bad_data_flag)
              .map((row) => (
                <button
                  key={row.row_no}
                  onClick={() => {
                    setHighlightedRow(row.row_no)
                    setActiveTab('nameplate')
                  }}
                  className="w-full flex items-center gap-4 p-3 bg-industrial-800 rounded hover:bg-industrial-700/70 transition-colors text-left"
                >
                  <span className="font-mono text-warning-500 font-bold">
                    行 #{row.row_no.toString().padStart(3, '0')}
                  </span>
                  <span className="font-mono text-sm text-white">
                    {row.device_id} · {row.param_name}
                  </span>
                  <span className="font-mono text-xs text-status-red ml-auto">
                    {row.bad_data_reason}
                  </span>
                  <ExternalLink className="w-4 h-4 text-industrial-600" />
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
