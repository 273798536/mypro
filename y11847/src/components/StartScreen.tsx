import React from 'react';

interface StartScreenProps {
  onStart: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="text-6xl mb-4">🌧️🏙️🌳</div>
          <h1 className="text-4xl font-bold text-white mb-2">城市雨洪调度牌</h1>
          <p className="text-xl text-gray-400">海绵城市科普卡牌游戏</p>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 mb-8 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">📖 游戏规则</h2>
          <div className="text-left text-gray-300 space-y-3 text-sm">
            <p>🎯 <strong>目标：</strong>在5轮降雨中，合理调度泵站、雨水花园和管网，保持城市不发生严重内涝。</p>
            <p>🃏 <strong>每回合：</strong>系统随机抽取一张雨量卡，你需要打出调度卡牌来应对。</p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-amber-600/20 p-3 rounded-lg border border-amber-600/50">
                <div className="text-amber-400 font-bold">⚙️ 泵站卡牌</div>
                <p className="text-xs text-gray-400 mt-1">快速排水但增加负荷</p>
              </div>
              <div className="bg-emerald-600/20 p-3 rounded-lg border border-emerald-600/50">
                <div className="text-emerald-400 font-bold">🌳 雨水花园</div>
                <p className="text-xs text-gray-400 mt-1">生态蓄水但容量有限</p>
              </div>
              <div className="bg-slate-600/20 p-3 rounded-lg border border-slate-500/50">
                <div className="text-slate-300 font-bold">🔧 管网调度</div>
                <p className="text-xs text-gray-400 mt-1">缓解低洼积水问题</p>
              </div>
              <div className="bg-blue-600/20 p-3 rounded-lg border border-blue-600/50">
                <div className="text-blue-400 font-bold">🌧️ 雨量卡</div>
                <p className="text-xs text-gray-400 mt-1">每回合的挑战来源</p>
              </div>
            </div>
            <p className="mt-4">⚠️ <strong>注意：</strong>泵站过载、低洼积水、绿地耗尽都会触发警告并扣分！</p>
            <p>🔍 <strong>追踪：</strong>每一步操作的计算过程都可追溯，让你明白分数的由来。</p>
          </div>
        </div>

        <button
          onClick={onStart}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-4 px-12 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-blue-500/30 text-xl"
        >
          🎮 开始游戏
        </button>
      </div>
    </div>
  );
};
