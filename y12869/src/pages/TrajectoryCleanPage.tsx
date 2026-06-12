import { useState } from 'react';
import { useCleanRuleExecutor } from '@/hooks/useCleanRuleExecutor';
import { useAppStore } from '@/store/useAppStore';
import { Filter, Camera, Clock, GitCompare, Upload, ChevronLeft, ChevronRight, Settings, Play, X } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function TrajectoryCleanPage() {
  const { ruleChain, snapshots, currentSnapshotIndex, currentSnapshot, toggleRule, updateRuleParam,
    setCurrentSnapshotIndex, addInspectionPhoto, applyChain, lineGroups } = useCleanRuleExecutor();
  const photos = useAppStore(s => s.photos);
  const getAllPoints = useAppStore(s => s.getAllPoints);

  const [activeLineId, setActiveLineId] = useState<string>(() => lineGroups.keys().next().value || '');
  const activeLine = lineGroups.get(activeLineId) || [];
  const cleaned = applyChain(activeLine);

  const beforeAfterChart = activeLine.map((p, i) => ({
    idx: i,
    原始: +p.correctedDepth.toFixed(2),
    清洗后: +(cleaned[i]?.correctedDepth ?? p.correctedDepth).toFixed(2),
  }));

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const midIdx = Math.floor(activeLine.length / 2);
      const ref = activeLine[midIdx];
      addInspectionPhoto({
        photoId: `PH-UPLOAD-${Date.now()}`,
        uploadedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        gpsX: ref?.gpsX || 0,
        gpsY: ref?.gpsY || 0,
        photoTime: ref?.measureTime || new Date().toISOString(),
        relatedPointId: ref?.pointId,
        caption: `巡检照片 - ${file.name}`,
        dataUrl: (evt.target?.result as string) || '',
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-5 gap-5">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-serif font-bold text-white/95">轨迹清洗中心</h1>
          <p className="text-xs text-channel-muted mt-1">调整清洗规则，补录巡检照片，查看任意时刻历史快照</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="btn-warning inline-flex items-center gap-2 cursor-pointer">
            <Camera className="w-4 h-4" />
            <span>补录巡检照片</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
          <div className="chip-blue">已关联照片 {photos.length} 张</div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5 flex-1 min-h-0">
        <div className="col-span-4 card p-4 flex flex-col gap-4 overflow-auto scrollbar-thin">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-ocean-400" />
              <span className="text-sm font-semibold">清洗规则链</span>
              <span className="chip-gray ml-auto">{ruleChain.appliedAt}</span>
            </div>
            <div className="flex gap-1 items-center mb-4">
              {ruleChain.rules.map((r, idx) => (
                <div key={r.ruleId} className="flex items-center gap-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold border transition-all
                    ${r.enabled ? 'bg-ocean-700/40 border-ocean-500 text-ocean-200' : 'bg-channel-card border-channel-border text-channel-muted'}`}
                    title={r.name}
                  >{idx + 1}</div>
                  {idx < ruleChain.rules.length - 1 && (
                    <div className={`w-4 h-0.5 ${r.enabled ? 'bg-ocean-500' : 'bg-channel-border'}`} />
                  )}
                </div>
              ))}
              <Play className="w-4 h-4 ml-2 text-emerald-400" />
            </div>

            <div className="space-y-2.5">
              {ruleChain.rules.map(rule => (
                <div key={rule.ruleId} className={`rounded-lg border p-3 transition-all ${rule.enabled ? 'border-ocean-600/50 bg-ocean-900/20' : 'border-channel-border opacity-70'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={rule.enabled}
                        onChange={(e) => toggleRule(rule.ruleId, e.target.checked)}
                      />
                      <div className="w-9 h-5 bg-channel-border rounded-full peer peer-checked:bg-ocean-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                    </label>
                    <span className="text-sm font-medium flex-1">{rule.name}</span>
                    <Settings className="w-3.5 h-3.5 text-channel-muted" />
                  </div>
                  {rule.enabled && Object.entries(rule.params).map(([k, v]) => (
                    <div key={k} className="pl-11 pr-1 mt-2">
                      <div className="flex items-center justify-between text-[11px] text-channel-muted mb-1">
                        <span>{k === 'sigma' ? 'σ 倍数' : k === 'windowSize' ? '窗口长度' : k === 'processNoise' ? '过程噪声' : k === 'measureNoise' ? '测量噪声' : k === 'maxDriftMeters' ? '最大偏航(m)' : k}</span>
                        <span className="font-mono text-ocean-300">{v}</span>
                      </div>
                      <Slider.Root
                        className="radix-slider-track h-4"
                        min={k === 'sigma' ? 1 : k === 'windowSize' ? 3 : 0.001}
                        max={k === 'sigma' ? 6 : k === 'windowSize' ? 21 : k === 'maxDriftMeters' ? 50 : 0.2}
                        step={k === 'windowSize' ? 2 : k === 'maxDriftMeters' ? 1 : 0.001}
                        value={[v]}
                        onValueChange={(val) => updateRuleParam(rule.ruleId, k, val[0])}
                      >
                        <Slider.Track className="relative h-1 bg-channel-border rounded-full w-full">
                          <Slider.Range className="absolute bg-ocean-500 h-full rounded-full" />
                        </Slider.Track>
                        <Slider.Thumb className="radix-slider-thumb" />
                      </Slider.Root>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Upload className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold">测线选择</span>
            </div>
            <select
              value={activeLineId}
              onChange={(e) => setActiveLineId(e.target.value)}
              className="w-full px-3 py-2 rounded bg-channel-card border border-channel-border text-sm focus:outline-none focus:border-ocean-500"
            >
              {[...lineGroups.keys()].map(lid => (
                <option key={lid} value={lid}>{lid} · {lineGroups.get(lid)?.length} 测点</option>
              ))}
            </select>
          </div>
        </div>

        <div className="col-span-8 flex flex-col gap-4 min-h-0">
          <div className="card p-4 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <GitCompare className="w-4 h-4 text-ocean-400" />
              <span className="text-sm font-semibold">轨迹对比：原始 vs 清洗后</span>
              <span className="chip-gray ml-auto">{activeLineId}</span>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={beforeAfterChart} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="idx" stroke="#64748B" fontSize={11} label={{ value: '测点序号', position: 'insideBottom', offset: -10, fill: '#64748B', fontSize: 11 }} />
                  <YAxis stroke="#64748B" fontSize={11} label={{ value: '深度 (m)', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#CBD5E1' }}
                    labelStyle={{ color: '#94A3B8' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#CBD5E1' }} />
                  <Line type="monotone" dataKey="原始" stroke="#F59E0B" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="清洗后" stroke="#10B981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-4 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-ocean-400" />
              <span className="text-sm font-semibold">快照时间轴（历史回看）</span>
              <div className="chip-gray ml-auto">
                当前 #{currentSnapshotIndex + 1} / {snapshots.length}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentSnapshotIndex(Math.max(0, currentSnapshotIndex - 1))}
                disabled={currentSnapshotIndex === 0}
                className="p-2 rounded bg-channel-card border border-channel-border text-channel-muted hover:text-channel-text hover:bg-ocean-700/30 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 relative h-14 bg-channel-bg rounded border border-channel-border overflow-hidden">
                <div className="absolute inset-x-0 top-0 bottom-0 flex">
                  {snapshots.map((snap, idx) => {
                    const widthPct = 100 / snapshots.length;
                    const isTrigger = snap.trigger !== 'initial';
                    const isActive = idx === currentSnapshotIndex;
                    return (
                      <button
                        key={snap.snapshotId}
                        onClick={() => setCurrentSnapshotIndex(idx)}
                        style={{ width: `${widthPct}%` }}
                        className={`relative h-full transition-all border-r last:border-r-0 border-channel-border/50 group
                          ${isActive ? 'bg-ocean-700/50' : 'hover:bg-ocean-900/40'}`}
                        title={`${snap.timestamp} · ${snap.trigger} · Δ${snap.diffCount}`}
                      >
                        {isTrigger && (
                          <div className={`absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full
                            ${snap.trigger === 'photoAdded' ? 'bg-amber-400' : snap.trigger === 'ruleChanged' ? 'bg-blue-400' : 'bg-purple-400'}
                            ${isActive ? 'ring-2 ring-white' : ''}`}
                          />
                        )}
                        <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono whitespace-nowrap
                          ${isActive ? 'text-white' : 'text-channel-muted group-hover:text-channel-text'}`}
                        >
                          #{idx + 1}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => setCurrentSnapshotIndex(Math.min(snapshots.length - 1, currentSnapshotIndex + 1))}
                disabled={currentSnapshotIndex === snapshots.length - 1}
                className="p-2 rounded bg-channel-card border border-channel-border text-channel-muted hover:text-channel-text hover:bg-ocean-700/30 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {currentSnapshot && (
              <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded bg-channel-bg/60 border border-channel-border">
                  <div className="label-muted">触发方式</div>
                  <div className="font-semibold mt-0.5 text-ocean-300">
                    {currentSnapshot.trigger === 'initial' ? '初始清洗' :
                      currentSnapshot.trigger === 'photoAdded' ? '照片补录' :
                      currentSnapshot.trigger === 'ruleChanged' ? '规则变更' : '手动触发'}
                  </div>
                </div>
                <div className="p-2 rounded bg-channel-bg/60 border border-channel-border">
                  <div className="label-muted">时间戳</div>
                  <div className="font-mono text-[11px] mt-0.5">{currentSnapshot.timestamp.split(' ')[1]}</div>
                </div>
                <div className="p-2 rounded bg-channel-bg/60 border border-channel-border">
                  <div className="label-muted">变更点数</div>
                  <div className="font-mono font-semibold mt-0.5 text-amber-300">{currentSnapshot.diffCount}</div>
                </div>
                <div className="p-2 rounded bg-channel-bg/60 border border-channel-border">
                  <div className="label-muted">关联照片</div>
                  <div className="font-mono font-semibold mt-0.5 text-emerald-300">{currentSnapshot.triggerPhotoIds?.length || 0} 张</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
