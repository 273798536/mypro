import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Trash2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useLensStore } from '../../store/useLensStore';
import { formatNumber } from '../../physics/lensCalculator';

export const StepManager: React.FC = () => {
  const { steps, loadStep, deleteStep, clearSteps } = useLensStore();
  const [isExpanded, setIsExpanded] = useState(true);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <motion.div
      className="glass-panel rounded-xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-optical-accent" />
          <h2 className="text-lg font-bold text-white">实验步骤</h2>
          <span className="px-2 py-0.5 rounded-full bg-slate-700 text-xs text-slate-300">
            {steps.length} 条记录
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {steps.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无保存的步骤</p>
                  <p className="text-xs mt-1">点击控制面板的保存按钮记录当前状态</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                    {steps.slice().reverse().map((step, index) => (
                      <motion.div
                        key={step.id}
                        className="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 text-xs text-slate-400 mb-1">
                            <span className="font-mono">{formatTime(step.timestamp)}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                              #{steps.length - index}
                            </span>
                          </div>
                          <div className="flex gap-4 text-xs font-mono">
                            <span className="text-blue-400">f={formatNumber(step.state.focalLength)}</span>
                            <span className="text-orange-400">u={formatNumber(step.state.objectDistance)}</span>
                            <span className="text-green-400">v={formatNumber(step.state.imageDistance)}</span>
                            <span className="text-purple-400">m={formatNumber(step.state.magnification, 2)}</span>
                          </div>
                          {step.note && (
                            <p className="text-xs text-slate-400 mt-1">{step.note}</p>
                          )}
                        </div>
                        <div className="flex gap-1 ml-3">
                          <button
                            onClick={() => loadStep(step.id)}
                            className="p-2 rounded hover:bg-slate-700/50 transition-colors"
                            title="加载此状态"
                          >
                            <RotateCcw className="w-4 h-4 text-optical-accent" />
                          </button>
                          <button
                            onClick={() => deleteStep(step.id)}
                            className="p-2 rounded hover:bg-red-500/20 transition-colors"
                            title="删除此记录"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {steps.length > 0 && (
                    <button
                      onClick={clearSteps}
                      className="w-full mt-3 py-2 text-xs text-slate-400 hover:text-red-400 transition-colors"
                    >
                      清空所有记录
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
