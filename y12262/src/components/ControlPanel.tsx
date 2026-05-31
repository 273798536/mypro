import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { RiskLevel } from '../types';
import { getRiskLevelBgColor, getRiskLevelText } from '../utils';
import { useGameStore } from '../store/gameStore';

interface ControlPanelProps {
  levelId: string;
  maxMistakes: number;
  currentMistakes: number;
  operationsCount: number;
  totalNodes: number;
  processedCount: number;
  canUndo: boolean;
  canRedo: boolean;
  isPlaying: boolean;
}

export function ControlPanel({
  levelId,
  maxMistakes,
  currentMistakes,
  operationsCount,
  totalNodes,
  processedCount,
  canUndo,
  canRedo,
  isPlaying,
}: ControlPanelProps) {
  const navigate = useNavigate();
  const selectedNodeId = useGameStore((state) => state.selectedNodeId);
  const markNode = useGameStore((state) => state.markNode);
  const undo = useGameStore((state) => state.undo);
  const redo = useGameStore((state) => state.redo);
  const submit = useGameStore((state) => state.submit);
  const reset = useGameStore((state) => state.reset);

  const progress = (processedCount / totalNodes) * 100;
  const mistakesRemaining = maxMistakes - currentMistakes;

  const handleMark = (level: RiskLevel) => {
    if (!selectedNodeId || !isPlaying) return;
    markNode(selectedNodeId, level);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">操作面板</h3>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-1 rounded font-medium ${
              mistakesRemaining > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            剩余错误: {mistakesRemaining}/{maxMistakes}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">处理进度</span>
          <span className="text-slate-300">
            {processedCount}/{totalNodes} 节点
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="pt-2 border-t border-slate-700">
        <p className="text-xs text-slate-400 mb-3">
          {selectedNodeId
            ? '为选中的节点标记风险等级：'
            : '请先在图谱中选择一个节点'}
        </p>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleMark('safe')}
            disabled={!selectedNodeId || !isPlaying}
            className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg transition-all ${
              selectedNodeId && isPlaying
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span className="text-xl">✓</span>
            <span className="text-xs font-medium">安全</span>
          </button>

          <button
            onClick={() => handleMark('suspicious')}
            disabled={!selectedNodeId || !isPlaying}
            className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg transition-all ${
              selectedNodeId && isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer active:scale-95'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span className="text-xl">⚠</span>
            <span className="text-xs font-medium">可疑</span>
          </button>

          <button
            onClick={() => handleMark('blacklist')}
            disabled={!selectedNodeId || !isPlaying}
            className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg transition-all ${
              selectedNodeId && isPlaying
                ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer active:scale-95'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span className="text-xl">🚫</span>
            <span className="text-xs font-medium">黑名单</span>
          </button>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-700">
        <div className="flex gap-2 mb-3">
          <button
            onClick={undo}
            disabled={!canUndo || !isPlaying}
            className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              canUndo && isPlaying
                ? 'bg-slate-700 hover:bg-slate-600 text-white cursor-pointer'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            ↩ 撤销
          </button>
          <button
            onClick={redo}
            disabled={!canRedo || !isPlaying}
            className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              canRedo && isPlaying
                ? 'bg-slate-700 hover:bg-slate-600 text-white cursor-pointer'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            ↪ 重做
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={reset}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white transition-all"
          >
            🔄 重新开始
          </button>
          {isPlaying ? (
            <button
              onClick={submit}
              disabled={processedCount < totalNodes}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                processedCount >= totalNodes
                  ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              ✅ 提交答案
            </button>
          ) : (
            <button
              onClick={() => navigate(`/review/${levelId}`)}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all"
            >
              📊 查看复盘
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {operationsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-2 border-t border-slate-700 space-y-2"
          >
            <p className="text-xs text-slate-400">图例说明</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-500" />
                <span className="text-slate-400">未标记</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600" />
                <span className="text-slate-400">安全</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-600" />
                <span className="text-slate-400">可疑</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-600" />
                <span className="text-slate-400">黑名单</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
