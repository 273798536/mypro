import { useTideWatcher } from '@/hooks/useTideWatcher';
import { Waves, AlertCircle, CheckCircle, RefreshCw, Clock, GitBranch, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';

const LEVEL_COLORS = {
  critical: { chip: 'chip-red', label: '严重影响' },
  major: { chip: 'chip-orange', label: '较重影响' },
  minor: { chip: 'chip-blue', label: '轻微影响' },
};

export default function TideImpactPage() {
  const { currentVersion, impacts, groupedImpacts, countdown, syncTideVersion } = useTideWatcher();

  const tideChartData = currentVersion?.records.map(r => ({
    time: r.time.split(' ')[1]?.slice(0, 5) || r.time,
    潮高: r.height,
    类型: r.type,
  })) || [];

  if (!currentVersion) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-channel-muted">加载潮汐数据中…</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-5 gap-5">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-serif font-bold text-white/95">潮汐影响追踪</h1>
          <p className="text-xs text-channel-muted mt-1">延迟不覆盖旧结论，透明化展示影响范围与恢复条件</p>
        </div>
        <div className="flex items-center gap-2">
          {currentVersion.status === 'delayed' && countdown && (
            <div className="chip-orange text-base py-1 px-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="font-mono tabular-nums">
                预计恢复 {String(countdown.h).padStart(2, '0')}:{String(countdown.m).padStart(2, '0')}:{String(countdown.s).padStart(2, '0')}
              </span>
            </div>
          )}
          <button onClick={syncTideVersion} className="btn-primary inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            <span>模拟同步</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5 flex-1 min-h-0 overflow-hidden">
        <div className="col-span-5 flex flex-col gap-5 min-h-0">
          <div className="card p-4 shrink-0">
            <div className="flex items-start gap-3 mb-3">
              {currentVersion.status === 'synchronized' ? (
                <CheckCircle className="w-6 h-6 text-emerald-400 mt-0.5 shrink-0" />
              ) : currentVersion.status === 'delayed' ? (
                <div className="relative shrink-0">
                  <AlertCircle className="w-6 h-6 text-amber-400 mt-0.5" />
                  <div className="absolute inset-0 animate-ripple">
                    <AlertCircle className="w-6 h-6 text-amber-400 mt-0.5 opacity-40" />
                  </div>
                </div>
              ) : (
                <AlertCircle className="w-6 h-6 text-red-400 mt-0.5 shrink-0" />
              )}
              <div>
                <div className={`text-base font-semibold ${currentVersion.status === 'synchronized' ? 'text-emerald-300' : currentVersion.status === 'delayed' ? 'text-amber-300' : 'text-red-300'}`}>
                  {currentVersion.status === 'synchronized' ? '潮汐表已同步' : currentVersion.status === 'delayed' ? `潮汐表延迟 ${currentVersion.delayHours} 小时` : '潮汐表缺失'}
                </div>
                <div className="text-xs text-channel-muted mt-0.5">
                  版本 {currentVersion.tideVersionId} · 发布 {currentVersion.publishTime} · 生效 {currentVersion.effectiveTime}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded bg-channel-bg/60 border border-channel-border">
                <div className="label-muted">记录条数</div>
                <div className="font-mono font-semibold mt-1 text-lg">{currentVersion.records.length}</div>
              </div>
              <div className="p-2.5 rounded bg-channel-bg/60 border border-channel-border">
                <div className="label-muted">最高潮</div>
                <div className="font-mono font-semibold mt-1 text-lg text-blue-300">{Math.max(...currentVersion.records.map(r => r.height)).toFixed(2)} m</div>
              </div>
              <div className="p-2.5 rounded bg-channel-bg/60 border border-channel-border">
                <div className="label-muted">最低潮</div>
                <div className="font-mono font-semibold mt-1 text-lg text-amber-300">{Math.min(...currentVersion.records.map(r => r.height)).toFixed(2)} m</div>
              </div>
            </div>
          </div>

          <div className="card p-4 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <TrendingUp className="w-4 h-4 text-ocean-400" />
              <span className="text-sm font-semibold">潮位曲线（36h）</span>
              {currentVersion.status === 'delayed' && (
                <span className="chip-orange ml-auto">含 3h 预报段</span>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tideChartData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                  <defs>
                    <linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#64748B" fontSize={10} interval={Math.floor(tideChartData.length / 10)} />
                  <YAxis stroke="#64748B" fontSize={11} label={{ value: '潮高 (m)', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#CBD5E1' }}
                  />
                  {currentVersion.status === 'delayed' && (
                    <ReferenceLine x={tideChartData[Math.floor(tideChartData.length * 0.5)]?.time} stroke="#F59E0B" strokeDasharray="5 3" label={{ value: '实际截止', fill: '#F59E0B', fontSize: 10 }} />
                  )}
                  <Area type="monotone" dataKey="潮高" stroke="#3B82F6" strokeWidth={2} fill="url(#tideGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-span-7 card p-4 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <GitBranch className="w-4 h-4 text-ocean-400" />
            <span className="text-sm font-semibold">受影响结论清单（不覆盖原结论）</span>
            <span className="chip-red ml-auto">{impacts.length} 项</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4 text-xs shrink-0">
            {(['critical', 'major', 'minor'] as const).map(level => (
              <div key={level} className={`p-2.5 rounded border ${LEVEL_COLORS[level].chip.includes('red') ? 'severity-red' : LEVEL_COLORS[level].chip.includes('orange') ? 'severity-orange' : 'severity-blue'}`}>
                <div className="flex items-center justify-between">
                  <span className="opacity-80">{LEVEL_COLORS[level].label}</span>
                  <span className="font-mono font-bold text-lg">{groupedImpacts[level].length}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-auto scrollbar-thin space-y-3 pr-1">
            {impacts.map(imp => {
              const cfg = LEVEL_COLORS[imp.impactLevel];
              return (
                <div key={imp.impactId} className={`rounded-lg border p-4 ${imp.impactLevel === 'critical' ? 'severity-red' : imp.impactLevel === 'major' ? 'severity-orange' : 'severity-blue'} transition-all hover:shadow-card-hover`}>
                  <div className="flex items-start gap-3 mb-3">
                    <span className={`${cfg.chip} shrink-0`}>{cfg.label}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{imp.conclusionDesc}</div>
                      <div className="text-[11px] text-channel-muted mt-0.5 font-mono">
                        {imp.conclusionId} · 关联 {imp.relatedAnomalyId || '全局'}
                      </div>
                    </div>
                    {imp.estRecoverTime && (
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-channel-muted">预计恢复</div>
                        <div className="text-xs font-mono">{imp.estRecoverTime.split(' ')[1]}</div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded bg-slate-500/10 border border-slate-500/30 relative">
                      <div className="flex items-center gap-1 mb-1.5">
                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                        <span className="text-[11px] uppercase tracking-wider text-slate-400">原结论（保留）</span>
                      </div>
                      <div className="text-xs text-slate-200/80 line-through decoration-slate-500 decoration-2 leading-relaxed">
                        {imp.originalValue}
                      </div>
                      <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-600/50 pt-1.5">
                        <span className="text-slate-400">依据：</span>{imp.originalBasis}
                      </div>
                    </div>

                    <div className="p-3 rounded bg-amber-500/15 border border-amber-500/40 relative">
                      <div className="absolute -top-1.5 -right-1.5 chip-orange text-[9px] py-0 px-1.5">临时</div>
                      <div className="flex items-center gap-1 mb-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-[11px] uppercase tracking-wider text-amber-300">临时结论</span>
                      </div>
                      <div className="text-xs text-amber-100 italic leading-relaxed">
                        {imp.tempValue}
                      </div>
                      <div className="mt-2 text-[10px] text-amber-300/70 border-t border-amber-500/30 pt-1.5">
                        <span className="text-amber-200/80">依据：</span>{imp.tempBasis}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-xs">
                    <Waves className="w-3.5 h-3.5 text-ocean-400 shrink-0" />
                    <span className="text-channel-muted">恢复条件：</span>
                    <span className="text-channel-text flex-1">{imp.recoverCondition}</span>
                  </div>
                </div>
              );
            })}

            {impacts.length === 0 && (
              <div className="text-center py-12 text-channel-muted">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400/50" />
                <div>当前无受影响的结论</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
