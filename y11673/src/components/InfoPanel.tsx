import { useState } from 'react';
import { SimulationStats, SimulationError, SimulationParams, ParamRecord } from '../types';
import { X, AlertTriangle, Info, ChevronDown, ChevronUp, Database } from 'lucide-react';

interface InfoPanelProps {
  stats: SimulationStats;
  errors: SimulationError[];
  params: SimulationParams;
  records: ParamRecord[];
  onDismissError: (id: string) => void;
  onSaveRecord: () => void;
  onDeleteRecord: (id: string) => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({
  stats,
  errors,
  params,
  records,
  onDismissError,
  onSaveRecord,
  onDeleteRecord,
}) => {
  const [showErrors, setShowErrors] = useState(true);
  const [showRecords, setShowRecords] = useState(false);

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'parameter':
        return <AlertTriangle size={14} className="text-warning-yellow" />;
      case 'integration':
        return <AlertTriangle size={14} className="text-alert-red" />;
      case 'performance':
        return <Info size={14} className="text-ray-cyan" />;
      default:
        return <Info size={14} />;
    }
  };

  const getErrorBgColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-alert-red/20 border-alert-red/50';
      case 'error':
        return 'bg-alert-red/10 border-alert-red/30';
      case 'warning':
        return 'bg-warning-yellow/10 border-warning-yellow/30';
      default:
        return 'bg-space-blue/50 border-space-blue';
    }
  };

  return (
    <div className="w-full h-full flex flex-col glass-panel rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gravity-orange/20">
        <h2 className="text-lg font-display font-semibold text-gravity-orange">
          信息面板
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-space-black/50 rounded-lg p-3 border border-space-blue">
          <h3 className="text-sm font-display font-medium text-gray-300 mb-3">
            统计数据
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-space-blue/50 rounded p-2">
              <p className="text-gray-500 text-xs">总光线</p>
              <p className="text-ray-cyan font-mono text-lg">{stats.totalRays}</p>
            </div>
            <div className="bg-space-blue/50 rounded p-2">
              <p className="text-gray-500 text-xs">已吞噬</p>
              <p className="text-alert-red font-mono text-lg">{stats.absorbedRays}</p>
            </div>
            <div className="bg-space-blue/50 rounded p-2">
              <p className="text-gray-500 text-xs">已逃逸</p>
              <p className="text-success-green font-mono text-lg">{stats.escapedRays}</p>
            </div>
            <div className="bg-space-blue/50 rounded p-2">
              <p className="text-gray-500 text-xs">错误</p>
              <p className="text-warning-yellow font-mono text-lg">{stats.errorRays}</p>
            </div>
            <div className="bg-space-blue/50 rounded p-2">
              <p className="text-gray-500 text-xs">平均步数</p>
              <p className="text-gray-300 font-mono text-lg">{stats.averageSteps.toFixed(0)}</p>
            </div>
            <div className="bg-space-blue/50 rounded p-2">
              <p className="text-gray-500 text-xs">计算耗时</p>
              <p className="text-gray-300 font-mono text-lg">{formatTime(stats.totalComputationTime)}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between bg-space-blue/30 rounded p-2">
            <span className="text-gray-500 text-xs">帧率</span>
            <span className={`font-mono ${stats.fps < 30 ? 'text-alert-red' : 'text-success-green'}`}>
              {stats.fps.toFixed(1)} FPS
            </span>
          </div>
        </div>

        <div>
          <button
            onClick={() => setShowErrors(!showErrors)}
            className="w-full flex items-center justify-between p-2 bg-space-blue/50 rounded hover:bg-space-blue/70 transition-colors"
          >
            <span className="text-sm text-gray-300 flex items-center gap-2">
              <AlertTriangle size={14} />
              异常信息
              {errors.length > 0 && (
                <span className="bg-alert-red text-white text-xs px-1.5 py-0.5 rounded-full">
                  {errors.length}
                </span>
              )}
            </span>
            {showErrors ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showErrors && (
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {errors.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  暂无异常
                </p>
              ) : (
                errors.map((error) => (
                  <div
                    key={error.id}
                    className={`rounded-lg p-3 border ${getErrorBgColor(error.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        {getErrorIcon(error.type)}
                        <div>
                          <p className="text-sm text-gray-200">{error.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(error.timestamp).toLocaleTimeString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onDismissError(error.id)}
                        className="text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowRecords(!showRecords)}
              className="flex items-center justify-between p-2 bg-space-blue/50 rounded hover:bg-space-blue/70 transition-colors flex-1 mr-2"
            >
              <span className="text-sm text-gray-300 flex items-center gap-2">
                <Database size={14} />
                参数记录
                {records.length > 0 && (
                  <span className="bg-ray-cyan text-space-black text-xs px-1.5 py-0.5 rounded-full">
                    {records.length}
                  </span>
                )}
              </span>
              {showRecords ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button
              onClick={onSaveRecord}
              className="p-2 bg-gravity-orange/20 hover:bg-gravity-orange/30 text-gravity-orange rounded transition-colors"
              title="保存当前参数"
            >
              <Database size={16} />
            </button>
          </div>

          {showRecords && (
            <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
              {records.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  暂无参数记录
                </p>
              ) : (
                records.slice(0, 10).map((record) => (
                  <div
                    key={record.id}
                    className="bg-space-blue/30 rounded-lg p-3 border border-space-blue"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-gray-300 font-mono">
                          {new Date(record.timestamp).toLocaleString('zh-CN')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          质量: {record.params.blackHoleMass}M☉ | 光线: {record.params.rayCount}条
                        </p>
                        {record.note && (
                          <p className="text-xs text-ray-cyan mt-1">{record.note}</p>
                        )}
                      </div>
                      <button
                        onClick={() => onDeleteRecord(record.id)}
                        className="text-gray-500 hover:text-alert-red transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="bg-space-black/50 rounded-lg p-3 border border-space-blue">
          <h3 className="text-sm font-display font-medium text-gray-300 mb-2">
            当前参数
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">黑洞质量:</span>
              <span className="text-gravity-orange">{params.blackHoleMass} M☉</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">光线数量:</span>
              <span className="text-ray-cyan">{params.rayCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">积分步数:</span>
              <span className="text-warning-yellow">{params.integrationSteps}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">步长:</span>
              <span className="text-warning-yellow">{params.stepSize}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;
