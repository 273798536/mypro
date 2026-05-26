import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, RotateCcw, HelpCircle, Info } from 'lucide-react';
import { useGameStore } from '../hooks/useGameStore';
import { ReservoirScene } from '../components/ReservoirScene';
import { ControlPanel } from '../components/ControlPanel';
import { WaterLevelChart } from '../components/WaterLevelChart';
import { StatusPanel } from '../components/StatusPanel';
import { RoundLog } from '../components/RoundLog';
import { WeatherCard } from '../components/WeatherCard';

export function Game() {
  const navigate = useNavigate();
  const {
    started,
    status,
    round,
    maxRounds,
    weather,
    upstreamInflow,
    reservoirLevel,
    gateOpening,
    warningIssued,
    startGame,
    nextRound,
    resetGame,
  } = useGameStore();

  useEffect(() => {
    if (status !== 'playing' && started) {
      navigate('/result');
    }
  }, [status, started, navigate]);

  const handleStart = () => {
    startGame();
  };

  const handleNext = () => {
    nextRound();
  };

  const handleReset = () => {
    resetGame();
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-100 mb-2">水库闸门防洪棋</h1>
            <p className="text-slate-400">通过回合模拟理解防洪调度的取舍与权衡</p>
          </div>

          <div className="bg-slate-800 rounded-2xl p-6 mb-6 border border-slate-700">
            <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-400" />
              游戏规则
            </h2>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-2">
                <span className="text-blue-400">1.</span>
                <span>每回合抽取天气卡，确定上游来水量</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400">2.</span>
                <span>调整闸门开度控制泄洪，必要时发布预警</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400">3.</span>
                <span>水位超预警线未预警将扣分，溢洪将严重扣分</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400">4.</span>
                <span>开闸过猛或蓄水不足也会影响分数</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400">5.</span>
                <span>完成 {maxRounds} 回合且未溃坝即为胜利</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700">
              <div className="text-3xl mb-2">🌊</div>
              <div className="text-sm text-slate-400">开闸过猛</div>
              <div className="text-xs text-red-400">水位骤降扣分</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700">
              <div className="text-3xl mb-2">💧</div>
              <div className="text-sm text-slate-400">蓄水不足</div>
              <div className="text-xs text-blue-400">水位过低扣分</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700">
              <div className="text-3xl mb-2">⚠️</div>
              <div className="text-sm text-slate-400">预警太晚</div>
              <div className="text-xs text-orange-400">超预警线扣分</div>
            </div>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 rounded-xl text-lg font-bold
              bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500
              text-white shadow-lg shadow-blue-500/25
              transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Play className="w-6 h-6" />
            开始游戏
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-slate-100">水库闸门防洪棋</h1>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
              bg-slate-700 hover:bg-slate-600 text-slate-300
              transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重新开始
          </button>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-8 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ReservoirScene
                reservoirLevel={reservoirLevel}
                gateOpening={gateOpening}
                upstreamInflow={upstreamInflow}
                weatherType={weather.type}
                warningIssued={warningIssued}
              />
              <WeatherCard weather={weather} inflow={upstreamInflow} />
            </div>

            <WaterLevelChart height={180} />

            <RoundLog />
          </div>

          <div className="col-span-4 space-y-4">
            <StatusPanel />
            <ControlPanel />

            <div className="bg-slate-800 rounded-xl p-4">
              <button
                onClick={handleNext}
                disabled={status !== 'playing'}
                className="w-full py-4 rounded-xl text-lg font-bold
                  bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500
                  text-white shadow-lg shadow-green-500/25
                  transition-all duration-200 flex items-center justify-center gap-2
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-5 h-5" />
                确认操作 (回合 {round}/{maxRounds})
              </button>

              <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Info className="w-3 h-3" />
                  操作提示
                </div>
                <p className="text-xs text-slate-500">
                  调整闸门开度和预警状态后，点击上方按钮确认操作，进入下一回合
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
