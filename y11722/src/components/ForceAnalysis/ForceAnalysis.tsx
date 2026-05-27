import React from 'react';
import { ForceAnalysis as ForceAnalysisType } from '../../types';
import { toDegrees, getStatusText, getStatusColor } from '../../utils/physics';

interface ForceAnalysisProps {
  analysis: ForceAnalysisType | null;
}

export const ForceAnalysisPanel: React.FC<ForceAnalysisProps> = ({ analysis }) => {
  if (!analysis) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-slate-800 border-b pb-3 mb-4">
          📊 受力分析
        </h2>
        <div className="text-center text-slate-400 py-8">
          等待参数输入...
        </div>
      </div>
    );
  }

  const statusColor = getStatusColor(analysis.status);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <h2 className="text-xl font-bold text-slate-800 border-b pb-3">
        📊 受力分析
      </h2>

      <div className="text-center p-4 rounded-xl" style={{ backgroundColor: `${statusColor}15` }}>
        <div className="text-sm text-slate-500 mb-1">当前状态</div>
        <div
          className="text-3xl font-bold"
          style={{ color: statusColor }}
        >
          {getStatusText(analysis.status)}
        </div>
        {analysis.status === 'critical' && (
          <div className="text-sm text-error mt-1 animate-pulse">
            ⚠️ 接近临界角！请谨慎判断
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-600">基本力</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <ForceItem
            label="重力 G"
            value={analysis.gravity}
            unit="N"
            color="#ef4444"
            formula="G = mg"
          />
          <ForceItem
            label="支持力 N"
            value={analysis.normalForce}
            unit="N"
            color="#10b981"
            formula="N = mg·cosθ"
          />
          <ForceItem
            label="最大静摩擦"
            value={analysis.maxStaticFriction}
            unit="N"
            color="#f59e0b"
            formula="f_max = μN"
          />
          <ForceItem
            label="摩擦力 f"
            value={analysis.frictionForce}
            unit="N"
            color="#3b82f6"
            formula={analysis.status === 'static' ? 'f = F_drive' : 'f = μN'}
          />
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-600">沿斜面分量</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <ForceItem
            label="重力分量"
            value={analysis.gravityParallel}
            unit="N"
            color="#f97316"
            formula="mg·sinθ"
          />
          <ForceItem
            label="外力分量"
            value={analysis.externalForceParallel}
            unit="N"
            color="#8b5cf6"
            formula="F·cosα"
          />
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-600">运动学结果</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <ForceItem
            label="合力 F_net"
            value={analysis.netForce}
            unit="N"
            color="#0ea5e9"
            highlight
          />
          <ForceItem
            label="加速度 a"
            value={analysis.acceleration}
            unit="m/s²"
            color="#06b6d4"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="text-sm font-semibold text-slate-600 mb-2">临界角</div>
        <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
          <span className="text-slate-600">θ_c = arctan({(analysis.gravityParallel / analysis.gravityPerpendicular).toFixed(2)})</span>
          <span className="text-xl font-mono font-bold text-slate-800">
            {toDegrees(analysis.criticalAngle).toFixed(2)}°
          </span>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <div className="text-sm font-semibold text-blue-800 mb-2">💡 受力分析公式</div>
        <div className="text-xs text-blue-700 space-y-1 font-mono">
          <div>沿斜面: F_net = mg·sinθ + F·cosα - f</div>
          <div>垂直斜面: N = mg·cosθ - F·sinα</div>
          <div>摩擦力: f = μN (滑动) 或 f = F_drive (静止)</div>
        </div>
      </div>
    </div>
  );
};

interface ForceItemProps {
  label: string;
  value: number;
  unit: string;
  color: string;
  formula?: string;
  highlight?: boolean;
}

const ForceItem: React.FC<ForceItemProps> = ({
  label,
  value,
  unit,
  color,
  formula,
  highlight,
}) => (
  <div
    className={`p-3 rounded-lg ${highlight ? 'ring-2 ring-offset-2' : ''}`}
    style={{
      backgroundColor: `${color}10`,
      ...(highlight ? { ringColor: color } : {}),
    }}
  >
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-lg font-mono font-bold" style={{ color }}>
      {value.toFixed(2)} <span className="text-sm font-normal">{unit}</span>
    </div>
    {formula && (
      <div className="text-xs text-slate-400 mt-1 font-mono">{formula}</div>
    )}
  </div>
);
