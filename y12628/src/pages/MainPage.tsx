import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, Undo, Redo, Clock, Target, AlertTriangle } from 'lucide-react';
import { useAppStore, STICKER_TYPES } from '../store';
import StickerCanvas from '../components/StickerCanvas';
import ErrorToast from '../components/ErrorToast';
import type { StickerType } from '../types';

const MainPage = () => {
  const {
    game,
    stickers,
    errors,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    finishGame,
    updateElapsedTime,
    addSticker,
    undo,
    redo,
    canUndo,
    canRedo,
    clearError,
  } = useAppStore();

  const [selectedType, setSelectedType] = useState<StickerType | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (game.status === 'playing') {
      timerRef.current = window.setInterval(() => {
        if (game.startTime) {
          const elapsed = Date.now() - game.startTime;
          updateElapsedTime(elapsed);
        }
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [game.status, game.startTime, updateElapsedTime]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (game.status !== 'playing' || !selectedType) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / 40) * 40;
    const y = Math.round((e.clientY - rect.top) / 40) * 40;

    addSticker(selectedType, x, y);
  };

  const handleStart = () => {
    if (game.status === 'idle') {
      startGame();
    } else if (game.status === 'paused') {
      resumeGame();
    }
  };

  const handlePause = () => {
    pauseGame();
  };

  const handleReset = () => {
    resetGame();
  };

  const handleFinish = () => {
    finishGame();
  };

  const getStatusClass = () => {
    switch (game.status) {
      case 'playing': return 'status-playing';
      case 'paused': return 'status-paused';
      case 'finished': return 'status-finished';
      default: return 'status-idle';
    }
  };

  const getStatusText = () => {
    switch (game.status) {
      case 'playing': return '进行中';
      case 'paused': return '已暂停';
      case 'finished': return '已完成';
      default: return '未开始';
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={`status-indicator ${getStatusClass()}`} />
              <span className="text-sm font-medium">{getStatusText()}</span>
            </div>

            <div className="flex items-center gap-2 text-white/80">
              <Clock className="w-4 h-4" />
              <span className="font-mono text-lg">{formatTime(game.elapsedTime)}</span>
            </div>

            <div className="flex items-center gap-2 text-white/80">
              <Target className="w-4 h-4" />
              <span className="text-sm">
                {game.placedStickers} / {game.totalStickers} 张贴纸
              </span>
            </div>

            <div className="w-48">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary-light transition-all duration-300"
                  style={{ width: `${game.progress}%` }}
                />
              </div>
              <p className="text-xs text-white/60 mt-1 text-right">{Math.round(game.progress)}%</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {game.status !== 'playing' ? (
              <button
                onClick={handleStart}
                className="btn-success flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {game.status === 'idle' ? '开始' : '继续'}
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="btn-warning flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                暂停
              </button>
            )}

            <button
              onClick={handleReset}
              className="btn-secondary flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              重开
            </button>

            <button
              onClick={handleFinish}
              disabled={game.status === 'idle' || game.status === 'finished'}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" />
              结算
            </button>

            <div className="w-px h-8 bg-white/20 mx-2" />

            <button
              onClick={undo}
              disabled={!canUndo()}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="撤销"
            >
              <Undo className="w-5 h-5" />
            </button>

            <button
              onClick={redo}
              disabled={!canRedo()}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="重做"
            >
              <Redo className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="w-64 glass-card p-4 space-y-4">
          <h3 className="text-sm font-semibold text-white/80">选择贴纸类型</h3>
          
          <div className="grid grid-cols-2 gap-2">
            {STICKER_TYPES.map((sticker) => (
              <button
                key={sticker.type}
                onClick={() => setSelectedType(sticker.type as StickerType)}
                disabled={game.status !== 'playing'}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  selectedType === sticker.type
                    ? 'border-white bg-white/20'
                    : 'border-transparent bg-white/5 hover:bg-white/10'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div
                  className="w-10 h-10 mx-auto rounded-lg sticker-shadow"
                  style={{ backgroundColor: sticker.color }}
                />
                <p className="text-xs mt-2 text-center text-white/80">{sticker.label}</p>
              </button>
            ))}
          </div>

          {selectedType && game.status === 'playing' && (
            <div className="p-3 bg-primary/20 border border-primary/30 rounded-lg">
              <p className="text-xs text-primary-light">
                💡 点击画布放置「{STICKER_TYPES.find(s => s.type === selectedType)?.label}」贴纸
              </p>
            </div>
          )}

          {game.status !== 'playing' && (
            <div className="p-3 bg-warning/20 border border-warning/30 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
              <p className="text-xs text-warning-light">
                {game.status === 'idle' ? '点击「开始」按钮开始标注' : '游戏已暂停，点击「继续」恢复'}
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 glass-card p-4">
          <StickerCanvas
            stickers={stickers}
            onCanvasClick={handleCanvasClick}
            interactive={game.status === 'playing'}
          />
        </div>
      </div>

      <ErrorToast errors={errors} onClose={clearError} />
    </div>
  );
};

export default MainPage;
