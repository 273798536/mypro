import { use3DSceneSync } from '@/hooks/use3DSceneSync';
import * as Slider from '@radix-ui/react-slider';
import { X, Move, Cylinder, ArrowRight, ArrowUp } from 'lucide-react';
import { useMemo } from 'react';

const PRESETS = [
  { orientation: 'x' as const, label: '纵切（沿航道）', icon: ArrowRight, defaultValue: 0, min: -5500, max: 5500, step: 10, unit: 'm（距中桩）' },
  { orientation: 'y' as const, label: '横切（沿宽度）', icon: ArrowUp, defaultValue: 0, min: -120, max: 120, step: 1, unit: 'm（航道宽度）' },
  { orientation: 'z' as const, label: '深度剖切', icon: Cylinder, defaultValue: -10, min: -80, max: 10, step: 0.5, unit: 'm（深度）' },
];

export function ClippingPlaneControl() {
  const { clipping, setClipping } = use3DSceneSync();
  const currentPreset = useMemo(
    () => clipping ? PRESETS.find(p => p.orientation === clipping.orientation) || PRESETS[0] : null,
    [clipping]
  );

  if (!clipping) {
    return (
      <div className="absolute right-4 bottom-4 flex flex-col gap-1.5 z-10">
        <div className="card p-2 backdrop-blur bg-channel-panel/70">
          <div className="label-muted mb-1.5 px-1">剖切工具</div>
          <div className="flex flex-col gap-1">
            {PRESETS.map(p => (
              <button
                key={p.orientation}
                onClick={() => setClipping({ orientation: p.orientation, value: p.defaultValue, enabled: true })}
                className="flex items-center gap-2 px-3 py-2 rounded hover:bg-ocean-700/40 text-xs transition-colors text-left"
              >
                <p.icon className="w-3.5 h-3.5 text-ocean-400" />
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-4 bottom-4 w-72 card backdrop-blur bg-channel-panel/90 p-3 z-10 shadow-card-hover">
      <div className="flex items-center gap-2 mb-3">
        <Move className="w-4 h-4 text-ocean-400" />
        <span className="text-sm font-semibold flex-1">{currentPreset?.label}</span>
        <button
          onClick={() => setClipping(null)}
          className="text-channel-muted hover:text-channel-text p-1 rounded hover:bg-channel-border/30"
          title="关闭剖切"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-channel-muted">
          <span>位置</span>
          <span className="font-mono ml-auto text-ocean-300">
            {clipping.value.toFixed(currentPreset?.step < 1 ? 1 : 0)}{currentPreset?.unit}
          </span>
        </div>
        <Slider.Root
          className="radix-slider-track h-5"
          min={currentPreset?.min || -1000}
          max={currentPreset?.max || 1000}
          step={currentPreset?.step || 1}
          value={[clipping.value]}
          onValueChange={(v) => setClipping({ ...clipping, value: v[0] })}
        >
          <Slider.Track className="relative h-1.5 bg-channel-border rounded-full flex-1 w-full">
            <Slider.Range className="absolute bg-ocean-500 h-full rounded-full" />
          </Slider.Track>
          <Slider.Thumb className="radix-slider-thumb" aria-label="位置" />
        </Slider.Root>
        <div className="flex gap-1 pt-1">
          {PRESETS.map(p => (
            <button
              key={p.orientation}
              onClick={() => setClipping({ orientation: p.orientation, value: p.defaultValue, enabled: true })}
              className={`flex-1 py-1 rounded text-[10px] border transition-colors
                ${p.orientation === clipping.orientation
                  ? 'bg-ocean-700/40 border-ocean-600 text-ocean-200'
                  : 'border-channel-border text-channel-muted hover:bg-channel-card'
                }`}
            >
              {p.label.split('（')[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
