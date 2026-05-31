import React from 'react';
import { Clock, AlertTriangle, Wind, DollarSign, Edit3, Trash2, Plus, Zap } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import type { EvidenceType } from '../types/bridge';

const iconMap: Record<EvidenceType, React.ReactNode> = {
  node_modify: <Edit3 size={14} />,
  member_add: <Plus size={14} />,
  member_remove: <Trash2 size={14} />,
  budget_change: <DollarSign size={14} />,
  wind_level_up: <Wind size={14} />,
  vibration_peak: <Zap size={14} />,
  failure: <AlertTriangle size={14} />,
  remark_change: <Edit3 size={14} />
};

const colorMap: Record<EvidenceType, string> = {
  node_modify: 'bg-blue-500',
  member_add: 'bg-emerald-500',
  member_remove: 'bg-red-500',
  budget_change: 'bg-amber-500',
  wind_level_up: 'bg-cyan-500',
  vibration_peak: 'bg-orange-500',
  failure: 'bg-red-600',
  remark_change: 'bg-purple-500'
};

export const EvidenceTimeline: React.FC = () => {
  const evidenceChain = useGameStore(state => state.evidenceChain);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur border border-slate-700 rounded-xl p-4">
      <h3 className="text-white font-bold mb-4 flex items-center gap-2">
        <Clock size={18} />
        证据链时间线
      </h3>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
        {evidenceChain.slice().reverse().map((record, index) => (
          <div key={index} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full ${colorMap[record.type]} flex items-center justify-center text-white`}>
                {iconMap[record.type]}
              </div>
              {index < evidenceChain.length - 1 && (
                <div className="w-px h-full bg-slate-700 mt-1" />
              )}
            </div>
            <div className="flex-1 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-slate-400 font-mono">{formatTime(record.timestamp)}</span>
                <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded">
                  v{record.version}
                </span>
              </div>
              <p className="text-sm text-white">{record.remark || record.type}</p>
              {Object.keys(record.data).length > 0 && (
                <div className="mt-1 text-xs text-slate-400 bg-slate-900/50 rounded p-2 font-mono">
                  {JSON.stringify(record.data, null, 1).slice(0, 100)}
                  {JSON.stringify(record.data).length > 100 && '...'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
