import { AlertTriangle, CheckCircle, Clock, MapPin } from 'lucide-react';
import { usePointStore } from '@/store/usePointStore';
import { sourceTypeLabels } from '@/types';

export default function StatCards() {
  const { getStatistics } = usePointStore();
  const stats = getStatistics();

  const cards = [
    {
      label: '总点位',
      value: stats.total,
      icon: MapPin,
      color: 'text-slate-700',
      bgColor: 'bg-slate-100',
      iconBg: 'bg-slate-200',
    },
    {
      label: '异常点位',
      value: stats.abnormal,
      icon: AlertTriangle,
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-100',
    },
    {
      label: '待复核',
      value: stats.pending,
      icon: Clock,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
    },
    {
      label: '已确认',
      value: stats.confirmed,
      icon: CheckCircle,
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`${card.bgColor} rounded-lg p-4 border border-slate-200`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </div>
        );
      })}

      <div className="col-span-4 bg-white rounded-lg p-4 border border-slate-200">
        <p className="text-sm text-slate-600 mb-3">数据来源分布</p>
        <div className="flex gap-6">
          {(Object.keys(stats.bySource) as Array<keyof typeof stats.bySource>).map(
            (key) => (
              <div key={key} className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-sm ${
                    key === 'gis_old'
                      ? 'bg-blue-500'
                      : key === 'attachment'
                      ? 'bg-purple-500'
                      : 'bg-orange-500'
                  }`}
                />
                <span className="text-sm text-slate-700">
                  {sourceTypeLabels[key]}: {stats.bySource[key]}条
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
