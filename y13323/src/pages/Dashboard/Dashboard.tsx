import { useAppStore } from '@/store/useAppStore';
import {
  FileText,
  RotateCcw,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { formatRelativeTime, getEventTypeColor } from '@/utils/format';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { dashboardStats, timeline } = useAppStore();
  const navigate = useNavigate();

  const statCards = [
    {
      title: '样本总数',
      value: dashboardStats.totalSamples,
      icon: FileText,
      color: 'from-accent-blue-500 to-accent-blue-600',
      trend: dashboardStats.trend.samples,
      link: '/samples',
    },
    {
      title: '撤回记录',
      value: dashboardStats.totalWithdrawals,
      icon: RotateCcw,
      color: 'from-status-error to-red-600',
      trend: dashboardStats.trend.withdrawals,
      link: '/withdrawals',
    },
    {
      title: '待处理',
      value: dashboardStats.pendingCount,
      icon: Clock,
      color: 'from-status-warning to-orange-600',
      trend: dashboardStats.trend.pending,
      link: '/samples?filter=pending',
    },
    {
      title: '疑似泄漏',
      value: dashboardStats.leakSuspectedCount,
      icon: AlertTriangle,
      color: 'from-status-warning to-amber-600',
      trend: dashboardStats.trend.leaks,
      link: '/samples?filter=leak',
    },
  ];

  const renderTrend = (trend: number) => {
    if (trend > 0) {
      return (
        <span className="flex items-center gap-1 text-status-error text-xs">
          <TrendingUp size={14} />
          {trend > 0 ? `+${trend}` : trend}
        </span>
      );
    } else if (trend < 0) {
      return (
        <span className="flex items-center gap-1 text-status-success text-xs">
          <TrendingDown size={14} />
          {trend}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-gray-400 text-xs">
        <Minus size={14} />
        持平
      </span>
    );
  };

  const recentEvents = timeline.slice(0, 8);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, index) => (
          <Card
            key={stat.title}
            hover
            className="overflow-hidden"
            onClick={() => navigate(stat.link)}
          >
            <div
              className="h-2 bg-gradient-to-r"
              style={{
                animationDelay: `${index * 50}ms`,
                background: `linear-gradient(to right, var(--tw-gradient-stops))`,
              }}
            >
              <div className={`h-full bg-gradient-to-r ${stat.color}`}></div>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-deep-blue-500 mt-2 font-mono">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-lg bg-gradient-to-br ${stat.color} text-white`}
                >
                  <stat.icon size={22} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                {renderTrend(stat.trend)}
                <span className="text-xs text-gray-400 ml-2">较上周</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-serif-sc text-lg font-semibold text-deep-blue-500">
              最近活动
            </h3>
            <button
              onClick={() => navigate('/timeline')}
              className="text-sm text-accent-blue-500 hover:text-accent-blue-600 transition-colors"
            >
              查看全部 →
            </button>
          </div>

          <div className="space-y-1">
            {recentEvents.map((event, index) => (
              <div
                key={event.id}
                className="flex gap-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="relative">
                  <div
                    className={`w-3 h-3 rounded-full ${getEventTypeColor(
                      event.type
                    )} mt-1.5`}
                  ></div>
                  {index < recentEvents.length - 1 && (
                    <div className="absolute left-1/2 top-5 w-0.5 h-full bg-gray-100 -translate-x-1/2"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {event.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                    {event.description}
                  </p>
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap pt-0.5">
                  {formatRelativeTime(event.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-serif-sc text-lg font-semibold text-deep-blue-500 mb-5">
            快捷操作
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/report')}
              className="w-full p-4 bg-gradient-to-r from-deep-blue-500 to-deep-blue-600 text-white rounded-lg text-left hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
            >
              <p className="font-medium">生成回放报告</p>
              <p className="text-sm text-deep-blue-200 mt-1">
                分析误判原因，拆解灰度变化
              </p>
            </button>

            <button
              onClick={() => navigate('/samples?filter=leak')}
              className="w-full p-4 border border-status-warning/30 bg-status-warning/5 rounded-lg text-left hover:bg-status-warning/10 transition-colors"
            >
              <p className="font-medium text-status-warning">
                处理疑似泄漏样本
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {dashboardStats.leakSuspectedCount} 份待确认
              </p>
            </button>

            <button
              onClick={() => navigate('/timeline')}
              className="w-full p-4 border border-gray-200 rounded-lg text-left hover:bg-gray-50 transition-colors"
            >
              <p className="font-medium text-gray-700">查看历史时间线</p>
              <p className="text-sm text-gray-500 mt-1">
                追踪所有版本和备注记录
              </p>
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-3">待处理事项</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">待复核样本</span>
                <Badge variant="warning">{dashboardStats.pendingCount}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">进行中撤回</span>
                <Badge variant="error">2</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">待补充材料</span>
                <Badge variant="warning">3</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
