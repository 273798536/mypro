import { useState } from 'react';
import { Clock, Search, Filter } from 'lucide-react';
import { useRedemptionStore } from '@/store/useRedemptionStore';
import { getStatusColor, getStatusText, formatDateTime, formatAmount } from '@/utils/formatters';

export default function HistoryPage() {
  const { statusLogs, redemptions } = useRedemptionStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredLogs = statusLogs
    .filter(log => {
      const redemption = redemptions.find(r => r.id === log.requestId);
      if (!redemption) return false;
      const matchesSearch = redemption.customerName.includes(searchQuery) ||
        redemption.fundName.includes(searchQuery) ||
        log.requestId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || log.toStatus === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const statusOptions = [
    { value: 'all', label: '全部操作' },
    { value: 'confirmed', label: '确认' },
    { value: 'partial_confirmed', label: '部分确认' },
    { value: 'delayed', label: '清算顺延' },
    { value: 'settled', label: '到账' },
    { value: 'reviewing', label: '提交复核' },
  ];

  const groupByDate = () => {
    const groups: Record<string, typeof filteredLogs> = {};
    filteredLogs.forEach(log => {
      const date = log.timestamp.split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
    });
    return groups;
  };

  const groupedLogs = groupByDate();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="flex-shrink-0 px-6 py-4 border-b border-slate-700 bg-slate-850">
        <div>
          <h2 className="text-xl font-bold text-white">历史记录</h2>
          <p className="text-sm text-slate-400 mt-0.5">所有操作日志，按时间倒序</p>
        </div>
      </header>

      <div className="flex-shrink-0 px-6 py-3 border-b border-slate-700 bg-slate-850/50 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索客户、基金、赎回编号..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="input-field w-40"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {Object.keys(groupedLogs).length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">暂无操作记录</p>
            </div>
          ) : (
              Object.entries(groupedLogs).map(([date, logs]) => {
                const dateObj = new Date(date);
                const dateStr = dateObj.toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                });

                return (
                  <div key={date}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-px flex-1 bg-slate-700" />
                      <span className="text-sm font-medium text-slate-400 whitespace-nowrap">
                        {dateStr}
                      </span>
                      <div className="h-px flex-1 bg-slate-700" />
                    </div>

                    <div className="relative pl-8 space-y-4">
                      {logs.map(log => {
                        const redemption = redemptions.find(r => r.id === log.requestId);
                        return (
                          <div key={log.id} className="relative">
                            <div className="absolute -left-8 top-1 w-2 h-2 rounded-full bg-primary-500 mt-2" />
                            <div className="card p-4 hover:border-slate-600 transition-colors">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm text-slate-400">{log.requestId}</span>
                                  <span className={`status-pill text-xs ${getStatusColor(log.toStatus)}`}>
                                    {getStatusText(log.toStatus)}
                                  </span>
                                  {log.fromStatus !== log.toStatus && (
                                    <>
                                      <span className="text-slate-600">→</span>
                                      <span className={`status-pill text-xs ${getStatusColor(log.fromStatus)} opacity-50`}>
                                        {getStatusText(log.fromStatus)}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <span className="text-xs text-slate-500">
                                  {formatDateTime(log.timestamp)}
                                </span>
                              </div>
                              {redemption && (
                                <div className="flex items-center gap-4 mb-2 text-sm">
                                  <span className="text-white">{redemption.customerName}</span>
                                  <span className="text-slate-500">·</span>
                                  <span className="text-slate-400">{redemption.fundName}</span>
                                  <span className="text-slate-500">·</span>
                                  <span className="font-mono text-slate-300">
                                    {formatAmount(redemption.requestAmount)} 份
                                  </span>
                                </div>
                              )}
                              <p className="text-sm text-slate-400">{log.reason}</p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                <Clock className="w-3.5 h-3.5" />
                                <span>操作人：{log.operator}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
        </div>
      </div>
    </div>
  );
}
