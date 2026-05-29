import React, { useState } from 'react';
import { AlertTriangle, User, FileText, ChevronDown, ChevronUp, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useAppStore } from '../store';
import { Issue, IssueStatus, IssueType } from '../types';

const IssuePanel: React.FC = () => {
  const { issues, updateIssueStatus } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getSeverityStyle = (severity: Issue['severity']) => {
    switch (severity) {
      case 'critical':
        return { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', label: '严重' };
      case 'error':
        return { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400', label: '错误' };
      case 'warning':
        return { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', label: '警告' };
    }
  };

  const getTypeIcon = (type: IssueType) => {
    switch (type) {
      case 'escalator_capacity':
        return <XCircle className="w-4 h-4" />;
      case 'barrier_inactive':
        return <AlertTriangle className="w-4 h-4" />;
      case 'flow_reflux':
        return <AlertTriangle className="w-4 h-4" />;
      case 'data_missing':
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusStyle = (status: IssueStatus) => {
    switch (status) {
      case 'open':
        return { icon: <XCircle className="w-4 h-4" />, text: '待处理', color: 'text-red-400' };
      case 'in_progress':
        return { icon: <Clock className="w-4 h-4" />, text: '处理中', color: 'text-yellow-400' };
      case 'resolved':
        return { icon: <CheckCircle2 className="w-4 h-4" />, text: '已解决', color: 'text-green-400' };
    }
  };

  const getTypeLabel = (type: IssueType) => {
    switch (type) {
      case 'escalator_capacity':
        return '扶梯容量';
      case 'barrier_inactive':
        return '围挡失效';
      case 'flow_reflux':
        return '客流回流';
      case 'data_missing':
        return '数据缺失';
    }
  };

  const stats = {
    total: issues.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    open: issues.filter(i => i.status === 'open').length
  };

  return (
    <div className="w-80 glass-panel rounded-l-2xl flex flex-col h-full">
      <div className="p-4 border-b border-blue-500/20">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <h2 className="text-lg font-display font-semibold text-white">问题追踪</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 bg-blue-500/10 rounded-lg text-center">
            <p className="text-2xl font-display font-bold text-white">{stats.total}</p>
            <p className="text-xs text-blue-200/60">总计</p>
          </div>
          <div className="p-2 bg-red-500/10 rounded-lg text-center">
            <p className="text-2xl font-display font-bold text-red-400">{stats.critical}</p>
            <p className="text-xs text-blue-200/60">严重</p>
          </div>
          <div className="p-2 bg-yellow-500/10 rounded-lg text-center">
            <p className="text-2xl font-display font-bold text-yellow-400">{stats.open}</p>
            <p className="text-xs text-blue-200/60">待处理</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {issues.length === 0 ? (
          <div className="text-center text-blue-200/60 py-12">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400/60" />
            <p>暂无问题</p>
            <p className="text-sm mt-1">数据状态良好</p>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => {
              const severity = getSeverityStyle(issue.severity);
              const status = getStatusStyle(issue.status);
              const isExpanded = expandedId === issue.id;

              return (
                <div
                  key={issue.id}
                  className={`rounded-lg border transition-all ${severity.bg} ${severity.border}`}
                >
                  <div
                    className="p-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={severity.text}>{getTypeIcon(issue.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{issue.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${severity.bg} ${severity.text}`}>
                              {getTypeLabel(issue.type)}
                            </span>
                            {issue.floor && (
                              <span className="text-xs text-blue-200/60">
                                B{issue.floor}层
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-blue-300 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-blue-300 shrink-0" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-blue-500/20 pt-3">
                      <p className="text-sm text-blue-200/80 mb-3">{issue.description}</p>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 text-xs">
                          <User className="w-3 h-3 text-blue-300" />
                          <span className="text-blue-200/60">对接人:</span>
                          <span className="text-white">{issue.responsiblePerson}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <FileText className="w-3 h-3 text-blue-300" />
                          <span className="text-blue-200/60">文档:</span>
                          <span className="text-blue-300 font-mono truncate">{issue.documentPath}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-1 text-xs ${status.color}`}>
                          {status.icon}
                          <span>{status.text}</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateIssueStatus(issue.id, 'in_progress');
                            }}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              issue.status === 'in_progress'
                                ? 'bg-yellow-500 text-white'
                                : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                            }`}
                          >
                            处理中
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateIssueStatus(issue.id, 'resolved');
                            }}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              issue.status === 'resolved'
                                ? 'bg-green-500 text-white'
                                : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                            }`}
                          >
                            已解决
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-blue-500/20">
        <div className="text-xs text-blue-200/60">
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            红色 = 扶梯容量错误已拦截
          </p>
        </div>
      </div>
    </div>
  );
};

export default IssuePanel;
