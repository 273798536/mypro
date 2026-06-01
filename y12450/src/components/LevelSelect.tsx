import { useState } from 'react';
import { LEVELS } from '../data/levels';
import { useGameStore } from '../store/gameStore';

const LevelSelect = () => {
  const [playerName, setPlayerName] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const initLevel = useGameStore(state => state.initLevel);

  const difficultyColors = {
    easy: 'bg-green-600',
    medium: 'bg-yellow-600',
    hard: 'bg-red-600'
  };

  const difficultyLabels = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
  };

  const handleStart = () => {
    if (playerName && selectedLevel) {
      initLevel(selectedLevel, playerName);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">选择关卡</h2>
        <p className="text-gray-400">
          体验债券现金流处理的完整流程，从票息支付到违约处置</p>
      </div>

      <div className="mb-8">
        <label className="block text-gray-300 mb-2">输入你的名字</label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="请输入玩家姓名"
          className="w-full px-4 py-3 bg-rail-card border border-gray-600 rounded-lg text-white focus:outline-none focus:border-rail-info"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {LEVELS.map((level) => (
          <div
            key={level.id}
            onClick={() => setSelectedLevel(level.id)}
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
              selectedLevel === level.id
                ? 'border-rail-info bg-rail-accent'
                : 'border-gray-600 bg-rail-card hover:border-gray-500'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-semibold text-white">{level.name}</h3>
              <span className={`px-3 py-1 rounded-full text-xs text-white ${difficultyColors[level.difficulty]}`}>
                {difficultyLabels[level.difficulty]}
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-4">{level.description}</p>
            <div className="flex flex-wrap gap-2">
              {level.hasCouponDeferral && (
                <span className="px-2 py-1 bg-rail-warning/20 text-rail-warning text-xs rounded">
                  票息顺延
                </span>
              )}
              {level.hasPutOption && (
                <span className="px-2 py-1 bg-rail-info/20 text-rail-info text-xs rounded">
                  回售选择权
                </span>
              )}
              {level.hasDefaultEvent && (
                <span className="px-2 py-1 bg-rail-danger/20 text-rail-danger text-xs rounded">
                  违约事件
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <button
          onClick={handleStart}
          disabled={!playerName || !selectedLevel}
          className={`px-8 py-3 bg-rail-info text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rail-info/80`}
        >
          开始挑战
        </button>
      </div>
    </div>
  );
};

export default LevelSelect;
