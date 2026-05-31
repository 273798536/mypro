import { useMemo } from 'react';
import { Settings, Play, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { formatAngleValue, formatTorqueValue } from '../utils/torqueEngine';

export const ParameterPanel = () => {
  const {
    robotConfig,
    angleData,
    loadData,
    torqueResults,
    selectedJointId,
    isCalculating,
    calculateTorque,
    clearAll,
  } = useAppStore();

  const selectedJoint = useMemo(() => {
    return robotConfig?.joints.find((j) => j.id === selectedJointId);
  }, [robotConfig, selectedJointId]);

  const selectedTorqueResult = useMemo(() => {
    return torqueResults.find((r) => r.jointId === selectedJointId);
  }, [torqueResults, selectedJointId]);

  const selectedAngleData = useMemo(() => {
    if (!angleData || !selectedJointId) return null;
    return angleData.data.filter((d) => d.jointId === selectedJointId);
  }, [angleData, selectedJointId]);

  const selectedLoadData = useMemo(() => {
    if (!loadData || !selectedJointId) return null;
    const jointIndex = robotConfig?.joints.findIndex((j) => j.id === selectedJointId);
    if (jointIndex === undefined || jointIndex === -1) return null;
    const link = robotConfig?.links[jointIndex];
    if (!link) return null;
    return loadData.data.filter((d) => d.linkId === link.id);
  }, [loadData, selectedJointId, robotConfig]);

  const handleCalculate = async () => {
    await calculateTorque();
  };

  return (
    <div className="h-full bg-industrial-700 rounded-lg p-4 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary-400" />
          <h3 className="text-sm font-semibold text-white font-mono">参数配置</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 disabled:bg-industrial-500 text-white text-xs font-medium rounded transition-all duration-200 glow-primary"
          >
            <Play className="w-3 h-3" />
            {isCalculating ? '计算中...' : '开始验算'}
          </button>
          <button
            onClick={clearAll}
            disabled={isCalculating}
            className="flex items-center gap-2 px-3 py-1.5 bg-industrial-500 hover:bg-industrial-400 disabled:bg-industrial-600 text-white text-xs font-medium rounded transition-all duration-200"
          >
            <RotateCcw className="w-3 h-3" />
            重置
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {selectedJoint ? (
          <>
            <div className="bg-industrial-600 rounded-lg p-3 border border-industrial-500">
              <h4 className="text-xs font-semibold text-primary-400 mb-3 font-mono">
                关节信息 - {selectedJoint.name}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="data-label">关节编号</p>
                  <p className="data-value">J{selectedJoint.index}</p>
                </div>
                <div>
                  <p className="data-label">扭矩阈值</p>
                  <p className="data-value text-warning-400">
                    {formatTorqueValue(selectedJoint.maxTorque)}
                  </p>
                </div>
                <div>
                  <p className="data-label">角度范围</p>
                  <p className="data-value">
                    [{formatAngleValue(selectedJoint.minAngle)}, {formatAngleValue(selectedJoint.maxAngle)}]
                  </p>
                </div>
                <div>
                  <p className="data-label">位置坐标</p>
                  <p className="data-value text-xs">
                    ({selectedJoint.position.map((v) => v.toFixed(2)).join(', ')})
                  </p>
                </div>
              </div>
            </div>

            {selectedTorqueResult && (
              <div className={`rounded-lg p-3 border ${
                selectedTorqueResult.isOverLimit
                  ? 'bg-danger-500/10 border-danger-500'
                  : 'bg-success-500/10 border-success-500'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-white font-mono">验算结果</h4>
                  {selectedTorqueResult.isOverLimit ? (
                    <span className="flex items-center gap-1 text-xs text-danger-400">
                      <AlertCircle className="w-3 h-3" />
                      超限
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-success-400">
                      <CheckCircle2 className="w-3 h-3" />
                      正常
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="data-label">最大扭矩</p>
                    <p className={`data-value ${selectedTorqueResult.isOverLimit ? 'text-danger-400' : 'text-success-400'}`}>
                      {formatTorqueValue(selectedTorqueResult.maxTorque)}
                    </p>
                  </div>
                  <div>
                    <p className="data-label">最小扭矩</p>
                    <p className="data-value">
                      {formatTorqueValue(selectedTorqueResult.minTorque)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="data-label">超限次数</p>
                    <p className={`data-value ${selectedTorqueResult.overLimitPoints.length > 0 ? 'text-danger-400' : 'text-success-400'}`}>
                      {selectedTorqueResult.overLimitPoints.length} 次
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedAngleData && selectedAngleData.length > 0 && (
              <div className="bg-industrial-600 rounded-lg p-3 border border-industrial-500">
                <h4 className="text-xs font-semibold text-primary-400 mb-3 font-mono">角度数据样本</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedAngleData.slice(0, 5).map((point, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-industrial-300 font-mono">{point.timestamp}ms</span>
                      <span className="text-white font-mono">{formatAngleValue(point.angle)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedLoadData && selectedLoadData.length > 0 && (
              <div className="bg-industrial-600 rounded-lg p-3 border border-industrial-500">
                <h4 className="text-xs font-semibold text-primary-400 mb-3 font-mono">负载数据样本</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedLoadData.slice(0, 5).map((point, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-industrial-300 font-mono">{point.timestamp}ms</span>
                      <span className={`font-mono ${point.mass === 0 ? 'text-danger-400' : 'text-white'}`}>
                        {point.mass === 0 ? '⚠️ 缺失' : `${point.mass.toFixed(1)} kg`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-4">🔧</div>
            <p className="text-industrial-300 text-sm">点击3D模型中的关节</p>
            <p className="text-industrial-400 text-xs mt-1">查看详细参数和验算结果</p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-industrial-500">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-white font-mono">
              {torqueResults.length}
            </p>
            <p className="text-xs text-industrial-300">已验算关节</p>
          </div>
          <div>
            <p className="text-lg font-bold text-danger-400 font-mono">
              {torqueResults.filter((r) => r.isOverLimit).length}
            </p>
            <p className="text-xs text-industrial-300">超限关节</p>
          </div>
          <div>
            <p className="text-lg font-bold text-warning-400 font-mono">
              {angleData?.data.length || 0}
            </p>
            <p className="text-xs text-industrial-300">数据点数</p>
          </div>
        </div>
      </div>
    </div>
  );
};
