import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { BaggageTag } from '../components/BaggageTag';
import { ConveyorBelt } from '../components/ConveyorBelt';
import { ScorePanel } from '../components/ScorePanel';
import { Timer } from '../components/Timer';
import { ErrorToast } from '../components/ErrorToast';
import { ExitType } from '../types';
import { Home, Pause, Play } from 'lucide-react';

const ALL_EXITS: ExitType[] = [
  'gate_A', 'gate_B', 'gate_C', 'gate_D',
  'oversized', 'transfer_urgent', 'transfer_normal', 'delayed'
];

export const Game: React.FC = () => {
  const {
    currentLevel,
    score,
    combo,
    maxCombo,
    timeRemaining,
    currentBaggage,
    conveyorBelts,
    actions,
    activeError,
    gameStatus,
    setPage,
    switchConveyor,
    pauseGame,
    resumeGame,
    dismissError,
  } = useGameStore();

  const [selectedBaggage, setSelectedBaggage] = useState<string | null>(null);

  const handleSelectBelt = (baggageId: string, beltId: number) => {
    setSelectedBaggage(null);
    useGameStore.setState(state => ({
      currentBaggage: state.currentBaggage.map(b =>
        b.id === baggageId ? { ...b, selectedBelt: beltId } : b
      ),
    }));
  };

  const correctCount = actions.filter(a => a.errorType === 'none').length;

  if (!currentLevel) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-conveyor-100 via-gray-50 to-conveyor-100">
      <Timer />
      <ErrorToast error={activeError} onDismiss={dismissError} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPage('home')}
              className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Home size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{currentLevel.name}</h1>
              <p className="text-sm text-gray-500">{currentLevel.description}</p>
            </div>
          </div>
          <button
            onClick={gameStatus === 'playing' ? pauseGame : resumeGame}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {gameStatus === 'playing' ? (
              <><Pause size={18} /> 暂停</>
            ) : (
              <><Play size={18} /> 继续</>
            )}
          </button>
        </div>

        <ScorePanel
          score={score}
          combo={combo}
          maxCombo={maxCombo}
          timeRemaining={timeRemaining}
          totalBaggage={actions.length}
          correctCount={correctCount}
        />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4">传送系统</h2>
              
              <div className="space-y-4">
                {conveyorBelts.map(belt => (
                  <ConveyorBelt
                    key={belt.id}
                    belt={belt}
                    exits={ALL_EXITS}
                    onSwitchExit={(exit) => switchConveyor(belt.id, exit)}
                    isActive={currentBaggage.some(b => b.selectedBelt === belt.id)}
                  />
                ))}
              </div>

              <div className="mt-8">
                <h3 className="text-md font-bold text-gray-800 mb-4">待分拣行李</h3>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  <AnimatePresence>
                    {currentBaggage
                      .filter(b => b.selectedBelt === null)
                      .map(baggage => (
                        <motion.div
                          key={baggage.id}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex-shrink-0"
                        >
                          <BaggageTag
                            baggage={baggage}
                            onSelectBelt={(beltId) => handleSelectBelt(baggage.id, beltId)}
                            selectedBelt={selectedBaggage === baggage.id ? null : baggage.selectedBelt}
                          />
                        </motion.div>
                      ))}
                  </AnimatePresence>
                  {currentBaggage.filter(b => b.selectedBelt === null).length === 0 && (
                    <div className="text-gray-400 text-sm py-8 text-center w-full">
                      等待下一件行李...
                    </div>
                  )}
                </div>
              </div>

              {currentBaggage.filter(b => b.selectedBelt !== null).length > 0 && (
                <div className="mt-4">
                  <h3 className="text-md font-bold text-gray-800 mb-4">传送中</h3>
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {currentBaggage
                      .filter(b => b.selectedBelt !== null)
                      .map(baggage => (
                        <div
                          key={baggage.id}
                          className="flex-shrink-0 opacity-70"
                          style={{
                            transform: `translateX(${baggage.position}px)`,
                            transition: 'transform 0.5s linear',
                          }}
                        >
                          <BaggageTag
                            baggage={baggage}
                            showControls={false}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3">快速操作提示</h3>
              <div className="text-xs text-gray-600 space-y-2">
                <p>1. 查看行李牌上的信息</p>
                <p>2. 点击行李下方选择传送带编号</p>
                <p>3. 确保传送带目标出口正确</p>
                <p>4. 行李将自动传送并计分</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3">图例说明</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-warning-500" />
                  <span className="text-gray-600">超规行李</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  <span className="text-gray-600">延误航班</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-orange-500" />
                  <span className="text-gray-600">加急转机</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-teal-500" />
                  <span className="text-gray-600">普通转机</span>
                </div>
              </div>
            </div>

            <div className="bg-aviation-50 rounded-2xl p-4 border border-aviation-100">
              <h3 className="font-bold text-aviation-800 mb-2">进度</h3>
              <div className="text-3xl font-mono font-bold text-aviation-600">
                {actions.length} / {currentLevel.baggageCount}
              </div>
              <div className="mt-2 h-2 bg-aviation-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-aviation-500 rounded-full transition-all duration-300"
                  style={{ width: `${(actions.length / currentLevel.baggageCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {gameStatus === 'paused' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-40"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-4">游戏暂停</h2>
              <p className="text-gray-600 mb-6">休息一下，准备好了再继续</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setPage('home')}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  返回首页
                </button>
                <button
                  onClick={resumeGame}
                  className="flex-1 py-3 bg-aviation-500 text-white rounded-xl hover:bg-aviation-600 transition-colors"
                >
                  继续游戏
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
