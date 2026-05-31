import { Play, Pause, RotateCcw, HelpCircle, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { formatTime } from '../utils/common';
import { useTimer } from '../hooks/useTimer';
import { SCENARIOS, difficultyColors, difficultyLabels } from '../data/scenarios';

interface ControlBarProps {
  onHelp: () => void;
}

export function ControlBar({ onHelp }: ControlBarProps) {
  const {
    status,
    currentRound,
    totalRounds,
    score,
    maxScore,
    scenario,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    setScenario,
    exportGameRecord,
  } = useGameStore();

  const { elapsedTime } = useTimer();

  const isIdle = status === 'idle';
  const isPlaying = status === 'playing';
  const isPaused = status === 'paused';
  const isSettled = status === 'settled';

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl p-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">雨</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">城市雨洪卡牌局</h1>
                  <p className="text-xs text-slate-400">海绵城市应急处置模拟</p>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-700" />

              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-400">场景：</label>
                <select
                  value={scenario.id}
                  onChange={e => {
                    const selected = SCENARIOS.find(s => s.id === e.target.value);
                    if (selected) setScenario(selected);
                  }}
                  disabled={!isIdle}
                  className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                >
                  {SCENARIOS.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({difficultyLabels[s.difficulty]})
                    </option>
                  ))}
                </select>
                <span className={`text-sm font-medium ${difficultyColors[scenario.difficulty]}`}>
                  {difficultyLabels[scenario.difficulty]}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="text-slate-400 text-xs">回合</div>
                  <div className="text-white font-mono text-lg font-bold">
                    {currentRound}
                    <span className="text-slate-500 text-sm">/{totalRounds}</span>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-slate-400 text-xs">时间</div>
                  <div className="text-white font-mono text-lg font-bold">
                    {formatTime(elapsedTime)}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-slate-400 text-xs">得分</div>
                  <div className="text-cyan-400 font-mono text-lg font-bold">
                    {score.toFixed(0)}
                    <span className="text-slate-500 text-sm">/{maxScore}</span>
                  </div>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-700" />

              <div className="flex items-center gap-2">
                {isIdle && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startGame}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium rounded-lg shadow-lg shadow-emerald-500/25 transition-all"
                  >
                    <Play size={18} />
                    开始游戏
                  </motion.button>
                )}

                {isPlaying && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={pauseGame}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-white font-medium rounded-lg shadow-lg shadow-amber-500/25 transition-all"
                  >
                    <Pause size={18} />
                    暂停
                  </motion.button>
                )}

                {isPaused && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={resumeGame}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg shadow-lg shadow-emerald-500/25 transition-all"
                  >
                    <Play size={18} />
                    继续
                  </motion.button>
                )}

                {(isPlaying || isPaused || isSettled) && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={restartGame}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-all"
                  >
                    <RotateCcw size={18} />
                    重开
                  </motion.button>
                )}

                {isSettled && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={exportGameRecord}
                    className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg shadow-lg shadow-cyan-500/25 transition-all"
                  >
                    <Download size={18} />
                    导出成绩
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onHelp}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all"
                  title="帮助说明"
                >
                  <HelpCircle size={20} />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
