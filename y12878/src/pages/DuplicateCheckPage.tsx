import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Copy, AlertTriangle, CheckCircle2, Merge, Search, ChevronDown, ChevronUp } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { useVoyageStore } from '@/store/useVoyageStore';
import { cn } from '@/lib/utils';

type DuplicateStatus = 'pending' | 'approved';

interface DetailRecord {
  id: string;
  timestamp: string;
  fuelConsumption: number;
  speed: number;
  windSpeed: number;
  source: string;
  isConflict: Record<string, boolean>;
}

const fieldLabels: Record<string, string> = {
  fuelConsumption: '油耗',
  speed: '航速',
  windSpeed: '风速',
};

export default function DuplicateCheckPage() {
  const { duplicateGroups, fuelRecords, weatherData, buoySupplements, resolveDuplicate } = useVoyageStore();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedRecords, setSelectedRecords] = useState<Record<string, string>>({});
  const trendChartRef = useRef<HTMLDivElement>(null);
  const trendChartInstance = useRef<echarts.ECharts | null>(null);

  const pendingCount = duplicateGroups.filter((g) => !g.resolved).length;
  const resolvedCount = duplicateGroups.filter((g) => g.resolved).length;
  const supplementCount = buoySupplements.length;
  const accuracyRate = 95;

  useEffect(() => {
    if (!trendChartRef.current) return;

    trendChartInstance.current = echarts.init(trendChartRef.current);

    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });

    const option: echarts.EChartsOption = {
      grid: { left: 40, right: 20, top: 10, bottom: 25 },
      xAxis: {
        type: 'category',
        data: days,
        axisLabel: { color: '#90A4AE', fontSize: 10 },
        axisLine: { lineStyle: { color: 'rgba(0,184,212,0.2)' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#90A4AE', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(0,184,212,0.1)' } },
      },
      series: [
        {
          data: [3, 5, 2, 8, 4, 6, 3, 7, 5, 9, 4, 6, 3, 5],
          type: 'bar',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#00B8D4' },
              { offset: 1, color: 'rgba(0,184,212,0.2)' },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: 14,
        },
      ],
    };

    trendChartInstance.current.setOption(option);

    const handleResize = () => trendChartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      trendChartInstance.current?.dispose();
      trendChartInstance.current = null;
    };
  }, []);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const getGroupRecords = (group: typeof duplicateGroups[0]): DetailRecord[] => {
    return group.records.map((recordId) => {
      const fuel = fuelRecords.find((f) => f.id === recordId);
      const weather = weatherData.find((w) => w.fuelRecordId === recordId);

      const base: DetailRecord = {
        id: recordId,
        timestamp: fuel?.timestamp || '-',
        fuelConsumption: fuel?.fuelConsumption ?? 0,
        speed: fuel?.speed ?? 0,
        windSpeed: weather?.windSpeed ?? 0,
        source: fuel?.source || '未知',
        isConflict: {},
      };
      return base;
    });
  };

  const computeConflicts = (records: DetailRecord[], conflictingFields: string[]) => {
    const result = records.map((r) => ({ ...r, isConflict: {} as Record<string, boolean> }));
    conflictingFields.forEach((field) => {
      const values = result.map((r) => String((r as any)[field]));
      const unique = new Set(values);
      if (unique.size > 1) {
        result.forEach((r, idx) => {
          r.isConflict[field] = values[idx] !== Array.from(unique)[0];
        });
      }
    });
    return result;
  };

  const handleSelectRecord = (groupId: string, recordId: string) => {
    setSelectedRecords((prev) => ({ ...prev, [groupId]: recordId }));
  };

  const handleMerge = (groupId: string) => {
    const chosen = selectedRecords[groupId];
    if (chosen) {
      resolveDuplicate(groupId, chosen);
    }
  };

  const handleMarkNonDuplicate = (groupId: string) => {
    const firstRecord = duplicateGroups.find((g) => g.groupId === groupId)?.records[0];
    if (firstRecord) {
      resolveDuplicate(groupId, firstRecord);
    }
  };

  const statCards = [
    {
      label: '待处理重复组',
      value: pendingCount,
      icon: AlertTriangle,
      color: 'text-data-gold',
      bg: 'from-data-gold/20 to-transparent',
    },
    {
      label: '已解决重复组',
      value: resolvedCount,
      icon: CheckCircle2,
      color: 'text-ocean',
      bg: 'from-ocean/20 to-transparent',
    },
    {
      label: '本月补录数据',
      value: supplementCount,
      icon: Copy,
      color: 'text-coral',
      bg: 'from-coral/20 to-transparent',
    },
    {
      label: '冲突检测正确率',
      value: `${accuracyRate}%`,
      icon: Search,
      color: 'text-green-500',
      bg: 'from-green-500/20 to-transparent',
    },
  ];

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-deep-sea">重复导入与补录冲突检测</h2>
            <p className="mt-1 text-sm text-sea-gray-dark">自动识别重复数据，辅助人工决策合并策略</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={cn(
                'relative overflow-hidden rounded-xl border border-white/40 bg-white/50 p-5 backdrop-blur-md shadow-sm',
                'bg-gradient-to-br',
                card.bg
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-sea-gray-dark">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-deep-sea">{card.value}</p>
                </div>
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-white/60', card.color)}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-white/40 bg-white/50 p-5 backdrop-blur-md shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-deep-sea">近14天重复数据检测趋势</h3>
            <span className="text-xs text-sea-gray-dark">单位：组</span>
          </div>
          <div ref={trendChartRef} className="h-48 w-full" />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-deep-sea">重复数据组列表</h3>
            <div className="flex gap-2 text-sm">
              <span className="rounded-full bg-data-gold/10 px-3 py-1 text-data-gold">
                待处理 {pendingCount}
              </span>
              <span className="rounded-full bg-ocean/10 px-3 py-1 text-ocean">
                已解决 {resolvedCount}
              </span>
            </div>
          </div>

          {duplicateGroups.length === 0 ? (
            <div className="rounded-xl border border-white/40 bg-white/50 p-12 text-center backdrop-blur-md">
              <CheckCircle2 className="mx-auto h-12 w-12 text-ocean" />
              <p className="mt-3 text-sea-gray-dark">暂无重复数据</p>
            </div>
          ) : (
            duplicateGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.groupId);
              const status: DuplicateStatus = group.resolved ? 'approved' : 'pending';
              const records = computeConflicts(getGroupRecords(group), group.conflictingFields);
              const selected = selectedRecords[group.groupId];

              return (
                <div
                  key={group.groupId}
                  className="overflow-hidden rounded-xl border border-white/40 bg-white/50 backdrop-blur-md shadow-sm"
                >
                  <button
                    onClick={() => toggleGroup(group.groupId)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-white/60"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        group.resolved ? 'bg-ocean/10 text-ocean' : 'bg-data-gold/10 text-data-gold'
                      )}>
                        <Merge className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-deep-sea">组ID: {group.groupId}</span>
                          <StatusBadge status={status} />
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-sea-gray-dark">
                          <span>置信度: <span className="font-medium text-deep-sea">{(group.confidence * 100).toFixed(1)}%</span></span>
                          <span>记录数: <span className="font-medium text-deep-sea">{group.records.length}</span></span>
                          <span>冲突字段: <span className="font-medium text-coral">{group.conflictingFields.length}</span></span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-sea-gray-dark" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-sea-gray-dark" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-white/40 bg-sea-gray/30 p-5">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/40 text-left text-sea-gray-dark">
                              <th className="pb-3 pr-3 font-medium">选择</th>
                              <th className="pb-3 pr-3 font-medium">时间</th>
                              <th className="pb-3 pr-3 font-medium">油耗(L)</th>
                              <th className="pb-3 pr-3 font-medium">航速(kn)</th>
                              <th className="pb-3 pr-3 font-medium">风速(m/s)</th>
                              <th className="pb-3 pr-3 font-medium">来源</th>
                              <th className="pb-3 font-medium">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {records.map((record) => (
                              <tr key={record.id} className="border-b border-white/20 last:border-0">
                                <td className="py-3 pr-3">
                                  <input
                                    type="radio"
                                    name={`select-${group.groupId}`}
                                    checked={selected === record.id}
                                    onChange={() => handleSelectRecord(group.groupId, record.id)}
                                    disabled={group.resolved}
                                    className="h-4 w-4 accent-ocean"
                                  />
                                </td>
                                <td className="py-3 pr-3 text-deep-sea">
                                  {new Date(record.timestamp).toLocaleString('zh-CN')}
                                </td>
                                <td className={cn(
                                  'py-3 pr-3',
                                  record.isConflict.fuelConsumption && 'rounded bg-data-gold/30 font-medium text-data-gold'
                                )}>
                                  {record.fuelConsumption.toFixed(1)}
                                </td>
                                <td className={cn(
                                  'py-3 pr-3',
                                  record.isConflict.speed && 'rounded bg-data-gold/30 font-medium text-data-gold'
                                )}>
                                  {record.speed.toFixed(1)}
                                </td>
                                <td className={cn(
                                  'py-3 pr-3',
                                  record.isConflict.windSpeed && 'rounded bg-data-gold/30 font-medium text-data-gold'
                                )}>
                                  {record.windSpeed.toFixed(1)}
                                </td>
                                <td className="py-3 pr-3 text-sea-gray-dark">{record.source}</td>
                                <td className="py-3">
                                  <button className="text-xs text-ocean hover:underline">
                                    查看溯源
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        {!group.resolved ? (
                          <>
                            <button
                              onClick={() => handleMerge(group.groupId)}
                              disabled={!selected}
                              className={cn(
                                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                                selected
                                  ? 'bg-ocean hover:bg-ocean-light'
                                  : 'cursor-not-allowed bg-sea-gray-dark'
                              )}
                            >
                              <Merge className="h-4 w-4" />
                              合并选中
                            </button>
                            <button
                              onClick={() => handleMarkNonDuplicate(group.groupId)}
                              className="inline-flex items-center gap-2 rounded-lg border border-ocean px-4 py-2 text-sm font-medium text-ocean transition-colors hover:bg-ocean/10"
                            >
                              标记为非重复
                            </button>
                            <button className="inline-flex items-center gap-2 rounded-lg border border-sea-gray-dark/40 px-4 py-2 text-sm font-medium text-sea-gray-dark transition-colors hover:bg-sea-gray-dark/10">
                              <Search className="h-4 w-4" />
                              查看单条溯源
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-ocean">
                            <CheckCircle2 className="h-4 w-4" />
                            已处理，保留记录: {group.chosenRecordId || '系统自动决策'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
  );
}
