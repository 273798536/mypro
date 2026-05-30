import { AlertTriangle, ArrowRight, Cross, ShieldAlert } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { IssueType } from '@/types'

const TYPE_CONFIG: Record<IssueType, { icon: typeof AlertTriangle; color: string; cardClass: string; label: string }> = {
  size_out_of_bound: { icon: ArrowRight, color: 'text-med-orange', cardClass: 'issue-card-size', label: '尺寸越界' },
  side_mismatch: { icon: Cross, color: 'text-med-purple', cardClass: 'issue-card-side', label: '侧别混淆' },
  forbidden_zone_collision: { icon: ShieldAlert, color: 'text-med-red', cardClass: 'issue-card-collision', label: '禁区碰撞' },
}

export default function CollisionPanel() {
  const issues = useAppStore((s) => s.filteredIssues)
  const selectedIssueId = useAppStore((s) => s.selectedIssueId)
  const selectIssue = useAppStore((s) => s.selectIssue)

  if (issues.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="text-med-green text-sm font-medium">✓ 未检测到匹配问题</div>
        <div className="text-med-text-dim text-xs mt-1">所有植入物参数在安全范围内</div>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
      {issues.map((issue) => {
        const config = TYPE_CONFIG[issue.type]
        const Icon = config.icon
        const isSelected = selectedIssueId === issue.id
        return (
          <div
            key={issue.id}
            onClick={() => selectIssue(isSelected ? null : issue.id)}
            className={`issue-card ${config.cardClass} ${isSelected ? 'ring-1 ring-current' : ''}`}
          >
            <div className="flex items-start gap-2">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold ${config.color}`}>
                    {config.label}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      issue.severity === 'critical'
                        ? 'bg-med-red/20 text-med-red'
                        : 'bg-med-orange/20 text-med-orange'
                    }`}
                  >
                    {issue.severity === 'critical' ? '严重' : '警告'}
                  </span>
                </div>
                <p className="text-xs text-med-text leading-relaxed">
                  {issue.description}
                </p>
                {isSelected && (
                  <div className="mt-2 p-2 rounded bg-med-dark/60 text-xs text-med-text-dim leading-relaxed">
                    <span className="text-med-text font-medium">解释：</span>
                    {issue.explanation}
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  selectIssue(issue.id)
                }}
                className="text-med-text-dim hover:text-med-blue transition-colors shrink-0"
                title="定位到3D视图"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
