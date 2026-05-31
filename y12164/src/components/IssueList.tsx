import { useMemo } from 'react';
import { AlertTriangle, AlertCircle, XCircle, Link2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getIssueTypeLabel, getSeverityColor, getSeverityBgColor } from '../utils/torqueEngine';
import type { IssueRecord } from '../types';

interface IssueListProps {
  maxHeight?: number;
}

export const IssueList = ({ maxHeight = 400 }: IssueListProps) => {
  const { issues, selectJoint } = useAppStore();

  const sortedIssues = useMemo(() => {
    const severityOrder = { critical: 0, error: 1, warning: 2 };
    return [...issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [issues]);

  const getIssueIcon = (issue: IssueRecord) => {
    switch (issue.severity) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-danger-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-danger-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-industrial-300" />;
    }
  };

  const handleJumpToRecord = (issue: IssueRecord) => {
    if (issue.referenceId.startsWith('joint-')) {
      selectJoint(issue.referenceId);
    }
  };

  if (issues.length === 0) {
    return (
      <div className="h-full bg-industrial-700 rounded-lg p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-success-500" />
          <h3 className="text-sm font-semibold text-white font-mono">问题列表</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-4xl mb-4">✅</div>
          <p className="text-success-400 text-sm">未检测到问题</p>
          <p className="text-industrial-400 text-xs mt-1">所有参数均在正常范围内</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-industrial-700 rounded-lg p-4 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-danger-500" />
          <h3 className="text-sm font-semibold text-white font-mono">问题列表</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-danger-500 animate-pulse"></span>
            <span className="text-industrial-300">严重 {issues.filter((i) => i.severity === 'critical').length}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-danger-500"></span>
            <span className="text-industrial-300">错误 {issues.filter((i) => i.severity === 'error').length}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning-500"></span>
            <span className="text-industrial-300">警告 {issues.filter((i) => i.severity === 'warning').length}</span>
          </span>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto space-y-2 pr-2"
        style={{ maxHeight: maxHeight - 80 }}
      >
        {sortedIssues.map((issue, index) => (
          <div
            key={issue.id}
            className={`p-3 rounded-lg border ${getSeverityBgColor(issue.severity)} transition-all duration-200 hover:scale-[1.01] cursor-pointer`}
            onClick={() => handleJumpToRecord(issue)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1">
                {getIssueIcon(issue)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-industrial-400">
                      #{index + 1}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getSeverityColor(issue.severity)} bg-current/10`}>
                      {getIssueTypeLabel(issue.type)}
                    </span>
                    <span className="text-xs text-industrial-400">
                      {issue.position}
                    </span>
                  </div>
                  <p className="text-xs text-industrial-200 leading-relaxed">
                    {issue.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-industrial-400 font-mono">
                      {issue.timestamp}
                    </span>
                    <button
                      className="flex items-center gap-1 text-[10px] text-primary-400 hover:text-primary-300 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJumpToRecord(issue);
                      }}
                    >
                      <Link2 className="w-3 h-3" />
                      跳转记录
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-industrial-500">
        <div className="flex items-center justify-between text-xs">
          <span className="text-industrial-400">
            共 {issues.length} 个问题需要处理
          </span>
          <span className="text-danger-400">
            ⚠️ 负载缺失问题需优先解决
          </span>
        </div>
      </div>
    </div>
  );
};
