import { useState, useEffect } from 'react';
import { X, RotateCcw, SkipForward, Download, Play, FileText, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../game/engine';
import { saveGameRecord } from '../game/recorder';
import { exportAsText, exportAsJSON, generateReportContent } from '../utils/export';
import { FAIL_REASON_MESSAGES } from '../game/config';
import { formatTime } from '../utils/math';
import type { GameRecord } from '../game/types';

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplay: () => void;
  onNextLevel: () => void;
  hasNextLevel: boolean;
}

export const ResultModal = ({
  isOpen,
  onClose,
  onReplay,
  onNextLevel,
  hasNextLevel,
}: ResultModalProps) => {
  const navigate = useNavigate();
  const [recordSaved, setRecordSaved] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [replayFrame, setReplayFrame] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);

  const {
    currentLevel,
    score,
    stars,
    elapsedTime,
    initialEnergy,
    energy,
    charges,
    gameState,
    failReason,
    replayData,
    getGameRecord,
    maxFieldStrength,
  } = useGameStore();

  const success = gameState === 'success';
  const energyUsed = initialEnergy - energy;

  useEffect(() => {
    if (isOpen && success) {
      setRecordSaved(false);
      try {
        const record = getGameRecord();
        saveGameRecord(record);
        setRecordSaved(true);
      } catch (e) {
        console.error('Failed to save record:', e);
      }
    }
  }, [isOpen, success, getGameRecord]);

  useEffect(() => {
    if (isOpen && score > 0) {
      setAnimatedScore(0);
      const duration = 1500;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimatedScore(Math.round(score * eased));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [isOpen, score]);

  useEffect(() => {
    if (showReplay && replayData.length > 0) {
      const interval = setInterval(() => {
        setReplayFrame((prev) => {
          if (prev >= replayData.length - 1) {
            return 0;
          }
          return prev + 1;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [showReplay, replayData]);

  const handleExportReport = () => {
    const record = getGameRecord();
    exportAsText(record);
  };

  const handleExportJSON = () => {
    const record = getGameRecord();
    exportAsJSON(record);
  };

  const handleViewHistory = () => {
    navigate('/history');
  };

  if (!isOpen || !currentLevel) return null;

  const currentFrame = replayData[replayFrame];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="panel-glass p-8 mx-4">
          <button
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center mb-8">
            <div
              className={`text-4xl font-display font-bold mb-2 ${
                success ? 'text-success-green glow-text-cyan' : 'text-neon-pink glow-text-pink'
              }`}
            >
              {success ? '🎉 成功逃脱!' : '💥 逃脱失败'}
            </div>
            <div className="text-gray-400 font-mono">{currentLevel.name}</div>
          </div>

          {!success && failReason && (
            <div className="mb-6 p-4 bg-neon-pink/10 border border-neon-pink/50 rounded-lg">
              <div className="text-neon-pink font-mono font-bold text-center">
                失败原因: {FAIL_REASON_MESSAGES[failReason]}
              </div>
            </div>
          )}

          <div className="text-center mb-8">
            <div className="text-6xl font-display font-bold text-neon-yellow glow-text-cyan mb-2">
              {animatedScore}
            </div>
            <div className="text-sm text-gray-400 font-mono">最终得分</div>
            <div className="flex justify-center gap-2 mt-3">
              {[1, 2, 3].map((i) => (
                <Star
                  key={i}
                  className={`w-10 h-10 transition-all duration-500 ${
                    i <= stars
                      ? 'text-neon-yellow fill-neon-yellow'
                      : 'text-gray-600'
                  }`}
                  style={{
                    animationDelay: `${i * 200}ms`,
                    filter: i <= stars ? 'drop-shadow(0 0 10px #ffbe0b)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {showReplay && currentFrame && (
            <div className="mb-6 p-4 bg-space-900/50 rounded-lg border border-neon-cyan/30">
              <div className="text-center text-sm text-gray-400 font-mono mb-2">
                回放进度: {replayFrame + 1} / {replayData.length}
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm font-mono">
                <div className="text-center">
                  <span className="text-gray-500">X:</span>{' '}
                  <span className="text-neon-cyan">
                    {currentFrame.ballPosition.x.toFixed(0)}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-gray-500">Y:</span>{' '}
                  <span className="text-neon-cyan">
                    {currentFrame.ballPosition.y.toFixed(0)}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-gray-500">速度:</span>{' '}
                  <span className="text-neon-yellow">
                    {Math.sqrt(
                      currentFrame.ballVelocity.x ** 2 +
                        currentFrame.ballVelocity.y ** 2
                    ).toFixed(0)}
                  </span>
                </div>
              </div>
              <div className="w-full h-2 bg-space-700 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-neon-cyan transition-all duration-50"
                  style={{
                    width: `${((replayFrame + 1) / replayData.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-space-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-display font-bold text-neon-purple">
                {formatTime(elapsedTime)}
              </div>
              <div className="text-xs text-gray-400 font-mono">完成用时</div>
            </div>
            <div className="bg-space-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-display font-bold text-neon-yellow">
                {Math.round(energyUsed)}
              </div>
              <div className="text-xs text-gray-400 font-mono">能量消耗</div>
            </div>
            <div className="bg-space-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-display font-bold text-neon-pink">
                {charges.length}
              </div>
              <div className="text-xs text-gray-400 font-mono">电荷数量</div>
            </div>
            <div className="bg-space-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-display font-bold text-neon-cyan">
                {Math.round(maxFieldStrength)}
              </div>
              <div className="text-xs text-gray-400 font-mono">最大电场</div>
            </div>
          </div>

          <div className="bg-space-900/50 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-400 font-mono mb-2">评分说明</div>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">时间得分 (40%):</span>
                <span className="text-neon-cyan">
                  {Math.round(
                    Math.max(0, (1 - elapsedTime / currentLevel.timeLimit) * 40)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">能量得分 (30%):</span>
                <span className="text-neon-cyan">
                  {Math.round(
                    Math.max(0, (1 - energyUsed / initialEnergy) * 30)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">效率得分 (30%):</span>
                <span className="text-neon-cyan">
                  {Math.round(
                    Math.max(0, (1 - Math.min(charges.length, 10) / 10) * 30)
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-neon-cyan text-space-900 font-display font-bold transition-all duration-300 hover:shadow-neon-cyan"
              onClick={onReplay}
            >
              <RotateCcw className="w-4 h-4" />
              🔄 重玩
            </button>
            {success && hasNextLevel && (
              <button
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-success-green text-space-900 font-display font-bold transition-all duration-300 hover:shadow-neon-cyan"
                onClick={onNextLevel}
              >
                <SkipForward className="w-4 h-4" />
                ⏭ 下一关
              </button>
            )}
            {replayData.length > 0 && (
              <button
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 font-mono transition-all duration-300 ${
                  showReplay
                    ? 'border-neon-yellow bg-neon-yellow/20 text-neon-yellow'
                    : 'border-neon-purple text-neon-purple hover:bg-neon-purple/20'
                }`}
                onClick={() => setShowReplay(!showReplay)}
              >
                <Play className="w-4 h-4" />
                {showReplay ? '⏸ 停止回放' : '▶ 回放'}
              </button>
            )}
            <button
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 border-neon-cyan text-neon-cyan font-mono transition-all duration-300 hover:bg-neon-cyan/20"
              onClick={handleExportReport}
            >
              <FileText className="w-4 h-4" />
              📄 导出报告
            </button>
          </div>

          <div className="flex gap-3">
            <button
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-gray-600 text-gray-400 font-mono text-sm transition-all duration-300 hover:border-gray-400 hover:text-gray-300"
              onClick={handleExportJSON}
            >
              <Download className="w-4 h-4" />
              导出 JSON
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-gray-600 text-gray-400 font-mono text-sm transition-all duration-300 hover:border-gray-400 hover:text-gray-300"
              onClick={handleViewHistory}
            >
              📊 历史记录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
