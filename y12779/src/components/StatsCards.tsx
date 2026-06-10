import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, FlaskConical, TrendingUp } from 'lucide-react';
import { useReportStore } from '../store/useReportStore';
import { computeStats } from '../utils/validation';

export const StatsCards: React.FC = () => {
  const batches = useReportStore((s) => s.batches);
  const stats = computeStats(batches);

  const cards = [
    {
      label: '总批次数',
      value: stats.total,
      suffix: '批',
      icon: FlaskConical,
      bg: 'from-brand-800 to-brand-600',
      textColor: 'text-white',
      sub: `平均选择性 ${stats.avgSelectivity}%`,
    },
    {
      label: '放行通过',
      value: stats.successCount,
      suffix: '批',
      icon: CheckCircle2,
      bg: 'from-status-success to-emerald-400',
      textColor: 'text-white',
      sub: `通过率 ${stats.passRate}%`,
    },
    {
      label: '待确认',
      value: stats.pendingCount,
      suffix: '批',
      icon: Clock,
      bg: 'from-amber-500 to-status-pending',
      textColor: 'text-amber-900',
      sub: '需补录或复测',
    },
    {
      label: '异常/废弃',
      value: stats.failedCount,
      suffix: '批',
      icon: AlertTriangle,
      bg: 'from-status-failed to-rose-400',
      textColor: 'text-white',
      sub: '含拦阻原因',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((c, i) => (
        <div
          key={c.label}
          className={`card-paper relative overflow-hidden animate-fade-in-up`}
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${c.bg}`} />
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{c.label}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className={`font-serif text-4xl font-bold bg-gradient-to-r ${c.bg} bg-clip-text text-transparent`}>
                    {c.value}
                  </span>
                  <span className="text-sm text-gray-500 font-mono">{c.suffix}</span>
                </div>
                <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {c.sub}
                </p>
              </div>
              <div className={`p-2.5 rounded-lg bg-gradient-to-br ${c.bg} ${c.textColor} shadow-soft`}>
                <c.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
