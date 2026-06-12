import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as echarts from 'echarts';
import {
  Ship,
  Clock,
  Fuel,
  Wind,
  Waves,
  Thermometer,
  AlertTriangle,
  Edit3,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  Navigation,
  MapPin,
  Droplets,
  Gauge,
  Save,
  Anchor,
  Info,
  TrendingUp,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import TraceTimeline from '@/components/TraceTimeline';
import { useVoyageStore } from '@/store/useVoyageStore';
import { cn } from '@/lib/utils';
import type { CleanStep } from '@/types';

const MAP_WIDTH = 600;
const MAP_HEIGHT = 400;
const LAT_MIN = 29.5;
const LAT_MAX = 31.0;
const LNG_MIN = 121.5;
const LNG_MAX = 123.5;

const latLngToXY = (lat: number, lng: number) => {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * MAP_WIDTH;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_HEIGHT;
  return { x, y };
};

const ZHOUSHAN_ISLANDS = [
  { lat: 30.25, lng: 122.15 },
  { lat: 30.45, lng: 122.10 },
  { lat: 30.58, lng: 122.25 },
  { lat: 30.62, lng: 122.45 },
  { lat: 30.55, lng: 122.65 },
  { lat: 30.40, lng: 122.80 },
  { lat: 30.20, lng: 122.85 },
  { lat: 30.00, lng: 122.78 },
  { lat: 29.85, lng: 122.60 },
  { lat: 29.80, lng: 122.35 },
  { lat: 29.90, lng: 122.10 },
  { lat: 30.05, lng: 122.00 },
];

interface ExpandedRow {
  recordId: string;
  open: boolean;
}

export default function ReviewDetail() {
  const { vesselId, date } = useParams<{ vesselId: string; date: string }>();
  const navigate = useNavigate();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const [expandedRows, setExpandedRows] = useState<ExpandedRow[]>([]);
  const [remark, setRemark] = useState('');
  const [remarkSaved, setRemarkSaved] = useState(false);

  const {
    vessels,
    buoySupplements,
    getVoyageByVesselAndDate,
    getFuelRecordsByVoyage,
    getWeatherByFuelRecord,
    getTideByFuelRecord,
    getCorrectionsByRecord,
  } = useVoyageStore();

  const vessel = useMemo(() => {
    return vessels.find((v) => v.id === vesselId);
  }, [vessels, vesselId]);

  const voyage = useMemo(() => {
    if (!vesselId || !date) return undefined;
    return getVoyageByVesselAndDate(vesselId, date);
  }, [vesselId, date, getVoyageByVesselAndDate]);

  const fuelRecords = useMemo(() => {
    if (!voyage) return [];
    return getFuelRecordsByVoyage(voyage.id).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [voyage, getFuelRecordsByVoyage]);

  const voyageBuoys = useMemo(() => {
    if (!voyage) return [];
    return buoySupplements.filter((b) => b.voyageId === voyage.id);
  }, [voyage, buoySupplements]);

  const stats = useMemo(() => {
    if (fuelRecords.length === 0) {
      return {
        totalHours: 0,
        totalFuel: 0,
        avgFuel: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        highWindFuelIncrease: 0,
        correctionsCount: 0,
      };
    }

    const startTs = new Date(fuelRecords[0].timestamp).getTime();
    const endTs = new Date(fuelRecords[fuelRecords.length - 1].timestamp).getTime();
    const totalHours = Math.max(1, Math.round((endTs - startTs) / 3600000));
    const totalFuel = fuelRecords.reduce((sum, r) => sum + r.fuelConsumption, 0);
    const avgFuel = totalFuel / fuelRecords.length;

    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let highWindFuelSum = 0;
    let highWindExpectedSum = 0;
    let correctionsCount = 0;

    fuelRecords.forEach((r) => {
      if (r.status === 'pending') pendingCount++;
      if (r.status === 'approved') approvedCount++;
      if (r.status === 'rejected') rejectedCount++;
      if (r.hasCorrection) correctionsCount++;

      const weather = getWeatherByFuelRecord(r.id);
      if (weather && weather.windSpeed >= 10) {
        highWindFuelSum += r.fuelConsumption;
        highWindExpectedSum += r.expectedFuel;
      }
    });

    const highWindFuelIncrease =
      highWindExpectedSum > 0
        ? Math.round(((highWindFuelSum - highWindExpectedSum) / highWindExpectedSum) * 100)
        : 0;

    return {
      totalHours,
      totalFuel,
      avgFuel,
      pendingCount,
      approvedCount,
      rejectedCount,
      highWindFuelIncrease,
      correctionsCount,
    };
  }, [fuelRecords, getWeatherByFuelRecord]);

  const islandPath = useMemo(() => {
    return ZHOUSHAN_ISLANDS.map((p, i) => {
      const { x, y } = latLngToXY(p.lat, p.lng);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ') + ' Z';
  }, []);

  const routePath = useMemo(() => {
    if (fuelRecords.length < 2) return '';
    const points = fuelRecords.map((r) => latLngToXY(r.lat, r.lng));
    let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = ((prev.x + curr.x) / 2).toFixed(2);
      const cpy = ((prev.y + curr.y) / 2).toFixed(2);
      path += ` Q ${cpx} ${cpy} ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
    }
    return path;
  }, [fuelRecords]);

  useEffect(() => {
    if (!chartRef.current || fuelRecords.length === 0) return;

    chartInstance.current = echarts.init(chartRef.current, 'dark');

    const times = fuelRecords.map((r) =>
      new Date(r.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    );
    const actualFuel = fuelRecords.map((r) => Number(r.fuelConsumption.toFixed(1)));
    const expectedFuel = fuelRecords.map((r) => Number(r.expectedFuel.toFixed(1)));
    const windSpeeds = fuelRecords.map((r) => {
      const w = getWeatherByFuelRecord(r.id);
      return w ? Number(w.windSpeed.toFixed(1)) : 0;
    });

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10, 37, 64, 0.95)',
        borderColor: '#00B8D4',
        borderWidth: 1,
        textStyle: { color: '#fff' },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let result = `<div style="font-weight:bold;margin-bottom:8px">${params[0].axisValueLabel}</div>`;
          params.forEach((p: any) => {
            const color = p.color || '#00B8D4';
            result += `<div style="display:flex;align-items:center;gap:8px;margin:4px 0">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color}"></span>
              <span>${p.seriesName}:</span>
              <span style="font-weight:bold">${p.value} ${p.seriesName.includes('油耗') ? 'L/h' : 'm/s'}</span>
            </div>`;
          });
          return result;
        },
      },
      legend: {
        data: ['实际油耗', '预计油耗', '风速'],
        textStyle: { color: '#B0BEC5' },
        top: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: times,
        axisLine: { lineStyle: { color: '#B0BEC5' } },
        axisLabel: { color: '#B0BEC5', fontSize: 10 },
      },
      yAxis: [
        {
          type: 'value',
          name: '油耗(L/h)',
          nameTextStyle: { color: '#B0BEC5' },
          axisLine: { lineStyle: { color: '#B0BEC5' } },
          axisLabel: { color: '#B0BEC5' },
          splitLine: { lineStyle: { color: 'rgba(176, 190, 197, 0.1)' } },
        },
        {
          type: 'value',
          name: '风速(m/s)',
          nameTextStyle: { color: '#B0BEC5' },
          axisLine: { lineStyle: { color: '#B0BEC5' } },
          axisLabel: { color: '#B0BEC5' },
          splitLine: { show: false },
        },
      ],
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          bottom: 0,
          height: 20,
          borderColor: '#00B8D4',
          backgroundColor: 'rgba(0, 184, 212, 0.1)',
          fillerColor: 'rgba(0, 184, 212, 0.2)',
          handleStyle: { color: '#00B8D4' },
          textStyle: { color: '#B0BEC5' },
        },
      ],
      series: [
        {
          name: '实际油耗',
          type: 'line',
          smooth: true,
          data: actualFuel,
          itemStyle: { color: '#00B8D4' },
          lineStyle: { color: '#00B8D4', width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0, 184, 212, 0.3)' },
              { offset: 1, color: 'rgba(0, 184, 212, 0)' },
            ]),
          },
          symbol: 'circle',
          symbolSize: 6,
        },
        {
          name: '预计油耗',
          type: 'line',
          smooth: true,
          data: expectedFuel,
          itemStyle: { color: '#B0BEC5' },
          lineStyle: { color: '#B0BEC5', width: 2, type: 'dashed' },
          symbol: 'circle',
          symbolSize: 4,
        },
        {
          name: '风速',
          type: 'bar',
          yAxisIndex: 1,
          data: windSpeeds,
          itemStyle: {
            color: 'rgba(255, 179, 0, 0.45)',
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '40%',
        },
      ],
    };

    chartInstance.current.setOption(option);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, [fuelRecords, getWeatherByFuelRecord]);

  const toggleRow = (recordId: string) => {
    setExpandedRows((prev) => {
      const existing = prev.find((r) => r.recordId === recordId);
      if (existing) {
        return prev.map((r) =>
          r.recordId === recordId ? { ...r, open: !r.open } : r
        );
      }
      return [...prev, { recordId, open: true }];
    });
  };

  const isRowOpen = (recordId: string) => {
    return expandedRows.find((r) => r.recordId === recordId)?.open ?? false;
  };

  const getCleanSteps = (recordId: string): CleanStep[] => {
    const weather = getWeatherByFuelRecord(recordId);
    const corrections = getCorrectionsByRecord(recordId);
    const steps: CleanStep[] = [];

    if (weather?.isNullFilled) {
      steps.push({
        step: '空值填充',
        before: { 字段: weather.nullFillSource || '未知', 值: null },
        after: { 填充结果: '已填充' },
        reason: `数据缺失，通过邻近数据插值或默认值填充`,
        operator: 'system',
        timestamp: new Date().toLocaleString('zh-CN'),
      });
    }

    if (weather?.parsedFromRemark) {
      steps.push({
        step: '备注解析',
        before: { 原始备注: weather.remark || '-' },
        after: { 解析字段: '已提取气象数据' },
        reason: '从原始备注文本中解析提取气象参数',
        operator: 'system',
        timestamp: new Date().toLocaleString('zh-CN'),
      });
    }

    corrections.forEach((c) => {
      steps.push({
        step: '人工修正',
        before: { 油耗值: c.beforeValue, 状态: c.fromStatus },
        after: { 油耗值: c.afterValue, 状态: c.toStatus },
        reason: c.reason,
        operator: 'user',
        timestamp: c.operateTime,
      });
    });

    if (steps.length === 0) {
      steps.push({
        step: '原始数据',
        before: { 状态: '导入' },
        after: { 状态: '已入库' },
        reason: '数据正常，无需清洗处理',
        operator: 'system',
        timestamp: new Date().toLocaleString('zh-CN'),
      });
    }

    return steps;
  };

  const handleSaveRemark = () => {
    setRemarkSaved(true);
    setTimeout(() => setRemarkSaved(false), 2000);
  };

  const hasNullFilled = (recordId: string) => {
    const weather = getWeatherByFuelRecord(recordId);
    return weather?.isNullFilled ?? false;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-ocean" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-data-gold" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-coral" />;
      default:
        return <Info className="h-4 w-4 text-sea-gray-dark" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-deep-sea via-deep-sea-light to-deep-sea text-white">
      <div className="container mx-auto p-4 lg:p-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ocean/20 backdrop-blur-sm">
              <Navigation className="h-6 w-6 text-ocean-light" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-wide">航线复盘详情</h1>
              <p className="text-sm text-sea-gray-dark">
                {vessel?.name || '未知渔船'} · {date || '未知日期'} · {voyage?.route || ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg bg-white/5 px-4 py-2 text-sm hover:bg-white/10 border border-white/10 transition-colors"
          >
            返回
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-160px)]">
          <div className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-ocean-light" />
              <h2 className="font-semibold">航线轨迹图</h2>
              <span className="ml-auto text-xs text-sea-gray-dark flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-ocean"></span>
                  航线
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-coral"></span>
                  气象异常
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-data-gold"></span>
                  浮标补录
                </span>
              </span>
            </div>
            <div className="flex-1 p-3">
              <svg
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="reviewSeaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0A2540" />
                    <stop offset="50%" stopColor="#143A5C" />
                    <stop offset="100%" stopColor="#0A2540" />
                  </linearGradient>
                  <linearGradient id="reviewIslandGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#2D5A3D" />
                    <stop offset="100%" stopColor="#1A3D2A" />
                  </linearGradient>
                  <linearGradient id="reviewRouteGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4DD0E1" />
                    <stop offset="50%" stopColor="#00B8D4" />
                    <stop offset="100%" stopColor="#0097A7" />
                  </linearGradient>
                  <filter id="reviewGlow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="8" height="8">
                    <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="#FFB300" strokeWidth="1" opacity="0.5" />
                  </pattern>
                </defs>

                <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#reviewSeaGradient)" />

                {Array.from({ length: 7 }, (_, i) => {
                  const x = (i / 6) * MAP_WIDTH;
                  return (
                    <line
                      key={`rv-${i}`}
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={MAP_HEIGHT}
                      stroke="#4DD0E1"
                      strokeOpacity="0.1"
                      strokeWidth="1"
                      strokeDasharray="4 6"
                    />
                  );
                })}
                {Array.from({ length: 5 }, (_, i) => {
                  const y = (i / 4) * MAP_HEIGHT;
                  return (
                    <line
                      key={`rh-${i}`}
                      x1={0}
                      y1={y}
                      x2={MAP_WIDTH}
                      y2={y}
                      stroke="#4DD0E1"
                      strokeOpacity="0.1"
                      strokeWidth="1"
                      strokeDasharray="4 6"
                    />
                  );
                })}

                <path
                  d={islandPath}
                  fill="url(#reviewIslandGradient)"
                  stroke="#4DD0E1"
                  strokeWidth="1.5"
                  strokeOpacity="0.4"
                />

                {routePath && (
                  <g>
                    <path
                      d={routePath}
                      fill="none"
                      stroke="#4DD0E1"
                      strokeOpacity="0.15"
                      strokeWidth="10"
                    />
                    <path
                      d={routePath}
                      fill="none"
                      stroke="url(#reviewRouteGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#reviewGlow)"
                    />
                  </g>
                )}

                {fuelRecords.map((r) => {
                  const weather = getWeatherByFuelRecord(r.id);
                  const isAnomaly = weather && weather.windSpeed >= 12;
                  const { x, y } = latLngToXY(r.lat, r.lng);
                  return (
                    <g key={r.id}>
                      <circle
                        cx={x}
                        cy={y}
                        r={isAnomaly ? 10 : 5}
                        fill={isAnomaly ? '#FF6B6B' : '#00B8D4'}
                        fillOpacity={isAnomaly ? 0.8 : 0.6}
                        className={isAnomaly ? 'animate-pulse-slow' : ''}
                      />
                      {isAnomaly && (
                        <circle
                          cx={x}
                          cy={y}
                          r="14"
                          fill="none"
                          stroke="#FF6B6B"
                          strokeWidth="2"
                          strokeOpacity="0.5"
                          className="animate-pulse-slow"
                        />
                      )}
                    </g>
                  );
                })}

                {voyageBuoys.map((b) => {
                  const buoyLat = (b as any).latitude ?? 0;
                  const buoyLng = (b as any).longitude ?? 0;
                  const { x, y } = latLngToXY(buoyLat, buoyLng);
                  return (
                    <g key={b.id}>
                      <circle cx={x} cy={y} r="12" fill="#FFB300" fillOpacity="0.2" />
                      <circle cx={x} cy={y} r="7" fill="#FFB300" />
                      <circle cx={x} cy={y} r="3" fill="#FFF8E1" />
                    </g>
                  );
                })}

                {fuelRecords.length > 0 && (
                  <>
                    {(() => {
                      const start = latLngToXY(fuelRecords[0].lat, fuelRecords[0].lng);
                      const end = latLngToXY(
                        fuelRecords[fuelRecords.length - 1].lat,
                        fuelRecords[fuelRecords.length - 1].lng
                      );
                      return (
                        <>
                          <g>
                            <circle cx={start.x} cy={start.y} r="12" fill="#4CAF50" fillOpacity="0.3" />
                            <circle cx={start.x} cy={start.y} r="8" fill="#4CAF50" />
                            <Anchor className="h-4 w-4 text-white" x={start.x - 8} y={start.y - 8} />
                          </g>
                          <g>
                            <circle cx={end.x} cy={end.y} r="12" fill="#FF6B6B" fillOpacity="0.3" />
                            <circle cx={end.x} cy={end.y} r="8" fill="#FF6B6B" />
                            <Anchor className="h-4 w-4 text-white" x={end.x - 8} y={end.y - 8} />
                          </g>
                        </>
                      );
                    })()}
                  </>
                )}
              </svg>
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Activity className="h-4 w-4 text-ocean-light" />
              <h2 className="font-semibold">油耗趋势分析</h2>
            </div>
            <div className="flex-1 p-2">
              <div ref={chartRef} className="w-full h-full" style={{ minHeight: '300px' }} />
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden flex flex-col lg:col-span-1">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-ocean-light" />
                <h2 className="font-semibold">逐小时数据明细</h2>
                <span className="text-xs text-sea-gray-dark">({fuelRecords.length} 条)</span>
              </div>
              <span className="text-xs text-sea-gray-dark flex items-center gap-2">
                <span className="inline-block w-4 h-4 rounded" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4' stroke='%23FFB300' stroke-width='1' opacity='0.6'/%3E%3C/svg%3E")` }} />
                空值填充
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-deep-sea-light/95 backdrop-blur-sm">
                  <tr className="text-left text-sea-gray-dark border-b border-white/10">
                    <th className="px-3 py-2.5 font-medium"></th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">时间</th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">油耗</th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">预计油耗</th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">航速</th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">风速</th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">浪高</th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">潮位</th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">状态</th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {fuelRecords.map((record) => {
                    const weather = getWeatherByFuelRecord(record.id);
                    const tide = getTideByFuelRecord(record.id);
                    const isNull = hasNullFilled(record.id);
                    const open = isRowOpen(record.id);
                    const cellBg = isNull
                      ? {
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4' stroke='%23FFB300' stroke-width='1' opacity='0.5'/%3E%3C/svg%3E")`,
                          backgroundColor: 'rgba(255, 179, 0, 0.08)',
                        }
                      : {};

                    return (
                      <>
                        <tr
                          key={record.id}
                          className={cn(
                            'border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors',
                            open && 'bg-white/5'
                          )}
                          onClick={() => toggleRow(record.id)}
                        >
                          <td className="px-3 py-2.5">
                            {open ? (
                              <ChevronUp className="h-4 w-4 text-ocean" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-sea-gray-dark" />
                            )}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs">
                            {new Date(record.timestamp).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono text-ocean-light" style={cellBg}>
                            {record.fuelConsumption.toFixed(1)} L/h
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono text-sea-gray-dark">
                            {record.expectedFuel.toFixed(1)} L/h
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono">
                            {record.speed?.toFixed(1) || '-'} 节
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono" style={weather?.isNullFilled ? cellBg : {}}>
                            <div className="flex items-center gap-1">
                              <Wind className="h-3 w-3 text-data-gold" />
                              {weather ? `${weather.windSpeed.toFixed(1)} m/s` : '-'}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono" style={weather?.isNullFilled ? cellBg : {}}>
                            <div className="flex items-center gap-1">
                              <Waves className="h-3 w-3 text-ocean-light" />
                              {weather ? `${weather.waveHeight.toFixed(1)} m` : '-'}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono">
                            <div className="flex items-center gap-1">
                              <Droplets className="h-3 w-3 text-cyan-400" />
                              {tide ? `${tide.tideLevel.toFixed(2)} m` : '-'}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <StatusBadge status={record.status as any} />
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => navigate(`/correction/${record.id}`)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-data-gold/20 text-data-gold hover:bg-data-gold/30 transition-colors text-xs"
                              >
                                <Edit3 className="h-3 w-3" />
                                修正
                              </button>
                              <button
                                onClick={() => navigate(`/trace/${record.id}`)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-ocean/20 text-ocean-light hover:bg-ocean/30 transition-colors text-xs"
                              >
                                <Search className="h-3 w-3" />
                                溯源
                              </button>
                            </div>
                          </td>
                        </tr>
                        {open && (
                          <tr className="bg-deep-sea/60 border-b border-white/5">
                            <td colSpan={10} className="px-4 py-4">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-ocean-light">
                                    <Activity className="h-4 w-4" />
                                    数据清洗溯源
                                  </h4>
                                  <div className="max-h-64 overflow-y-auto pr-2">
                                    <TraceTimeline steps={getCleanSteps(record.id)} />
                                  </div>
                                </div>
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-ocean-light">
                                    <Thermometer className="h-4 w-4" />
                                    气象原始数据
                                  </h4>
                                  {weather ? (
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                                        <span className="text-sea-gray-dark flex items-center gap-1.5">
                                          <Wind className="h-3.5 w-3.5" /> 风速
                                        </span>
                                        <span className="font-mono">{weather.windSpeed.toFixed(1)} m/s</span>
                                      </div>
                                      <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                                        <span className="text-sea-gray-dark">风向</span>
                                        <span className="font-mono">{weather.windDirection || '-'}</span>
                                      </div>
                                      <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                                        <span className="text-sea-gray-dark flex items-center gap-1.5">
                                          <Waves className="h-3.5 w-3.5" /> 浪高
                                        </span>
                                        <span className="font-mono">{weather.waveHeight.toFixed(1)} m</span>
                                      </div>
                                      <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                                        <span className="text-sea-gray-dark flex items-center gap-1.5">
                                          <Thermometer className="h-3.5 w-3.5" /> 气温
                                        </span>
                                        <span className="font-mono">{weather.temperature.toFixed(1)}°C</span>
                                      </div>
                                      <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                                        <span className="text-sea-gray-dark">空值填充</span>
                                        <span className={cn(
                                          'px-2 py-0.5 rounded-full text-xs font-medium',
                                          weather.isNullFilled
                                            ? 'bg-data-gold/20 text-data-gold'
                                            : 'bg-ocean/20 text-ocean-light'
                                        )}>
                                          {weather.isNullFilled ? '是' : '否'}
                                        </span>
                                      </div>
                                      {weather.isNullFilled && (
                                        <div className="flex justify-between items-center py-1.5">
                                          <span className="text-sea-gray-dark">填充字段</span>
                                          <span className="font-mono text-xs">{weather.nullFillSource || '-'}</span>
                                        </div>
                                      )}
                                      {weather.remark && (
                                        <div className="mt-2 p-2 rounded-lg bg-white/5 text-xs text-sea-gray-dark italic">
                                          备注: {weather.remark}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-sea-gray-dark">暂无气象数据</p>
                                  )}
                                </div>
                                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-ocean-light">
                                    <Edit3 className="h-4 w-4" />
                                    修正记录
                                  </h4>
                                  {(() => {
                                    const corrections = getCorrectionsByRecord(record.id);
                                    if (corrections.length === 0) {
                                      return <p className="text-sm text-sea-gray-dark">暂无修正记录</p>;
                                    }
                                    return (
                                      <div className="space-y-2">
                                        {corrections.map((c) => (
                                          <div key={c.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-xs font-medium text-ocean-light">{c.operator}</span>
                                              <span className="text-xs text-sea-gray-dark">
                                                {new Date(c.operateTime).toLocaleDateString('zh-CN', {
                                                  month: '2-digit',
                                                  day: '2-digit',
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                })}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm font-mono mb-1">
                                              <span className="text-sea-gray-dark">{c.beforeValue.toFixed(1)}</span>
                                              <span className="text-ocean">→</span>
                                              <span className="text-data-gold">{c.afterValue.toFixed(1)} L/h</span>
                                            </div>
                                            <p className="text-xs text-sea-gray-dark">{c.reason}</p>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Info className="h-4 w-4 text-ocean-light" />
              <h2 className="font-semibold">复盘结论</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="flex items-center gap-2 text-sea-gray-dark text-xs mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    航程总时长
                  </div>
                  <p className="text-xl font-bold text-white">{stats.totalHours} 小时</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="flex items-center gap-2 text-sea-gray-dark text-xs mb-1">
                    <Fuel className="h-3.5 w-3.5" />
                    总油耗
                  </div>
                  <p className="text-xl font-bold text-ocean-light">{stats.totalFuel.toFixed(1)} L</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="flex items-center gap-2 text-sea-gray-dark text-xs mb-1">
                    <Gauge className="h-3.5 w-3.5" />
                    平均油耗
                  </div>
                  <p className="text-xl font-bold text-ocean">{stats.avgFuel.toFixed(1)} L/h</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="flex items-center gap-2 text-sea-gray-dark text-xs mb-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    异常点统计
                  </div>
                  <p className="text-xl font-bold flex items-baseline gap-1">
                    <span className="text-data-gold">{stats.pendingCount}</span>
                    <span className="text-sea-gray-dark text-sm">待确认</span>
                    <span className="text-ocean-light ml-1">{stats.approvedCount}</span>
                    <span className="text-sea-gray-dark text-sm">已通过</span>
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-ocean-light">
                  <Wind className="h-4 w-4" />
                  气象因素影响分析
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-sea-gray-dark">高风速时段(≥10m/s)油耗增加</span>
                    <span className={cn(
                      'text-sm font-bold font-mono',
                      stats.highWindFuelIncrease > 10 ? 'text-coral' : stats.highWindFuelIncrease > 5 ? 'text-data-gold' : 'text-ocean-light'
                    )}>
                      {stats.highWindFuelIncrease > 0 ? '+' : ''}{stats.highWindFuelIncrease}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        stats.highWindFuelIncrease > 10
                          ? 'bg-coral'
                          : stats.highWindFuelIncrease > 5
                          ? 'bg-data-gold'
                          : 'bg-ocean'
                      )}
                      style={{ width: `${Math.min(stats.highWindFuelIncrease, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-sea-gray-dark mt-2">
                    {stats.highWindFuelIncrease >= 10
                      ? '⚠️ 高风速对油耗影响显著，建议恶劣天气调整航线或降低航速'
                      : stats.highWindFuelIncrease >= 5
                      ? '⚡ 中等程度气象影响，需关注风速变化趋势'
                      : '✓ 气象因素对整体油耗影响在合理范围内'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-ocean-light">
                  <MapPin className="h-4 w-4" />
                  浮标补录说明
                </h4>
                {voyageBuoys.length === 0 ? (
                  <p className="text-sm text-sea-gray-dark">本次航程无浮标补录数据</p>
                ) : (
                  <div className="space-y-2">
                    {voyageBuoys.map((b) => (
                      <div key={b.id} className="p-2 rounded-lg bg-white/5 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-data-gold">
                            {(b as any).buoyName || '浮标补录'}
                          </span>
                          <span className="text-sea-gray-dark">
                            {new Date(b.supplementTime).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sea-gray-dark">
                          <span>录入: {b.operator}</span>
                        </div>
                        {b.originalRemark && (
                          <p className="mt-1 text-sea-gray-dark italic">{b.originalRemark}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-ocean-light">
                  <Edit3 className="h-4 w-4" />
                  修正记录汇总
                </h4>
                {stats.correctionsCount === 0 ? (
                  <p className="text-sm text-sea-gray-dark">本次航程无人工修正记录</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-data-gold">{stats.correctionsCount}</span>
                    <span className="text-sm text-sea-gray-dark">条数据已进行人工修正</span>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-ocean-light">
                    <FileText className="h-4 w-4" />
                    人工备注
                  </h4>
                  <button
                    onClick={handleSaveRemark}
                    className={cn(
                      'inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      remarkSaved
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-ocean/20 text-ocean-light hover:bg-ocean/30'
                    )}
                  >
                    {remarkSaved ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        已保存
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        保存
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="请输入复盘备注、分析结论或需要关注的事项..."
                  className="w-full h-28 p-3 rounded-lg bg-deep-sea/50 border border-white/10 text-sm text-white placeholder-sea-gray-dark/50 focus:outline-none focus:border-ocean/50 resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
