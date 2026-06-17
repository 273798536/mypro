import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  BarChart3,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Eye,
  Activity,
  FileSearch,
  GitCompare,
  Search,
  UserCheck,
  Zap,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { fetchKPIs } from '@/mock';
import type { KPIData } from '@/types';

type ColorKey = 'industrial' | 'success' | 'danger' | 'warning' | 'amber';

const colorMap: Record<ColorKey, { bg: string; iconBg: string; icon: string; text: string; light: string }> = {
  industrial: {
    bg: 'bg-industrial-50',
    iconBg: 'bg-industrial-100',
    icon: 'text-industrial',
    text: 'text-industrial-700',
    light: 'bg-industrial-50',
  },
  success: {
    bg: 'bg-success-50',
    iconBg: 'bg-success-100',
    icon: 'text-success',
    text: 'text-success-700',
    light: 'bg-success-50',
  },
  danger: {
    bg: 'bg-danger-50',
    iconBg: 'bg-danger-100',
    icon: 'text-danger',
    text: 'text-danger-700',
    light: 'bg-danger-50',
  },
  warning: {
    bg: 'bg-warning-50',
    iconBg: 'bg-warning-100',
    icon: 'text-warning',
    text: 'text-warning-700',
    light: 'bg-warning-50',
  },
  amber: {
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    icon: 'text-amber',
    text: 'text-amber-700',
    light: 'bg-amber-50',
  },
};

function useAnimatedNumber(target: number, duration: number = 1200, decimals: number = 0): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === undefined || target === null) return;

    const startValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = startValue + (target - startValue) * easeOutQuart;
      setValue(decimals > 0 ? Number(current.toFixed(decimals)) : Math.round(current));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

