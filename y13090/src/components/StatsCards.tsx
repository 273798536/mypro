import { FileCheck, AlertTriangle, Tags, Layers } from 'lucide-react';
import { useReviewStore } from '@/store/reviewStore';

export function StatsCards() {
  const { filteredResult, setFilters, activeAnomalyTab, setActiveAnomalyTab } = useReviewStore();
  const { stats } = filteredResult;

  const cards = [
    {
      key: 'total',
      label: '总记录数',
      value: stats.total,
      icon: FileCheck,
      color: 'text-industrial-400',
      bg: 'bg-industrial-600/10',
      border: 'border-industrial-600/30',
      onClick: () => setFilters({ showOnlyAnomaly: false }),
    },
    {
      key: 'anomaly',
      label: '异常总数',
      value: stats.anomalyCount,
      icon: AlertTriangle,
      color: 'text-warning-400',
      bg: 'bg-warning-500/10',
      border: 'border-warning-500/30',
      onClick: () => setFilters({ showOnlyAnomaly: true }),
    },
    {
      key: 'name',
      label: '名称不一致',
      value: stats.nameMismatchCount,
      icon: Tags,
      color: 'text-warning-400',
      bg: 'bg-warning-500/10',
      border: 'border-warning-500/30',
      onClick: () => {
        setActiveAnomalyTab('name_mismatch');
        setFilters({ showOnlyAnomaly: true });
      },
      active: activeAnomalyTab === 'name_mismatch',
    },
    {
      key: 'floor',
      label: '楼层单位混写',
      value: stats.floorUnitMixedCount,
      icon: Layers,
      color: 'text-danger-400',
      bg: 'bg-danger-500/10',
      border: 'border-danger-500/30',
      onClick: () => {
        setActiveAnomalyTab('floor_unit_mixed');
        setFilters({ showOnlyAnomaly: true });
      },
      active: activeAnomalyTab === 'floor_unit_mixed',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <button
          key={c.key}
          onClick={c.onClick}
          className={`group relative text-left p-4 rounded-lg border-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-industrial-lg ${c.bg} ${c.border} ${
            c.active ? 'ring-2 ring-offset-2 ring-offset-steel-900 ring-industrial-500' : ''
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2 rounded-md ${c.bg}`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-steel-500">点击筛选</span>
          </div>
          <div className="font-mono text-3xl font-bold text-steel-100 mb-1 group-hover:text-white transition-colors">
            {stats.total > 0 ? c.value : '—'}
          </div>
          <div className="text-sm text-steel-400">{c.label}</div>
        </button>
      ))}
    </div>
  );
}
