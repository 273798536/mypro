import React, { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { ControlBar } from './components/ControlBar';
import { GameBoard } from './components/GameBoard';
import { InfoPanel } from './components/InfoPanel';
import { ResultModal } from './components/ResultModal';
import { SampleSelector } from './components/SampleSelector';
import { useGameStore } from './store/useGameStore';

function App() {
  const { state } = useGameStore();
  const [showResult, setShowResult] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  useEffect(() => {
    if (state.phase === 'ended') {
      setShowResult(true);
    }
  }, [state.phase]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-amber-50 to-blue-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🌾</span>
            <div>
              <h1 className="text-3xl font-bold text-green-800" style={{ fontFamily: '"Noto Serif SC", serif' }}>
                农田灌溉阀门棋
              </h1>
              <p className="text-sm text-gray-600">农技站教学模拟系统</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTutorial(true)}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all"
            >
              📖 游戏说明
            </button>
            <button
              onClick={() => setShowSamples(true)}
              className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-all"
            >
              <BookOpen size={18} />
              教学样例
            </button>
          </div>
        </div>

        <ControlBar />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <GameBoard />
          </div>
          <div className="lg:col-span-1">
            <InfoPanel />
          </div>
        </div>

        {state.phase === 'idle' && showTutorial && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
              <h2 className="text-2xl font-bold text-green-800 mb-4 flex items-center gap-2">
                🎮 游戏说明
              </h2>
              <div className="space-y-3 text-gray-700">
                <div className="bg-blue-50 rounded-lg p-3">
                  <h3 className="font-bold text-blue-800 mb-1">🎯 游戏目标</h3>
                  <p className="text-sm">通过开关阀门控制水流，让所有地块的作物得到适量的灌溉，避免干旱和过度灌溉。</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <h3 className="font-bold text-green-800 mb-1">🕹️ 操作方式</h3>
                  <ul className="text-sm space-y-1">
                    <li>• 点击红色/绿色方块切换阀门开关状态</li>
                    <li>• 调整好阀门后点击"下一回合"确认</li>
                    <li>• 系统会自动计算水流路径和灌溉效果</li>
                  </ul>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3">
                  <h3 className="font-bold text-yellow-800 mb-1">⚠️ 注意事项</h3>
                  <ul className="text-sm space-y-1">
                    <li>• 上游阀门关闭会导致下游断水</li>
                    <li>• 水量超过需水量120%视为过度灌溉</li>
                    <li>• 水量低于需水量50%视为严重干旱</li>
                    <li>• 天气会影响蒸发量，注意调整策略</li>
                  </ul>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <h3 className="font-bold text-purple-800 mb-1">📊 结算与报告</h3>
                  <p className="text-sm">游戏结束后可查看详细报告，包括操作回放、异常记录、得分详情，并支持导出PDF/TXT格式。</p>
                </div>
              </div>
              <button
                onClick={() => setShowTutorial(false)}
                className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-all"
              >
                我知道了
              </button>
            </div>
          </div>
        )}

        {showResult && (
          <ResultModal onClose={() => setShowResult(false)} />
        )}

        {showSamples && (
          <SampleSelector onClose={() => setShowSamples(false)} />
        )}
      </div>
    </div>
  );
}

export default App;
