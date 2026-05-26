import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { minutesToLabel } from '@/utils/importExport';
import { Play, Pause, SkipForward, SkipBack, Trophy, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ResultPage() {
  const { lastResult, lastSim, materials, playbackIndex, playbackPlaying, playbackSpeed, setPlayback } = useGameStore();
  const [idx, setIdx] = useState(playbackIndex);
  const [playing, setPlaying] = useState(playbackPlaying);
  const [speed, setSpeed] = useState(playbackSpeed);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!lastSim) return;
    const maxT = lastSim.temperatureSeries.length;
    if (playing && idx < maxT) {
      timerRef.current = window.setTimeout(() => {
        setIdx((i) => Math.min(maxT, i + speed * 30));
      }, 50);
    }
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [idx, playing, speed, lastSim]);

  useEffect(() => {
    setPlayback({ playbackIndex: idx, playbackPlaying: playing, playbackSpeed: speed });
  }, [idx, playing, speed, setPlayback]);

  if (!lastResult || !lastSim) {
    return (
      <div className="card p-10 text-center">
        <Trophy className="mx-auto mb-4 text-white/40" size={40} />
        <div className="text-white/70 mb-3">尚未有评分结果</div>
        <Link to="/scheduler" className="btn-primary inline-flex">去排程竞技</Link>
      </div>
    );
  }

  const currentTime = lastSim.temperatureSeries[Math.min(idx, lastSim.temperatureSeries.length - 1)]?.time ?? 0;
  const currentTemps: Record<string, number> = {};
  lastSim.temperatureSeries.slice(0, idx + 1).forEach((p) => {
    currentTemps[p.zoneId] = p.temperature;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-wider">关卡结果与回放</h1>
        <p className="text-white/60 text-sm mt-1">可回看评分事件、温度变化与除霜执行过程。</p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-4 card p-6 text-center">
          <div className="text-xs text-white/50">总分</div>
          <div className="font-display text-5xl mt-2 text-white">{lastResult.score}</div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${gradeColor(lastResult.grade)}`}>
              等级 {lastResult.grade}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs ${lastResult.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
              {lastResult.passed ? '通关' : '未通关'}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <Stat label="最高温度" value={`${lastResult.maxTemp.toFixed(1)}℃`} />
            <Stat label="除霜超时" value={`${lastResult.totalOvertimeMin} 分`} />
            <Stat label="出库延误" value={`${lastResult.totalDelayMin} 分`} />
          </div>
        </div>

        <div className="col-span-8 card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display">扣分明细</div>
            <div className="text-xs text-white/50">共 {lastResult.events.length} 条</div>
          </div>
          <div className="space-y-2 max-h-72 scroll-y pr-2">
            {lastResult.events.map((e, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <div className="text-sm text-white/80">{e.detail}</div>
                  <div className="text-[11px] text-white/40">
                    {e.type === 'base' ? '基础' : e.type === 'bonus' ? '奖励' : e.type === 'overtime' ? '超时' : e.type === 'temp' ? '越阈' : '延误'}
                  </div>
                </div>
                <div className={`font-display ${e.value >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {e.value >= 0 ? '+' : ''}{e.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-display">评分回放</div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={() => setIdx(0)}><SkipBack size={14} /></button>
            <button className="btn-ghost" onClick={() => setPlaying(!playing)}>
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button className="btn-ghost" onClick={() => setIdx(lastSim.temperatureSeries.length - 1)}><SkipForward size={14} /></button>
            <div className="flex gap-1 ml-2">
              {[1, 2, 4, 8].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-1 rounded text-xs ${speed === s ? 'bg-[#2E5BFF] text-white' : 'bg-white/5 text-white/60'}`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="text-white/60">时间：{minutesToLabel(currentTime)}</span>
          <span className="text-white/40">{Math.round((idx / Math.max(1, lastSim.temperatureSeries.length - 1)) * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={lastSim.temperatureSeries.length - 1}
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          className="w-full accent-[#2E5BFF]"
        />

        <div className="mt-4 grid grid-cols-12 gap-4">
          <div className="col-span-6 space-y-2">
            <div className="text-xs text-white/50">当前温度</div>
            {materials.zones.map((z) => {
              const temp = currentTemps[z.id] ?? z.targetTemp;
              const layer = materials.tempLayers.find((l) => l.zoneId === z.id);
              const over = layer && temp > layer.tempCeiling;
              return (
                <div key={z.id} className="flex items-center justify-between p-2 bg-white/5 rounded">
                  <span className="text-sm text-white/70">{z.name}</span>
                  <span className={`font-display ${over ? 'text-red-400 alert-pulse px-2 rounded' : 'text-emerald-300'}`}>
                    {temp.toFixed(2)}℃
                  </span>
                </div>
              );
            })}
          </div>
          <div className="col-span-6 space-y-2">
            <div className="text-xs text-white/50">当前告警</div>
            <div className="max-h-40 scroll-y space-y-1">
              {lastSim.alerts
                .filter((a) => a.time <= currentTime)
                .slice(-10)
                .map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs p-2 bg-red-500/10 rounded">
                    <AlertTriangle size={12} className="text-red-400" />
                    <span className="text-white/50 w-14">{minutesToLabel(a.time)}</span>
                    <span className="text-red-300 w-10">{a.type === 'overtime' ? '超时' : a.type === 'temp' ? '越阈' : '延误'}</span>
                    <span className="text-white/80 truncate">{a.message}</span>
                  </div>
                ))}
              {lastSim.alerts.filter((a) => a.time <= currentTime).length === 0 && (
                <div className="text-xs text-white/40">暂无告警</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded p-2">
      <div className="text-white/50 text-[10px]">{label}</div>
      <div className="font-display text-sm text-white mt-0.5">{value}</div>
    </div>
  );
}

function gradeColor(g: string) {
  return g === 'S'
    ? 'bg-yellow-500/20 text-yellow-300'
    : g === 'A'
    ? 'bg-emerald-500/20 text-emerald-300'
    : g === 'B'
    ? 'bg-sky-500/20 text-sky-300'
    : g === 'C'
    ? 'bg-indigo-500/20 text-indigo-300'
    : g === 'D'
    ? 'bg-orange-500/20 text-orange-300'
    : 'bg-red-500/20 text-red-300';
}
