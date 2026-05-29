import { useState, useCallback } from 'react';
import { Settings, Play, AlertTriangle, Activity } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { reduceDimensionality, runMultipleTimes } from '@/utils/dimReduction';
import type { ProjectionPoint } from '@/types';

const METHODS = [
  { value: 'pca' as const, label: 'PCA' },
  { value: 'tsne' as const, label: 't-SNE' },
  { value: 'umap' as const, label: 'UMAP' },
];

export default function ParamPanel() {
  const config = useStore((s) => s.config);
  const samples = useStore((s) => s.samples);
  const showOutliers = useStore((s) => s.showOutliers);
  const showInstability = useStore((s) => s.showInstability);
  const setConfig = useStore((s) => s.setConfig);
  const setProjections = useStore((s) => s.setProjections);
  const setInstabilityTrails = useStore((s) => s.setInstabilityTrails);
  const setShowOutliers = useStore((s) => s.setShowOutliers);
  const setShowInstability = useStore((s) => s.setShowInstability);

  const [loading, setLoading] = useState(false);

  const handleReproject = useCallback(async () => {
    if (samples.length === 0) return;
    setLoading(true);
    try {
      const vectors = samples.map((s) => s.vector);
      const points3d = await reduceDimensionality(vectors, config.method, config.params);
      const projections: ProjectionPoint[] = points3d.map((p, i) => ({
        sampleId: samples[i].id,
        x: p.x,
        y: p.y,
        z: p.z,
      }));
      setProjections(projections);
      if (showInstability) {
        const trails3d = await runMultipleTimes(vectors, config.method, config.params, 3);
        const trails: ProjectionPoint[][] = trails3d.map((run) =>
          run.map((p, i) => ({
            sampleId: samples[i].id,
            x: p.x,
            y: p.y,
            z: p.z,
          }))
        );
        setInstabilityTrails(trails);
      }
    } finally {
      setLoading(false);
    }
  }, [samples, config, showInstability, setProjections, setInstabilityTrails]);

  const handleInstabilityToggle = useCallback(async () => {
    const next = !showInstability;
    setShowInstability(next);
    if (next && samples.length > 0) {
      setLoading(true);
      try {
        const vectors = samples.map((s) => s.vector);
        const trails3d = await runMultipleTimes(vectors, config.method, config.params, 3);
        const trails: ProjectionPoint[][] = trails3d.map((run) =>
          run.map((p, i) => ({
            sampleId: samples[i].id,
            x: p.x,
            y: p.y,
            z: p.z,
          }))
        );
        setInstabilityTrails(trails);
      } finally {
        setLoading(false);
      }
    }
  }, [showInstability, samples, config, setShowInstability, setInstabilityTrails]);

  const updateParam = useCallback(
    (key: string, value: number) => {
      setConfig({ ...config, params: { ...config.params, [key]: value } });
    },
    [config, setConfig],
  );

  return (
    <div className="flex flex-col gap-5 bg-[#0f1629] border-r border-[#1a2040] p-4 min-w-[260px] text-white/80">
      <div className="flex items-center gap-2 text-sm font-semibold tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <Settings size={16} />
        <span>DR 参数</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-white/50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>方法</label>
        <select
          value={config.method}
          onChange={(e) => setConfig({ ...config, method: e.target.value as 'pca' | 'tsne' | 'umap', params: {} })}
          className="bg-[#1a2040] border border-[#2a3060] rounded-md px-2 py-1.5 text-sm text-white/90 outline-none focus:border-[#4d9fff] transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {config.method === 'tsne' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-white/50 flex justify-between" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <span>perplexity</span>
            <span className="text-white/70">{config.params.perplexity ?? 30}</span>
          </label>
          <input
            type="range"
            min={5}
            max={100}
            value={config.params.perplexity ?? 30}
            onChange={(e) => updateParam('perplexity', Number(e.target.value))}
            className="w-full accent-[#4d9fff] h-1.5 rounded-full appearance-none bg-[#1a2040] cursor-pointer"
          />
        </div>
      )}

      {config.method === 'umap' && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/50 flex justify-between" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <span>nNeighbors</span>
              <span className="text-white/70">{config.params.nNeighbors ?? 15}</span>
            </label>
            <input
              type="range"
              min={2}
              max={100}
              value={config.params.nNeighbors ?? 15}
              onChange={(e) => updateParam('nNeighbors', Number(e.target.value))}
              className="w-full accent-[#4d9fff] h-1.5 rounded-full appearance-none bg-[#1a2040] cursor-pointer"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/50 flex justify-between" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <span>minDist</span>
              <span className="text-white/70">{config.params.minDist ?? 0.1}</span>
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={config.params.minDist ?? 0.1}
              onChange={(e) => updateParam('minDist', Number(e.target.value))}
              className="w-full accent-[#4d9fff] h-1.5 rounded-full appearance-none bg-[#1a2040] cursor-pointer"
            />
          </div>
        </>
      )}

      <button
        onClick={handleReproject}
        disabled={loading || samples.length === 0}
        className="flex items-center justify-center gap-2 bg-[#4d9fff] hover:bg-[#3d8fee] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg py-2 transition-colors"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Play size={14} />
        )}
        重新投影
      </button>

      <div className="border-t border-[#1a2040] pt-4 flex flex-col gap-3">
        <button
          onClick={handleInstabilityToggle}
          disabled={loading}
          className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors ${
            showInstability
              ? 'bg-[#ff6b35]/15 border-[#ff6b35]/40 text-[#ff6b35]'
              : 'bg-transparent border-[#2a3060] text-white/60 hover:text-white/80 hover:border-[#3a4080]'
          }`}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <AlertTriangle size={14} />
          不稳定性检测
        </button>

        <button
          onClick={() => setShowOutliers(!showOutliers)}
          disabled={loading}
          className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors ${
            showOutliers
              ? 'bg-[#fbbf24]/15 border-[#fbbf24]/40 text-[#fbbf24]'
              : 'bg-transparent border-[#2a3060] text-white/60 hover:text-white/80 hover:border-[#3a4080]'
          }`}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <Activity size={14} />
          异常点偏移
        </button>
      </div>
    </div>
  );
}
