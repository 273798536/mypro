import React, { useState } from 'react';
import {
  History,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  MapPin,
  RefreshCw,
  Plus,
  Hand,
  Edit3,
  Search,
} from 'lucide-react';
import { useSampleStore } from '../store/useSampleStore';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../utils/dateUtils';
import { ActionType, ACTION_LABELS, STATUS_LABELS, SampleStatus } from '../../shared/types';

export const AuditLogPage: React.FC = () => {
  const { auditLogs, samples } = useSampleStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionType | 'all'>('all');

  const getActionIcon = (action: ActionType) => {
    switch (action) {
      case 'create':
        return <Plus className="w-4 h-4" />;
      case 'review':
        return <Edit3 className="w-4 h-4" />;
      case 'update_location':
        return <MapPin className="w-4 h-4" />;
      case 'manual_confirm':
        return <Hand className="w-4 h-4" />;
      case 'rerun':
        return <RefreshCw className="w-4 h-4" />;
      case 'supplement':
        return <Plus className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: ActionType) => {
    switch (action) {
      case 'create':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'review':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'update_location':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'manual_confirm':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'rerun':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'supplement':
        return 'bg-teal-100 text-teal-700 border-teal-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getSampleByLog = (sampleId: string) => {
    return samples.find((s) => s.id === sampleId);
  };

  const filteredLogs = auditLogs.filter((log) => {
    const sample = getSampleByLog(log.sampleId);
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      log.operator.toLowerCase().includes(searchLower) ||
      log.reason.toLowerCase().includes(searchLower) ||
      log.oldValue.toLowerCase().includes(searchLower) ||
      log.newValue.toLowerCase().includes(searchLower) ||
      sample?.strainCode.toLowerCase().includes(searchLower) ||
      sample?.strainName.toLowerCase().includes(searchLower);
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const formatValue = (field: string, value: string) => {
    if (field === 'status' || field === 'autoJudge') {
      const status = value as SampleStatus;
      if (STATUS_LABELS[status]) {
        return <StatusBadge status={status} size="sm" />;
      }
    }
    return value;
  };

  const actionOptions: { value: ActionType | 'all'; label: string }[] = [
    { value: 'all', label: '全部操作' },
    { value: 'create', label: '创建样本' },
    { value: 'review', label: '复核操作' },
    { value: 'update_location', label: '修改地点' },
    { value: 'manual_confirm', label: '人工确认' },
    { value: 'rerun', label: '重复运行' },
    { value: 'supplement', label: '补录样本' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6" />
            审计历史
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            记录所有操作的详细信息，包括操作人、时间、变更内容和原因
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索操作人、原因、样本..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as ActionType | 'all')}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {actionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto py-6 px-8">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">暂无操作记录</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-slate-200" />
              
              <div className="space-y-6">
                {filteredLogs.map((log, index) => {
                  const sample = getSampleByLog(log.sampleId);
                  const isExpanded = expandedId === log.id;
                  const isContaminatedPassThrough =
                    log.action === 'review' &&
                    log.oldValue === 'contaminated' &&
                    log.newValue !== 'contaminated';

                  return (
                    <div key={log.id} className="relative pl-14">
                      <div
                        className={`absolute left-0 w-11 h-11 rounded-full border-4 border-white flex items-center justify-center ${getActionColor(
                          log.action
                        )} shadow-sm`}
                      >
                        {getActionIcon(log.action)}
                      </div>

                      <div
                        className={`bg-slate-50 rounded-xl border border-slate-200 overflow-hidden transition-all hover:border-slate-300 ${
                          isContaminatedPassThrough ? 'ring-2 ring-rose-300 ring-offset-2' : ''
                        }`}
                      >
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : log.id)
                          }
                          className="w-full p-4 flex items-start justify-between text-left"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getActionColor(
                                  log.action
                                )}`}
                              >
                                {getActionIcon(log.action)}
                                {ACTION_LABELS[log.action]}
                              </span>
                              {isContaminatedPassThrough && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200">
                                  ⚠️ 污染样本通过
                                </span>
                              )}
                              {sample && (
                                <span className="text-sm text-slate-500">
                                  {sample.strainCode} - {sample.strainName}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5" />
                                {log.operator}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDateTime(log.operateTime)}
                              </span>
                            </div>

                            {log.reason && (
                              <p className="text-sm text-slate-600 mt-2 line-clamp-1">
                                {log.reason}
                              </p>
                            )}
                          </div>

                          <div className="ml-4">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-slate-200 pt-4 mt-0">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-1">
                                  变更字段
                                </p>
                                <p className="text-sm text-slate-700 font-medium">
                                  {log.fieldChanged}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-1">
                                  操作类型
                                </p>
                                <p className="text-sm text-slate-700">
                                  {ACTION_LABELS[log.action]}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-1">
                                  变更前
                                </p>
                                <div className="p-2 bg-slate-100 rounded-lg">
                                  {formatValue(log.fieldChanged, log.oldValue)}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-1">
                                  变更后
                                </p>
                                <div className="p-2 bg-emerald-50 rounded-lg">
                                  {formatValue(log.fieldChanged, log.newValue)}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4">
                              <p className="text-xs font-medium text-slate-500 mb-1">
                                变更原因
                              </p>
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm text-amber-800">
                                  {log.reason}
                                </p>
                              </div>
                            </div>

                            {isContaminatedPassThrough && (
                              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                                <p className="text-sm font-medium text-rose-800 mb-1">
                                  ⚠️ 重要：污染样本复核通过
                                </p>
                                <p className="text-xs text-rose-700">
                                  此操作将已标记为污染的样本复核通过。此记录将永久保存在系统中，
                                  操作人：{log.operator}，操作时间：
                                  {formatDateTime(log.operateTime)}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
