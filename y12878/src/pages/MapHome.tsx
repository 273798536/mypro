import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Map as MapIcon,
  Ship,
  AlertTriangle,
  Droplets,
  Calendar,
  Filter,
  Anchor,
  ChevronRight,
  Fuel,
  Activity,
  X,
} from 'lucide-react';
import { useVoyageStore } from '@/store/useVoyageStore';
import { cn } from '@/lib/utils';
import type { Vessel, FuelRecord, AlertSeverity } from '@/types';

const MAP_WIDTH = 900;
const MAP_HEIGHT = 600;
const LAT_MIN = 29.5;
const LAT_MAX = 31.0;
const LNG_MIN = 121.5;
const LNG_MAX = 123.5;

const latLngToXY = (lat: number, lng: number) => {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    console.warn('[latLngToXY] 无效坐标:', { lat, lng });
    return { x: 0, y: 0 };
  }
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

const getSeverityColor = (severity: AlertSeverity) => {
  switch (severity) {
    case 'low':
      return 'bg-green-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'high':
      return 'bg-orange-500';
    case 'critical':
      return 'bg-red-500';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
      return 'text-ocean';
    case 'pending':
      return 'text-data-gold';
    case 'rejected':
      return 'text-coral';
    default:
      return 'text-ocean-light';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'approved':
      return '正常';
    case 'pending':
      return '待审核';
    case 'rejected':
      return '已拒绝';
    default:
      return status;
  }
};

interface VesselTooltip {
  vessel: Vessel;
  fuelRecord: FuelRecord;
  x: number;
  y: number;
}

