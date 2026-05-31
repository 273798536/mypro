import { AlertTriangle, AlertCircle, Waves, Gauge, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { AnomalyInfo } from '@shared/types';

interface AnomalyPanelProps {
  anomalies: AnomalyInfo[];
}

const anomalyConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  wave_missing: {
    icon: <Waves className="w-5 h-5" />,
    label: '波浪参数缺测',
    color: 'amber',
  },
  speed_jump: {
    icon: <Gauge className="w-5 h-5" />,
    label: '航速突变',
    color: 'orange',
  },
  cabin_misalignment: {
    icon: <MapPin className="w-5 h-5" />,
    label: '舱室位置异常',
    color: 'rose',
  },
};

const colorClasses: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    iconBg: 'bg-amber-100 text-amber-600',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
    iconBg: 'bg-orange-100 text-orange-600',
  },
  rose: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-800',
    iconBg: 'bg-rose-100 text-rose-600',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    iconBg: 'bg-yellow-100 text-yellow-600',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    iconBg: 'bg-red-100 text-red-600',
  },
};

export default function AnomalyPanel({ anomalies }: AnomalyPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (anomalies.length === 0) {
    return null;
  }

  const warnings = anomalies.filter((a) => a.severity === 'warning');
  const errors = anomalies.filter((a) => a.severity === 'error');

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          异常检测结果
          {anomalies.length > 0 && (
            <span className="text-sm font-normal px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
              {anomalies.length} 项异常
            </span>
          )}
        </h3>
      </div>

      {errors.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-red-700 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            严重错误 ({errors.length})
          </p>
          {errors.map((anomaly, idx) => {
            const config = anomalyConfig[anomaly.type] || anomalyConfig.wave_missing;
            const colors = colorClasses[anomaly.severity] || colorClasses.error;
            const id = `${anomaly.type}-${idx}`;
            const isExpanded = expanded[id];

            return (
              <div
                key={id}
                className={`p-4 rounded-xl border-2 ${colors.bg} ${colors.border} animate-pulse`}
                style={{ animationIterationCount: 3 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${colors.iconBg} flex-shrink-0`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold ${colors.text}`}>
                          {config.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-red-200 text-red-800 rounded-full">
                          {anomaly.severity === 'error' ? '错误' : '警告'}
                        </span>
                        <span className="text-xs text-slate-500">
                          来源：{anomaly.source}
                        </span>
                      </div>
                      <p className={`text-sm mt-2 ${colors.text}`}>{anomaly.message}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleExpand(id)}
                    className="p-1 hover:bg-white/50 rounded transition-colors flex-shrink-0"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                </div>
                {isExpanded && (
                  <div className="mt-3 p-3 bg-white/60 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">原始数据</p>
                    <pre className="text-xs text-slate-700 overflow-x-auto">
                      {JSON.stringify(anomaly.rawValue, null, 2)}
                    </pre>
                    <p className="text-xs text-slate-500 mt-2">
                      影响字段：{anomaly.affectedField}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-amber-700 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            警告提示 ({warnings.length})
          </p>
          {warnings.map((anomaly, idx) => {
            const config = anomalyConfig[anomaly.type] || anomalyConfig.wave_missing;
            const colors = colorClasses[config.color] || colorClasses.warning;
            const id = `${anomaly.type}-${idx}`;
            const isExpanded = expanded[id];

            return (
              <div
                key={id}
                className={`p-4 rounded-xl border ${colors.bg} ${colors.border} transition-all hover:shadow-sm`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${colors.iconBg} flex-shrink-0`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold ${colors.text}`}>
                          {config.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full">
                          警告
                        </span>
                        <span className="text-xs text-slate-500">
                          来源：{anomaly.source}
                        </span>
                      </div>
                      <p className={`text-sm mt-2 ${colors.text}`}>{anomaly.message}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleExpand(id)}
                    className="p-1 hover:bg-white/50 rounded transition-colors flex-shrink-0"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                </div>
                {isExpanded && (
                  <div className="mt-3 p-3 bg-white/60 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">原始数据</p>
                    <pre className="text-xs text-slate-700 overflow-x-auto">
                      {JSON.stringify(anomaly.rawValue, null, 2)}
                    </pre>
                    <p className="text-xs text-slate-500 mt-2">
                      影响字段：{anomaly.affectedField}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {anomalies.some((a) => a.type === 'wave_missing') && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          <p className="font-medium mb-1">💡 处理建议</p>
          <p>波浪参数缺测时，系统将使用典型海况估算值（有义波高1.5m，波浪周期8s，横浪90°）。
          为获得更准确的结果，请补充实测波浪数据。</p>
        </div>
      )}

      {anomalies.some((a) => a.type === 'speed_jump') && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          <p className="font-medium mb-1">💡 处理建议</p>
          <p>检测到航速突变可能是数据录入错误或特殊工况（如加速、避障）。
          请核实航速数据来源，确认是否需要排除异常值后重新计算。</p>
        </div>
      )}

      {anomalies.some((a) => a.type === 'cabin_misalignment') && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          <p className="font-medium mb-1">💡 处理建议</p>
          <p>舱室位置异常可能是由于混用了改装前后的船体参数。
          请确认舱室坐标是否与当前分析的船体版本匹配，避免数据错误合并。</p>
        </div>
      )}
    </div>
  );
}
