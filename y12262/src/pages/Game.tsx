import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { getLevelById } from '../data/levels';
import { RelationGraph } from '../components/RelationGraph';
import { MaterialPanel } from '../components/MaterialPanel';
import { ControlPanel } from '../components/ControlPanel';
import { FeedbackToast } from '../components/FeedbackToast';
import { FailureModal } from '../components/FailureModal';
import { getFocusPointText, formatTimestamp } from '../utils';

export default function Game() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const loadLevel = useGameStore((state) => state.loadLevel);
  const stateWithHistory = useGameStore((state) => state.stateWithHistory);
  const currentLevel = useGameStore((state) => state.currentLevel);
  const [showStory, setShowStory] = useState(true);

  useEffect(() => {
    if (levelId) {
      const level = getLevelById(levelId);
      if (!level) {
        navigate('/');
        return;
      }
      loadLevel(levelId);
      setShowStory(true);
    }
  }, [levelId, loadLevel, navigate]);

  if (!stateWithHistory || !currentLevel) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  const { past, present, future } = stateWithHistory;
  const processedCount = Object.values(present.nodeStates).filter(
    (s) => s !== 'unknown'
  ).length;

  const canUndo = past.length > 0 && present.status === 'playing';
  const canRedo = future.length > 0 && present.status === 'playing';
  const isPlaying = present.status === 'playing';

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <FeedbackToast />

      <AnimatePresence>
        {showStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-4xl">
                    📂
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white">
                      {currentLevel.title}
                    </h2>
                    <p className="text-white/80 text-sm mt-1">
                      核心知识点：{getFocusPointText(currentLevel.focusPoint)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  案件背景
                </h3>
                <p className="text-slate-300 leading-relaxed mb-6">
                  {currentLevel.backgroundStory}
                </p>

                <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
                  <h4 className="text-sm font-medium text-white mb-2">
                    📊 案件数据
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-400">
                        {currentLevel.nodes.length}
                      </p>
                      <p className="text-xs text-slate-400">关联节点</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-400">
                        {currentLevel.edges.length}
                      </p>
                      <p className="text-xs text-slate-400">关系连线</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-400">
                        {currentLevel.materials.length}
                      </p>
                      <p className="text-xs text-slate-400">证据材料</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-4 mb-6">
                  <p className="text-amber-300 text-sm">
                    <span className="font-semibold">⚠️ 注意：</span>
                    本关重点考察{getFocusPointText(currentLevel.focusPoint)}
                    的识别能力。请仔细查看所有材料，避免做出错误判断。
                  </p>
                </div>

                <button
                  onClick={() => setShowStory(false)}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-medium text-white transition-all active:scale-95 text-lg"
                >
                  开始分析 →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FailureModal nodes={currentLevel.nodes} />

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              ← 返回
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">
                {currentLevel.title}
              </h1>
              <p className="text-xs text-slate-400">
                开始时间：{formatTimestamp(present.startTime)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                present.status === 'playing'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : present.status === 'completed'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {present.status === 'playing'
                ? '进行中'
                : present.status === 'completed'
                ? '已完成'
                : '已失败'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
              🎯 {getFocusPointText(currentLevel.focusPoint)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 140px)' }}>
          <div className="col-span-8">
            <div className="h-full">
              <RelationGraph
                nodes={currentLevel.nodes}
                edges={currentLevel.edges}
                nodeStates={present.nodeStates}
                showCorrectAnswers={!isPlaying}
                width={800}
                height={600}
              />
            </div>
          </div>

          <div className="col-span-4 flex flex-col gap-4">
            <div className="flex-1 min-h-0">
              <MaterialPanel
                materials={currentLevel.materials}
                nodes={currentLevel.nodes}
                nodeStates={present.nodeStates}
              />
            </div>
            <div className="shrink-0">
              <ControlPanel
                levelId={currentLevel.id}
                maxMistakes={currentLevel.maxMistakes}
                currentMistakes={present.mistakes}
                operationsCount={present.operations.length}
                totalNodes={currentLevel.nodes.length}
                processedCount={processedCount}
                canUndo={canUndo}
                canRedo={canRedo}
                isPlaying={isPlaying}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
