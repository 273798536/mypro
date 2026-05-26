import { useTrajectoryStore } from '@/store/useTrajectoryStore';
import { formatTrajectorySource } from '@/utils/errorFormatter';
import { convertFromMs } from '@/utils/unitConverter';
import { AlertTriangle, Flag, Mountain, Timer, Gauge } from 'lucide-react';

export function ResultDisplay() {
  const currentResult = useTrajectoryStore((s) => s.currentResult);

  if (!currentResult) {
    return null;
  }

  const r = currentResult;
  const p = r.params;

  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-golf-green">计算结果</h3>
        {r.landing.outOfBounds && (
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-golf-error/20 text-golf-error text-xs">
            <AlertTriangle size={12} />
            落点超界
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 p-2 rounded bg-golf-dark/50">
          <Flag size={14} className="text-golf-green" />
          <div>
            <div className="text-xs text-gray-500">总距离</div>
            <div className="text-lg font-bold text-golf-green font-display">
              {r.landing.distance.toFixed(1)}<span className="text-xs">m</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded bg-golf-dark/50">
          <Mountain size={14} className="text-golf-green" />
          <div>
            <div className="text-xs text-gray-500">最高点</div>
            <div className="text-lg font-bold text-golf-green font-display">
              {r.apex.height.toFixed(1)}<span className="text-xs">m</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded bg-golf-dark/50">
          <Timer size={14} className="text-golf-green" />
          <div>
            <div className="text-xs text-gray-500">飞行时间</div>
            <div className="text-lg font-bold text-golf-green font-display">
              {r.flightTime.toFixed(2)}<span className="text-xs">s</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded bg-golf-dark/50">
          <Gauge size={14} className="text-golf-green" />
          <div>
            <div className="text-xs text-gray-500">横向偏差</div>
            <div className={`text-lg font-bold font-display ${
              r.landing.x < 0 ? 'text-golf-error' : r.landing.x > 0 ? 'text-golf-warn' : 'text-golf-green'
            }`}>
              {r.landing.x.toFixed(1)}<span className="text-xs">m</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-gray-400">
          <span>飞行距离 (Carry)</span>
          <span className="text-gray-300">{r.landing.carry.toFixed(1)} m</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>滚动距离 (Roll)</span>
          <span className="text-gray-300">{r.landing.roll.toFixed(1)} m</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>落点坐标</span>
          <span className="text-gray-300">X: {r.landing.x.toFixed(1)}, Z: {r.landing.z.toFixed(1)}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-golf-teal/20 text-xs text-gray-500">
        <div>来源: {formatTrajectorySource(p.source)}</div>
        <div>计算耗时: {r.calculationTime.toFixed(1)}ms</div>
      </div>

      {r.landing.outOfBounds && r.landing.outOfBoundsReason && (
        <div className="mt-3 p-2 rounded bg-golf-error/10 border border-golf-error/30 text-xs text-golf-error">
          ⚠️ {r.landing.outOfBoundsReason}
        </div>
      )}
    </div>
  );
}
