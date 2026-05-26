import { useCompareStore } from '@/store/useCompareStore';
import { useTrajectoryStore } from '@/store/useTrajectoryStore';
import { formatTrajectorySource } from '@/utils/errorFormatter';
import { X, Minus } from 'lucide-react';

export function TrajectoryCompare() {
  const items = useCompareStore((s) => s.items);
  const removeFromCompare = useCompareStore((s) => s.removeFromCompare);
  const currentResult = useTrajectoryStore((s) => s.currentResult);

  if (items.length === 0) {
    return null;
  }

  const allItems = currentResult
    ? [...items, { id: 'current', color: '#32E0C4', result: currentResult, label: '当前' }]
    : items;

  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-golf-green">参数对比</h3>
        <span className="text-xs text-gray-500">{items.length + (currentResult ? 1 : 0)}/4</span>
      </div>

      <div className="space-y-3">
        {allItems.map((item) => {
          const p = item.result.params;
          const r = item.result;
          return (
            <div
              key={item.id}
              className="p-3 rounded-lg border"
              style={{ borderColor: `${item.color}40` }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-semibold" style={{ color: item.color }}>
                    {item.label}
                  </span>
                </div>
                {item.id !== 'current' && (
                  <button
                    onClick={() => removeFromCompare(item.id)}
                    className="p-1 rounded hover:bg-golf-error/20 text-gray-500 hover:text-golf-error transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-gray-500">球速</div>
                  <div className="text-golf-green">{p.ballSpeed}{p.ballSpeedUnit}</div>
                </div>
                <div>
                  <div className="text-gray-500">发射角</div>
                  <div className="text-golf-green">{p.launchAngle}°</div>
                </div>
                <div>
                  <div className="text-gray-500">后旋</div>
                  <div className="text-golf-green">{p.backspin}rpm</div>
                </div>
                <div>
                  <div className="text-gray-500">侧旋</div>
                  <div className="text-golf-green">{p.sidespin}rpm</div>
                </div>
                <div>
                  <div className="text-gray-500">总距离</div>
                  <div className="text-golf-green font-semibold">
                    {r.landing.distance.toFixed(0)}m
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">最高点</div>
                  <div className="text-golf-green">{r.apex.height.toFixed(1)}m</div>
                </div>
              </div>

              <div className="text-xs text-gray-500 mt-2">
                {formatTrajectorySource(p.source)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
