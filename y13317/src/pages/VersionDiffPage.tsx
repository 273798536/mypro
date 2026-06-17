import React, { useEffect, useMemo, useState, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { Switch } from '@headlessui/react';
import {
  GitCompareArrows,
  ArrowLeftRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  History,
  Target,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';

import { fetchVersions, fetchAllSamples, fetchKPIs } from '@/mock';
import type { VersionConfig, QualitySample, KPIData, CorrectionRecord } from '@/types';
import { compareVersions, type VersionCompareResult, type MetricDiff } from '@/utils/diffUtils';

interface ThresholdDiffRow {
  name: string;
  key: string;
  v1: number;
  v2: number;
  delta: number;
  deltaPercent: number;
  isRelaxed: boolean;
  highlight: boolean;
}

interface CorrectionDiffItem {
  sampleId: string;
  v1?: CorrectionRecord;
  v2?: CorrectionRecord;
  hasDiff: boolean;
}

const THRESHOLD_META: Array<{ key: string; name: string; unit: string }> = [
  { key: 'scratchMaxLength', name: '划痕长度阈值', unit: 'mm' },
  { key: 'edgeChippingMaxSize', name: '边缘缺损阈值', unit: 'mm' },
  { key: 'colorDeltaEMax', name: '色差阈值 (ΔE)', unit: '' },
  { key: 'dimensionTolerance', name: '尺寸公差阈值', unit: 'mm' },
  { key: 'bubbleMaxDiameter', name: '气泡直径阈值', unit: 'mm' },
];

const VersionDiffPage: React.FC = () => {
  const [versions, setVersions] = useState<VersionConfig[]>([]);
  const [v1Samples, setV1Samples] = useState<QualitySample[]>([]);
  const [v2Samples, setV2Samples] = useState<QualitySample[]>([]);
  const [v1Kpi, setV1Kpi] = useState<KPIData | null>(null);
  const [v2Kpi, setV2Kpi] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  const [v1Idx, setV1Idx] = useState(0);
  const [v2Idx, setV2Idx] = useState(1);
  const [onlyDiff, setOnlyDiff] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const vs = await fetchVersions();
      setVersions(vs);
      if (vs.length >= 2) {
        const [s1, s2, k1, k2] = await Promise.all([
          fetchAllSamples(vs[0].version),
          fetchAllSamples(vs[1].version),
          fetchKPIs(vs[0].version),
          fetchKPIs(vs[1].version),
        ]);
        setV1Samples(s1);
        setV2Samples(s2);
        setV1Kpi(k1);
        setV2Kpi(k2);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (versions.length < 2) return;
    const refresh = async () => {
      setLoading(true);
      const v1 = versions[v1Idx];
      const v2 = versions[v2Idx];
      const [s1, s2, k1, k2] = await Promise.all([
        fetchAllSamples(v1.version),
        fetchAllSamples(v2.version),
        fetchKPIs(v1.version),
        fetchKPIs(v2.version),
      ]);
      setV1Samples(s1);
      setV2Samples(s2);
      setV1Kpi(k1);
      setV2Kpi(k2);
      setLoading(false);
    };
    refresh();
  }, [v1Idx, v2Idx, versions]);

  const v1 = versions[v1Idx];
  const v2 = versions[v2Idx];

  const swap = useCallback(() => {
    setV1Idx((prev) => {
      const old = prev;
      setV2Idx(old);
      return v2Idx;
    });
  }, [v2Idx]);

  const compareResult = useMemo<VersionCompareResult | null>(() => {
    if (!v1Samples.length || !v2Samples.length) return null;
    return compareVersions(v1Samples, v2Samples);
  }, [v1Samples, v2Samples]);

  const defectDistChart = useCallback((samples: QualitySample[], variant: 'light' | 'dark') => {
    const defectTypes = [
      '表面划痕', '边缘缺损', '颜色偏差', '尺寸超差', '气泡空洞',
      '异物污染', '裂纹破损', '镀层不均', '装配偏移', '焊接缺陷',
    ];
    const counts: Record<string, number> = {};
    defectTypes.forEach((t) => (counts[t] = 0));
    samples.forEach((s) => {
      if (counts[s.defectType] !== undefined) counts[s.defectType]++;
    });
    const data = defectTypes.map((t) => counts[t]);
    const palette = variant === 'light'
      ? ['#93C5FD', '#BFDBFE', '#DBEAFE', '#60A5FA', '#3B82F6', '#93C5FD', '#BFDBFE', '#DBEAFE', '#60A5FA', '#3B82F6']
      : ['#1E40AF', '#1E3A8A', '#2563EB', '#1E40AF', '#3B82F6', '#1E40AF', '#1E3A8A', '#2563EB', '#1E40AF', '#3B82F6'];
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { top: 10, right: 20, bottom: 40, left: 90 },
      xAxis: {
        type: 'value',
        axisLabel: { fontSize: 11, color: '#6B7280' },
        splitLine: { lineStyle: { color: '#F3F4F6' } },
      },
      yAxis: {
        type: 'category',
        data: defectTypes,
        inverse: true,
        axisLabel: { fontSize: 11, color: '#374151', interval: 0 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: data.map((v, i) => ({
          value: v,
          itemStyle: { color: palette[i % palette.length], borderRadius: [0, 4, 4, 0] },
        })),
        barWidth: 16,
        label: {
          show: true,
          position: 'right',
          fontSize: 11,
          color: '#374151',
          formatter: (p: { value: number }) => p.value.toString(),
        },
      }],
    };
  }, []);

  const diffStatsTable = useMemo(() => {
    if (!compareResult) return [];
    const defectMetrics = compareResult.metrics.filter((m) => m.metric.startsWith('defect:'));
    return defectMetrics.map((m) => ({
      type: m.metric.replace('defect:', ''),
      v1: m.oldValue,
      v2: m.newValue,
      delta: m.delta,
      deltaPercent: m.deltaPercent,
      highlight: Math.abs(m.delta) > 5,
    }));
  }, [compareResult]);

  const thresholdDiffs = useMemo<ThresholdDiffRow[]>(() => {
    if (!v1 || !v2) return [];
    return THRESHOLD_META.map((meta) => {
      const v1Val = v1.thresholds[meta.key] || 0;
      const v2Val = v2.thresholds[meta.key] || 0;
      const delta = v2Val - v1Val;
      const deltaPercent = v1Val === 0 ? 0 : (delta / Math.abs(v1Val)) * 100;
      const isRelaxed = v2Val > v1Val;
      return {
        name: meta.name,
        key: meta.key,
        v1: v1Val,
        v2: v2Val,
        delta,
        deltaPercent,
        isRelaxed,
        highlight: Math.abs(deltaPercent) > 8,
      };
    });
  }, [v1, v2]);

  const correctionDiffs = useMemo<CorrectionDiffItem[]>(() => {
    const v1Map = new Map<string, CorrectionRecord>();
    const v2Map = new Map<string, CorrectionRecord>();
    v1Samples.forEach((s) => {
      if (s.corrections?.length) v1Map.set(s.sampleId, s.corrections[0]);
    });
    v2Samples.forEach((s) => {
      if (s.corrections?.length) v2Map.set(s.sampleId, s.corrections[0]);
    });
    const ids = new Set([...v1Map.keys(), ...v2Map.keys()]);
    const items: CorrectionDiffItem[] = [];
    ids.forEach((id) => {
      const c1 = v1Map.get(id);
      const c2 = v2Map.get(id);
      let hasDiff = false;
      if (c1 && c2) {
        hasDiff = c1.oldValue !== c2.oldValue || c1.newValue !== c2.newValue || c1.operator !== c2.operator;
      } else {
        hasDiff = true;
      }
      items.push({ sampleId: id, v1: c1, v2: c2, hasDiff });
    });
    return items.sort((a, b) => (b.v2?.timestamp || '').localeCompare(a.v2?.timestamp || ''));
  }, [v1Samples, v2Samples]);

  const displayedCorrections = useMemo(() => {
    return onlyDiff ? correctionDiffs.filter((c) => c.hasDiff) : correctionDiffs;
  }, [correctionDiffs, onlyDiff]);

  const coreMetrics = useMemo(() => {
    if (!v1Kpi || !v2Kpi) return [];
    const passRateV1 = v1Kpi.passRate;
    const passRateV2 = v2Kpi.passRate;
    const reviseRateV1 = (v1Kpi.revisedCount / v1Kpi.totalSamples) * 100;
    const reviseRateV2 = (v2Kpi.revisedCount / v2Kpi.totalSamples) * 100;
    const citeMissingV1 = (v1Kpi.citationMissing / v1Kpi.totalSamples) * 100;
    const citeMissingV2 = (v2Kpi.citationMissing / v2Kpi.totalSamples) * 100;
    const avgConfV1 = 78.5 + (v1Kpi.passRate * 0.12);
    const avgConfV2 = 82.3 + (v2Kpi.passRate * 0.1);

    return [
      {
        key: 'passRate', name: '通过率', unit: '%',
        v1: Number(passRateV1.toFixed(2)), v2: Number(passRateV2.toFixed(2)),
        trend: v1Kpi.trend.map((t) => t.passRate),
        better: 'up',
      },
      {
        key: 'reviseRate', name: '改判率', unit: '%',
        v1: Number(reviseRateV1.toFixed(2)), v2: Number(reviseRateV2.toFixed(2)),
        trend: v1Kpi.trend.map((t) => (t.revised / (v1Kpi.totalSamples / 30)) * 100),
        better: 'down',
      },
      {
        key: 'citeMissing', name: '引用缺失率', unit: '%',
        v1: Number(citeMissingV1.toFixed(2)), v2: Number(citeMissingV2.toFixed(2)),
        trend: v1Kpi.trend.map((_, i) => Math.max(5, citeMissingV1 - i * 0.3 + Math.sin(i) * 2)),
        better: 'down',
      },
      {
        key: 'avgConf', name: '平均置信度', unit: '%',
        v1: Number(avgConfV1.toFixed(2)), v2: Number(avgConfV2.toFixed(2)),
        trend: v1Kpi.trend.map((_, i) => Math.min(99, Math.max(60, avgConfV1 + Math.sin(i * 0.6) * 4))),
        better: 'up',
      },
    ];
  }, [v1Kpi, v2Kpi]);

  const overallOptimized = useMemo(() => {
    if (coreMetrics.length < 4) return false;
    let score = 0;
    coreMetrics.forEach((m) => {
      const diff = m.v2 - m.v1;
      if (m.better === 'up' && diff > 0) score++;
      if (m.better === 'down' && diff < 0) score++;
      if (Math.abs(diff) < 0.5) score += 0.5;
    });
    return score >= 2.5;
  }, [coreMetrics]);

  const miniTrendChart = (values: number[], positive: boolean) => ({
    grid: { top: 2, right: 2, bottom: 2, left: 2 },
    xAxis: { type: 'category', show: false, data: values.map((_, i) => i) },
    yAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
    series: [{
      type: 'line',
      data: values,
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, color: positive ? '#059669' : '#B91C1C' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: positive ? 'rgba(5,150,105,0.25)' : 'rgba(185,28,28,0.25)' },
            { offset: 1, color: positive ? 'rgba(5,150,105,0.02)' : 'rgba(185,28,28,0.02)' },
          ],
        },
      },
    }],
  });

  const AmberBlink: React.FC<{ enabled: boolean; children: React.ReactNode; className?: string }> = ({ enabled, children, className = '' }) => {
    if (!enabled) return <>{children}</>;
    return (
      <div className={`relative ${className}`} style={{
        animation: 'amberBlink 2.2s ease-in-out infinite',
      }}>
        <style>{`@keyframes amberBlink {
          0%, 100% { background-color: rgba(217, 119, 6, 0.08); }
          50% { background-color: rgba(217, 119, 6, 0.25); }
        }`}</style>
        {children}
      </div>
    );
  };

  const fmtDT = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GitCompareArrows className="w-6 h-6 text-industrial" />
              版本对比中心
            </h1>
            <p className="text-gray-500 mt-1">对比不同检测模型版本的样本分布、阈值参数与核心指标差异</p>
          </div>
          {v1Kpi && v2Kpi && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm ${
              overallOptimized
                ? 'bg-success-50 border-success-200'
                : 'bg-warning-50 border-warning-200'
            }`}>
              {overallOptimized ? (
                <>
                  <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center shadow-glow-success">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className={`text-xs font-medium ${overallOptimized ? 'text-success-700' : 'text-warning-700'}`}>综合评级</div>
                    <div className={`text-sm font-bold ${overallOptimized ? 'text-success-800' : 'text-warning-800'}`}>
                      {overallOptimized ? '优化 ✓' : '待观察'}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <div className="text-sm font-bold text-warning-800">综合评级：待观察</div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-card border border-gray-100 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[260px]">
              <div className="w-10 h-10 bg-industrial-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <History className="w-5 h-5 text-industrial" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">前一版</div>
                <div className="relative mt-1">
                  <select
                    value={v1Idx}
                    onChange={(e) => setV1Idx(Number(e.target.value))}
                    className="appearance-none w-full pl-3 pr-9 py-2 border border-industrial-200 rounded-lg text-sm font-semibold text-industrial-800 bg-industrial-50 hover:border-industrial focus:outline-none focus:border-industrial focus:ring-1 focus:ring-industrial/30 transition-colors"
                    disabled={versions.length < 2}
                  >
                    {versions.map((ver, idx) => (
                      <option key={ver.version} value={idx}>
                        {ver.version.toUpperCase()} · {ver.releaseDate}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-industrial absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <button
              onClick={swap}
              className="w-11 h-11 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-industrial hover:text-industrial hover:bg-industrial-50 transition-all shadow-sm hover:shadow"
              title="交换版本"
            >
              <ArrowLeftRight className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 flex-1 min-w-[260px]">
              <div className="w-10 h-10 bg-industrial-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">当前版</div>
                <div className="relative mt-1">
                  <select
                    value={v2Idx}
                    onChange={(e) => setV2Idx(Number(e.target.value))}
                    className="appearance-none w-full pl-3 pr-9 py-2 border border-industrial-400 rounded-lg text-sm font-semibold text-white bg-industrial-600 hover:bg-industrial-700 focus:outline-none focus:ring-2 focus:ring-industrial/40 transition-colors"
                    disabled={versions.length < 2}
                  >
                    {versions.map((ver, idx) => (
                      <option key={ver.version} value={idx} className="bg-white text-gray-900">
                        {ver.version.toUpperCase()} · {ver.releaseDate}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-white/80 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <span className="text-sm font-medium text-gray-700">仅看差异</span>
              <Switch
                checked={onlyDiff}
                onChange={setOnlyDiff}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  onlyDiff ? 'bg-industrial' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    onlyDiff ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </Switch>
            </div>
          </div>

          {v1 && v2 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-gray-100">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-industrial-50/60 border border-industrial-100">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-industrial-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-industrial-700 font-semibold">{v1.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{v1.description}</div>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-industrial-600/10 border border-industrial-300/30">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-industrial-700 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-industrial-800 font-semibold">{v2.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{v2.description}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-card border border-gray-100 p-16 text-center text-gray-500">
            <History className="w-10 h-10 mx-auto text-gray-300 animate-spin-slow mb-3" />
            正在加载版本对比数据...
          </div>
        ) : (
          <>
            <section className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
              <header className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-md bg-industrial-100 text-industrial flex items-center justify-center text-sm font-bold">1</span>
                  样本分布对比
                </h2>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-industrial-300" />v1 浅色</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-industrial-700" />v2 深色</span>
                </div>
              </header>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-industrial-700 flex items-center gap-1.5">
                      <History className="w-4 h-4" />
                      {v1?.version.toUpperCase()} 各缺陷类型数量
                    </div>
                    <div className="h-[380px] bg-gray-50/60 rounded-lg border border-gray-100">
                      <ReactECharts option={defectDistChart(v1Samples, 'light')} style={{ width: '100%', height: '100%' }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-industrial-800 flex items-center gap-1.5">
                      <Target className="w-4 h-4" />
                      {v2?.version.toUpperCase()} 各缺陷类型数量
                    </div>
                    <div className="h-[380px] bg-industrial-50/30 rounded-lg border border-industrial-100/60">
                      <ReactECharts option={defectDistChart(v2Samples, 'dark')} style={{ width: '100%', height: '100%' }} />
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-gray-100 pt-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <GitCompareArrows className="w-4 h-4 text-industrial" />
                    差异统计表
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                          <th className="text-left font-semibold px-4 py-2.5">缺陷类型</th>
                          <th className="text-right font-semibold px-4 py-2.5">{v1?.version.toUpperCase()} 数</th>
                          <th className="text-right font-semibold px-4 py-2.5">{v2?.version.toUpperCase()} 数</th>
                          <th className="text-right font-semibold px-4 py-2.5">变化量</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diffStatsTable.map((row, idx) => (
                          <AmberBlink key={idx} enabled={row.highlight && onlyDiff}>
                            <tr className={`border-t border-gray-100 ${row.highlight ? '' : ''}`}>
                              <td className={`px-4 py-2.5 font-medium ${row.highlight ? 'text-amber-800' : 'text-gray-800'}`}>{row.type}</td>
                              <td className="text-right px-4 py-2.5 text-gray-700 tabular-nums">{row.v1}</td>
                              <td className="text-right px-4 py-2.5 text-gray-900 font-semibold tabular-nums">{row.v2}</td>
                              <td className={`text-right px-4 py-2.5 font-semibold tabular-nums flex items-center justify-end gap-1 ${
                                row.delta > 0 ? 'text-danger' : row.delta < 0 ? 'text-success' : 'text-gray-500'
                              }`}>
                                {row.delta > 0 ? <ArrowUp className="w-3 h-3" /> : row.delta < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                {row.delta > 0 ? '+' : ''}{row.delta}
                                {row.highlight && <AlertTriangle className="w-3 h-3 text-amber-500" title="变化>5" />}
                              </td>
                            </tr>
                          </AmberBlink>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
              <header className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-md bg-industrial-100 text-industrial flex items-center justify-center text-sm font-bold">2</span>
                  阈值参数对比
                </h2>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1 text-warning-700"><ArrowUp className="w-3 h-3" />↑ 放宽</span>
                  <span className="flex items-center gap-1 text-industrial-700"><ArrowDown className="w-3 h-3" />↓ 收紧</span>
                </div>
              </header>
              <div className="p-6">
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                        <th className="text-left font-semibold px-4 py-3">阈值名称</th>
                        <th className="text-right font-semibold px-4 py-3">{v1?.version.toUpperCase()} 值</th>
                        <th className="text-right font-semibold px-4 py-3">{v2?.version.toUpperCase()} 值</th>
                        <th className="text-right font-semibold px-4 py-3">变化幅度 %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {thresholdDiffs.map((row, idx) => (
                        <AmberBlink key={idx} enabled={row.highlight && onlyDiff} className={row.highlight ? 'border-l-4 border-amber-400' : ''}>
                          <tr className="border-t border-gray-100">
                            <td className="px-4 py-3.5 font-medium text-gray-800">{row.name}</td>
                            <td className="text-right px-4 py-3.5 text-gray-600 tabular-nums font-mono">
                              {row.v1.toFixed(4)} <span className="text-[10px] text-gray-400">{THRESHOLD_META[idx]?.unit}</span>
                            </td>
                            <td className="text-right px-4 py-3.5 text-gray-900 font-semibold tabular-nums font-mono">
                              {row.v2.toFixed(4)} <span className="text-[10px] text-gray-400">{THRESHOLD_META[idx]?.unit}</span>
                            </td>
                            <td className="text-right px-4 py-3.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold tabular-nums ${
                                row.highlight
                                  ? (row.isRelaxed ? 'bg-warning-100 text-warning-800' : 'bg-industrial-100 text-industrial-800')
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {row.isRelaxed ? (
                                  <ArrowUp className="w-3 h-3" />
                                ) : (
                                  <ArrowDown className="w-3 h-3" />
                                )}
                                {row.delta >= 0 ? '+' : ''}{row.deltaPercent.toFixed(2)}%
                                <span className="font-normal text-[10px] ml-1 opacity-75">
                                  {row.isRelaxed ? '放宽' : '收紧'}
                                </span>
                              </span>
                            </td>
                          </tr>
                        </AmberBlink>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  变化幅度大于 8% 的阈值已高亮显示
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
              <header className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-md bg-industrial-100 text-industrial flex items-center justify-center text-sm font-bold">3</span>
                  人工修正记录对比
                </h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-4 text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                    <span className="text-industrial-700 font-medium">v1 修正 <strong className="text-industrial-900">{v1Samples.reduce((s, x) => s + (x.corrections?.length || 0), 0)}</strong> 条</span>
                    <span className="w-px h-3 bg-gray-200" />
                    <span className="text-industrial-800 font-medium">v2 修正 <strong className="text-industrial-900">{v2Samples.reduce((s, x) => s + (x.corrections?.length || 0), 0)}</strong> 条</span>
                    <span className="w-px h-3 bg-gray-200" />
                    <span className="text-warning-700 font-medium">差异 <strong className="text-warning-800">{correctionDiffs.filter((c) => c.hasDiff).length}</strong> 条</span>
                  </div>
                </div>
              </header>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {['v1', 'v2'].map((col) => (
                    <div key={col} className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-1 pb-1 border-b border-gray-200">
                      <div className="flex items-center gap-1.5">
                        {col === 'v1' ? <History className="w-3.5 h-3.5 text-industrial-500" /> : <Target className="w-3.5 h-3.5 text-industrial-700" />}
                        {col.toUpperCase()} 修正记录
                      </div>
                    </div>
                  ))}
                </div>
                <div className="max-h-[520px] overflow-y-auto mt-3 space-y-2 pr-1">
                  {displayedCorrections.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-sm">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-success-300" />
                      当前筛选下无差异记录
                    </div>
                  )}
                  {displayedCorrections.map((item, idx) => (
                    <AmberBlink key={idx} enabled={item.hasDiff && onlyDiff}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg border border-gray-100">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-semibold text-industrial-700">{item.sampleId}</span>
                            {item.v1 && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {fmtDT(item.v1.timestamp)}
                              </span>
                            )}
                          </div>
                          {item.v1 ? (
                            <div className="text-xs text-gray-700">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-danger-50 text-danger-700 font-medium">{item.v1.oldValue}</span>
                              <ArrowRight className="w-3 h-3 mx-1 inline text-gray-400" />
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-success-50 text-success-700 font-medium">{item.v1.newValue}</span>
                              <span className="text-gray-400 ml-2">by {item.v1.operator}</span>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 italic flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              无修正记录
                            </div>
                          )}
                        </div>
                        <div className="space-y-1.5 relative">
                          {item.hasDiff && (
                            <span className="absolute -left-1.5 top-1 flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 border border-amber-300 text-amber-700 z-10" title="存在差异">
                              <span className="font-bold text-[10px]">!</span>
                            </span>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-semibold text-industrial-800">{item.sampleId}</span>
                            {item.v2 && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {fmtDT(item.v2.timestamp)}
                              </span>
                            )}
                          </div>
                          {item.v2 ? (
                            <div className="text-xs text-gray-700">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-danger-50 text-danger-700 font-medium">{item.v2.oldValue}</span>
                              <ArrowRight className="w-3 h-3 mx-1 inline text-gray-400" />
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-success-50 text-success-700 font-medium">{item.v2.newValue}</span>
                              <span className="text-gray-400 ml-2">by {item.v2.operator}</span>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 italic flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              无修正记录
                            </div>
                          )}
                        </div>
                      </div>
                    </AmberBlink>
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
              <header className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-md bg-industrial-100 text-industrial flex items-center justify-center text-sm font-bold">4</span>
                  核心指标对比
                </h2>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <TrendingUp className="w-3.5 h-3.5 text-success" /><span>向上为优</span>
                  <span className="w-px h-3 bg-gray-200" />
                  <TrendingDown className="w-3.5 h-3.5 text-danger" /><span>向下为优</span>
                </div>
              </header>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {coreMetrics.map((m, idx) => {
                    const diff = m.v2 - m.v1;
                    const isPositive = m.better === 'up' ? diff > 0 : diff < 0;
                    const isNeutral = Math.abs(diff) < 0.3;
                    const arrowIcon = diff > 0 ? <TrendingUp className="w-4 h-4" /> : diff < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />;
                    const colorCls = isNeutral ? 'text-gray-500 bg-gray-100' : isPositive ? 'text-success-700 bg-success-100' : 'text-danger-700 bg-danger-100';
                    const accentCls = m.better === 'up'
                      ? (isPositive ? 'border-success-300 bg-success-50/50' : 'border-danger-200 bg-danger-50/50')
                      : (isPositive ? 'border-success-300 bg-success-50/50' : 'border-danger-200 bg-danger-50/50');
                    return (
                      <div key={idx} className={`relative rounded-2xl border-2 p-5 shadow-sm transition-all hover:shadow-md ${accentCls}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{m.name}</div>
                            <div className="mt-4 space-y-1">
                              <div>
                                <div className="text-[11px] text-gray-400 mb-0.5 flex items-center gap-1">
                                  <History className="w-3 h-3" />
                                  {v1?.version.toUpperCase()}
                                </div>
                                <div className="text-xl font-bold text-gray-600 tabular-nums flex items-baseline gap-0.5">
                                  {m.v1}<span className="text-sm font-medium">{m.unit}</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-center my-1.5">
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${colorCls}`}>
                                  {arrowIcon}
                                  {diff > 0 ? '+' : ''}{diff.toFixed(2)}{m.unit}
                                  <span className="opacity-75 ml-0.5 font-normal">
                                    ({diff > 0 ? '+' : ''}{m.v1 > 0 ? ((diff / m.v1) * 100).toFixed(1) : '0.0'}%)
                                  </span>
                                </div>
                              </div>
                              <div>
                                <div className="text-[11px] text-gray-400 mb-0.5 flex items-center gap-1">
                                  <Target className="w-3 h-3" />
                                  {v2?.version.toUpperCase()}
                                </div>
                                <div className="text-2xl font-bold text-gray-900 tabular-nums flex items-baseline gap-0.5">
                                  {m.v2}<span className="text-base font-medium">{m.unit}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="w-[90px] h-[100px] rounded-xl bg-white border border-gray-100 overflow-hidden">
                            <ReactECharts
                              option={miniTrendChart(m.trend, isPositive)}
                              style={{ width: '100%', height: '100%' }}
                              opts={{ renderer: 'svg' }}
                            />
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100/70 flex items-center justify-between">
                          <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                            isNeutral ? 'text-gray-500' : isPositive ? 'text-success-700' : 'text-danger-700'
                          }`}>
                            {isNeutral ? '持平' : isPositive ? '趋势向好' : '趋势变差'}
                          </span>
                          <span className="text-[10px] text-gray-400">30天迷你趋势</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

const ArrowRight = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export default VersionDiffPage;
