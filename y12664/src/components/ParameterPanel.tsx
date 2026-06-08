import { useLayoutStore } from '@/hooks/useLayoutStore';
import type { LayoutConfig } from '@/types';
import { RefreshCcw } from 'lucide-react';

const fields: { key: keyof Omit<LayoutConfig, 'bounds'>; label: string; min?: number; max?: number; step?: number }[] = [
  { key: 'rows', label: '行数', min: 1, max: 20, step: 1 },
  { key: 'cols', label: '列数', min: 1, max: 20, step: 1 },
  { key: 'layers', label: '层数', min: 1, max: 10, step: 1 },
  { key: 'spacingX', label: '列间距 X', min: 0.2, max: 5, step: 0.1 },
  { key: 'spacingY', label: '层间距 Y', min: 0.2, max: 5, step: 0.1 },
  { key: 'spacingZ', label: '行间距 Z', min: 0.2, max: 5, step: 0.1 },
];

export default function ParameterPanel() {
  const config = useLayoutStore((s) => s.config);
  const setConfig = useLayoutStore((s) => s.setConfig);
  const regenerateCages = useLayoutStore((s) => s.regenerateCages);

  const update = (key: keyof Omit<LayoutConfig, 'bounds'>, value: number) => {
    setConfig({ [key]: value } as Partial<LayoutConfig>);
  };

  return (
    <div className="bg-slate-900/70 backdrop-blur-sm border border-slate-700/60 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-slate-100 font-semibold tracking-wide text-sm">排布参数</h3>
        <button
          type="button"
          onClick={regenerateCages}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-slate-700/60 hover:bg-slate-600/70 text-slate-100 transition border border-slate-600/60"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          根据参数重算
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider">{f.label}</span>
            <input
              type="number"
              min={f.min}
              max={f.max}
              step={f.step}
              value={(config[f.key] as number) ?? 0}
              onChange={(e) => update(f.key, parseFloat(e.target.value) || 0)}
              className="mt-1 w-full bg-slate-800/80 border border-slate-700/80 rounded-md px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40"
            />
          </label>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-700/60">
        <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">排布边界</div>
        <div className="text-xs text-slate-300 font-mono leading-relaxed">
          X: [{config.bounds.minX}, {config.bounds.maxX}] &nbsp; Y: [{config.bounds.minY}, {config.bounds.maxY}] &nbsp; Z: [{config.bounds.minZ}, {config.bounds.maxZ}]
        </div>
      </div>
    </div>
  );
}
