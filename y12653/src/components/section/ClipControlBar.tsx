import { RotateCcw, Scissors } from 'lucide-react';
import { useReactorStore } from '@/store/useReactorStore';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type Axis = 'x' | 'y' | 'z';

const axisLabels: Record<Axis, string> = {
  x: 'X 轴',
  y: 'Y 轴',
  z: 'Z 轴',
};

const axisColors: Record<Axis, string> = {
  x: 'text-accent-red',
  y: 'text-accent-green',
  z: 'text-accent-orange',
};

export default function ClipControlBar() {
  const clipPlanes = useReactorStore((s) => s.clipPlanes);
  const setClip = useReactorStore((s) => s.setClip);
  const toggleClipEnabled = useReactorStore((s) => s.toggleClipEnabled);
  const resetClip = useReactorStore((s) => s.resetClip);

  const axes: Axis[] = ['x', 'y', 'z'];

  return (
    <div className="glass absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-4 flex items-center gap-6">
      <div className="flex items-center gap-4">
        {axes.map((axis) => (
          <div key={axis} className="flex items-center gap-3">
            <span className={cn('text-sm font-medium w-10', axisColors[axis])}>
              {axisLabels[axis]}
            </span>
            <input
              type="range"
              min={-3}
              max={3}
              step={0.05}
              value={clipPlanes[axis]}
              onChange={(e) => setClip(axis, parseFloat(e.target.value))}
              disabled={!clipPlanes.enabled}
              className="w-32 accent-orange-500 disabled:opacity-40"
            />
            <span className="text-xs font-mono text-steel-100 w-12 text-right">
              {clipPlanes[axis].toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className="h-8 w-px bg-white/10" />

      <div className="flex items-center gap-2">
        <Button
          variant={clipPlanes.enabled ? 'primary' : 'outline'}
          size="sm"
          onClick={toggleClipEnabled}
        >
          <Scissors className="w-4 h-4 mr-1.5" />
          {clipPlanes.enabled ? '剖切中' : '启用剖切'}
        </Button>
        <Button variant="ghost" size="sm" onClick={resetClip}>
          <RotateCcw className="w-4 h-4 mr-1.5" />
          重置
        </Button>
      </div>
    </div>
  );
}
