import { useEffect, useState } from 'react'
import { Link2, ChevronRight, ArrowRightLeft } from 'lucide-react'
import { useStore } from '@/store/useStore'

export default function SnapshotConclusion() {
  const { snapshots, fetchSnapshots, conclusions, fetchConclusions } = useStore()
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null)
  const [activeConclusionId, setActiveConclusionId] = useState<string | null>(null)

  useEffect(() => {
    fetchSnapshots()
    fetchConclusions()
  }, [fetchSnapshots, fetchConclusions])

  const handleSnapshotClick = (snapshotId: string) => {
    setActiveSnapshotId(snapshotId)
    const snap = snapshots.find((s) => s.id === snapshotId)
    if (snap?.conclusion_id) {
      setActiveConclusionId(snap.conclusion_id)
    } else {
      setActiveConclusionId(null)
    }
  }

  const handleConclusionClick = (conclusionId: string) => {
    setActiveConclusionId(conclusionId)
    const conc = conclusions.find((c) => c.id === conclusionId)
    if (conc?.related_snapshot_id) {
      setActiveSnapshotId(conc.related_snapshot_id)
    }
  }

  const activeSnapshot = snapshots.find((s) => s.id === activeSnapshotId)
  const activeConclusion = conclusions.find((c) => c.id === activeConclusionId)

  const breadcrumb = []
  breadcrumb.push('快照-结论')
  if (activeSnapshot) breadcrumb.push(activeSnapshot.table_name)
  if (activeConclusion) breadcrumb.push('结论详情')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">快照-结论链路</h1>

      <div className="flex items-center text-sm text-slate-400">
        {breadcrumb.map((item, idx) => (
          <span key={idx} className="flex items-center">
            {idx > 0 && <ChevronRight className="w-3 h-3 mx-1" />}
            <span className={idx === breadcrumb.length - 1 ? 'text-amber-400' : ''}>{item}</span>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">表结构快照</h2>
          {snapshots.map((snapshot) => {
            const isActive = activeSnapshotId === snapshot.id
            const hasConclusion = conclusions.some((c) => c.related_snapshot_id === snapshot.id)
            return (
              <div
                key={snapshot.id}
                onClick={() => handleSnapshotClick(snapshot.id)}
                className={`bg-slate-800 rounded-xl border p-4 cursor-pointer transition-colors ${
                  isActive ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Link2 className={`w-4 h-4 mr-2 ${isActive ? 'text-amber-500' : 'text-slate-500'}`} />
                    <span className="text-white font-medium text-sm">{snapshot.table_name}</span>
                  </div>
                  {hasConclusion && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const conc = conclusions.find((c) => c.related_snapshot_id === snapshot.id)
                        if (conc) handleConclusionClick(conc.id)
                      }}
                      className="text-amber-500 hover:text-amber-400"
                      title="跳转到结论"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <pre className="font-mono text-xs text-slate-400 bg-slate-900 rounded p-2 overflow-x-auto max-h-24 line-clamp-4">
                  {snapshot.schema_ddl}
                </pre>
                <div className="text-xs text-slate-500 mt-2">{snapshot.captured_at}</div>
              </div>
            )
          })}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">结论详情</h2>
          {activeConclusion ? (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  activeConclusion.immutable ? 'bg-slate-600/30 text-slate-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {activeConclusion.immutable ? '不可变' : '可编辑'}
                </span>
                {activeConclusion.related_snapshot_id && (
                  <button
                    onClick={() => handleSnapshotClick(activeConclusion.related_snapshot_id!)}
                    className="text-amber-500 hover:text-amber-400"
                    title="跳转到快照"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{activeConclusion.content}</p>
              <div className="text-xs text-slate-500 mt-4">{activeConclusion.created_at}</div>
            </div>
          ) : activeSnapshotId ? (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
              <p className="text-slate-400 text-sm">该快照暂无关联结论</p>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
              <Link2 className="w-8 h-8 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">点击左侧快照查看关联结论</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
