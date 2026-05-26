import { useWaterStore } from '@/store/useWaterStore';
import { AlertTriangle, AlertCircle, Save, Check, Filter } from 'lucide-react';
import { useState } from 'react';

const typeConfig: Record<string, { icon: typeof AlertTriangle; color: string; label: string }> = {
  closed_loop: { icon: AlertCircle, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10', label: '闭环误判' },
  low_pressure: { icon: AlertTriangle, color: 'text-red-400 border-red-500/30 bg-red-500/10', label: '低压告警' },
  unsaved_state: { icon: Save, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', label: '未保存状态' },
  bad_data: { icon: AlertCircle, color: 'text-rose-400 border-rose-500/30 bg-rose-500/10', label: '数据异常' },
};

const severityColor: Record<string, string> = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-slate-400',
};

export default function AnomalyList() {
  const { anomalies, acknowledgeAnomaly, saveValveState } = useWaterStore();
  const [filter, setFilter] = useState<string[]>(['closed_loop', 'low_pressure', 'unsaved_state', 'bad_data']);

  const filteredAnomalies = anomalies.filter(a => filter.includes(a.type) && !a.acknowledged);

  const toggleFilter = (type: string) => {
    setFilter(prev => prev.includes(type) ? prev.filter(f => f !== type) : [...prev, type]);
  };

  return (
    <div className="p-4 border border-slate-700/50 rounded-lg bg-slate-900/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-400" />
          <span className="text-sm text-slate-300">异常告警</span>
          {filteredAnomalies.length > 0 && (
            <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">
              {filteredAnomalies.length}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {Object.entries(typeConfig).map(([type, config]) => (
          <button
            key={type}
            onClick={() => toggleFilter(type)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              filter.includes(type)
                ? `${config.color} opacity-100`
                : 'border-slate-700 text-slate-500 opacity-50'
            }`}
          >
            {config.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredAnomalies.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-4">无异常告警</div>
        )}
        {filteredAnomalies.map(anomaly => {
          const config = typeConfig[anomaly.type];
          const Icon = config.icon;
          return (
            <div
              key={anomaly.id}
              className={`rounded-lg border p-3 ${config.color}`}
            >
              <div className="flex items-start gap-2">
                <Icon size={14} className="mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${severityColor[anomaly.severity]}`}>
                      [{config.label}]
                    </span>
                    <span className="text-xs text-slate-400">{anomaly.location}</span>
                  </div>
                  <p className="text-xs text-white leading-relaxed">{anomaly.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{anomaly.suggestion}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {anomaly.type === 'unsaved_state' && (
                      <button
                        onClick={() => saveValveState(anomaly.locationId)}
                        className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30"
                      >
                        <Save size={10} />
                        保存状态
                      </button>
                    )}
                    <button
                      onClick={() => acknowledgeAnomaly(anomaly.id)}
                      className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-700/50 text-slate-400 rounded hover:bg-slate-600/50"
                    >
                      <Check size={10} />
                      已知晓
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
