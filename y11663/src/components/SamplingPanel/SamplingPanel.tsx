
import { Gauge, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { PressureField } from '../../types';
import { formatPressure } from '../../utils/colorMap';

interface SamplingPanelProps {
  pressureField: PressureField | null;
}

export function SamplingPanel({ pressureField }: SamplingPanelProps) {
  if (!pressureField) {
    return (
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold border-b border-slate-700 pb-2">
          <Gauge size={18} />
          <span>采样数据</span>
        </div>
        <div className="text-slate-400 text-sm py-8 text-center">
          暂无压力场数据
        </div>
      </div>
    );
  }

  const validPoints = pressureField.samplingPoints.filter((p) => p.isValid);
  const invalidPoints = pressureField.samplingPoints.filter((p) => !p.isValid);
  const upperPoints = pressureField.samplingPoints.filter(
    (p) => p.surface === 'upper' || p.surface === 'leading' || p.surface === 'trailing'
  );
  const lowerPoints = pressureField.samplingPoints.filter((p) => p.surface === 'lower');

  const getStatusIcon = (isValid: boolean) => {
    if (isValid) return <CheckCircle size={14} className="text-green-500" />;
    return <XCircle size={14} className="text-red-500" />;
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-cyan-400 font-semibold border-b border-slate-700 pb-2">
        <Gauge size={18} />
        <span>采样数据</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-slate-700/50 rounded p-2 text-center">
          <div className="text-slate-400">总采样点</div>
          <div className="text-white font-mono text-lg">{pressureField.samplingPoints.length}</div>
        </div>
        <div className="bg-green-900/30 rounded p-2 text-center">
          <div className="text-green-400">有效</div>
          <div className="text-green-300 font-mono text-lg">{validPoints.length}</div>
        </div>
        <div className="bg-red-900/30 rounded p-2 text-center">
          <div className="text-red-400">缺失</div>
          <div className="text-red-300 font-mono text-lg">{invalidPoints.length}</div>
        </div>
      </div>

      {pressureField.colorInverted && (
        <div className="flex items-center gap-2 bg-yellow-900/30 border border-yellow-700 rounded p-2 text-xs">
          <AlertTriangle size={14} className="text-yellow-500" />
          <span className="text-yellow-300">压力分布可能反转</span>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <div className="text-xs text-slate-400 mb-1">上表面压力</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {upperPoints.slice(0, 8).map((point) => (
              <div
                key={point.id}
                className="flex items-center justify-between text-xs bg-slate-700/30 rounded px-2 py-1"
              >
                <div className="flex items-center gap-1">
                  {getStatusIcon(point.isValid)}
                  <span className="text-slate-300">
                    x={(point.position.x * 100).toFixed(0)}%
                  </span>
                </div>
                <span className="font-mono text-cyan-300">
                  {formatPressure(point.pressure)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">下表面压力</div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {lowerPoints.map((point) => (
              <div
                key={point.id}
                className="flex items-center justify-between text-xs bg-slate-700/30 rounded px-2 py-1"
              >
                <div className="flex items-center gap-1">
                  {getStatusIcon(point.isValid)}
                  <span className="text-slate-300">
                    x={(point.position.x * 100).toFixed(0)}%
                  </span>
                </div>
                <span className="font-mono text-cyan-300">
                  {formatPressure(point.pressure)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-700">
        <div>
          <div className="text-slate-400">最小压力</div>
          <div className="text-blue-400 font-mono">
            {formatPressure(pressureField.minPressure)}
          </div>
        </div>
        <div>
          <div className="text-slate-400">最大压力</div>
          <div className="text-red-400 font-mono">
            {formatPressure(pressureField.maxPressure)}
          </div>
        </div>
      </div>
    </div>
  );
}
