import { useState } from 'react';
import { Clock, User, Tag, ArrowRight, AlertCircle, CheckCircle2, GitBranch } from 'lucide-react';
import { useValuationStore } from '@/store/valuationStore';
import { conflictTypeLabels } from '@/data/mockData';
import { formatDateTime, formatCurrency } from '@/utils/format';
import type { ConflictType } from '@/types';

type TabType = 'logs' | 'conflicts';

const fieldLabels: Record<string, string> = {
  valuationAmount: '估值金额',
  valuationMethod: '估值方法',
  sharePrice: '每股价格',
  dataSource: '数据来源',
  version: '版本',
};

export default function ChangesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('logs');
  const [filterType, setFilterType] = useState<string>('all');
  const { valuationLogs, conflicts, resolveConflict } = useValuationStore();

  const filteredConflicts = filterType === 'all' 
    ? conflicts 
    : conflicts.filter((c) => c.conflictType === filterType);

  const handleResolveConflict = (conflictId: string) => {
    resolveConflict(conflictId, '当前用户');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">变更追踪器</h1>
        <p className="text-slate-500 mt-1">追踪所有估值口径变更和人工修改记录</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'logs'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <GitBranch className="w-4 h-4" />
              变更历史
              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                {valuationLogs.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'conflicts'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              冲突记录
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                conflicts.filter((c) => !c.resolved).length > 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {conflicts.filter((c) => !c.resolved).length} 待处理
              </span>
            </div>
          </button>
        </div>

        {activeTab === 'logs' && (
          <div className="p-6">
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200" />
              
              <div className="space-y-6">
                {valuationLogs.map((log, index) => (
                  <div key={log.logId} className="relative pl-14">
                    <div className="absolute left-4 w-5 h-5 rounded-full bg-primary-100 border-4 border-primary-500" />
                    
                    <div className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{log.modifiedBy}</p>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDateTime(log.modifiedAt)}
                            </div>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                          {log.projectName}
                        </span>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Tag className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">
                            {fieldLabels[log.fieldName] || log.fieldName}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1.5 bg-red-50 text-red-700 text-sm rounded-lg line-through">
                            {typeof log.oldValue === 'number' && log.fieldName === 'valuationAmount'
                              ? formatCurrency(log.oldValue)
                              : log.oldValue}
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm rounded-lg font-medium">
                            {typeof log.newValue === 'number' && log.fieldName === 'valuationAmount'
                              ? formatCurrency(log.newValue)
                              : log.newValue}
                          </span>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-sm text-slate-600">
                            <span className="font-medium">变更原因：</span>
                            {log.reason}
                          </p>
                        </div>

                        {log.impactScope.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="text-xs text-slate-500">影响范围：</span>
                            {log.impactScope.map((scope, i) => (
                              <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">
                                {scope}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'conflicts' && (
          <div className="p-6">
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filterType === 'all'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                全部 ({conflicts.length})
              </button>
              {Object.entries(conflictTypeLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilterType(key)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterType === key
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label} ({conflicts.filter((c) => c.conflictType === key).length})
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {filteredConflicts.map((conflict) => (
                <div
                  key={conflict.conflictId}
                  className={`rounded-xl border p-5 transition-all ${
                    conflict.resolved
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white border-slate-200 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        conflict.resolved ? 'bg-emerald-100' : 'bg-red-100'
                      }`}>
                        {conflict.resolved ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            conflict.resolved
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {conflictTypeLabels[conflict.conflictType]}
                          </span>
                          <span className="text-sm text-slate-500">{conflict.projectName}</span>
                        </div>
                        <p className="text-slate-700 mb-2">{conflict.description}</p>
                        <div className="text-sm text-slate-500">
                          <span className="font-medium">定位：</span>
                          {conflict.location.source}
                          {conflict.location.row && `，第 ${conflict.location.row} 行`}
                          {conflict.location.field && `，字段：${conflict.location.field}`}
                        </div>
                        {conflict.resolved && conflict.resolvedBy && (
                          <div className="mt-2 text-sm text-emerald-600">
                            已由 {conflict.resolvedBy} 于 {formatDateTime(conflict.resolvedAt!)} 标记解决
                          </div>
                        )}
                      </div>
                    </div>
                    {!conflict.resolved && (
                      <button
                        onClick={() => handleResolveConflict(conflict.conflictId)}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors"
                      >
                        标记已解决
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
