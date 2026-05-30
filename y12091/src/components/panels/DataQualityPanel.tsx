import { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, ChevronDown, ChevronRight, Wrench, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getIssueTypeLabel, getSeverityColor, getSeverityLabel } from '../../utils/dataValidator';
import { DataQualityIssue } from '../../types';

interface IssueItemProps {
  issue: DataQualityIssue;
  onIgnore: (id: string) => void;
  onFix: (id: string, fixData: Record<string, any>) => void;
}

function IssueItem({ issue, onIgnore, onFix }: IssueItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);

  const severityColor = getSeverityColor(issue.severity);
  const typeLabel = getIssueTypeLabel(issue.type);

  return (
    <div
      className={`mb-2 rounded-lg border transition-all ${
        issue.ignored
          ? 'bg-slate-800/30 border-slate-700/50 opacity-60'
          : 'bg-slate-800/80 border-slate-600'
      }`}
    >
      <div
        className="p-3 cursor-pointer flex items-start gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${severityColor}20` }}
        >
          <AlertTriangle size={14} style={{ color: severityColor }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs px-2 py-0.5 rounded font-medium"
              style={{ backgroundColor: `${severityColor}20`, color: severityColor }}
            >
              {getSeverityLabel(issue.severity)}
            </span>
            <span className="text-xs text-slate-400">{typeLabel}</span>
            {issue.ignored && (
              <span className="text-xs text-slate-500">(已忽略)</span>
            )}
          </div>
          <div className="text-sm text-slate-200 line-clamp-2">{issue.description}</div>
        </div>

        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronDown size={16} className="text-slate-400" />
          ) : (
            <ChevronRight size={16} className="text-slate-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-700/50 pt-3">
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-sky-400" />
              <span className="text-xs text-sky-400 font-medium">修正建议</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{issue.suggestion}</p>
          </div>

          <div className="flex gap-2">
            {!issue.ignored && issue.fixData && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFix(issue.id, issue.fixData!);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/20 text-sky-400 text-xs rounded hover:bg-sky-500/30 transition-colors border border-sky-500/30"
              >
                <Wrench size={12} />
                自动修正
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onIgnore(issue.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors border ${
                issue.ignored
                  ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30'
                  : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
              }`}
            >
              {issue.ignored ? <Eye size={12} /> : <EyeOff size={12} />}
              {issue.ignored ? '取消忽略' : '忽略此问题'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DataQualityPanel() {
  const { issues, ignoreIssue, fixIssue } = useAppStore();

  const activeIssues = issues.filter(i => !i.ignored);
  const ignoredIssues = issues.filter(i => i.ignored);

  const highCount = activeIssues.filter(i => i.severity === 'high').length;
  const mediumCount = activeIssues.filter(i => i.severity === 'medium').length;
  const lowCount = activeIssues.filter(i => i.severity === 'low').length;

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-400" />
          数据质量检测
        </h3>
        <div className="flex items-center gap-2">
          {highCount > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-400">{highCount}</span>
            </span>
          )}
          {mediumCount > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-amber-400">{mediumCount}</span>
            </span>
          )}
          {lowCount > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-green-400">{lowCount}</span>
            </span>
          )}
        </div>
      </div>

      {activeIssues.length === 0 && ignoredIssues.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle size={32} className="mx-auto text-green-400 mb-2" />
          <p className="text-sm text-slate-400">数据质量良好，未检测到问题</p>
        </div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1">
          {activeIssues.map((issue) => (
            <IssueItem
              key={issue.id}
              issue={issue}
              onIgnore={ignoreIssue}
              onFix={fixIssue}
            />
          ))}

          {ignoredIssues.length > 0 && (
            <>
              <div className="text-xs text-slate-500 py-2 border-t border-slate-700 mt-3 pt-3">
                已忽略的问题 ({ignoredIssues.length})
              </div>
              {ignoredIssues.map((issue) => (
                <IssueItem
                  key={issue.id}
                  issue={issue}
                  onIgnore={ignoreIssue}
                  onFix={fixIssue}
                />
              ))}
            </>
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          检测内容包括：断面缺失、流量突变、坐标错位、字段缺失、数据延迟
        </p>
      </div>
    </div>
  );
}
