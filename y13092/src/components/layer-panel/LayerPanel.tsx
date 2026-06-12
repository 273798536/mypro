import { useAppStore } from '@/store/useAppStore';
import { Layers, Eye, EyeOff, Globe } from 'lucide-react';

const coordSystemLabels: Record<string, string> = {
  bj54: '北京54',
  wgs84: 'WGS84',
  local: '局部坐标',
  unknown: '未知坐标系',
};

const coordSystemColors: Record<string, string> = {
  bj54: 'text-green-400',
  wgs84: 'text-blue-400',
  local: 'text-yellow-400',
  unknown: 'text-red-400',
};

export default function LayerPanel() {
  const { layers, toggleLayer, setLayerOpacity } = useAppStore();

  const mixedCoords = new Set(layers.filter((l) => l.visible).map((l) => l.coordinateSystem));
  const hasMixedCoords = mixedCoords.size > 1;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 h-full flex flex-col">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
        <Layers size={16} className="text-slate-400" />
        <span className="text-sm font-medium text-slate-200">图层控制</span>
      </div>

      {hasMixedCoords && (
        <div className="mx-3 mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400 flex items-start gap-2">
          <Globe size={14} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">坐标系混杂警告</p>
            <p className="mt-1 text-yellow-400/70">
              当前显示 {mixedCoords.size} 种坐标系，叠加结果仅供参考
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`p-3 rounded border transition-colors ${
              layer.visible
                ? 'bg-slate-700/50 border-slate-600'
                : 'bg-slate-800/50 border-slate-700/50 opacity-60'
            }`}
          >
            <div className="flex items-start gap-2">
              <button
                onClick={() => toggleLayer(layer.id)}
                className="mt-0.5 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>

              <div
                className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                style={{ backgroundColor: layer.color }}
              />

              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">{layer.name}</p>
                <p className={`text-xs mt-0.5 ${coordSystemColors[layer.coordinateSystem]}`}>
                  {coordSystemLabels[layer.coordinateSystem]}
                </p>
              </div>
            </div>

            {layer.visible && (
              <div className="mt-3 pl-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-8">透明度</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={layer.opacity}
                    onChange={(e) =>
                      setLayerOpacity(layer.id, parseFloat(e.target.value))
                    }
                    className="flex-1 h-1 bg-slate-600 rounded-full appearance-none cursor-pointer"
                  />
                  <span className="text-xs text-slate-400 w-8 text-right">
                    {(layer.opacity * 100).toFixed(0)}%
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-2 truncate">
                  来源: {layer.source}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          共 {layers.length} 个图层，{layers.filter((l) => l.visible).length} 个显示
        </p>
      </div>
    </div>
  );
}
