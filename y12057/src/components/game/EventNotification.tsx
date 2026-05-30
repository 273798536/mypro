import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, FileText, X, Check } from 'lucide-react';
import type { GameEvent, DataSource } from '../../engine/types';

interface EventNotificationProps {
  event: GameEvent | null;
  onResolve: (choice: string) => void;
  onViewSource: (sourceId: string) => void;
  availableDataSources: DataSource[];
}

export const EventNotification: React.FC<EventNotificationProps> = ({
  event,
  onResolve,
  onViewSource,
  availableDataSources
}) => {
  if (!event) return null;

  const getEventColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'from-red-500 to-red-700';
      case 'high': return 'from-orange-500 to-orange-700';
      case 'medium': return 'from-yellow-500 to-yellow-700';
      default: return 'from-blue-500 to-blue-700';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'critical': return '紧急';
      case 'high': return '高';
      case 'medium': return '中';
      default: return '低';
    }
  };

  const dataSource = availableDataSources.find(ds => ds.id === event.dataSourceId);
  const isDirty = event.isDirty || false;

  return (
    <AnimatePresence>
      <motion.div
        key={event.id}
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.95 }}
        className="absolute top-4 right-4 z-50 max-w-md"
      >
        <div className="bg-slate-800/95 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className={`bg-gradient-to-r ${getEventColor(event.severity)} px-4 py-2 flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
              <span className="font-bold text-white">
                {event.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isDirty && (
                <span className="px-2 py-0.5 bg-red-900/50 rounded text-xs text-red-200 font-bold">
                  脏数据
                </span>
              )}
              <span className="px-2 py-0.5 bg-white/20 rounded text-xs text-white font-medium">
                {getSeverityText(event.severity)}
              </span>
            </div>
          </div>

          <div className="p-4">
            <p className="text-slate-300 text-sm mb-3">
              {event.description}
            </p>

            {event.mergeError && (
              <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-400 text-xs font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  <span>数据合并警告: {event.mergeError}</span>
                </div>
              </div>
            )}

            {dataSource && (
              <button
                onClick={() => onViewSource(dataSource.id)}
                className="w-full mb-4 flex items-center gap-2 p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                <div className="flex-1 text-left">
                  <div className="text-sm text-slate-200">查看数据源</div>
                  <div className="text-xs text-slate-400">{dataSource.name}</div>
                </div>
                <Clock className="w-3 h-3 text-slate-500" />
              </button>
            )}

            <div className="text-xs text-slate-400 mb-3 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>剩余时间: {Math.max(0, event.expiresAt - event.timestamp).toFixed(0)}秒</span>
            </div>

            <div className="space-y-2">
              {event.choices.map((choice, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onResolve(choice.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    choice.consequence > 0
                      ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20'
                      : choice.consequence < -10
                      ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                      : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      choice.consequence > 0
                        ? 'bg-green-500/30'
                        : choice.consequence < -10
                        ? 'bg-red-500/30'
                        : 'bg-slate-600'
                    }`}>
                      {choice.consequence > 0 ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : choice.consequence < -10 ? (
                        <X className="w-3 h-3 text-red-400" />
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-white font-medium">
                        {choice.text}
                      </div>
                      {choice.consequence !== 0 && (
                        <div className={`text-xs mt-1 ${
                          choice.consequence > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          风险影响: {choice.consequence > 0 ? '+' : ''}{choice.consequence.toFixed(1)}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
