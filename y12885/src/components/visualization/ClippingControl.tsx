import { Layers, RotateCcw, Maximize2, Minimize2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../../store';

export default function ClippingControl() {
  const { clippingPlanes, setClippingPlanes, resetClippingPlanes } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggleAxis = (axis: 'x' | 'y' | 'z') => {
    setClippingPlanes({
      [axis]: { ...clippingPlanes[axis], enabled: !clippingPlanes[axis].enabled }
    });
  };

  const handleValueChange = (axis: 'x' | 'y' | 'z', value: number) => {
    setClippingPlanes({
      [axis]: { ...clippingPlanes[axis], value }
    });
  };

  const activePlanesCount = [
    clippingPlanes.x.enabled,
    clippingPlanes.y.enabled,
    clippingPlanes.z.enabled
  ].filter(Boolean).length;

  const axisLabels = {
    x: { label: 'X轴', color: 'text-[#3E92CC]', bgColor: 'bg-[#3E92CC]' },
    y: { label: 'Y轴 (深度)', color: 'text-[#2ECC71]', bgColor: 'bg-[#2ECC71]' },
    z: { label: 'Z轴', color: 'text-[#F39C12]', bgColor: 'bg-[#F39C12]' },
  };

  return (
    <div className="absolute top-4 left-4 z-10">
      <div className="glass-panel overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-ocean-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-ocean-300" />
            <span className="text-sm font-medium text-ocean-100">剖面切割</span>
            {activePlanesCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-ocean-500 text-white rounded-full">
                {activePlanesCount}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-ocean-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-ocean-400" />
          )}
        </button>

        {isExpanded && (
          <div className="p-3 pt-0 space-y-3 border-t border-ocean-700/30">
            {(['x', 'y', 'z'] as const).map(axis => (
              <div key={axis} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clippingPlanes[axis].enabled}
                      onChange={() => handleToggleAxis(axis)}
                      className="w-4 h-4 rounded border-ocean-600 bg-ocean-900 text-ocean-500 focus:ring-ocean-500"
                    />
                    <span className={`text-sm ${axisLabels[axis].color}`}>
                      {axisLabels[axis].label}
                    </span>
                  </label>
                  <span className="text-xs font-mono text-ocean-300">
                    {clippingPlanes[axis].value.toFixed(1)}
                  </span>
                </div>
                {clippingPlanes[axis].enabled && (
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    step={0.5}
                    value={clippingPlanes[axis].value}
                    onChange={(e) => handleValueChange(axis, Number(e.target.value))}
                    className={`w-full accent-ocean-500 ${axisLabels[axis].bgColor}`}
                  />
                )}
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <button
                onClick={resetClippingPlanes}
                className="flex-1 btn-secondary text-xs py-1.5 flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重置
              </button>
            </div>

            <div className="pt-2 border-t border-ocean-700/30">
              <p className="text-xs text-ocean-400 mb-2">图例</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-[#3E92CC]" />
                  <span className="text-xs text-ocean-300">X轴切割面</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-[#2ECC71]" />
                  <span className="text-xs text-ocean-300">Y轴(深度)切割面</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-[#F39C12]" />
                  <span className="text-xs text-ocean-300">Z轴切割面</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
