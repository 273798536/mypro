import { CheckCircle, XCircle, Clock, AlertTriangle, FlipHorizontal2, TrendingUp } from 'lucide-react';
import type { GameStats } from '../types';
import { useRole } from '../context/RoleContext';

interface StatsPanelProps {
  stats: GameStats;
  hitRate: number;
}

export function StatsPanel({ stats, hitRate }: StatsPanelProps) {
  const { isTeacher } = useRole();

  const statItems = [
    {
      label: '命中数',
      value: stats.hits,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      show: true,
    },
    {
      label: '未命中',
      value: stats.misses,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      show: true,
    },
    {
      label: '待确认',
      value: stats.pendingCount,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      show: isTeacher,
    },
    {
      label: '异常数据',
      value: stats.errorCount,
      icon: AlertTriangle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      show: isTeacher,
    },
    {
      label: '坐标翻转',
      value: stats.flippedCount,
      icon: FlipHorizontal2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      show: isTeacher,
    },
  ];

  const visibleItems = statItems.filter((item) => item.show);

  return (
    <div className="w-64 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-5 h-5" />
          <span className="font-medium">实时统计</span>
        </div>
        <p className="text-xs text-cyan-100">当前标注练习进度</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-4 text-center border border-cyan-200">
          <div className="text-4xl font-bold text-cyan-700 mb-1">
            {stats.totalScore}
          </div>
          <div className="text-sm text-cyan-600 font-medium">总得分</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 text-center border border-emerald-200">
          <div className="text-3xl font-bold text-emerald-700 mb-1">
            {hitRate}%
          </div>
          <div className="text-sm text-emerald-600 font-medium">命中率</div>
          <div className="mt-2 h-2 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
              style={{ width: `${hitRate}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {visibleItems.map((item) => (
            <div
              key={item.label}
              className={`flex items-center justify-between p-3 rounded-lg border ${item.bgColor} ${item.borderColor} transition-all duration-200 hover:shadow-md`}
            >
              <div className="flex items-center gap-2">
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <span className="text-sm text-slate-600">{item.label}</span>
              </div>
              <span className={`font-bold text-lg ${item.color}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-500">完成进度</span>
            <span className="text-sm font-medium text-slate-700">
              {stats.completedRecords} / {stats.totalRecords}
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
              style={{
                width: `${(stats.completedRecords / stats.totalRecords) * 100}%`,
              }}
            />
          </div>
        </div>

        {stats.completedRecords > 0 && (
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">平均偏差</span>
              <span className="font-mono font-bold text-slate-700">
                {stats.averageDistance.toFixed(1)} px
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
