
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, History, Play, ArrowRight, Users } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { VoiceTrack } from '../components/game/VoiceTrack';
import { GesturePanel } from '../components/game/GesturePanel';
import { StatusPanel } from '../components/game/StatusPanel';
import { SCENES, VoicePart, GestureType } from '../types';
import { cn } from '../lib/utils';

export const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    session,
    isPlaying,
    selectedTarget,
    showAnimation,
    lastAction,
    startGame,
    makeDecision,
    nextRound,
    setSelectedTarget,
  } = useGameStore();

  const [selectedScene, setSelectedScene] = useState(0);

  const handleStartGame = () => {
    const scene = SCENES[selectedScene];
    startGame(scene.name, scene.rounds);
  };

  const handleGesture = (gesture: GestureType) => {
    makeDecision(gesture);
  };

  const handleNextRound = () => {
    nextRound();
  };

  const handleTargetSelect = (part: VoicePart | 'all') => {
    setSelectedTarget(part);
  };

  if (!isPlaying || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/20 mb-6">
              <Music className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">合唱声部防线</h1>
            <p className="text-white/60 text-lg">
              通过指挥手势协调各声部，保持音量平衡和节奏同步
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 mb-8">
            <h3 className="text-xl font-bold text-white mb-6">选择训练曲目</h3>
            <div className="space-y-3">
              {SCENES.map((scene, index) => (
                <button
                  key={scene.name}
                  onClick={() => setSelectedScene(index)}
                  className={cn(
                    'w-full flex items-center justify-between p-4 rounded-xl transition-all',
                    selectedScene === index
                      ? 'bg-amber-500/20 border-2 border-amber-400'
                      : 'bg-white/5 border border-white/10 hover:border-white/30'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <Play className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-white">{scene.name}</div>
                      <div className="text-sm text-white/50">{scene.rounds} 回合</div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium',
                      scene.difficulty === '简单' && 'bg-green-500/20 text-green-400',
                      scene.difficulty === '中等' && 'bg-yellow-500/20 text-yellow-400',
                      scene.difficulty === '困难' && 'bg-red-500/20 text-red-400'
                    )}
                  >
                    {scene.difficulty}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleStartGame}
              className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              开始训练
            </button>
            <button
              onClick={() => navigate('/history')}
              className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all flex items-center gap-2"
            >
              <History className="w-5 h-5" />
              历史记录
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (session.status === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/20 flex items-center justify-center mx-auto mb-6">
            <Music className="w-12 h-12 text-amber-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">训练完成！</h2>
          <p className="text-white/60 mb-8">查看详细分析报告</p>
          <button
            onClick={() => navigate(`/result/${session.id}`)}
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/30 flex items-center gap-2 mx-auto"
          >
            查看报告
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 flex items-center justify-center">
              <Music className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">合唱声部防线</h1>
              <p className="text-sm text-white/60">{session.sceneName}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            历史记录
          </button>
        </div>

        {lastAction && (
          <div className="mb-6 p-4 bg-amber-500/20 border border-amber-400/50 rounded-xl text-amber-400 text-center font-medium animate-pulse">
            {lastAction}
          </div>
        )}

        <div className="mb-6">
          <StatusPanel session={session} />
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              声部轨道
            </h3>
            <button
              onClick={() => handleTargetSelect('all')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedTarget === 'all'
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              )}
            >
              全部声部
            </button>
          </div>
          <div className="flex gap-4 flex-wrap">
            {session.voiceStates.map((voice) => (
              <VoiceTrack
                key={voice.part}
                voice={voice}
                isSelected={selectedTarget === voice.part}
                onSelect={() => handleTargetSelect(voice.part)}
                showAnimation={showAnimation}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <GesturePanel onGesture={handleGesture} />
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 text-center">操作</h3>
            <p className="text-white/60 text-sm text-center mb-6">
              当前目标:{' '}
              <span className="text-amber-400 font-medium">
                {selectedTarget === 'all'
                  ? '全部声部'
                  : session.voiceStates.find((v) => v.part === selectedTarget)?.name}
              </span>
            </p>
            <button
              onClick={handleNextRound}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-5 h-5" />
              下一回合
            </button>
            <p className="text-xs text-white/40 text-center mt-3">
              完成当前回合的指挥操作后进入下一回合
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

