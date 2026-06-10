import { useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  Thermometer,
  Droplets,
  Mountain,
  Crosshair,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Package,
  Truck,
  FlaskRound,
  Leaf,
  FileWarning,
  CheckCircle2,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { SamplingLocation, TimelineNode } from '@/types';
import {
  cn,
  formatDateTime,
  getSampleLabelColor,
  getSpeciesEmoji,
  getStatusBadgeClass,
  getStatusText,
} from '@/utils';

const STAGE_ICONS: Record<string, any> = {
  田间采样: Leaf,
  养殖场采样: Leaf,
  样本入库: Package,
  冷藏暂存: Package,
  冷链转运: Truck,
  实验室接收: FlaskRound,
  DNA提取: FlaskRound,
  上机测序: FlaskRound,
  数据分析: FlaskRound,
};

const MAP_BOUNDS = {
  minLat: 24,
  maxLat: 50,
  minLng: 73,
  maxLng: 136,
  width: 780,
  height: 500,
};

function latLngToXY(lat: number, lng: number) {
  const { minLat, maxLat, minLng, maxLng, width, height } = MAP_BOUNDS;
  const x = ((lng - minLng) / (maxLng - minLng)) * width;
  const y = ((maxLat - lat) / (maxLat - minLat)) * height;
  return { x, y };
}

export default function SamplingMapPage() {
  const store = useAppStore();
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [timelineIdx, setTimelineIdx] = useState<number>(0);
  const [playing, setPlaying] = useState(false);

  const locationSamplePairs = useMemo(() => {
    return store.locations
      .map((loc) => ({
        loc,
        sample: store.samples.find((s) => s.id === loc.sampleId),
      }))
      .filter((x) => x.sample) as Array<{ loc: SamplingLocation; sample: any }>;
  }, [store.locations, store.samples]);

  const selectedPair = useMemo(
    () => locationSamplePairs.find((p) => p.loc.id === selectedLocId) || locationSamplePairs[0],
    [locationSamplePairs, selectedLocId]
  );

  const timeline: TimelineNode[] = useMemo(() => {
    if (!selectedPair) return [];
    return store.getTimelineBySample(selectedPair.sample.id);
  }, [selectedPair, store.timelines]);

  useEffect(() => {
    if (timeline.length === 0) return;
    const timer = setInterval(() => {
      if (!playing) return;
      setTimelineIdx((i) => (i + 1) % Math.max(1, timeline.length));
    }, 1500);
    return () => clearInterval(timer);
  }, [playing, timeline.length]);

  return (
    <div className="p-6 lg:p-8 space-y-5 max-w-[1800px] mx-auto">
      <div>
        <div className="text-xs text-slate-500 font-medium">溯源 / 采样地点</div>
        <h1 className="text-2xl font-bold text-slate-800 mt-1 font-serif-cn flex items-center gap-2">
          🗺️ 采样地点回看 & 冷链时间线
          <span className="ml-3 px-2 py-0.5 rounded bg-deep-ocean/10 text-deep-ocean text-xs font-normal border border-deep-ocean/20">
            出问题时一键回溯采样位置
          </span>
        </h1>
      </div>

      <div className="grid grid-cols-[1fr_380px] gap-5">
        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-deep-ocean/5 to-transparent">
            <div className="flex items-center gap-2 font-bold text-slate-800 font-serif-cn">
              <MapPin className="w-5 h-5 text-tundra-green-dark" />
              全国采样点分布
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-tundra-green" />
                冷链正常
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-warning" />
                温控波动
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                冷链中断
              </span>
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-slate-50 to-blue-50/40">
            <svg
              viewBox={`0 0 ${MAP_BOUNDS.width} ${MAP_BOUNDS.height}`}
              className="w-full h-[500px] block"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#cbd5e1" strokeWidth="0.5" opacity="0.5" />
                </pattern>
              </defs>
              <rect width={MAP_BOUNDS.width} height={MAP_BOUNDS.height} fill="url(#grid)" />

              <path
                d="M 280,420 Q 200,380 180,320 Q 140,260 180,200 Q 220,150 300,120 Q 380,100 460,110 Q 560,120 640,160 Q 720,200 730,280 Q 740,360 690,420 Q 620,470 520,460 Q 420,470 320,460 Q 280,440 280,420 Z"
                fill="#e2e8f0"
                stroke="#94a3b8"
                strokeWidth="1.5"
                opacity="0.9"
              />
              <path
                d="M 180,320 Q 240,330 280,380 Q 320,430 380,440 L 480,430 Q 560,420 620,380 Q 680,340 700,280 L 660,240 Q 580,260 520,280 Q 440,300 360,310 Q 280,320 200,310 Z"
                fill="#cbd5e1"
                opacity="0.4"
              />
              <path
                d="M 340,280 Q 420,270 460,240 Q 500,200 520,170 L 500,160 Q 480,190 440,210 Q 400,230 360,240 Z"
                fill="#f8fafc"
                opacity="0.6"
              />

              {locationSamplePairs.map(({ loc, sample }) => {
                const { x, y } = latLngToXY(loc.latitude, loc.longitude);
                const isActive = selectedPair?.loc.id === loc.id;
                const color =
                  sample.coldChainStatus === 'alert'
                    ? '#ef4444'
                    : sample.coldChainStatus === 'warning'
                    ? '#e07b39'
                    : '#3d8b6b';
                return (
                  <g key={loc.id} onClick={() => setSelectedLocId(loc.id)} className="cursor-pointer">
                    {isActive && (
                      <circle cx={x} cy={y} r="22" fill={color} opacity="0.15">
                        <animate attributeName="r" from="10" to="28" dur="1.8s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.4" to="0" dur="1.8s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={isActive ? 10 : 7}
                      fill={color}
                      stroke="white"
                      strokeWidth={isActive ? 3 : 2}
                      className="transition-all"
                    />
                    <text
                      x={x}
                      y={y + 3.5}
                      fontSize="9"
                      textAnchor="middle"
                      fill="white"
                      fontWeight="600"
                    >
                      {getSpeciesEmoji(sample.species)}
                    </text>
                    <text
                      x={x + 14}
                      y={y + 4}
                      fontSize="10"
                      fill={isActive ? color : '#475569'}
                      fontWeight={isActive ? '700' : '500'}
                    >
                      {sample.id.slice(-7)} · {sample.species}
                    </text>
                  </g>
                );
              })}

              <text x="40" y="40" fontSize="10" fill="#94a3b8">N 50°</text>
              <text x="40" y={MAP_BOUNDS.height - 10} fontSize="10" fill="#94a3b8">N 24°</text>
              <text x="40" y={MAP_BOUNDS.height / 2} fontSize="10" fill="#94a3b8">E 73°</text>
              <text x={MAP_BOUNDS.width - 60} y={MAP_BOUNDS.height / 2} fontSize="10" fill="#94a3b8">E 136°</text>
            </svg>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card">
            {selectedPair && (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-lg shadow',
                        getSampleLabelColor(selectedPair.sample.species)
                      )}
                    >
                      {getSpeciesEmoji(selectedPair.sample.species)}
                    </div>
                    <div>
                      <div className="font-mono-data font-bold text-slate-800 text-sm">
                        {selectedPair.sample.id}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {selectedPair.sample.species} · {selectedPair.sample.variety}
                      </div>
                    </div>
                  </div>
                  <span className={cn('badge', getStatusBadgeClass(selectedPair.sample.coldChainStatus))}>
                    {getStatusText(selectedPair.sample.coldChainStatus)}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-deep-ocean/5 border border-deep-ocean/10">
                    <MapPin className="w-4 h-4 text-deep-ocean shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-slate-400 mb-0.5">采样地点</div>
                      <div className="text-slate-700 font-medium leading-relaxed">
                        {selectedPair.loc.placeName}
                      </div>
                      <div className="font-mono-data text-[10px] text-slate-400 mt-1">
                        经纬度: {selectedPair.loc.latitude.toFixed(4)}°N, {selectedPair.loc.longitude.toFixed(4)}°E
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-1 text-slate-400 mb-1 text-[10px]">
                        <Thermometer className="w-3 h-3" />
                        采样温度
                      </div>
                      <div className="font-mono-data font-bold text-slate-700 text-sm">
                        {selectedPair.loc.temperature}℃
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-1 text-slate-400 mb-1 text-[10px]">
                        <Droplets className="w-3 h-3" />
                        相对湿度
                      </div>
                      <div className="font-mono-data font-bold text-slate-700 text-sm">
                        {selectedPair.loc.humidity}%
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-1 text-slate-400 mb-1 text-[10px]">
                        <Mountain className="w-3 h-3" />
                        海拔高度
                      </div>
                      <div className="font-mono-data font-bold text-slate-700 text-sm">
                        {selectedPair.loc.elevation} m
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-1 text-slate-400 mb-1 text-[10px]">
                        <Crosshair className="w-3 h-3" />
                        GPS精度
                      </div>
                      <div className="font-mono-data font-bold text-slate-700 text-sm">
                        ±{selectedPair.loc.gpsAccuracy} m
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="card !p-0 overflow-hidden">
            <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-tundra-green/10 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800 font-serif-cn text-sm">
                <FileWarning className="w-4 h-4 text-amber-warning" />
                冷链流程时间线
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTimelineIdx(Math.max(0, timelineIdx - 1))}
                  className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPlaying(!playing)}
                  className="w-7 h-7 rounded bg-deep-ocean text-white hover:bg-deep-ocean-light flex items-center justify-center"
                >
                  {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
                <button
                  onClick={() => setTimelineIdx(Math.min(timeline.length - 1, timelineIdx + 1))}
                  className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {timeline.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                该样本暂无详细冷链时间线记录
              </div>
            ) : (
              <div className="p-4 space-y-3 max-h-[340px] overflow-y-auto scrollbar-thin">
                {timeline.map((node, idx) => {
                  const IconCmp = STAGE_ICONS[node.stage] || Package;
                  const active = idx === timelineIdx;
                  const passed = idx < timelineIdx;
                  const hasWarn = node.status === '异常';
                  return (
                    <div
                      key={idx}
                      onClick={() => setTimelineIdx(idx)}
                      className={cn(
                        'relative pl-8 cursor-pointer transition-all rounded-md p-2 -mx-2',
                        active && 'bg-deep-ocean/8 shadow-inner'
                      )}
                    >
                      <div className="absolute left-1 top-3 w-5 h-full">
                        {idx < timeline.length - 1 && (
                          <div
                            className={cn(
                              'absolute left-2 top-5 bottom-[-12px] w-0.5',
                              passed ? 'bg-tundra-green' : 'bg-slate-200'
                            )}
                          />
                        )}
                        <div
                          className={cn(
                            'relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white',
                            active && 'ring-4 ring-deep-ocean/20',
                            hasWarn ? 'border-amber-warning' : passed ? 'border-tundra-green bg-tundra-green/10' : 'border-slate-300'
                          )}
                        >
                          {passed && !hasWarn ? (
                            <CheckCircle2 className="w-3 h-3 text-tundra-green -ml-0.5" />
                          ) : hasWarn ? (
                            <FileWarning className="w-2.5 h-2.5 text-amber-warning -ml-0.5" />
                          ) : (
                            <IconCmp className="w-2.5 h-2.5 text-slate-400 -ml-0.5" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            'text-sm font-semibold',
                            hasWarn ? 'text-amber-warning' : passed ? 'text-slate-700' : active ? 'text-deep-ocean' : 'text-slate-500'
                          )}>
                            {node.stage}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono-data mt-0.5">
                            {formatDateTime(node.time)}
                          </div>
                          {(node.location || node.temperature !== undefined) && (
                            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                              {node.location && <span>📍 {node.location}</span>}
                              {node.temperature !== undefined && (
                                <span className={cn(
                                  'px-1.5 py-0.5 rounded',
                                  node.temperature > 8 ? 'bg-amber-warning/15 text-amber-warning' : 'bg-slate-100 text-slate-500'
                                )}>
                                  🌡️ {node.temperature}℃
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className={cn(
                          'badge shrink-0 text-[10px]',
                          hasWarn ? 'bg-amber-warning/15 text-amber-warning' : passed ? 'bg-tundra-green/15 text-tundra-green-dark' : 'bg-slate-100 text-slate-500'
                        )}>
                          {node.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
