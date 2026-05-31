import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Undo2, Send, Settings } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

interface ControlPanelProps {
  onSubmit: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ onSubmit }) => {
  const { undoLastDefect, resetGame, placedDefects, isSubmitted, updateMinecartId, minecartId } = useGameStore();
  const [showSettings, setShowSettings] = useState(false);
  const [newMinecartId, setNewMinecartId] = useState(minecartId);

  const handleUpdateMinecart = () => {
    updateMinecartId(newMinecartId);
    setShowSettings(false);
  };

  return (
    <div className="p-6 bg-slate-900/80 rounded-xl border border-slate-700 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">操作控制</h3>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <Settings size={18} />
        </button>
      </div>

      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 p-4 bg-slate-800/50 rounded-lg"
        >
          <label className="block text-sm text-slate-400 mb-2">矿车标识</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newMinecartId}
              onChange={(e) => setNewMinecartId(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="输入矿车标识"
            />
            <button
              onClick={handleUpdateMinecart}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-colors"
            >
              更新
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={undoLastDefect}
          disabled={placedDefects.length === 0 || isSubmitted}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Undo2 size={18} />
          <span className="text-sm">撤销</span>
        </button>

        <button
          onClick={resetGame}
          disabled={isSubmitted}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-red-900/50 text-red-300 rounded-lg hover:bg-red-800/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-red-700/50"
        >
          <RotateCcw size={18} />
          <span className="text-sm">重置</span>
        </button>
      </div>

      <button
        onClick={onSubmit}
        disabled={placedDefects.length === 0 || isSubmitted}
        className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
      >
        <Send size={18} />
        <span className="font-medium">提交游戏</span>
      </button>

      {isSubmitted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-green-900/30 border border-green-500/30 rounded-lg text-center"
        >
          <p className="text-green-400 text-sm">游戏已提交！查看下方报告</p>
        </motion.div>
      )}
    </div>
  );
};

export default ControlPanel;
