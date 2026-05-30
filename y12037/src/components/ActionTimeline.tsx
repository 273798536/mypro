import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Play, Pause, RotateCcw } from 'lucide-react';
import { ActionRecord } from '@/types/game';
import { toolDescriptions } from '@/game/explanations';

interface ActionTimelineProps {
  actions: ActionRecord[];
}

export const ActionTimeline: React.FC<ActionTimelineProps> = ({ actions }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(-1);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handlePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    setPlayIndex(0);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setPlayIndex(-1);
    setExpandedId(null);
  };

  React.useEffect(() => {
    if (isPlaying && playIndex >= 0 && playIndex < actions.length) {
      setExpandedId(actions[playIndex].id);
      const timer = setTimeout(() => {
        if (playIndex < actions.length - 1) {
          setPlayIndex(playIndex + 1);
        } else {
          setIsPlaying(false);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, playIndex, actions]);

  const formatTime = (timestamp: number, firstTimestamp: number): string => {
    const diff = Math.floor((timestamp - firstTimestamp) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (actions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        暂无操作记录
      </div>
    );
  }

  const firstTimestamp = actions[0].timestamp;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-amber-300">操作记录回放</h4>
        <div className="flex gap-2">
          <button
            onClick={handlePlay}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-700 hover:bg-amber-600 rounded-lg text-sm transition-colors"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? '暂停' : '自动播放'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
          >
            <RotateCcw size={16} />
            重置
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-700" />

        <div className="space-y-3">
          {actions.map((action, index) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ 
                opacity: playIndex >= index || playIndex === -1 ? 1 : 0.3,
                x: 0,
              }}
              transition={{ delay: playIndex === -1 ? index * 0.05 : 0 }}
            >
              <div
                className={`relative flex items-start gap-4 p-3 rounded-xl cursor-pointer transition-all ${
                  expandedId === action.id
                    ? 'bg-gray-800'
                    : 'bg-gray-900/50 hover:bg-gray-800/50'
                } ${action.isCorrect ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}`}
                onClick={() => toggleExpand(action.id)}
              >
                <div
                  className={`absolute -left-1 top-4 w-3 h-3 rounded-full border-2 ${
                    action.isCorrect
                      ? 'bg-green-500 border-green-300'
                      : 'bg-red-500 border-red-300'
                  }`}
                />

                <div className="flex-1 ml-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        #{index + 1}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(action.timestamp, firstTimestamp)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          action.isCorrect
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-red-900/50 text-red-400'
                        }`}
                      >
                        {toolDescriptions[action.toolUsed].name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold ${
                          action.scoreChange >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {action.scoreChange >= 0 ? '+' : ''}
                        {action.scoreChange}
                      </span>
                      {expandedId === action.id ? (
                        <ChevronDown size={16} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={16} className="text-gray-400" />
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedId === action.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          {action.isCorrect ? (
                            <div className="text-green-400 text-sm">
                              ✓ 操作正确，成功修复问题！
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-red-400 font-semibold text-sm">
                                ✗ 操作失败
                              </div>
                              <div className="text-gray-300 text-sm">
                                {action.errorExplanation}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
