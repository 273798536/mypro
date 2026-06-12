import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Droplets, TrendingUp, MapPin, Activity, AlertTriangle, ChevronDown, ChevronUp, AlertCircle, AlertOctagon, Info } from 'lucide-react';
import { useVoyageStore } from '@/store/useVoyageStore';
import { cn } from '@/lib/utils';
import type { AlertSeverity } from '@/types';

interface WaterQualityParam {
  name: string;
  actual: number;
  threshold: number;
  unit: string;
  exceeded: boolean;
}

const severityConfig: Record<AlertSeverity, { color: string; bg: string; label: string; icon: typeof AlertTriangle }> = {
  critical: { color: 'bg-coral', bg: 'from-coral/30 to-transparent', label: '严重', icon: AlertOctagon },
  high: { color: 'bg-orange-500', bg: 'from-orange-500/30 to-transparent', label: '高', icon: AlertTriangle },
  medium: { color: 'bg-data-gold', bg: 'from-data-gold/30 to-transparent', label: '中', icon: AlertCircle },
  low: { color: 'bg-ocean', bg: 'from-ocean/30 to-transparent', label: '低', icon: Info },
};

export default function WaterQualityPage() {
  const { waterAlerts, voyages, fuelRecords } = useVoyageStore();
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const trendChartRef = useRef<HTMLDivElement>(null);
  const trendChartInstance = useRef<echarts.ECharts | null>(null);
  const correlationChartRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const correlationChartInstances = useRef<Record<string, echarts.ECharts | null>>({});

  const criticalCount = waterAlerts.filter((a) => a.severity === 'critical').length;
  const highCount = waterAlerts.filter((a) => a.severity === 'high').length;
  const mediumCount = waterAlerts.filter((a) => a.severity === 'medium').length;
  const lowCount = waterAlerts.filter((a) => a.severity === 'low').length;
  const totalCount = waterAlerts.length;

  useEffect(() => {
    if (!trendChartRef.current) return;

    trendChartInstance.current = echarts.init(trendChartRef.current);

    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });

    const option: echarts.EChartsOption = {
      grid: { left: 40, right: 20, top: 20, bottom: 30 },
      legend: {
        data: ['高', '中', '低'],
        right: 10,
        top: 0,
        textStyle: { color: '#90A4AE', fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10,
      },
      xAxis: {
        type: 'category',
        data: days,
        axisLabel: { color: '#90A4AE', fontSize: 9, interval: 3 },
        axisLine: { lineStyle: { color: 'rgba(0,184,212,0.2)' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#90A4AE', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(0,184,212,0.1)' } },
      },
      series: [
        {
          name: '高',
          type: 'bar',
          stack: 'total',
          data: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
          itemStyle: { color: '#FF6B6B' },
          barWidth: 14,
        },
        {
          name: '中',
          type: 'bar',
          stack: 'total',
          data: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0],
          itemStyle: { color: '#FFB300' },
          barWidth: 14,
        },
        {
          name: '低',
          type: 'bar',
          stack: 'total',
          data: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0],
          itemStyle: { color: '#00B8D4' },
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
      Object.values(correlationChartInstances.current).forEach((chart) => chart?.dispose());
      correlationChartInstances.current = {};
    };
  }, []);

  const toggleAlert = (alertId: string) => {
    setExpandedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(alertId)) {
        next.delete(alertId);
      } else {
        next.add(alertId);
      }
      return next;
    });

    if (!expandedAlerts.has(alertId)) {
      setTimeout(() => initCorrelationChart(alertId), 50);
    }
  };

  const initCorrelationChart = (alertId: string) => {
    const container = correlationChartRefs.current[alertId];
    if (!container) return;

    if (correlationChartInstances.current[alertId]) {
      correlationChartInstances.current[alertId]?.dispose();
    }

    const chart = echarts.init(container);
    correlationChartInstances.current[alertId] = chart;

    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);

    const option: echarts.EChartsOption = {
      grid: { left: 45, right: 50, top: 30, bottom: 30 },
      legend: {
        data: ['油耗', '水质指标'],
        right: 10,
        top: 0,
        textStyle: { color: '#90A4AE', fontSize: 11 },
      },
      xAxis: {
        type: 'category',
        data: hours,
        axisLabel: { color: '#90A4AE', fontSize: 10, interval: 3 },
        axisLine: { lineStyle: { color: 'rgba(0,184,212,0.2)' } },
      },
      yAxis: [
        {
          type: 'value',
          name: '油耗(L)',
          nameTextStyle: { color: '#90A4AE', fontSize: 10 },
          axisLabel: { color: '#90A4AE', fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(0,184,212,0.1)' } },
        },
        {
          type: 'value',
          name: '水质(mg/L)',
          nameTextStyle: { color: '#90A4AE', fontSize: 10 },
          axisLabel: { color: '#90A4AE', fontSize: 10 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '油耗',
          type: 'line',
          smooth: true,
          data: hours.map((_, i) => Number((18 + Math.sin(i / 3) * 5 + Math.random() * 3).toFixed(1))),
          lineStyle: { color: '#00B8D4', width: 2 },
          itemStyle: { color: '#00B8D4' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0,184,212,0.3)' },
              { offset: 1, color: 'rgba(0,184,212,0)' },
            ]),
          },
          symbol: 'none',
        },
        {
          name: '水质指标',
          type: 'line',
          smooth: true,
          yAxisIndex: 1,
          data: hours.map((_, i) => Number((4.5 + Math.cos(i / 4) * 1.2 + Math.random() * 0.5).toFixed(2))),
          lineStyle: { color: '#FFB300', width: 2, type: 'dashed' },
          itemStyle: { color: '#FFB300' },
          symbol: 'none',
        },
      ],
    };

    chart.setOption(option);
  };

  const getVoyageName = (voyageId: string) => {
    const v = voyages.find((voy) => voy.id === voyageId);
    return v ? v.route : '未知航程';
  };

  const getQualityParams = (alert: typeof waterAlerts[0]): WaterQualityParam[] => {
    const params: WaterQualityParam[] = [
      { name: alert.alertType, actual: alert.value ?? 0, threshold: alert.threshold ?? 0, unit: 'mg/L', exceeded: true },
      { name: '溶解氧', actual: 6.2, threshold: 5.0, unit: 'mg/L', exceeded: false },
      { name: 'pH值', actual: 8.1, threshold: 8.5, unit: '', exceeded: false },
      { name: '化学需氧量(COD)', actual: 4.2, threshold: 5.0, unit: 'mg/L', exceeded: false },
      { name: '氨氮', actual: 0.35, threshold: 0.5, unit: 'mg/L', exceeded: false },
    ];
    return params;
  };

  const getAffectedPoints = (alert: typeof waterAlerts[0]) => {
    return alert.affectedFuelRecords.slice(0, 3).map((id) => {
      const record = fuelRecords.find((f) => f.id === id);
      return {
        id,
        time: record?.timestamp || '-',
        fuelDiff: record ? Number(((record.fuelConsumption - record.expectedFuel) / record.expectedFuel * 100).toFixed(1)) : 0,
        expected: record?.expectedFuel ?? 0,
        actual: record?.fuelConsumption ?? 0,
      };
    });
  };

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-deep-sea">水质预警专项查看</h2>
            <p className="mt-1 text-sm text-sea-gray-dark">监测海域水质异常，分析对渔船作业油耗的影响</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-2">
            <h3 className="text-base font-semibold text-deep-sea">本月预警概览</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className={cn(
                'relative overflow-hidden rounded-xl border border-white/40 bg-gradient-to-br p-4 backdrop-blur-md shadow-sm',
                severityConfig.critical.bg
              )}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/60">
                    <severityConfig.critical.icon className="h-5 w-5 text-coral" />
                  </div>
                  <div>
                    <p className="text-xs text-sea-gray-dark">严重</p>
                    <p className="text-2xl font-bold text-deep-sea">{criticalCount}</p>
                  </div>
                </div>
              </div>
              <div className={cn(
                'relative overflow-hidden rounded-xl border border-white/40 bg-gradient-to-br p-4 backdrop-blur-md shadow-sm',
                severityConfig.high.bg
              )}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/60">
                    <severityConfig.high.icon className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-sea-gray-dark">高</p>
                    <p className="text-2xl font-bold text-deep-sea">{highCount}</p>
                  </div>
                </div>
              </div>
              <div className={cn(
                'relative overflow-hidden rounded-xl border border-white/40 bg-gradient-to-br p-4 backdrop-blur-md shadow-sm',
                severityConfig.medium.bg
              )}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/60">
                    <severityConfig.medium.icon className="h-5 w-5 text-data-gold" />
                  </div>
                  <div>
                    <p className="text-xs text-sea-gray-dark">中</p>
                    <p className="text-2xl font-bold text-deep-sea">{mediumCount}</p>
                  </div>
                </div>
              </div>
              <div className={cn(
                'relative overflow-hidden rounded-xl border border-white/40 bg-gradient-to-br p-4 backdrop-blur-md shadow-sm',
                severityConfig.low.bg
              )}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/60">
                    <severityConfig.low.icon className="h-5 w-5 text-ocean" />
                  </div>
                  <div>
                    <p className="text-xs text-sea-gray-dark">低</p>
                    <p className="text-2xl font-bold text-deep-sea">{lowCount}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-white/50 px-4 py-3 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-ocean" />
                <span className="text-sm text-deep-sea">预警总数</span>
              </div>
              <span className="text-xl font-bold text-deep-sea">{totalCount}</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/40 bg-white/50 p-5 backdrop-blur-md shadow-sm lg:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold text-deep-sea">
                <TrendingUp className="h-5 w-5 text-ocean" />
                近30天预警数量趋势
              </h3>
            </div>
            <div ref={trendChartRef} className="h-56 w-full" />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-deep-sea">预警列表</h3>

          {waterAlerts.length === 0 ? (
            <div className="rounded-xl border border-white/40 bg-white/50 p-12 text-center backdrop-blur-md">
              <Droplets className="mx-auto h-12 w-12 text-ocean" />
              <p className="mt-3 text-sea-gray-dark">暂无水质预警</p>
            </div>
          ) : (
            waterAlerts.map((alert) => {
              const isExpanded = expandedAlerts.has(alert.id);
              const sev = severityConfig[alert.severity];
              const SevIcon = sev.icon;
              const affected = getAffectedPoints(alert);
              const params = getQualityParams(alert);

              return (
                <div
                  key={alert.id}
                  className="overflow-hidden rounded-xl border border-white/40 bg-white/50 backdrop-blur-md shadow-sm"
                >
                  <div className="flex">
                    <div className={cn('w-1.5', sev.color)} />
                    <div className="flex-1">
                      <div
                        onClick={() => toggleAlert(alert.id)}
                        className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-white/60"
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                            sev.color + '/10 text' + sev.color.replace('bg-', '-')
                          )}
                            style={{ backgroundColor: alert.severity === 'critical' ? 'rgba(255,107,107,0.1)' : alert.severity === 'high' ? 'rgba(249,115,22,0.1)' : alert.severity === 'medium' ? 'rgba(255,179,0,0.1)' : 'rgba(0,184,212,0.1)' }}
                          >
                            <SevIcon
                              className="h-5 w-5"
                              style={{ color: alert.severity === 'critical' ? '#FF6B6B' : alert.severity === 'high' ? '#f97316' : alert.severity === 'medium' ? '#FFB300' : '#00B8D4' }}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-deep-sea">{alert.alertType}异常预警</span>
                              <span
                                className={cn(
                                  'rounded-full px-2.5 py-0.5 text-xs font-medium text-white',
                                  sev.color
                                )}
                              >
                                {sev.label}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-sea-gray-dark">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {alert.description.split('，')[0]}
                              </span>
                              <span className="flex items-center gap-1">
                                <Activity className="h-3.5 w-3.5" />
                                {new Date(alert.alertDate).toLocaleDateString('zh-CN')}
                              </span>
                              <span>关联航程: {getVoyageName(alert.voyageId)}</span>
                              <span>影响记录: {alert.affectedFuelRecords.length}条</span>
                            </div>
                            <p className="mt-1.5 text-sm text-sea-gray-dark">{alert.description}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-ocean px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-ocean-light"
                          >
                            <Activity className="h-3.5 w-3.5" />
                            查看关联油耗分析
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-sea-gray-dark" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-sea-gray-dark" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-white/40 bg-sea-gray/30 p-5">
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <div>
                          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-deep-sea">
                            <Droplets className="h-4 w-4 text-ocean" />
                            水质参数对比
                          </h4>
                          <div className="overflow-hidden rounded-lg border border-white/40">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-white/50 text-left text-sea-gray-dark">
                                  <th className="px-3 py-2.5 font-medium">参数</th>
                                  <th className="px-3 py-2.5 font-medium">实际值</th>
                                  <th className="px-3 py-2.5 font-medium">标准阈值</th>
                                  <th className="px-3 py-2.5 font-medium">状态</th>
                                </tr>
                              </thead>
                              <tbody>
                                {params.map((p) => (
                                  <tr key={p.name} className="border-t border-white/20">
                                    <td className="px-3 py-2.5 text-deep-sea">{p.name}</td>
                                    <td className={cn(
                                      'px-3 py-2.5 font-medium',
                                      p.exceeded ? 'text-coral' : 'text-deep-sea'
                                    )}>
                                      {p.actual}{p.unit}
                                    </td>
                                    <td className="px-3 py-2.5 text-sea-gray-dark">{p.threshold}{p.unit}</td>
                                    <td className="px-3 py-2.5">
                                      {p.exceeded ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-coral/10 px-2 py-0.5 text-xs font-medium text-coral">
                                          <AlertTriangle className="h-3 w-3" />
                                          超标
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-ocean/10 px-2 py-0.5 text-xs font-medium text-ocean">
                                          正常
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div>
                          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-deep-sea">
                            <Activity className="h-4 w-4 text-coral" />
                            关联航线油耗异常点
                          </h4>
                          {affected.length === 0 ? (
                            <div className="rounded-lg border border-white/40 bg-white/50 p-6 text-center text-sm text-sea-gray-dark">
                              暂无关联异常点
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {affected.map((pt) => (
                                <div
                                  key={pt.id}
                                  className="flex items-center justify-between rounded-lg border border-white/40 bg-white/50 px-4 py-3"
                                >
                                  <div>
                                    <p className="text-xs text-sea-gray-dark">
                                      {new Date(pt.time).toLocaleString('zh-CN')}
                                    </p>
                                    <p className="mt-0.5 text-sm text-deep-sea">
                                      预期 {pt.expected.toFixed(1)}L / 实际 {pt.actual.toFixed(1)}L
                                    </p>
                                  </div>
                                  <span className={cn(
                                    'rounded-full px-3 py-1 text-xs font-semibold',
                                    pt.fuelDiff > 10
                                      ? 'bg-coral/10 text-coral'
                                      : pt.fuelDiff > 0
                                        ? 'bg-data-gold/10 text-data-gold'
                                        : 'bg-ocean/10 text-ocean'
                                  )}>
                                    {pt.fuelDiff > 0 ? '+' : ''}{pt.fuelDiff}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5">
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-deep-sea">
                          <TrendingUp className="h-4 w-4 text-ocean" />
                          该区域同期油耗 vs 水质指标相关性
                        </h4>
                        <div
                          ref={(el) => { correlationChartRefs.current[alert.id] = el; }}
                          className="h-56 w-full rounded-lg border border-white/40 bg-white/50 p-3"
                        />
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
