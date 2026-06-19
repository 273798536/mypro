import { useEffect, useState } from 'react'
import { ShieldAlert, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { useStore } from '@/store/useStore'

export default function BackupGaps() {
  const { backupGaps, fetchBackupGaps } = useStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchBackupGaps()
  }, [fetchBackupGaps])

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">备份缺口追溯</h1>

      <div className="space-y-3">
        {backupGaps.map((gap) => {
          const isExpanded = expandedId === gap.id
          return (
            <div key={gap.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div
                className="px-5 py-4 flex items-center cursor-pointer hover:bg-slate-700/30 transition-colors"
                onClick={() => toggle(gap.id)}
              >
                <ShieldAlert className="w-4 h-4 text-amber-500 mr-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{gap.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span>行号: {gap.original_line_no}</span>
                    {gap.image_name && <span>图片: {gap.image_name}</span>}
                    {gap.source_remark && <span>来源: {gap.source_remark}</span>}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400 ml-2" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 ml-2" />
                )}
              </div>

              {isExpanded && (
                <div className="px-5 py-4 border-t border-slate-700 bg-slate-900/50">
                  <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-3">来源回溯</h4>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <span className="text-slate-400 w-24">源表名</span>
                      <span className="text-white font-mono">{gap.source_table}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-slate-400 w-24">源记录ID</span>
                      <span className="text-white font-mono text-xs">{gap.source_record_id}</span>
                    </div>
                    {gap.source_table === 'slow_query_logs' && (
                      <a
                        href={`/slow-query-logs`}
                        className="inline-flex items-center text-xs text-amber-500 hover:text-amber-400 mt-2"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        跳转到慢查询日志
                      </a>
                    )}
                    {gap.conclusion_id && (
                      <div className="flex items-center text-sm mt-2">
                        <span className="text-slate-400 w-24">关联结论</span>
                        <span className="text-amber-400 font-mono text-xs">{gap.conclusion_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {backupGaps.length === 0 && (
          <div className="bg-slate-800 rounded-xl p-10 text-center border border-slate-700">
            <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">暂无备份缺口记录</p>
          </div>
        )}
      </div>
    </div>
  )
}
