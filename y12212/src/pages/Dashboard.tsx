import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Upload,
  FileCheck,
  FileDown,
  Droplets,
  Bell,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboardStore';
import type { WarningItem } from '../../shared/types';

const statCards = [
  {
    key: 'pending' as const,
    label: '待复核',
    icon: Clock,
    gradient: 'from-[#3b82f6] to-[#1e3a5f]',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    key: 'exception' as const,
    label: '异常中',
    icon: AlertTriangle,
    gradient: 'from-orange-500 to-orange-600',
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-600',
  },
  {
    key: 'approved' as const,
    label: '已通过',
    icon: CheckCircle,
    gradient: 'from-[#10b981] to-emerald-600',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
  {
    key: 'rejected' as const,
    label: '已驳回',
    icon: XCircle,
    gradient: 'from-[#ef4444] to-red-600',
    bgLight: 'bg-red-50',
    textColor: 'text-red-600',
  },
];

const quickActions = [
  { label: '导入数据', icon: Upload, path: '/import', color: 'from-[#3b82f6] to-[#1e3a5f]' },
  { label: '开始复核', icon: FileCheck, path: '/review', color: 'from-[#10b981] to-emerald-600' },
  { label: '导出报表', icon: FileDown, path: '/report', color: 'from-purple-500 to-purple-600' },
];

const severityColors: Record<string, string> = {
  high: 'bg-red-100 text-[#ef4444]',
  medium: 'bg-orange-100 text-orange-600',
  low: 'bg-blue-100 text-[#3b82f6]',
};

const severityLabels: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, trend, warnings, fetchStats, fetchTrend, fetchWarnings } =
    useDashboardStore();

  useEffect(() => {
    fetchStats();
    fetchTrend();
    fetchWarnings();
  }, [fetchStats, fetchTrend, fetchWarnings]);

  const counts = {
    pending: stats?.pending_count ?? 0,
    exception: stats?.exception_count ?? 0,
    approved: stats?.approved_count ?? 0,
    rejected: stats?.rejected_count ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className={cn(
                'relative overflow-hidden rounded-xl bg-gradient-to-br p-5 text-white shadow-md',
                card.gradient
              )}
            >
              <div className="absolute -right-3 -top-3 opacity-10">
                <Icon className="h-20 w-20" />
              </div>
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium text-white/80">
                    {card.label}
                  </span>
                </div>
                <p className="mt-2 text-3xl font-bold">{counts[card.key]}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="group flex flex-col items-center gap-3 rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform group-hover:scale-110',
                  action.color
                )}
              >
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-semibold text-gray-700">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
            <Droplets className="h-4 w-4 text-[#3b82f6]" />
            近7日处理趋势
          </h3>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trend} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '13px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '13px' }} />
                <Bar
                  dataKey="approved"
                  name="已通过"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="rejected"
                  name="已驳回"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="exception"
                  name="异常"
                  fill="#f97316"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-gray-400">
              暂无趋势数据
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
            <Bell className="h-4 w-4 text-orange-500" />
            最近预警
          </h3>
          {warnings.length > 0 ? (
            <div className="space-y-3">
              {warnings.map((w: WarningItem) => (
                <div
                  key={w.id}
                  className="rounded-lg border border-gray-50 bg-gray-50/50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-700 leading-snug">
                      {w.message}
                    </p>
                    <span
                      className={cn(
                        'shrink-0 rounded px-1.5 py-0.5 text-xs font-medium',
                        severityColors[w.severity] ?? 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {severityLabels[w.severity] ?? w.severity}
                    </span>
                  </div>
                  {w.days_remaining != null && (
                    <p className="mt-1 text-xs text-gray-400">
                      剩余 {w.days_remaining} 天
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              暂无预警
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
