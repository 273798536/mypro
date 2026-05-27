import { Play, Pause, RotateCcw, Eye, Zap, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../game/engine';
import { useState } from 'react';
import type { PreviewWarning } from '../game/types';

interface ControlPanelProps {
  onShowResult: () => void;
}

export const ControlPanel = ({ onShowResult }: ControlPanelProps) => {
  const navigate = useNavigate();
  const [showFieldWarning, setShowFieldWarning] = useState(false);

  const {
    gameState,
    startGame,
    pauseGame,
    resumeGame,
    resetLevel,
    showPreview,
    setShowPreview,
    showFieldLines,
    setShowFieldLines,
    charges,
  } = useGameStore();

  const handleStart = () => {
    const { canStart, warnings } = startGame();

    if (!canStart) {
      const pathWarning = warnings.find((w) => w.type === 'path_wall');
      if (pathWarning) {
        alert(`⚠️ ${pathWarning.message}\n\n请调整电荷位置后再启动。`);
      }
      return;
    }

    const fieldWarning = warnings.find((w) => w.type === 'field_too_strong');
    if (fieldWarning) {
      const confirmed = window.confirm(
        `⚠️ ${fieldWarning.message}\n\n是否仍然继续？可能导致小球运动失控。`
      );
      if (!confirmed) {
        return;
      }
    }
  };

  const handlePause = () => {
    if (gameState === 'running') {
      pauseGame();
    } else if (gameState === 'paused') {
      resumeGame();
    }
  };

  const handleReset = () => {
    if (window.confirm('确定要重新开始吗？当前进度将丢失。')) {
      resetLevel();
    }
  };

  const handleBack = () => {
    if (gameState === 'running' || gameState === 'paused') {
      if (!window.confirm('游戏进行中，确定要返回关卡选择吗？')) {
        return;
      }
    }
    navigate('/');
  };

  return (
    <div className="panel-glass p-4 space-y-4">
      <h3 className="font-display text-neon-cyan text-lg font-bold glow-text-cyan">
        🎮 控制面板
      </h3>

      <div className="space-y-3">
        {gameState === 'placing' && (
          <button
            className="w-full py-3 px-4 rounded-lg bg-neon-cyan text-space-900 font-display font-bold text-lg transition-all duration-300 hover:shadow-neon-cyan hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleStart}
            disabled={charges.length === 0}
          >
            <div className="flex items-center justify-center gap-2">
              <Play className="w-5 h-5" />
              <span>▶ 开始模拟</span>
            </div>
          </button>
        )}

        {(gameState === 'running' || gameState === 'paused') && (
          <button
            className={`w-full py-3 px-4 rounded-lg font-display font-bold text-lg transition-all duration-300 ${
              gameState === 'running'
                ? 'bg-neon-yellow text-space-900 hover:shadow-neon-yellow'
                : 'bg-neon-cyan text-space-900 hover:shadow-neon-cyan'
            }`}
            onClick={handlePause}
          >
            <div className="flex items-center justify-center gap-2">
              {gameState === 'running' ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>⏸ 暂停</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>▶ 继续</span>
                </>
              )}
            </div>
          </button>
        )}

        {(gameState === 'success' || gameState === 'failed') && (
          <button
            className="w-full py-3 px-4 rounded-lg bg-neon-cyan text-space-900 font-display font-bold text-lg transition-all duration-300 hover:shadow-neon-cyan hover:scale-[1.02] active:scale-[0.98]"
            onClick={onShowResult}
          >
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-5 h-5" />
              <span>📊 查看结果</span>
            </div>
          </button>
        )}

        <button
          className={`w-full py-2 px-4 rounded-lg border-2 border-neon-purple text-neon-purple font-mono transition-all duration-300 hover:bg-neon-purple/20 hover:shadow-neon-purple ${
            gameState === 'running' ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={handleReset}
          disabled={gameState === 'running'}
        >
          <div className="flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" />
            <span>🔄 重新开始</span>
          </div>
        </button>

        <button
          className="w-full py-2 px-4 rounded-lg border-2 border-gray-600 text-gray-400 font-mono transition-all duration-300 hover:border-gray-400 hover:text-gray-300"
          onClick={handleBack}
        >
          <div className="flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span>← 返回关卡</span>
          </div>
        </button>
      </div>

      <div className="space-y-2 pt-4 border-t border-gray-700">
        <p className="text-sm text-gray-400 font-mono">显示选项</p>

        <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-space-700/50 transition-colors">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-neon-cyan" />
            <span className="text-sm font-mono">路径预览</span>
          </div>
          <div
            className={`w-10 h-6 rounded-full transition-all duration-300 relative ${
              showPreview ? 'bg-neon-cyan' : 'bg-gray-600'
            }`}
            onClick={() => setShowPreview(!showPreview)}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
                showPreview ? 'left-5' : 'left-1'
              }`}
            />
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-space-700/50 transition-colors">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-neon-purple" />
            <span className="text-sm font-mono">电场线</span>
          </div>
          <div
            className={`w-10 h-6 rounded-full transition-all duration-300 relative ${
              showFieldLines ? 'bg-neon-purple' : 'bg-gray-600'
            }`}
            onClick={() => setShowFieldLines(!showFieldLines)}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
                showFieldLines ? 'left-5' : 'left-1'
              }`}
            />
          </div>
        </label>
      </div>

      <div className="pt-4 border-t border-gray-700">
        <button
          className="w-full py-2 px-4 rounded-lg border border-gray-600 text-gray-400 font-mono text-sm transition-all duration-300 hover:border-neon-cyan hover:text-neon-cyan"
          onClick={() => navigate('/help')}
        >
          <div className="flex items-center justify-center gap-2">
            <Home className="w-4 h-4" />
            <span>❓ 操作帮助</span>
          </div>
        </button>
      </div>
    </div>
  );
};
