import { useMemo } from 'react'
import {
  AlertTriangle,
  Eye,
  CheckCircle,
  ChevronUp,
  ChevronDown,
  AlertOctagon,
  Box,
  Radio,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { ISSUE_TYPE_LABELS, SEVERITY_LABELS } from '@/types'
import type { DetectedIssue } from '@/types'

const SEVERITY_ORDER: Record<DetectedIssue['severity'], number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

const SEVERITY_COLORS: Record<DetectedIssue['severity'], string> = {
  critical: 'bg-red-500',
  warning: 'bg-orange-500',
  info: 'bg-blue-500',
}

const TYPE_ICONS: Record<DetectedIssue['type'], typeof AlertTriangle> = {
  wind_reversal: Radio,
  voxel_hole: Box,
  sensor_occlusion: AlertOctagon,
}

function IssueCard({
  issue,
  isSelected,
  onSelect,
  onConfirm,
}: {
  issue: DetectedIssue
  isSelected: boolean
  onSelect: () => void
  onConfirm: () => void
}) {
  const TypeIcon = TYPE_ICONS[issue.type]
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-[#2D333B] bg-[#1A1F26] hover:border-[#444C56]'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${SEVERITY_COLORS[issue.severity]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <TypeIcon size={12} className="text-[#8B949E] shrink-0" />
            <span className="text-xs font-medium text-[#E6EDF3]">{ISSUE_TYPE_LABELS[issue.type]}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                issue.severity === 'critical'
                  ? 'bg-red-500/15 text-red-400'
                  : issue.severity === 'warning'
                    ? 'bg-orange-500/15 text-orange-400'
                    : 'bg-blue-500/15 text-blue-400'
              }`}
            >
              {SEVERITY_LABELS[issue.severity]}
            </span>
          </div>
          <div className="text-[10px] font-mono text-[#8B949E] mb-1">
            ({issue.position.map((p) => p.toFixed(1)).join(', ')})
          </div>
          <div className="text-[11px] text-[#8B949E] line-clamp-1">{issue.description}</div>
        </div>
        <div
          onClick={(e) => {
            e.stopPropagation()
            onConfirm()
          }}
          className={`p-1 rounded shrink-0 transition-colors ${
            issue.confirmed
              ? 'text-emerald-400 hover:bg-emerald-500/15'
              : 'text-[#8B949E] hover:bg-[#2D333B]'
          }`}
        >
          {issue.confirmed ? <CheckCircle size={14} /> : <Eye size={14} />}
        </div>
      </div>
    </button>
  )
}

export default function IssuePanel() {
  const { issues, selectedIssueId, selectIssue, confirmIssue, issuePanelOpen, toggleIssuePanel } =
    useStore()

  const grouped = useMemo(() => {
    const sorted = [...issues].sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    )
    const groups: Record<string, DetectedIssue[]> = {}
    for (const issue of sorted) {
      ;(groups[issue.type] ??= []).push(issue)
    }
    return groups
  }, [issues])

  return (
    <div className="flex flex-col bg-[#0F1419] border-t border-[#2D333B] transition-all duration-300 ease-in-out overflow-hidden"
      style={{ height: issuePanelOpen ? 200 : 40 }}
    >
      <div className="flex items-center justify-between px-4 h-10 border-b border-[#2D333B] shrink-0">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-orange-500" />
          <span className="text-sm font-medium text-[#E6EDF3]">问题列表</span>
          {issues.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-mono">
              {issues.length}
            </span>
          )}
        </div>
        <button
          onClick={toggleIssuePanel}
          className="p-1 rounded hover:bg-[#1A1F26] text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
        >
          {issuePanelOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {issuePanelOpen && (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex gap-4 h-full">
            {Object.entries(grouped).map(([type, items]) => {
              const TypeIcon = TYPE_ICONS[type as DetectedIssue['type']]
              return (
                <div key={type} className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-1.5 mb-1 sticky top-0 bg-[#0F1419] py-0.5">
                    <TypeIcon size={12} className="text-[#8B949E]" />
                    <span className="text-xs text-[#8B949E]">{ISSUE_TYPE_LABELS[type as DetectedIssue['type']]}</span>
                    <span className="text-[10px] font-mono text-[#8B949E]">({items.length})</span>
                  </div>
                  <div className="space-y-1.5 overflow-y-auto max-h-[120px]">
                    {items.map((issue) => (
                      <IssueCard
                        key={issue.id}
                        issue={issue}
                        isSelected={issue.id === selectedIssueId}
                        onSelect={() => selectIssue(issue.id)}
                        onConfirm={() => confirmIssue(issue.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
