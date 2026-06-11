import { TrendingUp, TrendingDown } from 'lucide-react';
import type { DashboardStats } from '@/types';
import { formatAmountWithYuan } from '@/utils/reconciliation';

interface StatsCardsProps {
  stats: DashboardStats;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: '异常笔数',
      value: stats.totalAnomalies.toString(),
      suffix: '笔',
      trend: 'up',
      trendText: '较昨日 +2',
      color: 'text-amber-dark',
      borderColor: 'border-amber/40',
      bgAccent: 'from-amber/5 to-transparent',
    },
    {
      label: '涉及金额',
      value: formatAmountWithYuan(stats.totalAmount),
      suffix: '',
      trend: 'up',
      trendText: '占本月对账 18.6%',
      color: 'text-navy-700',
      borderColor: 'border-navy-200',
      bgAccent: 'from-navy-50 to-transparent',
    },
    {
      label: '双口径重复认领',
      value: stats.doubleCaliberCount.toString(),
      suffix: '笔',
      trend: 'down',
      trendText: '较昨日 -1（已复核）',
      color: 'text-emerald-dark',
      borderColor: 'border-emerald/40',
      bgAccent: 'from-emerald/5 to-transparent',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-5">
      {cards.map((card, idx) => (
        <div
          key={card.label}
          className={`card p-5 bg-gradient-to-br ${card.bgAccent} border-l-4 ${card.borderColor} animate-fade-up opacity-0`}
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <div className="text-xs text-navy-500 tracking-wider">
            {card.label}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`font-serif text-3xl font-semibold ${card.color}`}
            >
              {card.value}
            </span>
            {card.suffix && (
              <span className="text-sm text-navy-500">{card.suffix}</span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-navy-500">
            {card.trend === 'up' ? (
              <TrendingUp className="w-3.5 h-3.5 text-amber-dark" strokeWidth={2} />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-emerald-dark" strokeWidth={2} />
            )}
            <span>{card.trendText}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
