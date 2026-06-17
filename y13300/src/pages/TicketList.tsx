import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, CheckCircle, Lock, Filter, Search, AlertCircle, Loader2 } from 'lucide-react';
import type { TicketStatus, Ticket } from '../../shared/types.js';
import { STATUS_LABELS, STATUS_COLORS } from '../../shared/types.js';
import { useTicketStore } from '@/store/useTicketStore.js';
import { cn } from '@/lib/utils.js';

const statConfig = [
  { key: 'pending', label: '待处理', icon: Clock, color: 'bg-amber-500' },
  { key: 'needEvidence', label: '需补充证据', icon: AlertTriangle, color: 'bg-orange-500' },
  { key: 'completed', label: '已完成', icon: CheckCircle, color: 'bg-emerald-500' },
  { key: 'locked', label: '已锁定', icon: Lock, color: 'bg-violet-500' },
] as const;

export default function TicketList() {
  const navigate = useNavigate();
  const { tickets, stats, loading, error, fetchTickets, fetchStats } = useTicketStore();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | undefined>();
  const [sampleLeakFilter, setSampleLeakFilter] = useState<boolean | undefined>();
  const [manualMarkFilter, setManualMarkFilter] = useState<boolean | undefined>();

  useEffect(() => {
    fetchStats();
    fetchTickets();
  }, [fetchStats, fetchTickets]);

  const handleFilterChange = () => {
    fetchTickets({
      status: statusFilter,
      hasSampleLeak: sampleLeakFilter,
      hasManualMark: manualMarkFilter,
    });
  };

  const resetFilters = () => {
    setStatusFilter(undefined);
    setSampleLeakFilter(undefined);
    setManualMarkFilter(undefined);
    fetchTickets();
  };

  const renderStatCard = (key: string, label: string, icon: typeof Clock, color: string) => {
    const Icon = icon;
    const count = stats?.[key as keyof typeof stats] ?? 0;
    return (
      <div key={key} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm mb-1">{label}</p>
            <p className="text-3xl font-bold font-mono text-slate-800">{count}</p>
          </div>
          <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', color)}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', color)}
            style={{ width: `${Math.min(count * 10, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">工单管理</h1>
          <p className="text-slate-500">管理客服摘要证据复核工单</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statConfig.map((s) => renderStatCard(s.key, s.label, s.icon, s.color))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-700">筛选条件</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">状态：</label>
              <select
                value={statusFilter ?? ''}
                onChange={(e) => setStatusFilter(e.target.value as TicketStatus || undefined)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">样本泄漏：</label>
              <select
                value={sampleLeakFilter === undefined ? '' : String(sampleLeakFilter)}
                onChange={(e) => setSampleLeakFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部</option>
                <option value="true">是</option>
                <option value="false">否</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">人工标记：</label>
              <select
                value={manualMarkFilter === undefined ? '' : String(manualMarkFilter)}
                onChange={(e) => setManualMarkFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部</option>
                <option value="true">是</option>
                <option value="false">否</option>
              </select>
            </div>
            <button
              onClick={handleFilterChange}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              应用筛选
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              重置
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-32">工单编号</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">客户问题</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-24">客户</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-24">状态</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-28">版本</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-32">标记</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">更新时间</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-20">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((ticket: Ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500"
                    onClick={() => navigate(`/ticket/${ticket.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-slate-800 font-medium">{ticket.ticketNo}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <p className="line-clamp-2">{ticket.customerIssue}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ticket.customerName}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-1 rounded text-xs font-medium text-white', STATUS_COLORS[ticket.status])}>
                        {STATUS_LABELS[ticket.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-slate-600">
                        v{ticket.currentVersion}
                        {ticket.latestVersion > ticket.currentVersion && (
                          <span className="text-xs text-amber-500 ml-1">(最新v{ticket.latestVersion})</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {ticket.hasSampleLeak && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">泄漏</span>
                        )}
                        {ticket.hasManualMark && (
                          <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 text-xs rounded">人工</span>
                        )}
                        {ticket.lockedVersion && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-xs rounded">已锁</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(ticket.updatedAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-3">
                      <Search className="w-4 h-4 text-slate-400 hover:text-blue-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tickets.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              暂无工单数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
