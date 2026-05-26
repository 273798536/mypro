import React, { useState } from 'react';
import { Clock, Play, ChevronDown, ChevronUp, Plus, Minus, X, SkipForward } from 'lucide-react';
import { useGameEngine } from '../hooks/useGameEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { getOperationTypeLabel } from '../utils/replay';

export const ReplayPanel: React.FC = () => {
  const { state } = useGameEngine();
  const { operationLogs } = state;
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'add_margin': return <Plus className="w-4 h-4" />;
      case 'partial_close': return <Minus className="w-4 h-4" />;
      case 'full_close': return <X className="w-4 h-4" />;
      case 'skip': return <SkipForward className="w-4 h-4" />;
      case 'auto_liquidate': return <X className="w-4 h-4" />;
      default: return <Play className="w-4 h-4" />;
    }
  };

  const getOperationColor = (_type: string, scoreChange: number) => {
    if (scoreChange > 0) return 'bg-green-100 text-green-700 border-green-200';
    if (scoreChange < 0) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const groupedOperations = operationLogs.reduce((groups, log) => {
    const round = log.roundNumber;
    if (!groups[round]) {
      groups[round] = [];
    }
    groups[round].push(log);
    return groups;
  }, {} as Record<number, typeof operationLogs>);

  const rounds = Object.keys(groupedOperations).map(Number).sort((a, b) => b - a);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-primary-600" />
        <h3 className="text-lg font-bold text-gray-800">操作复盘</h3>
      </div>

      {rounds.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>暂无操作记录</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-2">
          {rounds.map((round) => (
            <div key={round} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedRound(expandedRound === round ? null : round)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="font-semibold text-gray-700">第 {round} 回合</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {groupedOperations[round].length} 次操作
                  </span>
                  {expandedRound === round ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </button>
              
              <AnimatePresence>
                {expandedRound === round && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 space-y-2 bg-white">
                      {groupedOperations[round].map((log) => (
                        <div
                          key={log.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${getOperationColor(log.type, log.scoreChange)}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            log.scoreChange >= 0 ? 'bg-green-200' : 'bg-red-200'
                          }`}>
                            {getOperationIcon(log.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{getOperationTypeLabel(log.type)}</span>
                              {log.accountName && (
                                <span className="text-sm opacity-75">- {log.accountName}</span>
                              )}
                              {log.operator === 'system' && (
                                <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">系统</span>
                              )}
                            </div>
                            <div className="text-sm opacity-75 mt-0.5">{log.reason}</div>
                          </div>
                          <div className={`font-mono font-bold ${
                            log.scoreChange >= 0 ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {log.scoreChange >= 0 ? '+' : ''}{log.scoreChange}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
