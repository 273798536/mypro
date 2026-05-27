import React, { useState, useEffect } from 'react';
import { Anomaly } from '../types';

interface AlertProps {
  anomalies: Anomaly[];
  onDismiss?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ anomalies, onDismiss }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (anomalies.length > 0) {
      setVisible(true);
    }
  }, [anomalies]);

  if (anomalies.length === 0 || !visible) return null;

  const getAnomalyColor = (type: string) => {
    switch (type) {
      case 'ENERGY_INCREASE':
        return 'bg-red-900/50 border-red-500';
      case 'MATERIAL_OUT_OF_BOUNDS':
        return 'bg-orange-900/50 border-orange-500';
      case 'COLLISION_PENETRATION':
        return 'bg-yellow-900/50 border-yellow-500';
      default:
        return 'bg-red-900/50 border-red-500';
    }
  };

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'ENERGY_INCREASE':
        return '⚡';
      case 'MATERIAL_OUT_OF_BOUNDS':
        return '⚠️';
      case 'COLLISION_PENETRATION':
        return '🔴';
      default:
        return '⚠️';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      <div className="animate-pulse">
        {anomalies.map((anomaly, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border-l-4 shadow-lg mb-2 ${getAnomalyColor(
              anomaly.type
            )}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">{getAnomalyIcon(anomaly.type)}</span>
              <div className="flex-1">
                <h4 className="font-bold text-white text-sm">物理异常检测</h4>
                <p className="text-slate-300 text-sm mt-1">{anomaly.message}</p>
                <p className="text-slate-500 text-xs mt-2">
                  此数据已标记，不建议用于正式实验结论
                </p>
              </div>
              <button
                onClick={() => setVisible(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface ResultDisplayProps {
  dropHeight: number;
  bounceHeight: number;
  restitution: number;
  hasAnomalies: boolean;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  dropHeight,
  bounceHeight,
  restitution,
  hasAnomalies,
}) => {
  if (dropHeight === 0 && bounceHeight === 0) return null;

  const energyLoss = dropHeight > 0 ? ((dropHeight - bounceHeight) / dropHeight * 100).toFixed(1) : '0';

  return (
    <div
      className={`p-4 rounded-xl ${
        hasAnomalies
          ? 'bg-red-900/30 border border-red-500/50'
          : 'bg-cyan-900/30 border border-cyan-500/50'
      }`}
    >
      <h4 className="font-bold text-white mb-3 flex items-center gap-2">
        {hasAnomalies ? (
          <>
            <span>⚠️</span> 实验结果 (存在异常)
          </>
        ) : (
          <>
            <span>✓</span> 实验结果
          </>
        )}
      </h4>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-slate-400 text-xs">下落高度</div>
          <div className="text-xl font-bold text-white">{dropHeight.toFixed(3)} m</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs">反弹高度</div>
          <div className="text-xl font-bold text-cyan-400">{bounceHeight.toFixed(3)} m</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs">恢复系数 e</div>
          <div className="text-xl font-bold text-green-400 font-mono">{restitution.toFixed(4)}</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs">能量损失</div>
          <div className="text-xl font-bold text-orange-400">{energyLoss}%</div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-600">
        <div className="text-xs text-slate-400">
          <span className="font-mono">e = √(h₂ / h₁)</span> = √({bounceHeight.toFixed(
          3
        )} / {dropHeight.toFixed(3)}) = <span className="text-cyan-400">{restitution.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
};
