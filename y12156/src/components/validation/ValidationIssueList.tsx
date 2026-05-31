import { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, XCircle, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import { ValidationIssue } from '../../types';
import { Badge } from '../ui/Badge';
import { ISSUE_TYPE_LABELS, ISSUE_SEVERITY_LABELS } from '../../utils/constants';

interface ValidationIssueListProps {
  issues: ValidationIssue[];
  onLocateRecord?: (recordId: string, recordType: string) => void;
}

export default function ValidationIssueList({ issues, onLocateRecord }: ValidationIssueListProps) {
  const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'missing_parameter' | 'duplicate_node' | 'reversed_temperature'>('all');

  const toggleExpand = (id: string) => {
    setExpandedIssues(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredIssues = activeTab === 'all'
    ? issues
    : issues.filter(i => i.type === activeTab);

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  const tabs = [
    { id: 'all' as const, label: '全部', count: issues.length },
    { id: 'missing_parameter' as const, label: '参数缺失', count: issues.filter(i => i.type === 'missing_parameter').length },
    { id: 'duplicate_node' as const, label: '节点重复', count: issues.filter(i => i.type === 'duplicate_node').length },
    { id: 'reversed_temperature' as const, label: '温差反向', count: issues.filter(i => i.type === 'reversed_temperature').length },
  ];

  if (issues.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">数据校验通过</h3>
        <p className="text-slate-500">未发现任何数据问题，可以继续计算</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">数据校验结果</h3>
          <p className="text-sm text-slate-500 mt-1">
            发现 <span className="font-medium text-red-600">{errors.length}</span> 个错误，
            <span className="font-medium text-amber-600">{warnings.length}</span> 个警告
          </p>
        </div>
        {errors.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-red-700">存在错误，无法继续计算</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-slate-100 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredIssues.map(issue => (
          <div
            key={issue.id}
            className={`border rounded-lg overflow-hidden transition-all ${
              issue.severity === 'error'
                ? 'border-red-200 bg-red-50/50'
                : 'border-amber-200 bg-amber-50/50'
            }`}
          >
            <div
              className="p-4 cursor-pointer hover:bg-white/50 transition-colors"
              onClick={() => toggleExpand(issue.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {issue.severity === 'error' ? (
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={issue.severity === 'error' ? 'danger' : 'warning'}>
                        {ISSUE_SEVERITY_LABELS[issue.severity]}
                      </Badge>
                      <Badge variant="default">
                        {ISSUE_TYPE_LABELS[issue.type]}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-slate-800">{issue.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {onLocateRecord && (
                    <button
                      className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 rounded transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLocateRecord(issue.sourceRecordId, issue.sourceRecordType);
                      }}
                    >
                      <Link2 className="w-3 h-3" />
                      定位记录
                    </button>
                  )}
                  {expandedIssues[issue.id] ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
            </div>

            {expandedIssues[issue.id] && (
              <div className="px-4 pb-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200 ml-8">
                  <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    人话解释
                  </h5>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {issue.humanReadableExplanation}
                  </p>

                  {(issue.expectedValue !== undefined || issue.actualValue !== undefined) && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                        详细信息
                      </h5>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {issue.fieldName && (
                          <div>
                            <span className="text-slate-500">字段名:</span>
                            <span className="ml-2 font-mono text-slate-700">{issue.fieldName}</span>
                          </div>
                        )}
                        {issue.expectedValue !== undefined && (
                          <div>
                            <span className="text-slate-500">期望值:</span>
                            <span className="ml-2 font-medium text-emerald-600">{String(issue.expectedValue)}</span>
                          </div>
                        )}
                        {issue.actualValue !== undefined && (
                          <div>
                            <span className="text-slate-500">实际值:</span>
                            <span className="ml-2 font-medium text-red-600">{String(issue.actualValue)}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500">记录ID:</span>
                          <span className="ml-2 font-mono text-slate-700 text-xs">{issue.sourceRecordId}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">记录类型:</span>
                          <span className="ml-2 text-slate-700">{issue.sourceRecordType}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