export default function MapHome() {
  const navigate = useNavigate();
  const [selectedVesselId, setSelectedVesselId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity | 'all'>('all');
  const [tooltip, setTooltip] = useState<VesselTooltip | null>(null);

  const {
    vessels,
    buoySupplements,
    waterAlerts,
    getLatestFuelRecordByVessel,
    getVoyagesByVessel,
    getFuelRecordsByVoyage,
    getPendingCorrectionsCount,
    getUnresolvedDuplicatesCount,
    getPendingWaterAlertsCount,
  } = useVoyageStore();

  const todayVoyages = useMemo(() => {
    let result = useVoyageStore.getState().voyages;
    if (selectedVesselId !== 'all') {
      result = result.filter((v) => v.vesselId === selectedVesselId);
    }
    if (selectedDate) {
      result = result.filter(
        (v) =>
          ((v as any).departureTime ?? v.startDate).slice(0, 10) === selectedDate ||
          ((v as any).arrivalTime ?? v.endDate).slice(0, 10) === selectedDate
      );
    }
    return result.sort(
      (a, b) => new Date((b as any).departureTime ?? b.startDate).getTime() - new Date((a as any).departureTime ?? a.startDate).getTime()
    );
  }, [selectedVesselId, selectedDate]);

  const vesselRoutes = useMemo(() => {
    const routes: Map<string, { lat: number; lng: number }[]> = new Map();
    vessels.forEach((vessel) => {
      if (selectedVesselId !== 'all' && selectedVesselId !== vessel.id) return;
      const voyages = getVoyagesByVessel(vessel.id);
      if (voyages.length > 0) {
        const latestVoyage = voyages[voyages.length - 1];
        const records = getFuelRecordsByVoyage(latestVoyage.id)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          .map((r) => ({ lat: r.lat, lng: r.lng }))
          .filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number' && !isNaN(r.lat) && !isNaN(r.lng));
        if (records.length > 0) {
          routes.set(vessel.id, records);
        }
      }
    });
    return routes;
  }, [vessels, selectedVesselId, getVoyagesByVessel, getFuelRecordsByVoyage]);

  const islandPath = useMemo(() => {
    return ZHOUSHAN_ISLANDS.map((p, i) => {
      const { x, y } = latLngToXY(p.lat, p.lng);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ') + ' Z';
  }, []);

  const generateBezierPath = (points: { lat: number; lng: number }[]) => {
    if (points.length < 2) return '';
    const xyPoints = points.map((p) => latLngToXY(p.lat, p.lng));
    let path = `M ${xyPoints[0].x.toFixed(2)} ${xyPoints[0].y.toFixed(2)}`;
    for (let i = 1; i < xyPoints.length; i++) {
      const prev = xyPoints[i - 1];
      const curr = xyPoints[i];
      const cpx = ((prev.x + curr.x) / 2).toFixed(2);
      const cpy = ((prev.y + curr.y) / 2).toFixed(2);
      path += ` Q ${cpx} ${cpy} ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
    }
    return path;
  };

  const handleVesselClick = (vessel: Vessel, fuelRecord: FuelRecord) => {
    navigate(`/review/${vessel.id}/${new Date(fuelRecord.timestamp).toISOString().slice(0, 10)}`);
  };

  const handleVoyageClick = (vesselId: string, date: string) => {
    navigate(`/review/${vesselId}/${date.slice(0, 10)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-deep-sea via-deep-sea-light to-deep-sea text-white">
      <div className="container mx-auto p-4 lg:p-6">
        <header className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ocean/20 backdrop-blur-sm">
            <MapIcon className="h-6 w-6 text-ocean-light" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wide">海图联动监控中心</h1>
            <p className="text-sm text-sea-gray-dark">舟山群岛渔船作业实时监控</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <aside className="lg:col-span-3 space-y-4">
            <div className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-4 w-4 text-ocean-light" />
                <h2 className="font-semibold">筛选条件</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-sea-gray-dark mb-1.5">渔船</label>
                  <div className="relative">
                    <Ship className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ocean-light/60" />
                    <select
                      value={selectedVesselId}
                      onChange={(e) => setSelectedVesselId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-ocean/50 appearance-none cursor-pointer"
                    >
                      <option value="all">全部渔船</option>
                      {vessels.map((v) => (
                        <option key={v.id} value={v.id} className="bg-deep-sea">
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-sea-gray-dark mb-1.5">日期</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ocean-light/60" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-ocean/50 [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-sea-gray-dark mb-1.5">异常等级</label>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'low', 'medium', 'high', 'critical'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setSelectedSeverity(level)}
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium transition-all',
                          selectedSeverity === level
                            ? 'bg-ocean text-white'
                            : 'bg-white/5 text-sea-gray-dark hover:bg-white/10'
                        )}
                      >
                        {level === 'all'
                          ? '全部'
                          : level === 'low'
                          ? '低'
                          : level === 'medium'
                          ? '中'
                          : level === 'high'
                          ? '高'
                          : '严重'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/correction')}
                className="w-full rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-4 text-left hover:bg-white/10 hover:border-ocean/30 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20">
                      <Activity className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="font-medium">待处理修正</p>
                      <p className="text-xs text-sea-gray-dark mt-0.5">人工审核修正记录</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-sea-gray-dark group-hover:text-ocean-light transition-colors" />
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-orange-400">
                    {getPendingCorrectionsCount()}
                  </span>
                  <span className="text-sm text-sea-gray-dark">条</span>
                </div>
              </button>

              <button
                onClick={() => navigate('/duplicate-check')}
                className="w-full rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-4 text-left hover:bg-white/10 hover:border-ocean/30 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-data-gold/20">
                      <AlertTriangle className="h-5 w-5 text-data-gold" />
                    </div>
                    <div>
                      <p className="font-medium">重复导入预警</p>
                      <p className="text-xs text-sea-gray-dark mt-0.5">检测重复数据条目</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-sea-gray-dark group-hover:text-ocean-light transition-colors" />
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-data-gold">
                    {getUnresolvedDuplicatesCount()}
                  </span>
                  <span className="text-sm text-sea-gray-dark">条</span>
                </div>
              </button>

              <button
                onClick={() => navigate('/water-quality')}
                className="w-full rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-4 text-left hover:bg-white/10 hover:border-ocean/30 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20">
                      <Droplets className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="font-medium">水质预警</p>
                      <p className="text-xs text-sea-gray-dark mt-0.5">近岸海域水质监测</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-sea-gray-dark group-hover:text-ocean-light transition-colors" />
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-cyan-400">
                    {getPendingWaterAlertsCount()}
                  </span>
                  <span className="text-sm text-sea-gray-dark">条</span>
                </div>
              </button>
            </div>
          </aside>

          <main className="lg:col-span-6">
            <div className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapIcon className="h-4 w-4 text-ocean-light" />
                  <h2 className="font-semibold">舟山海域海图</h2>
                </div>
                <div className="flex items-center gap-4 text-xs text-sea-gray-dark">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-ocean animate-pulse-slow"></span>
                    渔船位置
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-data-gold"></span>
                    浮标补录
                  </span>
                </div>
              </div>

              <div className="relative">
                <svg
                  viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                  className="w-full h-auto"
                  style={{ maxHeight: '65vh' }}
                >
                  <defs>
                    <linearGradient id="seaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0A2540" />
                      <stop offset="50%" stopColor="#143A5C" />
                      <stop offset="100%" stopColor="#0A2540" />
                    </linearGradient>
                    <linearGradient id="islandGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#2D5A3D" />
                      <stop offset="100%" stopColor="#1A3D2A" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#seaGradient)" />

                  {Array.from({ length: 9 }, (_, i) => {
                    const x = (i / 8) * MAP_WIDTH;
                    return (
                      <line
                        key={`v-${i}`}
                        x1={x}
                        y1={0}
                        x2={x}
                        y2={MAP_HEIGHT}
                        stroke="#4DD0E1"
                        strokeOpacity="0.12"
                        strokeWidth="1"
                        strokeDasharray="4 6"
                      />
                    );
                  })}
                  {Array.from({ length: 7 }, (_, i) => {
                    const y = (i / 6) * MAP_HEIGHT;
                    return (
                      <line
                        key={`h-${i}`}
                        x1={0}
                        y1={y}
                        x2={MAP_WIDTH}
                        y2={y}
                        stroke="#4DD0E1"
                        strokeOpacity="0.12"
                        strokeWidth="1"
                        strokeDasharray="4 6"
                      />
                    );
                  })}

                  <path
                    d={islandPath}
                    fill="url(#islandGradient)"
                    stroke="#4DD0E1"
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                  />

                  {Array.from(vesselRoutes.entries()).map(([vesselId, points]) => {
                    const path = generateBezierPath(points);
                    if (!path) return null;
                    return (
                      <g key={`route-${vesselId}`}>
                        <path
                          d={path}
                          fill="none"
                          stroke="#4DD0E1"
                          strokeOpacity="0.15"
                          strokeWidth="6"
                        />
                        <path
                          d={path}
                          fill="none"
                          stroke="#00B8D4"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeDasharray="10 5"
                          style={{
                            animation: 'flow 2s linear infinite',
                          }}
                        />
                      </g>
                    );
                  })}

                  {buoySupplements.map((buoy) => {
                    const lat = (buoy as any).lat ?? (buoy as any).latitude ?? 30.2;
                    const lng = (buoy as any).lng ?? (buoy as any).longitude ?? 122.2;
                    const { x, y } = latLngToXY(lat, lng);
                    return (
                      <g key={buoy.id}>
                        <circle cx={x} cy={y} r="10" fill="#FFB300" fillOpacity="0.2" />
                        <circle cx={x} cy={y} r="5" fill="#FFB300" />
                        <circle cx={x} cy={y} r="2" fill="#FFF8E1" />
                      </g>
                    );
                  })}

                  {waterAlerts
                    .filter((a) => selectedSeverity === 'all' || a.severity === selectedSeverity)
                    .filter((a) => {
                      const lat = a.lat ?? a.latitude;
                      const lng = a.lng ?? a.longitude;
                      return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
                    })
                    .map((alert) => {
                      const lat = alert.lat ?? alert.latitude ?? 30.0;
                      const lng = alert.lng ?? alert.longitude ?? 122.0;
                      const { x, y } = latLngToXY(lat, lng);
                      return (
                        <g key={alert.id}>
                          <circle
                            cx={x}
                            cy={y}
                            r="14"
                            fill="none"
                            stroke={getSeverityColor(alert.severity).replace('bg-', '')}
                            strokeOpacity="0.4"
                            strokeWidth="2"
                            className="animate-pulse-slow"
                          />
                          <circle
                            cx={x}
                            cy={y}
                            r="7"
                            className={getSeverityColor(alert.severity)}
                            fillOpacity="0.8"
                          />
                        </g>
                      );
                    })}

                  {vessels
                    .filter((v) => selectedVesselId === 'all' || selectedVesselId === v.id)
                    .map((vessel) => {
                      const fuelRecord = getLatestFuelRecordByVessel(vessel.id);
                      if (!fuelRecord) return null;
                      const { x, y } = latLngToXY(fuelRecord.lat, fuelRecord.lng);
                      return (
                        <g
                          key={vessel.id}
                          className="cursor-pointer"
                          onClick={() => handleVesselClick(vessel, fuelRecord)}
                          onMouseEnter={() => setTooltip({ vessel, fuelRecord, x, y })}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <circle
                            cx={x}
                            cy={y}
                            r="22"
                            fill="#00B8D4"
                            fillOpacity="0.15"
                            className="animate-pulse-slow"
                          />
                          <circle
                            cx={x}
                            cy={y}
                            r="14"
                            fill="#00B8D4"
                            fillOpacity="0.3"
                          />
                          <circle cx={x} cy={y} r="10" fill="#143A5C" stroke="#00B8D4" strokeWidth="2" />
                          <g transform={`translate(${x - 6}, ${y - 6})`}>
                            <Anchor className="h-3 w-3 text-ocean-light" />
                          </g>
                        </g>
                      );
                    })}
                </svg>

                {tooltip && (
                  <div
                    className="absolute pointer-events-none z-10"
                    style={{
                      left: `${(tooltip.x / MAP_WIDTH) * 100}%`,
                      top: `${(tooltip.y / MAP_HEIGHT) * 100}%`,
                      transform: 'translate(-50%, -120%)',
                    }}
                  >
                    <div className="rounded-xl bg-deep-sea/95 backdrop-blur-md border border-ocean/30 px-4 py-3 shadow-xl min-w-[200px]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Ship className="h-4 w-4 text-ocean-light" />
                          <span className="font-semibold">{tooltip.vessel.name}</span>
                        </div>
                        <button
                          onClick={() => setTooltip(null)}
                          className="text-sea-gray-dark hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-sea-gray-dark flex items-center gap-1.5">
                            <Fuel className="h-3.5 w-3.5" />
                            当前油耗
                          </span>
                          <span className="font-medium text-ocean-light">
                            {tooltip.fuelRecord.fuelConsumption.toFixed(1)} L/h
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sea-gray-dark">状态</span>
                          <span className={cn('font-medium', getStatusColor(tooltip.fuelRecord.status))}>
                            {getStatusText(tooltip.fuelRecord.status)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sea-gray-dark">航速</span>
                          <span className="font-medium">{tooltip.fuelRecord.speed.toFixed(1)} 节</span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-white/10 text-xs text-sea-gray-dark">
                        {new Date(tooltip.fuelRecord.timestamp).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>

          <aside className="lg:col-span-3">
            <div className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden h-full flex flex-col" style={{ maxHeight: 'calc(65vh + 52px)' }}>
              <div className="px-4 py-3 border-b border-white/10">
                <h2 className="font-semibold">今日航程列表</h2>
                <p className="text-xs text-sea-gray-dark mt-0.5">
                  共 {todayVoyages.length} 条航程记录
                </p>
              </div>

              <div className="flex-1 overflow-y-auto">
                {todayVoyages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-sea-gray-dark">
                    <Ship className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">暂无航程数据</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {todayVoyages.map((voyage) => {
                      const vessel = vessels.find((v) => v.id === voyage.vesselId);
                      const latestFuel = getLatestFuelRecordByVessel(voyage.vesselId);
                      return (
                        <button
                          key={voyage.id}
                          onClick={() => handleVoyageClick(voyage.vesselId, (voyage as any).departureTime ?? voyage.startDate)}
                          className="w-full p-4 text-left hover:bg-white/5 transition-colors group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ocean/20">
                                <Ship className="h-4 w-4 text-ocean-light" />
                              </div>
                              <div>
                                <p className="font-medium text-sm group-hover:text-ocean-light transition-colors">
                                  {vessel?.name || '未知渔船'}
                                </p>
                                <p className="text-xs text-sea-gray-dark mt-0.5">
                                  {(voyage as any).voyageNo}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-sea-gray-dark group-hover:text-ocean-light transition-colors mt-1" />
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-sea-gray-dark">出发</span>
                              <p className="text-sea-gray mt-0.5">{(voyage as any).departurePort}</p>
                              <p className="text-sea-gray-dark mt-0.5 text-[10px]">
                                {new Date((voyage as any).departureTime ?? voyage.startDate).toLocaleDateString('zh-CN', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                            <div>
                              <span className="text-sea-gray-dark">到达</span>
                              <p className="text-sea-gray mt-0.5">{(voyage as any).arrivalPort}</p>
                              <p className="text-sea-gray-dark mt-0.5 text-[10px]">
                                {new Date((voyage as any).arrivalTime ?? voyage.endDate).toLocaleDateString('zh-CN', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 text-sea-gray-dark">
                                <Fuel className="h-3 w-3" />
                                {(voyage as any).totalFuel.toFixed(0)}L
                              </span>
                              <span className="flex items-center gap-1 text-sea-gray-dark">
                                <Activity className="h-3 w-3" />
                                {(voyage as any).totalDistance.toFixed(1)}海里
                              </span>
                            </div>
                            {latestFuel && (
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-full text-[10px] font-medium',
                                  latestFuel.status === 'approved'
                                    ? 'bg-ocean/20 text-ocean-light'
                                    : latestFuel.status === 'pending'
                                    ? 'bg-data-gold/20 text-data-gold'
                                    : 'bg-coral/20 text-coral'
                                )}
                              >
                                {getStatusText(latestFuel.status)}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