interface KpiCardProps {
  title: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  color: ColorKey;
  subtitle?: React.ReactNode;
  decimals?: number;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, suffix, icon, color, subtitle, decimals = 0 }) => {
  const animatedValue = useAnimatedNumber(value, 1400, decimals);
  const c = colorMap[color];

  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5 animate-fade-in-up">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${c.iconBg} rounded-xl flex items-center justify-center`}>
          <span className={c.icon}>{icon}</span>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-2 font-medium">{title}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-gray-900 tracking-tight tabular-nums">
          {decimals > 0 ? animatedValue.toFixed(decimals) : animatedValue.toLocaleString()}
        </span>
        {suffix && <span className={`text-lg font-semibold ${c.text}`}>{suffix}</span>}
      </div>
      {subtitle && <div className="mt-3">{subtitle}</div>}
    </div>
  );
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchKPIs('v2');
        setKpiData(data);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const totalSamples = 120;
  const revisedCount = 87;
  const passRate = 92.4;
  const citationMissing = 18;
  const highRiskCount = 8;
  const pendingCount = 15;
  const verbalNoteCount = 24;

  const trendData = kpiData?.trend.slice(-7) ?? [];
  const defectData = kpiData?.defectDistribution ?? [];

  const trendOption: EChartsOption = {
    grid: { left: 50, right: 60, top: 60, bottom: 40 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      borderColor: '#374151',
      borderWidth: 1,
      textStyle: { color: '#fff', fontSize: 13 },
      axisPointer: {
        type: 'cross',
        lineStyle: { color: '#94a3b8', type: 'dashed' },
      },
    },
    legend: {
      data: ['改判数', '通过率'],
      top: 10,
      right: 20,
      textStyle: { color: '#475569', fontSize: 13 },
      itemGap: 24,
    },
    xAxis: {
      type: 'category',
      data: trendData.map((d) => d.date.slice(5)),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 12 },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: '改判数',
        nameTextStyle: { color: '#64748b', fontSize: 12, padding: [0, 0, 0, -30] },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 12 },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      },
      {
        type: 'value',
        name: '通过率(%)',
        nameTextStyle: { color: '#64748b', fontSize: 12, padding: [0, -30, 0, 0] },
        min: 75,
        max: 100,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 12, formatter: '{value}%' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '改判数',
        type: 'bar',
        barWidth: '38%',
        data: trendData.map((d) => d.revised),
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#3B82F6' },
              { offset: 1, color: '#93C5FD' },
            ],
          },
        },
        emphasis: {
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#2563EB' },
                { offset: 1, color: '#60A5FA' },
              ],
            },
            shadowBlur: 12,
            shadowColor: 'rgba(59, 130, 246, 0.5)',
          },
        },
      },
      {
        name: '通过率',
        type: 'line',
        yAxisIndex: 1,
        data: trendData.map((d) => d.passRate),
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: '#10B981' },
        itemStyle: { color: '#10B981', borderWidth: 2, borderColor: '#fff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.25)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.02)' },
            ],
          },
        },
        emphasis: {
          itemStyle: {
            color: '#059669',
            borderWidth: 3,
            shadowBlur: 10,
            shadowColor: 'rgba(16, 185, 129, 0.6)',
          },
        },
      },
    ],
  };

  const distributionOption: EChartsOption = {
    grid: { left: 100, right: 30, top: 20, bottom: 30 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      borderColor: '#374151',
      borderWidth: 1,
      textStyle: { color: '#fff', fontSize: 13 },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>缺陷数：<span style="color:#60A5FA;font-weight:600">${p.value}</span>`;
      },
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: defectData.map((d) => d.type).reverse(),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: { color: '#475569', fontSize: 12 },
    },
    series: [
      {
        type: 'bar',
        data: defectData.map((d) => d.count).reverse(),
        barWidth: '55%',
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: (params: any) => {
            const colors = [
              'rgba(37, 99, 235, 0.85)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(96, 165, 250, 0.78)',
              'rgba(147, 197, 253, 0.75)',
              'rgba(191, 219, 254, 0.72)',
              'rgba(16, 185, 129, 0.7)',
              'rgba(52, 211, 153, 0.68)',
              'rgba(245, 158, 11, 0.65)',
              'rgba(251, 191, 36, 0.62)',
              'rgba(252, 211, 77, 0.6)',
            ];
            return colors[params.dataIndex % colors.length];
          },
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 12,
            shadowColor: 'rgba(37, 99, 235, 0.4)',
            color: '#2563EB',
          },
        },
        label: {
          show: true,
          position: 'right',
          color: '#475569',
          fontSize: 12,
          fontWeight: 600,
          formatter: '{c}',
        },
      },
    ],
  };

  const onTrendChartClick = (params: any) => {
    console.log('Trend chart clicked:', params);
    navigate('/trace');
  };

  const onDistributionChartClick = (params: any) => {
    console.log('Distribution chart clicked:', params);
    navigate(`/trace?defectType=${encodeURIComponent(params.name)}`);
  };

  const versionMetrics = [
    { label: '通过率', v2: 92.4, v1: 89.2, unit: '%', higherIsBetter: true },
    { label: '改判率', v2: 72.5, v1: 65.8, unit: '%', higherIsBetter: true },
    { label: '引用缺失率', v2: 15.0, v1: 22.3, unit: '%', higherIsBetter: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-industrial-50/30 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-industrial rounded-lg flex items-center justify-center shadow-glow-industrial">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">数据总览仪表盘</h1>
              <p className="text-xs text-gray-500">Dashboard · 工业视觉人工改判质检平台</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-success-50 text-success rounded-full text-sm font-medium">
              <Activity className="w-4 h-4 animate-pulse" />
              系统运行正常
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <Link
          to="/citation"
          className="block w-full rounded-2xl bg-gradient-to-r from-danger-600 via-danger-500 to-orange-500 p-[1px] shadow-glow-danger animate-fade-in-down"
        >
          <div className="rounded-2xl bg-white px-6 py-4 flex items-center justify-between hover:bg-danger-50/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-danger-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-danger" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-danger-800 flex items-center gap-2">
                  引用缺失预警
                  <span className="text-xs bg-danger-100 text-danger px-2 py-0.5 rounded-full font-semibold">需立即处理</span>
                </h3>
                <p className="text-sm text-danger-600 mt-0.5">
                  当前有 <span className="font-bold">{citationMissing}</span> 条样本缺失引用，其中
                  <span className="font-bold mx-1">{highRiskCount}</span>
                  条为高风险，可能影响审计追溯与质量合规
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-danger-700 font-semibold shrink-0 hover:gap-3 transition-all">
              前往引用校验
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <KpiCard
            title="总样本数"
            value={totalSamples}
            icon={<BarChart3 className="w-6 h-6" />}
            color="industrial"
            subtitle={
              <span className="inline-flex items-center gap-1 text-xs text-industrial-600 bg-industrial-50 px-2 py-1 rounded-md font-medium">
                <Zap className="w-3 h-3" />
                v2 版本全量
              </span>
            }
          />
          <KpiCard
            title="已改判数"
            value={revisedCount}
            icon={<Edit3 className="w-6 h-6" />}
            color="industrial"
            subtitle={
              <span className="inline-flex items-center gap-1 text-xs text-industrial-600 bg-industrial-50 px-2 py-1 rounded-md font-medium">
                完成率 {((revisedCount / totalSamples) * 100).toFixed(1)}%
              </span>
            }
          />
          <KpiCard
            title="通过率"
            value={passRate}
            suffix="%"
            icon={<CheckCircle2 className="w-6 h-6" />}
            color="success"
            decimals={1}
            subtitle={
              <span className="inline-flex items-center gap-1 text-xs text-success-600 bg-success-50 px-2 py-1 rounded-md font-medium">
                <ArrowUpRight className="w-3 h-3" />
                ↑ +3.2% vs v1
              </span>
            }
          />
          <KpiCard
            title="引用缺失"
            value={citationMissing}
            icon={<AlertTriangle className="w-6 h-6" />}
            color="danger"
            subtitle={
              <span className="inline-flex items-center gap-1 text-xs text-danger-600 bg-danger-50 px-2 py-1 rounded-md font-medium">
                <Shield className="w-3 h-3" />
                {highRiskCount} 条高风险
              </span>
            }
          />
          <KpiCard
            title="待处理数"
            value={pendingCount}
            icon={<Clock className="w-6 h-6" />}
            color="warning"
            subtitle={
              <span className="inline-flex items-center gap-1 text-xs text-warning-600 bg-warning-50 px-2 py-1 rounded-md font-medium">
                <Clock className="w-3 h-3" />
                需人工复核
              </span>
            }
          />
          <KpiCard
            title="口头备注影响"
            value={verbalNoteCount}
            suffix="条"
            icon={<MessageSquare className="w-6 h-6" />}
            color="amber"
            subtitle={
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md font-medium">
                <FileSearch className="w-3 h-3" />
                建议补充书面引用
              </span>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-gray-100 p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-industrial" />
                  改判趋势分析
                </h3>
                <p className="text-xs text-gray-500 mt-1">最近 7 天改判数量与质检通过率变化</p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-md">近7日</span>
            </div>
            <ReactECharts
              option={trendOption}
              style={{ height: 340 }}
              notMerge
              lazyUpdate
              onEvents={{ click: onTrendChartClick }}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 animate-fade-in-up">
            <div className="mb-2">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-industrial" />
                缺陷类型分布
              </h3>
              <p className="text-xs text-gray-500 mt-1">点击类型可跳转追溯筛选</p>
            </div>
            <ReactECharts
              option={distributionOption}
              style={{ height: 340 }}
              notMerge
              lazyUpdate
              onEvents={{ click: onDistributionChartClick }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <GitCompare className="w-5 h-5 text-industrial" />
                  当前版本状态
                </h3>
                <p className="text-xs text-gray-500 mt-1">v2 版本发布后的关键指标对比</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-industrial-50 text-industrial-700 rounded-lg text-sm font-semibold">
                <span className="w-2 h-2 bg-industrial rounded-full animate-pulse" />
                v2 · 2026-06-15
              </div>
            </div>

            <div className="space-y-4">
              {versionMetrics.map((m) => {
                const diff = m.v2 - m.v1;
                const isPositive = m.higherIsBetter ? diff > 0 : diff < 0;
                return (
                  <div
                    key={m.label}
                    className={`p-4 rounded-xl border transition-colors ${
                      isPositive ? 'bg-success-50/60 border-success-200' : 'bg-amber-50/70 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 font-medium mb-1">{m.label}</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-gray-900 tabular-nums">
                            {m.v2.toFixed(1)}{m.unit}
                          </span>
                          <span className="text-xs text-gray-400">当前</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold ${
                            isPositive
                              ? 'bg-success-100 text-success-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {diff >= 0 ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                          {diff >= 0 ? '+' : ''}
                          {diff.toFixed(1)}{m.unit}
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">vs v1 · {m.v1.toFixed(1)}{m.unit}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 animate-fade-in-up">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-industrial" />
                快速操作
              </h3>
              <p className="text-xs text-gray-500 mt-1">常用功能一键直达</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Link
                to="/operator"
                className="group relative overflow-hidden rounded-2xl border-2 border-gray-100 p-5 hover:border-industrial-300 hover:bg-industrial-50/40 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-industrial-100 to-transparent rounded-full -translate-y-8 translate-x-8 opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-12 h-12 bg-industrial-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-glow-industrial">
                    <UserCheck className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">周姐工作台</h4>
                  <p className="text-xs text-gray-500">人工改判作业台</p>
                </div>
              </Link>

              <Link
                to="/citation"
                className="group relative overflow-hidden rounded-2xl border-2 border-gray-100 p-5 hover:border-danger-300 hover:bg-danger-50/40 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-danger-100 to-transparent rounded-full -translate-y-8 translate-x-8 opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-12 h-12 bg-danger-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-glow-danger">
                    <FileSearch className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">引用校验</h4>
                  <p className="text-xs text-gray-500">缺失引用检查修复</p>
                </div>
              </Link>

              <Link
                to="/version-diff"
                className="group relative overflow-hidden rounded-2xl border-2 border-gray-100 p-5 hover:border-success-300 hover:bg-success-50/40 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-success-100 to-transparent rounded-full -translate-y-8 translate-x-8 opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-12 h-12 bg-success-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-glow-success">
                    <GitCompare className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">版本对比</h4>
                  <p className="text-xs text-gray-500">v1 vs v2 差异分析</p>
                </div>
              </Link>

              <Link
                to="/trace"
                className="group relative overflow-hidden rounded-2xl border-2 border-gray-100 p-5 hover:border-warning-300 hover:bg-warning-50/40 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-warning-100 to-transparent rounded-full -translate-y-8 translate-x-8 opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-12 h-12 bg-warning-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Search className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">异常追溯</h4>
                  <p className="text-xs text-gray-500">缺陷溯源与定位</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 border-t border-gray-200 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-5 text-center text-xs text-gray-400">
          © 2026 工业视觉人工改判质检平台 · Industrial Visual Inspection Platform v2.0
        </div>
      </footer>
    </div>
  );
};

export default DashboardPage;
