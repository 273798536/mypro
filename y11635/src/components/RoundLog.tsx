import React, { useState } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useGameStore } from '../hooks/useGameStore';

export function RoundLog() {
  const { logs } = useGameStore();
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  const toggleExpand = (round: number) => {
    setExpandedRound(expandedRound === round ? null : round);
  };

  if (logs.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-blue-400" />
          回合日志
        </h3>
        <p className="text-sm text-slate-500 text-center py-8">暂无记录，开始游戏后将显示回合日志</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-blue-400" />
        回合日志
      </h3>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
        {[...logs].reverse().map((log) => (
          <div
            key={log.round}
            className={`border rounded-lg overflow-hidden transition-all duration-200 ${
              log.scoreChange >= 0
                ? 'border-slate-600 bg-slate-700/30'
                : 'border-red-700/50 bg-red-900/20'
            }`}
          >
            <button
              onClick={() => toggleExpand(log.round)}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-600/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-mono">R{log.round}</span>
                <span className="text-sm text-slate-300">{log.weather.name}</span>
                <span className="text-xs text-cyan-400 font-mono">来水 {log.upstreamInflow}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-mono font-bold ${
                  log.scoreChange >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {log.scoreChange >= 0 ? '+' : ''}{log.scoreChange}
                </span>
                {expandedRound === log.round ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </button>

            {expandedRound === log.round && (
              <div className="px-3 pb-3 pt-0 border-t border-slate-600/50 space-y-2">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">闸门开度</span>
                    <div className="text-slate-300 font-mono">{log.gateOpening}%</div>
                  </div>
                  <div>
                    <span className="text-slate-500">水位</span>
                    <div className="text-slate-300 font-mono">{log.reservoirLevel.toFixed(1)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">预警</span>
                    <div className={log.warningIssued ? 'text-orange-400' : 'text-slate-500'}>
                      {log.warningIssued ? '已发布' : '未发布'}
                    </div>
                  </div>
                </div>
                {log.events.length > 0 && (
                  <div className="pt-2 border-t border-slate-600/30">
                    <span className="text-xs text-slate-500">事件记录：</span>
                    <ul className="mt-1 space-y-1">
                      {log.events.map((event, i) => (
                        <li key={i} className="text-xs text-slate-400 flex items-start gap-1">
                          <span className="text-slate-600">•</span>
                          {event}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
