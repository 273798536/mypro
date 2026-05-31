import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/utils/calculator';
import dayjs from 'dayjs';
import {
  Clock,
  RefreshCcw,
  AlertTriangle,
  DollarSign,
  PieChart as PieChartIcon,
  ListTodo,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  User,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import Loading, { TableLoadingSkeleton } from '@/components/Loading';
import Empty from '@/components/Empty';
import { cn } from '@/lib/utils';
import type { RebookStatus } from '@/types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  color: 'blue' | 'green' | 'amber' | 'red';
}

function StatCard({ title, value, icon, trend, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-primary-50 text-primary-600 border-primary-100',
    green: 'bg-accent-green-50 text-accent-green-600 border-accent-green-100',
    amber: 'bg-accent-amber-50 text-accent-amber-600 border-accent-amber-100',
    red: 'bg-accent-red-50 text-accent-red-600 border-accent-red-100',
  };

  const iconBgClasses = {
    blue: 'bg-primary-100 text-primary-600',
    green: 'bg-accent-green-100 text-accent-green-600',
    amber: 'bg-accent-amber-100 text-accent-amber-600',
    red: 'bg-accent-red-100 text-accent-red-600',
  };

  return (
    <div
      className={cn(
        'p-5 rounded-xl border shadow-sm bg-white hover:shadow-md transition-shadow',
        colorClasses[color]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-primary-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-primary-800">{value}</p>
          {trend !== undefined && (
            <div
              className={cn(
                'flex items-center gap-1 mt-2 text-xs font-medium',
                trend >= 0 ? 'text-accent-green-600' : 'text-accent-red-600'
              )}
            >
              {trend >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              <span>{Math.abs(trend)}% 较昨日</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-lg', iconBgClasses[color])}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function PieChart({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <Empty
        title="暂无数据"
        description="近期没有异常记录"
        icon={<PieChartIcon className="w-12 h-12" />}
      />
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercent = 0;

  const getConicGradient = () => {
    let gradient = 'conic-gradient(';
    data.forEach((item, index) => {
      const percent = (item.value / total) * 100;
      const startAngle = cumulativePercent * 3.6;
      cumulativePercent += percent;
      const endAngle = cumulativePercent * 3.6;
      gradient += `${item.color} ${startAngle}deg ${endAngle}deg`;
      if (index < data.length - 1) gradient += ', ';
    });
    gradient += ')';
    return gradient;
  };

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      <div
        className="w-40 h-40 rounded-full relative"
        style={{ background: getConicGradient() }}
      >
        <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
          <span className="text-2xl font-bold text-primary-800">{total}</span>
        </div>
      </div>
      <div className="flex-1 space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-primary-700">{item.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-primary-800">
                {item.value}
              </span>
              <span className="text-xs text-primary-500 w-12 text-right">
                {total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const statusLabelMap: Record<RebookStatus, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-primary-100 text-primary-700' },
  pending: { label: '待复核', className: 'bg-accent-amber-100 text-accent-amber-700' },
  approved: { label: '已通过', className: 'bg-accent-green-100 text-accent-green-700' },
  rejected: { label: '已驳回', className: 'bg-accent-red-100 text-accent-red-700' },
  settled: { label: '已结算', className: 'bg-primary-100 text-primary-700' },
};

export default function Dashboard() {
  const {
    rebookRecords,
    tickets,
    isLoading,
    currentUser,
    initialize,
    getPendingReviews,
  } = useStore();

  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await initialize();
      setTimeout(() => setIsPageLoading(false), 500);
    };
    init();
  }, [initialize]);

  const stats = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    const pendingCount = rebookRecords.filter(
      (r) => r.status === 'draft' || r.status === 'pending'
    ).length;

    const todayRebookCount = rebookRecords.filter((r) =>
      dayjs(r.createdAt).format('YYYY-MM-DD') === today
    ).length;

    const yesterdayRebookCount = rebookRecords.filter((r) =>
      dayjs(r.createdAt).format('YYYY-MM-DD') === yesterday
    ).length;

    const rebookTrend =
      yesterdayRebookCount > 0
        ? Math.round(((todayRebookCount - yesterdayRebookCount) / yesterdayRebookCount) * 100)
        : todayRebookCount > 0
        ? 100
        : 0;

    const anomalyCount = rebookRecords.reduce(
      (sum, r) => sum + r.anomalies.filter(a => a.severity === 'error').length,
      0
    );

    const totalDifference = rebookRecords.reduce(
      (sum, r) => sum + r.totalDifference,
      0
    );

    return {
      pending: pendingCount,
      todayRebook: todayRebookCount,
      rebookTrend,
      anomaly: anomalyCount,
      totalDifference,
    };
  }, [rebookRecords]);

  const todoTasks = useMemo(() => {
    const tasks = [];
    
    const pendingReviews = getPendingReviews();
    pendingReviews.slice(0, 3).forEach((record) => {
      tasks.push({
        id: record.id,
        type: 'review',
        title: `复核改签申请 - ${record.orderNo}`,
        description: `提交人: ${record.createdBy}`,
        priority: 'high' as const,
        time: record.createdAt,
      });
    });

    const draftRecords = rebookRecords.filter(r => r.status === 'draft').slice(0, 2);
    draftRecords.forEach((record) => {
      tasks.push({
        id: record.id,
        type: 'complete',
        title: `完成改签信息 - ${record.orderNo}`,
        description: '请完善改签信息后提交',
        priority: 'medium' as const,
        time: record.createdAt,
      });
    });

    return tasks.sort((a, b) => dayjs(a.time).valueOf() - dayjs(b.time).valueOf()).slice(0, 5);
  }, [rebookRecords]);

  const recentRebookRecords = useMemo(() => {
    return [...rebookRecords]
      .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
      .slice(0, 5);
  }, [rebookRecords]);

  const anomalyDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      cabin_change: 0,
      cross_country_tax: 0,
      mileage_refund: 0,
    };

    rebookRecords.forEach((record) => {
      record.anomalies.forEach((a) => {
        counts[a.type] = (counts[a.type] || 0) + 1;
      });
    });

    return [
      {
        name: '舱位变更',
        value: counts.cabin_change,
        color: '#1e3a5f',
      },
      {
        name: '跨国税费',
        value: counts.cross_country_tax,
        color: '#f59e0b',
      },
      {
        name: '里程调整',
        value: counts.mileage_refund,
        color: '#10b981',
      },
    ];
  }, [rebookRecords]);

  if (isPageLoading || isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-primary-800 mb-6">仪表盘</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 bg-primary-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl p-5 border border-primary-100">
            <div className="h-6 bg-primary-100 rounded w-32 mb-4 animate-pulse" />
            <LoadingSkeleton count={5} />
          </div>
          <div className="bg-white rounded-xl p-5 border border-primary-100">
            <div className="h-6 bg-primary-100 rounded w-32 mb-4 animate-pulse" />
            <div className="h-48 bg-primary-50 rounded animate-pulse" />
          </div>
        </div>
        <TableLoadingSkeleton rows={5} columns={5} />
      </div>
    );
  }

  function LoadingSkeleton({ count = 3 }: { count?: number }) {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-primary-100 rounded-lg h-12"
          />
        ))}
      </div>
    );
  }

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    const badges = {
      high: 'bg-accent-red-100 text-accent-red-700',
      medium: 'bg-accent-amber-100 text-accent-amber-700',
      low: 'bg-primary-100 text-primary-700',
    };
    const labels = {
      high: '高',
      medium: '中',
      low: '低',
    };
    return { className: badges[priority], label: labels[priority] };
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary-800">仪表盘</h1>
        <p className="text-sm text-primary-500 mt-1">
          欢迎回来，{currentUser?.name || '用户'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="待处理任务"
          value={stats.pending}
          icon={<Clock className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="今日改签数"
          value={stats.todayRebook}
          icon={<RefreshCcw className="w-5 h-5" />}
          trend={stats.rebookTrend}
          color="green"
        />
        <StatCard
          title="异常单数"
          value={stats.anomaly}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="总差价金额"
          value={formatCurrency(stats.totalDifference)}
          icon={<DollarSign className="w-5 h-5" />}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-primary-100 overflow-hidden">
          <div className="p-5 border-b border-primary-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-primary-800">
                  待办任务
                </h2>
              </div>
              <button className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1 transition-colors">
                查看全部 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {todoTasks.length === 0 ? (
            <Empty
              title="暂无待办任务"
              description="当前没有需要处理的任务"
              icon={<ListTodo className="w-12 h-12" />}
            />
          ) : (
            <div className="divide-y divide-primary-100">
              {todoTasks.map((task) => {
                const priority = getPriorityBadge(task.priority);
                return (
                  <div
                    key={task.id}
                    className="p-4 hover:bg-primary-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-primary-800 truncate">
                            {task.title}
                          </span>
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full flex-shrink-0',
                              priority.className
                            )}
                          >
                            {priority.label}
                          </span>
                        </div>
                        <p className="text-sm text-primary-500">
                          {task.description}
                        </p>
                        <p className="text-xs text-primary-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {dayjs(task.time).format('YYYY-MM-DD HH:mm')}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-primary-400 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-primary-100 overflow-hidden">
          <div className="p-5 border-b border-primary-100">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-primary-800">
                异常类型分布
              </h2>
            </div>
          </div>
          <div className="p-5">
            <PieChart data={anomalyDistribution} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-primary-100 overflow-hidden">
        <div className="p-5 border-b border-primary-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-primary-800">
                近期改签记录
              </h2>
            </div>
            <button className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1 transition-colors">
              查看全部 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {recentRebookRecords.length === 0 ? (
          <Empty
            title="暂无改签记录"
            description="近期没有改签操作记录"
            icon={<FileText className="w-12 h-12" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary-50 border-b border-primary-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                    订单号
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                    操作人
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                    差价
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                    创建时间
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100">
                {recentRebookRecords.map((record) => {
                  const statusInfo = statusLabelMap[record.status];
                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-primary-50 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <span className="font-medium text-primary-800">
                          {record.orderNo}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-primary-600" />
                          </div>
                          <span className="text-sm text-primary-700">
                            {record.createdBy}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                            statusInfo.className
                          )}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'font-semibold',
                            record.totalDifference >= 0
                              ? 'text-accent-red-600'
                              : 'text-accent-green-600'
                          )}
                        >
                          {record.totalDifference >= 0 ? '+' : ''}
                          {formatCurrency(record.totalDifference)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-primary-600">
                        {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
