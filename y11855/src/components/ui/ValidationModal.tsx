import { useState } from 'react';
import { X, AlertCircle, AlertTriangle, Info, CheckCircle, ChevronDown, ChevronRight, Search, Filter } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
  ISSUE_TYPE_LABELS,
  SEVERITY_COLORS,
  type IssueSeverity,
  type IssueType
} from '../../types';
import { getIssueSummary } from '../../utils/validation';

export function ValidationModal() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState<IssueSeverity | 'all'>('all');
  const [filterType, setFilterType] = useState<IssueType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const showValidationModal = useAppStore(state => state.showValidationModal);
  const setShowValidationModal = useAppStore(state => state.setShowValidationModal);
  const validationIssues = useAppStore(state => state.validationIssues);
  const setSelectedElement = useAppStore(state => state.setSelectedElement);

  const summary = getIssueSummary(validationIssues);
  const hasErrors = summary.errors > 0;

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getSeverityIcon = (severity: IssueSeverity) => {
    switch (severity) {
      case 'error': return <AlertCircle size={16} className="text-red-500" />;
      case 'warning': return <AlertTriangle size={16} className="text-orange-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  const getSeverityLabel = (severity: IssueSeverity) => {
    switch (severity) {
      case 'error': return '错误';
      case 'warning': return '警告';
      default: return '提示';
    }
  };

  const handleLocate = (issue: any) => {
    if (issue.elementType === 'building' || issue.elementType === 'surface' || issue.elementType === 'runway') {
      setSelectedElement({ type: issue.elementType as 'building' | 'surface' | 'runway', id: issue.elementId });
    }
  };

  const filteredIssues = validationIssues.filter(issue => {
    if (filterSeverity !== 'all' && issue.severity !== filterSeverity) return false;
    if (filterType !== 'all' && issue.type !== filterType) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return issue.message.toLowerCase().includes(query) ||
             issue.suggestion.toLowerCase().includes(query) ||
             issue.elementId.toLowerCase().includes(query);
    }
    return true;
  });

  const groupedIssues = filteredIssues.reduce((acc, issue) => {
    const type = issue.elementType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(issue);
    return acc;
  }, {} as Record<string, typeof validationIssues>);

  const groupLabels: Record<string, string> = {
    runway: '跑道',
    building: '建筑',
    surface: '净空面',
    scene: '场景'
  };

  if (!showValidationModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-[700px] max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            {hasErrors ? (
              <AlertCircle size={20} className="text-red-500" />
            ) : (
              <AlertTriangle size={20} className="text-orange-500" />
            )}
            <div>
              <h2 className="text-white font-semibold text-base">数据校验报告</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                检测到 <span className="text-red-400 font-mono">{summary.errors}</span> 个错误，
                <span className="text-orange-400 font-mono">{summary.warnings}</span> 个警告，
                <span className="text-blue-400 font-mono">{summary.infos}</span> 个提示
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowValidationModal(false)}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {hasErrors && (
          <div className="px-6 py-3 bg-red-950/50 border-b border-red-900/50">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-red-300 font-medium">
                  存在严重数据问题，部分功能可能无法正常工作
                </p>
                <p className="text-xs text-red-400/80 mt-0.5">
                  碰撞检测将被禁用。请修正以下问题后重新导入数据。
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 py-3 border-b border-slate-700 flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索问题描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">全部级别</option>
              <option value="error">仅错误</option>
              <option value="warning">仅警告</option>
              <option value="info">仅提示</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">全部类型</option>
              {Object.entries(ISSUE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {Object.entries(groupedIssues).map(([group, issues]) => (
            <div key={group}>
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <span className="text-slate-400">{groupLabels[group] || group}</span>
                <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 font-mono">
                  {issues.length}
                </span>
              </h3>
              <div className="space-y-2">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="bg-slate-800/50 border border-slate-700 rounded overflow-hidden"
                  >
                    <div
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800/80 transition-colors"
                      onClick={() => toggleExpand(issue.id)}
                    >
                      <div className="mt-0.5">
                        {expandedIds.has(issue.id) ? (
                          <ChevronDown size={14} className="text-slate-400" />
                        ) : (
                          <ChevronRight size={14} className="text-slate-400" />
                        )}
                      </div>
                      <div className="mt-0.5">
                        {getSeverityIcon(issue.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white">{issue.message}</span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{
                              backgroundColor: `${SEVERITY_COLORS[issue.severity]}20`,
                              color: SEVERITY_COLORS[issue.severity]
                            }}
                          >
                            {getSeverityLabel(issue.severity)}
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] text-slate-400">
                            {ISSUE_TYPE_LABELS[issue.type]}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          {issue.elementType}: {issue.elementId}
                        </p>
                      </div>
                    </div>
                    
                    {expandedIds.has(issue.id) && (
                      <div className="px-4 pb-4 pl-[52px]">
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded p-3">
                          <div className="flex items-start gap-2 mb-2">
                            <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-slate-300 font-medium">修正建议</p>
                              <p className="text-xs text-slate-400 mt-1">{issue.suggestion}</p>
                            </div>
                          </div>
                          {(issue.elementType === 'building' || issue.elementType === 'surface' || issue.elementType === 'runway') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLocate(issue);
                                setShowValidationModal(false);
                              }}
                              className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white transition-colors"
                            >
                              在3D视图中定位
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredIssues.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <CheckCircle size={32} className="mb-3 text-green-500 opacity-50" />
              <p className="text-sm">没有匹配的问题</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            共 {validationIssues.length} 个问题，显示 {filteredIssues.length} 个
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowValidationModal(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs text-white transition-colors"
            >
              关闭
            </button>
            {!hasErrors && (
              <button
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white transition-colors"
              >
                继续查看
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
