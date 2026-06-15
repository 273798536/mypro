import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Filter, Search, User, FileText, GitMerge, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useComplaintStore } from '../store/useComplaintStore';
import { STATUS_LABELS } from '../utils/constants';
import { HistoryLog, Complaint } from '../utils/types';

interface LogWithComplaint extends HistoryLog {
  complaint?: Complaint;
}

type LogFilter = 'all' | '创建投诉' | '状态变更' | '补录会议纪要' | '归并记录' | '上传附件';

export const LogsPage: React.FC = () => {
  const navigate = useNavigate();
  const { complaints } = useComplaintStore();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [actionFilter, setActionFilter] = useState<LogFilter>('all');

  const allLogs = useMemo(() => {
    const logs: LogWithComplaint[] = [];
    complaints.forEach(complaint => {
      complaint.historyLogs.forEach(log => {
        logs.push({ ...log, complaint });
      });
    });
    return logs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [complaints]);

  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        const matchesStreet = log.complaint?.street.toLowerCase().includes(keyword);
        const matchesComplainant = log.complaint?.complainant.toLowerCase().includes(keyword);
        const matchesAction = log.action.toLowerCase().includes(keyword);
        const matchesReason = log.reason?.toLowerCase().includes(keyword);
        const matchesOperator = log.operator.toLowerCase().includes(keyword);
        return matchesStreet || matchesComplainant || matchesAction || matchesReason || matchesOperator;
      }
      return true;
    });
  }, [allLogs, searchKeyword, actionFilter]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case '创建投诉':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case '状态变更':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case '补录会议纪要':
        return <FileText className="w-4 h-4 text-purple-500" />;
      case '归并记录':
        return <GitMerge className="w-4 h-4 text-orange-500" />;
      case '上传附件':
        return <FileText className="w-4 h-4 text-indigo-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case '创建投诉':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case '状态变更':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case '补录会议纪要':
        return 'bg-purple-50 border-purple-200 text-purple-700';
      case '归并记录':
        return 'bg-orange-50 border-orange-200 text-orange-700';
      case '上传附件':
        return 'bg-indigo-50 border-indigo-200 text-indigo-700';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  const actionFilters: { value: LogFilter; label: string; count: number }[] = [
    { value: 'all', label: '全部', count: allLogs.length },
    { value: '创建投诉', label: '创建投诉', count: allLogs.filter(l => l.action === '创建投诉').length },
    { value: '状态变更', label: '状态变更', count: allLogs.filter(l => l.action === '状态变更').length },
    { value: '补录会议纪要', label: '会议纪要', count: allLogs.filter(l => l.action === '补录会议纪要').length },
    { value: '归并记录', label: '归并记录', count: allLogs.filter(l => l.action === '归并记录').length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">操作日志</h1>
                <p className="text-xs text-slate-500">查看所有投诉记录的操作历史</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索街口、投诉人、操作人..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
                {actionFilters.map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setActionFilter(filter.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                      actionFilter === filter.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filter.label} ({filter.count})
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[calc(100vh-300px)] overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">暂无操作日志</p>
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div
                  key={log.id}
                  className="px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => log.complaint && navigate(`/complaint/${log.complaint.id}`)}
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg border ${getActionColor(log.action)} flex-shrink-0`}>
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        {log.complaint && (
                          <span className="text-sm font-medium text-slate-900 truncate">
                            {log.complaint.street}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {log.timestamp}
                        </span>
                      </div>
                      {log.beforeStatus && log.afterStatus && (
                        <div className="flex items-center gap-2 mb-2 text-xs">
                          <span className="text-slate-500">状态变更:</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                            {STATUS_LABELS[log.beforeStatus]}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                            {STATUS_LABELS[log.afterStatus]}
                          </span>
                        </div>
                      )}
                      {log.reason && (
                        <p className="text-sm text-slate-600 mb-2">
                          <span className="text-slate-400">原因:</span> {log.reason}
                        </p>
                      )}
                      {log.nextStep && (
                        <p className="text-sm text-blue-600">
                          <span className="text-slate-400">下一步:</span> {log.nextStep}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.operator}
                        </span>
                        {log.complaint && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            #{log.complaint.id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-sm text-slate-500">
            共 {filteredLogs.length} 条记录
          </div>
        </div>
      </main>
    </div>
  );
};
