import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, RotateCcw } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import GameCanvas from '../components/game/GameCanvas';
import ControlPanel from '../components/game/ControlPanel';
import BeatIndicator from '../components/game/BeatIndicator';
import StatusBar from '../components/game/StatusBar';
import WaveformDisplay from '../components/game/WaveformDisplay';

const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentPhase, startGame, currentSonarPulse, resetGame } = useGameStore();

  useEffect(() => {
    if (currentPhase === 'intro') {
      startGame();
    }
  }, [currentPhase, startGame]);

  const latestWaveform = currentSonarPulse?.echoes[0]?.waveformData || Array(100).fill(0);

  const handleBackToHome = () => {
    resetGame();
    navigate('/');
  };

  return (
    <div className="min-h-screen deep-grid p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleBackToHome}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm">返回首页</span>
          </button>
          
          <h1 className="font-display text-xl text-tech-cyan-400">
            基础声呐导航
          </h1>

          <div className="flex gap-2">
            <button
              onClick={() => navigate('/report')}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-deep-ocean-800 text-gray-300 rounded-lg hover:bg-deep-ocean-700 transition-colors"
            >
              <FileText size={16} />
              报告
            </button>
            <button
              onClick={() => { resetGame(); startGame(); }}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-deep-ocean-800 text-gray-300 rounded-lg hover:bg-deep-ocean-700 transition-colors"
            >
              <RotateCcw size={16} />
              重置
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-3 space-y-4">
            <GameCanvas />
            
            <div className="glow-border rounded-lg p-4 bg-deep-ocean-950/50">
              <h3 className="text-tech-cyan-500 font-display text-sm mb-3">回声波形</h3>
              <WaveformDisplay
                data={latestWaveform}
                color={currentSonarPulse?.isMisjudged ? '#ff6b35' : '#00d4ff'}
                label={currentSonarPulse ? '扫描中...' : '等待声呐发射'}
                height={100}
              />
              {currentSonarPulse?.isMisjudged && (
                <div className="mt-2 text-xs text-warning-orange-400 bg-warning-orange-500/10 rounded p-2">
                  ⚠️ 检测到波形异常 - 可能存在回声误判
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <StatusBar />
            <BeatIndicator />
            <ControlPanel />
          </div>
        </div>

        {(currentPhase === 'completed' || currentPhase === 'failed') && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="glow-border rounded-xl p-8 bg-deep-ocean-950 max-w-md w-full mx-4 text-center">
              <div className={`text-6xl mb-4 ${currentPhase === 'completed' ? 'text-sonar-green-400' : 'text-danger-red-400'}`}>
                {currentPhase === 'completed' ? '🎉' : '💥'}
              </div>
              <h2 className={`font-display text-2xl mb-2 ${currentPhase === 'completed' ? 'text-sonar-green-400' : 'text-danger-red-400'}`}>
                {currentPhase === 'completed' ? '任务完成！' : '任务失败'}
              </h2>
              <p className="text-gray-400 mb-6">
                {currentPhase === 'completed' 
                  ? '恭喜你成功抵达目标点！' 
                  : '潜艇撞上了暗礁，请重试'}
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glow-border rounded-lg p-3">
                  <div className="text-xs text-gray-500">最终得分</div>
                  <div className="text-2xl font-display text-sonar-green-400">
                    {useGameStore.getState().score}
                  </div>
                </div>
                <div className="glow-border rounded-lg p-3">
                  <div className="text-xs text-gray-500">误判次数</div>
                  <div className="text-2xl font-display text-warning-orange-400">
                    {useGameStore.getState().misjudgments.length}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { resetGame(); startGame(); }}
                  className="flex-1 py-3 bg-tech-cyan-500 hover:bg-tech-cyan-400 text-deep-ocean-950 font-display rounded-lg transition-all"
                >
                  再次挑战
                </button>
                <button
                  onClick={() => navigate('/report')}
                  className="flex-1 py-3 bg-deep-ocean-800 hover:bg-deep-ocean-700 text-white font-display rounded-lg transition-all border border-tech-cyan-500/30"
                >
                  查看报告
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePage;
