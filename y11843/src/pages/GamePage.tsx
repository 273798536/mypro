import { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useGameLoop } from '../hooks/useGameLoop';
import { GameControls } from '../components/game/GameControls';
import { BeatIndicator } from '../components/game/BeatIndicator';
import { VoiceTrack } from '../components/game/VoiceTrack';
import { VolumeSlider } from '../components/game/VolumeSlider';
import { JudgeEffect } from '../components/game/JudgeEffect';
import { ScorePanel } from '../components/result/ScorePanel';
import { ProblemList } from '../components/result/ProblemList';
import { TimelinePlayer } from '../components/review/TimelinePlayer';
import { Music, Hand } from 'lucide-react';

export function GamePage() {
  const { status, currentTrack, handleNoteHit } = useGameStore();
  useGameLoop();
  const [showReview, setShowReview] = useState(false);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  const pixelsPerSecond = 150;
  const trackHeight = 80;

  useEffect(() => {
    if (status !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, string> = {
        '1': 'soprano',
        '2': 'alto',
        '3': 'tenor',
        '4': 'bass',
      };
      const partId = keyMap[e.key];
      if (partId) {
        setPressedKey(e.key);
        handleNoteHit(partId);
        setTimeout(() => setPressedKey(null), 150);
      }
    };

    const handleKeyUp = () => {
      setPressedKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [status, handleNoteHit]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Music className="w-10 h-10 text-cyan-400" />
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              合唱指挥练习局
            </h1>
          </div>
          <p className="text-slate-400">让声部看见节奏 · 让平衡成为直觉</p>
        </header>

        {status !== 'finished' ? (
          <>
            <div className="flex justify-center mb-6">
              <GameControls />
            </div>

            <div className="flex justify-center mb-6">
              <BeatIndicator />
            </div>

            {status === 'idle' && (
              <div className="max-w-2xl mx-auto mb-6 p-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                  <Hand className="w-5 h-5" />
                  操作说明
                </h3>
                <ul className="space-y-2 text-slate-300">
                  <li>• 点击「开始练习」进入练习模式</li>
                  <li>• 使用音量滑块调整各声部音量平衡</li>
                  <li>• 按下对应数字键 (1-4) 触发该声部进入</li>
                  <li>• 女高音: 1键 | 女低音: 2键 | 男高音: 3键 | 男低音: 4键</li>
                  <li>• 注意观察节拍，在音符到达判定线时准确触发</li>
                </ul>
              </div>
            )}

            <div className="mb-6 p-4 bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30">
              <h3 className="text-sm font-medium text-slate-400 mb-3">声部音量控制</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {currentTrack.parts.map((part) => (
                  <VolumeSlider
                    key={part.id}
                    partId={part.id}
                    partName={part.name}
                    color={part.color}
                    isMain={part.isMain}
                  />
                ))}
              </div>
            </div>

            <div className="relative p-6 bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30">
              <JudgeEffect />
              
              <div className="space-y-3">
                {currentTrack.parts.map((part) => (
                  <div key={part.id} className="relative group">
                    <VoiceTrack
                      part={part}
                      trackHeight={trackHeight}
                      pixelsPerSecond={pixelsPerSecond}
                    />
                    <button
                      onClick={() => handleNoteHit(part.id)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95"
                      style={{ 
                        backgroundColor: part.color + '40',
                        borderColor: part.color,
                        borderWidth: 2,
                      }}
                    >
                      触发
                    </button>
                  </div>
                ))}
              </div>

              {status === 'paused' && (
                <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-amber-400 mb-2">已暂停</div>
                    <div className="text-slate-400">点击「继续」恢复练习</div>
                  </div>
                </div>
              )}
            </div>

            {status === 'playing' && (
              <KeyboardHints pressedKey={pressedKey} />
            )}
          </>
        ) : (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <ScorePanel />
              <ProblemList />
            </div>

            {!showReview ? (
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowReview(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-400 hover:to-pink-400 transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 active:scale-95"
                >
                  查看详细复盘
                </button>
                <button
                  onClick={() => useGameStore.getState().restartGame()}
                  className="px-6 py-3 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  再来一次
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <TimelinePlayer />
                <div className="flex justify-center">
                  <button
                    onClick={() => useGameStore.getState().restartGame()}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-400 transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 active:scale-95"
                  >
                    返回练习
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface KeyboardHintsProps {
  pressedKey: string | null;
}

function KeyboardHints({ pressedKey }: KeyboardHintsProps) {
  const keys = [
    { key: '1', label: '女高', color: '#ff6b9d' },
    { key: '2', label: '女低', color: '#c084fc' },
    { key: '3', label: '男高', color: '#60a5fa' },
    { key: '4', label: '男低', color: '#34d399' },
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
      {keys.map(({ key, label, color }) => (
        <div
          key={key}
          className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-150 ${
            pressedKey === key
              ? 'scale-95 bg-slate-700'
              : 'bg-slate-800/80'
          }`}
          style={{
            borderColor: pressedKey === key ? color : 'rgba(100, 116, 139, 0.5)',
            borderWidth: 2,
            boxShadow: pressedKey === key ? `0 0 20px ${color}40` : 'none',
          }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg"
            style={{
              backgroundColor: color + '30',
              color: color,
            }}
          >
            {key}
          </div>
          <span className="text-xs text-slate-400">{label}</span>
        </div>
      ))}
    </div>
  );
}
