import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, MapPin, Clock, Zap, AlertTriangle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getGameRecordById } from '../utils/storage';
import { GameRecord, GameState } from '../types/game';
import WarehouseGrid from '../components/game/WarehouseGrid';

const Replay: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    if (id) {
      const gameRecord = getGameRecordById(id);
      if (gameRecord) {
        setRecord(gameRecord);
      }
    }
  }, [id]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && record && currentStepIndex < record.steps.length - 1) {
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= record.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 500 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, record, currentStepIndex, playbackSpeed]);

  if (!record) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">找不到游戏记录</p>
          <button
            onClick={() => navigate('/history')}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
          >
            返回历史记录
          </button>
        </div>
      </div>
    );
  }

  const currentStep = record.steps[currentStepIndex];
  const currentState: GameState = currentStep.stateSnapshot;

  const pathFindingAtCurrentStep = record.result.pathFindingTriggers.filter(
    (pf) => pf.triggerStep === currentStepIndex
  );

  const handleStepChange = (index: number) => {
    setCurrentStepIndex(index);
    setIsPlaying(false);
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  const handlePrevStep = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
    setIsPlaying(false);
  };

  const handleNextStep = () => {
    setCurrentStepIndex((prev) => Math.min(record.steps.length - 1, prev + 1));
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/history')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">回放分析</h1>
              <p className="text-xs text-slate-400">
                {record.sceneName} - {record.playerName}
              </p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg ${
            record.result.isWin ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {record.result.isWin ? '胜利' : '失败'} | 得分: {record.result.finalScore}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="lg:col-span-3">
            <WarehouseGrid
              scene={record.initialScene}
              gameState={currentState}
            />
          </div>
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-sm font-bold text-white mb-3">当前状态</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">时间</span>
                  <span className="text-white">{currentState.currentTime} / {currentState.maxTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">得分</span>
                  <span className="text-orange-400 font-bold">{currentState.score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">步骤</span>
                  <span className="text-white">{currentStepIndex + 1} / {record.steps.length}</span>
                </div>
              </div>
            </div>

            {pathFindingAtCurrentStep.length > 0 && (
              <div className="bg-purple-900/30 border border-purple-600 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-400 font-bold mb-2">
                  <MapPin className="w-4 h-4" />
                  寻路触发
                </div>
                {pathFindingAtCurrentStep.map((pf) => (
                  <div key={pf.id} className="text-sm text-slate-300">
                    <span className="text-blue-400">{pf.robotName}</span>
                    <p className="text-xs text-slate-400 mt-1">{pf.triggerReason}</p>
                  </div>
                ))}
              </div>
            )}

            {record.pauseRecords.length > 0 && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-500 font-bold mb-2">
                  <Clock className="w-4 h-4" />
                  暂停记录
                </div>
                <div className="text-sm text-slate-300">
                  总暂停: {record.result.pauseImpact.totalPauseTime} 秒
                </div>
                <div className="text-sm text-yellow-400">
                  扣分: -{record.result.pauseImpact.scoreReduction}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleRestart}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <SkipBack className="w-5 h-5 text-slate-300" />
              </button>
              <button
                onClick={handlePrevStep}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <SkipBack className="w-5 h-5 text-slate-300" style={{ transform: 'scaleX(-1)' }} />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white" />
                )}
              </button>
              <button
                onClick={handleNextStep}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <SkipForward className="w-5 h-5 text-slate-300" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">速度:</span>
              {[0.5, 1, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <input
              type="range"
              min={0}
              max={record.steps.length - 1}
              value={currentStepIndex}
              onChange={(e) => handleStepChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>开始</span>
              <span>步骤 {currentStepIndex + 1}</span>
              <span>结束</span>
            </div>
          </div>

          <div className="mt-4 flex gap-1 overflow-x-auto pb-2">
            {record.result.pathFindingTriggers.map((pf) => (
              <div
                key={pf.id}
                onClick={() => handleStepChange(pf.triggerStep)}
                className="flex-shrink-0 w-3 h-3 bg-purple-500 rounded-full cursor-pointer hover:scale-125 transition-transform"
                title={`${pf.robotName}: ${pf.triggerReason}`}
                style={{ marginLeft: `${(pf.triggerStep / (record.steps.length - 1)) * 100}%` }}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl p-4">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-500" />
              寻路触发记录
            </h3>
            {record.result.pathFindingTriggers.length === 0 ? (
              <p className="text-slate-400 text-sm">无寻路记录</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {record.result.pathFindingTriggers.map((pf) => (
                  <div
                    key={pf.id}
                    onClick={() => handleStepChange(pf.triggerStep)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      pf.triggerStep === currentStepIndex
                        ? 'bg-purple-500/30 border border-purple-500'
                        : 'bg-slate-700/50 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-blue-400 font-semibold">{pf.robotName}</span>
                      <span className="text-xs text-slate-500">步骤 {pf.triggerStep}</span>
                    </div>
                    <p className="text-sm text-slate-300 mt-1">{pf.triggerReason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              关键决策分析
            </h3>
            {record.result.keyDecisions.length === 0 ? (
              <p className="text-slate-400 text-sm">无决策记录</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {record.result.keyDecisions.map((decision, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-700/50 rounded-lg border-l-2 border-orange-500"
                  >
                    <p className="text-sm text-slate-300">{decision}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-slate-800 rounded-xl p-4">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            成绩明细
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-white">
                {record.result.scoreBreakdown.completedOrders}
              </div>
              <div className="text-xs text-slate-400 mt-1">完成订单</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-400">
                +{record.result.scoreBreakdown.baseScore}
              </div>
              <div className="text-xs text-slate-400 mt-1">基础分</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-400">
                +{record.result.scoreBreakdown.timeBonus}
              </div>
              <div className="text-xs text-slate-400 mt-1">时间奖励</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-400">
                -{record.result.scoreBreakdown.pausePenalty}
              </div>
              <div className="text-xs text-slate-400 mt-1">暂停惩罚</div>
            </div>
            <div className="bg-orange-600/20 rounded-lg p-4 text-center border border-orange-600">
              <div className="text-3xl font-bold text-orange-500">
                {record.result.finalScore}
              </div>
              <div className="text-xs text-orange-400 mt-1">最终得分</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Replay;
