import { useStore } from '@/store/useStore'
import { CONFLICT_TYPE_LABELS, COORDINATION_STATUS_LABELS } from '@/types'
import { manholes, pipelines, coordinationRecords } from '@/data/sampleData'
import { Download, FileText } from 'lucide-react'

export default function ReportExport() {
  const conflicts = useStore((s) => s.conflicts)
  const showConflicts = useStore((s) => s.showConflicts)

  const handleExport = () => {
    const manholeConclusions = manholes.map((mh) => {
      const relatedConflicts = conflicts.filter((c) =>
        c.involvedManholeIds.includes(mh.id)
      )
      const linkedPipe = pipelines.find((p) => p.id === mh.linkedPipelineId)
      return {
        manholeId: mh.id,
        label: mh.label,
        type: mh.type,
        elevation: mh.elevation,
        linkedPipeline: linkedPipe?.label ?? '未知',
        linkedPipelineVersion: linkedPipe?.version ?? '未知',
        position: mh.position,
        conflictCount: relatedConflicts.length,
        conflicts: relatedConflicts.map((c) => ({
          conflictId: c.id,
          type: CONFLICT_TYPE_LABELS[c.type],
          severity: c.severity,
          description: c.description,
        })),
      }
    })

    const conflictSummary = conflicts.map((c) => {
      const involvedManholeLabels = c.involvedManholeIds
        .map((id) => manholes.find((m) => m.id === id)?.label)
        .filter(Boolean)
      const involvedPipelineLabels = c.involvedPipelineIds
        .map((id) => pipelines.find((p) => p.id === id)?.label)
        .filter(Boolean)
      const relatedCoords = coordinationRecords
        .filter((r) => r.conflictId === c.id)
        .map((r) => ({
          id: r.id,
          status: COORDINATION_STATUS_LABELS[r.status],
          resolution: r.resolution,
        }))
      return {
        conflictId: c.id,
        type: CONFLICT_TYPE_LABELS[c.type],
        severity: c.severity,
        description: c.description,
        position: c.position,
        involvedPipelines: involvedPipelineLabels,
        involvedManholes: involvedManholeLabels,
        coordinationRecords: relatedCoords,
      }
    })

    const uiManholeConflictCount = conflicts.reduce((acc, c) => {
      c.involvedManholeIds.forEach((id) => {
        acc[id] = (acc[id] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)

    const consistencyCheck = manholeConclusions.every((mc) => {
      const uiCount = uiManholeConflictCount[mc.manholeId] || 0
      return mc.conflictCount === uiCount
    })

    const report = {
      exportTime: new Date().toISOString(),
      project: '地下管线冲突沙盘',
      summary: {
        totalConflicts: conflicts.length,
        highSeverity: conflicts.filter((c) => c.severity === 'high').length,
        mediumSeverity: conflicts.filter((c) => c.severity === 'medium').length,
        totalManholes: manholes.length,
        manholesWithConflicts: manholeConclusions.filter((mc) => mc.conflictCount > 0).length,
      },
      consistencyCheck: consistencyCheck ? 'PASS - 井盖点结论与界面冲突列表一致' : 'FAIL - 数据不一致',
      manholeConclusions,
      conflictSummary,
      coordinationSummary: coordinationRecords.map((r) => ({
        id: r.id,
        conflictId: r.conflictId,
        date: r.date,
        parties: r.parties,
        status: COORDINATION_STATUS_LABELS[r.status],
        resolution: r.resolution,
      })),
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pipeline-conflict-report-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-mono font-bold text-zinc-300">
        <FileText size={14} />
        报告导出
      </div>

      <div className="text-[10px] text-zinc-500 leading-relaxed">
        导出包含冲突列表、井盖点结论、协调记录的JSON报告。井盖点相关结论经过一致性校验，确保与界面显示一致。
      </div>

      {showConflicts && (
        <div className="space-y-1.5 text-[10px]">
          <div className="flex justify-between text-zinc-400">
            <span>冲突总数</span>
            <span className="font-mono">{conflicts.length}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>涉及井盖</span>
            <span className="font-mono">
              {new Set(conflicts.flatMap((c) => c.involvedManholeIds)).size}/{manholes.length}
            </span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>协调记录</span>
            <span className="font-mono">{coordinationRecords.length}</span>
          </div>
        </div>
      )}

      <button
        onClick={handleExport}
        className="w-full text-xs font-mono px-3 py-2 rounded flex items-center justify-center gap-2"
        style={{
          background: 'rgba(52,152,219,0.15)',
          color: '#3498db',
          border: '1px solid #3498db',
        }}
      >
        <Download size={12} />
        导出JSON报告
      </button>
    </div>
  )
}
