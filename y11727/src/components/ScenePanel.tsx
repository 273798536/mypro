import { useStore } from '@/store';
import { formatRe, formatVelocity, diameterToMeters } from '@/lib/sedimentation';
import { Camera, FileDown, Info } from 'lucide-react';
import { downloadPNG } from '@/lib/export';
import { downloadCSV } from '@/lib/export';

interface Props {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  children?: React.ReactNode;
}

export default function ScenePanel({ canvasRef, children }: Props) {
  const { samples, selectedId, banner } = useStore();
  const sample = samples.find((s) => s.id === selectedId) ?? samples[0] ?? null;

  const onScreenshot = () => {
    const c = canvasRef.current;
    if (!c) return;
    downloadPNG(c, `sedimentation-${Date.now()}.png`);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f1f]/80 border border-cyan-500/20 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-cyan-500/20 bg-cyan-950/40">
        <Info className="w-4 h-4 text-cyan-300" />
        <span className="text-xs text-cyan-200 font-mono">scene · sink</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => downloadCSV(samples)}
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10"
          >
            <FileDown className="w-3 h-3" /> CSV
          </button>
          <button
            onClick={onScreenshot}
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10"
          >
            <Camera className="w-3 h-3" /> PNG
          </button>
        </div>
      </div>
      {banner && (
        <div
          className={`px-3 py-1.5 text-[11px] font-mono border-b ${
            banner.level === 'error'
              ? 'bg-red-500/15 border-red-500/40 text-red-200'
              : 'bg-amber-500/15 border-amber-500/40 text-amber-200'
          }`}
        >
          {banner.level === 'error' ? '❌' : '⚠'} {banner.text}
        </div>
      )}
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0">{children}</div>
        {sample && (
          <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-cyan-200 bg-black/40 border border-cyan-500/20 rounded px-2 py-1 pointer-events-none">
            <span>d={sample.diameter.value}{sample.diameter.unit} ({diameterToMeters(sample.diameter.value, sample.diameter.unit).toExponential(2)} m)</span>
            <span>ρp={sample.particleDensity} kg/m³</span>
            <span>μ={sample.liquidViscosity} Pa·s</span>
            <span>T={sample.temperature ?? '缺失'} ℃</span>
            <span>H={sample.observationHeight} m</span>
            <span>v={formatVelocity(sample.stokesVelocity)}</span>
            <span>Re={formatRe(sample.reynolds)}</span>
            <span>src={sample.source}</span>
            {sample.corrections.length > 0 && (
              <span className="text-amber-300">修正: {sample.corrections.join('；')}</span>
            )}
          </div>
        )}
        {!sample && (
          <div className="absolute inset-0 flex items-center justify-center text-cyan-600/50 text-xs font-mono">
            请添加样本以开始
          </div>
        )}
      </div>
    </div>
  );
}
