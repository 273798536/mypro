import { AlertTriangle, AlertCircle, Info, Lightbulb, Crosshair, Zap } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { DiagnosticType } from '../types';

const issueIcons: Record<DiagnosticType, React.ReactNode> = {
  parameter_explosion: <Zap size={16} />,
  section_break: <AlertTriangle size={16} />,
  singularity_misleading: <Crosshair size={16} />,
};

const issueLabels: Record<DiagnosticType, string> = {
  parameter_explosion: '参数爆炸',
  section_break: '截线断裂',
  singularity_misleading: '奇点误导',
};

export default function DiagnosticPanel() {
  const issues = useWorkspaceStore((state) => state.diagnosticIssues);
  const clearDiagnosticIssues = useWorkspaceStore((state) => state.clearDiagnosticIssues);

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${issues.length > 0 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
          诊断面板
        </h3>
        {issues.length > 0 && (
          <button
            onClick={clearDiagnosticIssues}
            className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            清除
          </button>
        )}
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400"></div>
          <span className="text-[11px] text-slate-400">
            错误 <span className="text-red-400 font-mono">{errorCount}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400"></div>
          <span className="text-[11px] text-slate-400">
            警告 <span className="text-amber-400 font-mono">{warningCount}</span>
          </span>
        </div>
      </div>

      {issues.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-900/30 flex items-center justify-center">
            <Info size={20} className="text-emerald-400" />
          </div>
          <p className="text-xs text-slate-400">暂无检测到的问题</p>
          <p className="text-[11px] text-slate-500 mt-1">曲面状态良好</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className={`p-3 rounded-lg border ${
                issue.severity === 'error'
                  ? 'bg-red-900/20 border-red-800/50'
                  : 'bg-amber-900/20 border-amber-800/50'
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className={`p-1 rounded mt-0.5 ${
                    issue.severity === 'error'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {issue.severity === 'error' ? (
                    <AlertCircle size={14} />
                  ) : (
                    issueIcons[issue.type]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-200">
                      {issueLabels[issue.type]}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] rounded ${
                        issue.severity === 'error'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {issue.severity === 'error' ? '错误' : '警告'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">
                    {issue.description}
                  </p>
                  <div className="flex items-start gap-1.5">
                    <Lightbulb size={12} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-cyan-300/80">
                      {issue.suggestion}
                    </p>
                  </div>
                  {issue.location && (
                    <div className="mt-2 flex items-center gap-2">
                      <Crosshair size={12} className="text-slate-500" />
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({issue.location[0].toFixed(2)}, {issue.location[1].toFixed(2)}, {issue.location[2].toFixed(2)})
                      </span>
                      <button className="text-[10px] text-cyan-400 hover:text-cyan-300 ml-auto">
                        定位
                      </button>
                    </div>
                  )}
                  <div className="mt-2 pt-2 border-t border-slate-700/50">
                    <p className="text-[10px] text-slate-500">
                      触发：<span className="font-mono text-slate-400 break-all">{issue.triggeredBy}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
