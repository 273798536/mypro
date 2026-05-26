import { SimulationParams, SimulationStatus } from '../types';
import { Play, Pause, RotateCcw, Square, Settings } from 'lucide-react';

interface ControlPanelProps {
  params: SimulationParams;
  status: SimulationStatus;
  progress: number;
  onParamsChange: (params: Partial<SimulationParams>) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  status,
  progress,
  onParamsChange,
  onStart,
  onPause,
  onResume,
  onReset,
}) => {
  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return '准备就绪';
      case 'running':
        return '运行中';
      case 'paused':
        return '已暂停';
      case 'completed':
        return '已完成';
      case 'error':
        return '错误';
      default:
        return status;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'idle':
        return 'text-gray-400';
      case 'running':
        return 'text-success-green';
      case 'paused':
        return 'text-warning-yellow';
      case 'completed':
        return 'text-ray-cyan';
      case 'error':
        return 'text-alert-red';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="w-full h-full flex flex-col glass-panel rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gravity-orange/20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display font-semibold text-gravity-orange flex items-center gap-2">
            <Settings size={20} />
            控制面板
          </h2>
          <span className={`text-sm font-mono ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        <div className="w-full bg-space-blue rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gravity-orange to-ray-cyan transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1 text-right font-mono">
          {Math.round(progress * 100)}%
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="space-y-4">
          <h3 className="text-sm font-display font-medium text-gray-300 border-b border-space-blue pb-2">
            物理参数
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-400">黑洞质量</label>
                <span className="text-sm font-mono text-gravity-orange">
                  {params.blackHoleMass.toFixed(1)} M☉
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="0.5"
                value={params.blackHoleMass}
                onChange={(e) =>
                  onParamsChange({ blackHoleMass: parseFloat(e.target.value) })
                }
                disabled={status === 'running'}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>1</span>
                <span className="text-alert-red">80+ 危险</span>
                <span>100</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-400">光线数量</label>
                <span className="text-sm font-mono text-ray-cyan">
                  {params.rayCount} 条
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="200"
                step="1"
                value={params.rayCount}
                onChange={(e) =>
                  onParamsChange({ rayCount: parseInt(e.target.value) })
                }
                disabled={status === 'running'}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>10</span>
                <span>100</span>
                <span>200</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-400">碰撞参数</label>
                <span className="text-sm font-mono text-ray-cyan">
                  {params.rayImpactParameter.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="30"
                step="0.5"
                value={params.rayImpactParameter}
                onChange={(e) =>
                  onParamsChange({ rayImpactParameter: parseFloat(e.target.value) })
                }
                disabled={status === 'running'}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>3</span>
                <span>15</span>
                <span>30</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-400">光线角度范围</label>
                <span className="text-sm font-mono text-ray-cyan">
                  {params.rayAngleRange.toFixed(0)}°
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="180"
                step="5"
                value={params.rayAngleRange}
                onChange={(e) =>
                  onParamsChange({ rayAngleRange: parseFloat(e.target.value) })
                }
                disabled={status === 'running'}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-display font-medium text-gray-300 border-b border-space-blue pb-2">
            计算设置
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-400">积分步数</label>
                <span className="text-sm font-mono text-warning-yellow">
                  {params.integrationSteps.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="500"
                max="5000"
                step="100"
                value={params.integrationSteps}
                onChange={(e) =>
                  onParamsChange({ integrationSteps: parseInt(e.target.value) })
                }
                disabled={status === 'running'}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-400">积分步长</label>
                <span className="text-sm font-mono text-warning-yellow">
                  {params.stepSize.toFixed(3)}
                </span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.5"
                step="0.005"
                value={params.stepSize}
                onChange={(e) =>
                  onParamsChange({ stepSize: parseFloat(e.target.value) })
                }
                disabled={status === 'running'}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-display font-medium text-gray-300 border-b border-space-blue pb-2">
            显示选项
          </h3>

          <div className="space-y-2">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                显示网格
              </span>
              <div
                className={`w-10 h-5 rounded-full transition-colors ${
                  params.showGrid ? 'bg-gravity-orange' : 'bg-space-blue'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform mt-0.5 ${
                    params.showGrid ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
              <input
                type="checkbox"
                checked={params.showGrid}
                onChange={(e) => onParamsChange({ showGrid: e.target.checked })}
                className="sr-only"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                显示事件视界
              </span>
              <div
                className={`w-10 h-5 rounded-full transition-colors ${
                  params.showEventHorizon ? 'bg-gravity-orange' : 'bg-space-blue'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform mt-0.5 ${
                    params.showEventHorizon ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
              <input
                type="checkbox"
                checked={params.showEventHorizon}
                onChange={(e) => onParamsChange({ showEventHorizon: e.target.checked })}
                className="sr-only"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                显示光子球
              </span>
              <div
                className={`w-10 h-5 rounded-full transition-colors ${
                  params.showPhotonSphere ? 'bg-gravity-orange' : 'bg-space-blue'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform mt-0.5 ${
                    params.showPhotonSphere ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
              <input
                type="checkbox"
                checked={params.showPhotonSphere}
                onChange={(e) => onParamsChange({ showPhotonSphere: e.target.checked })}
                className="sr-only"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gravity-orange/20 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {status === 'idle' || status === 'completed' || status === 'error' ? (
            <button
              onClick={onStart}
              className="col-span-2 flex items-center justify-center gap-2 px-4 py-3 bg-gravity-orange hover:bg-gravity-orange/80 text-white rounded-lg font-display font-medium transition-all glow-orange hover:scale-105"
            >
              <Play size={20} />
              开始模拟
            </button>
          ) : status === 'running' ? (
            <button
              onClick={onPause}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-warning-yellow hover:bg-warning-yellow/80 text-space-black rounded-lg font-display font-medium transition-all"
            >
              <Pause size={20} />
              暂停
            </button>
          ) : (
            <button
              onClick={onResume}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-success-green hover:bg-success-green/80 text-space-black rounded-lg font-display font-medium transition-all"
            >
              <Play size={20} />
              继续
            </button>
          )}

          <button
            onClick={onReset}
            disabled={status === 'idle'}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-space-blue hover:bg-space-blue/80 text-gray-300 rounded-lg font-display font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw size={18} />
            重置
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
