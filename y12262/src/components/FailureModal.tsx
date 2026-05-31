import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { GraphNode } from '../types';
import {
  getRiskLevelText,
  getNodeTypeIcon,
  getRiskLevelColor,
  formatTimestamp,
} from '../utils';

interface FailureModalProps {
  nodes: GraphNode[];
}

export function FailureModal({ nodes }: FailureModalProps) {
  const navigate = useNavigate();
  const showFailureModal = useGameStore((state) => state.showFailureModal);
  const closeFailureModal = useGameStore((state) => state.closeFailureModal);
  const stateWithHistory = useGameStore((state) => state.stateWithHistory);
  const reset = useGameStore((state) => state.reset);

  if (!stateWithHistory) return null;

  const { present } = stateWithHistory;
  const wrongOperations = present.operations.filter((op) => !op.isCorrect);

  const lastWrongOp = wrongOperations[wrongOperations.length - 1];
  const lastWrongNode = lastWrongOp
    ? nodes.find((n) => n.id === lastWrongOp.nodeId)
    : null;

  const handleReview = () => {
    closeFailureModal();
    navigate(`/review/${present.levelId}`);
  };

  const handleRetry = () => {
    closeFailureModal();
    reset();
  };

  return (
    <AnimatePresence>
      {showFailureModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          >
            <div className="bg-gradient-to-r from-red-600 to-red-500 p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-4xl">
                  🚫
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">
                    {present.status === 'failed' ? '任务失败' : '标记错误'}
                  </h2>
                  <p className="text-white/80 text-sm mt-1">
                    错误次数已达上限，请查看原因后重试或进入复盘学习
                  </p>
                </div>
                <button
                  onClick={closeFailureModal}
                  className="text-white/70 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {lastWrongOp && lastWrongNode && (
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    最近一次错误
                  </h3>

                  <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 shrink-0"
                        style={{
                          borderColor: getRiskLevelColor(lastWrongNode.trueRiskLevel),
                          backgroundColor: `${getRiskLevelColor(lastWrongNode.trueRiskLevel)}20`,
                        }}
                      >
                        {getNodeTypeIcon(lastWrongNode.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-white">
                            {lastWrongNode.name}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 mb-2">
                          {lastWrongNode.description}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-slate-800 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-1">你的标记</p>
                        <p
                          className="font-semibold"
                          style={{ color: getRiskLevelColor(lastWrongOp.newValue) }}
                        >
                          {getRiskLevelText(lastWrongOp.newValue)}
                        </p>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-1">正确答案</p>
                        <p
                          className="font-semibold"
                          style={{
                            color: getRiskLevelColor(lastWrongNode.trueRiskLevel),
                          }}
                        >
                          {getRiskLevelText(lastWrongNode.trueRiskLevel)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-red-700/50">
                      <p className="text-sm text-red-300">
                        <span className="font-medium text-red-400">原因：</span>
                        {lastWrongOp.feedback}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {wrongOperations.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    证据链时间线
                  </h3>
                  <div className="space-y-3">
                    {wrongOperations.slice(-3).map((op, index) => {
                      const node = nodes.find((n) => n.id === op.nodeId);
                      if (!node) return null;

                      return (
                        <div
                          key={op.id}
                          className="flex gap-3 pl-4 border-l-2 border-red-700/50"
                        >
                          <div className="w-3 h-3 rounded-full bg-red-500 -ml-[7px] mt-1 shrink-0" />
                          <div className="flex-1 pb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-400">
                                {formatTimestamp(op.timestamp)}
                              </span>
                              <span className="text-xs text-red-400">✗ 错误</span>
                            </div>
                            <p className="text-sm text-white">
                              {getNodeTypeIcon(node.type)} {node.name}:{' '}
                              <span className="line-through text-slate-500">
                                {getRiskLevelText(op.oldValue)}
                              </span>{' '}
                              →{' '}
                              <span style={{ color: getRiskLevelColor(op.newValue) }}>
                                {getRiskLevelText(op.newValue)}
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {present.mistakes > 0 && (
                <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">总错误次数</span>
                    <span className="text-red-400 font-mono text-xl">
                      {present.mistakes}
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
                <h4 className="text-blue-300 font-medium mb-2">💡 培训提示</h4>
                <ul className="text-sm text-blue-200 space-y-1">
                  <li>• 仔细查看每个节点的关联材料，不要仅凭关系链判断</li>
                  <li>• 设备共享不等于风险，要结合交易行为</li>
                  <li>• 注意风险标签的时效性，历史标签可能已更新</li>
                </ul>
              </div>
            </div>

            <div className="p-6 pt-0">
              <div className="flex gap-3">
                <button
                  onClick={handleRetry}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all active:scale-95"
                >
                  🔄 重新挑战
                </button>
                <button
                  onClick={handleReview}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all active:scale-95"
                >
                  📊 查看复盘
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
