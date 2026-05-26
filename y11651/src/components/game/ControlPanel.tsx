import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Clock, Target, SkipForward, RotateCcw, Play } from 'lucide-react';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';

interface ControlPanelProps {
  energy: number;
  maxEnergy: number;
  scanCost: number;
  cooldown: number;
  cooldownTime: number;
  turn: number;
  maxTurns: number;
  canScan: boolean;
  onEndTurn: () => void;
  onReset: () => void;
  onSubmitGuess: () => void;
  isGuessMode: boolean;
  onToggleGuessMode: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  energy,
  maxEnergy,
  scanCost,
  cooldown,
  cooldownTime,
  turn,
  maxTurns,
  canScan,
  onEndTurn,
  onReset,
  onSubmitGuess,
  isGuessMode,
  onToggleGuessMode
}) => {
  const cooldownPercentage = cooldown > 0 ? ((cooldownTime - cooldown) / cooldownTime) * 100 : 100;

  return (
    <motion.div
      className="bg-slate-800/90 rounded-xl p-4 border border-slate-700 space-y-4"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
        <Target className="w-5 h-5" />
        控制面板
      </h3>

      <div className="space-y-3">
        <div>
          <ProgressBar
            value={energy}
            max={maxEnergy}
            label="能量"
            showValue
            variant="energy"
          />
          <p className="text-xs text-slate-400 mt-1">
            每次扫描消耗: {scanCost} 能量
          </p>
        </div>

        <div>
          <div className="flex justify-between mb-1 text-sm">
            <span className="text-slate-300 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              冷却时间
            </span>
            <span className="font-mono text-slate-300">
              {cooldown > 0 ? `${cooldown} 回合` : '就绪'}
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${cooldownPercentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div>
          <ProgressBar
            value={turn}
            max={maxTurns}
            label="回合进度"
            showValue
            variant="turn"
          />
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-700">
        <div className="text-sm text-slate-300 mb-2">
          {canScan ? (
            <span className="text-green-400">✓ 可以进行扫描</span>
          ) : cooldown > 0 ? (
            <span className="text-yellow-400">⏳ 冷却中...</span>
          ) : (
            <span className="text-red-400">✗ 能量不足</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={isGuessMode ? 'success' : 'secondary'}
            size="sm"
            onClick={onToggleGuessMode}
            className="w-full"
          >
            <Target className="w-4 h-4 mr-1" />
            {isGuessMode ? '取消定位' : '定位目标'}
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            onClick={onEndTurn}
            className="w-full"
          >
            <SkipForward className="w-4 h-4 mr-1" />
            结束回合
          </Button>
        </div>

        {isGuessMode && (
          <Button
            variant="success"
            size="sm"
            onClick={onSubmitGuess}
            className="w-full"
          >
            <Play className="w-4 h-4 mr-1" />
            提交位置猜测
          </Button>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={onReset}
          className="w-full"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          重新开始
        </Button>
      </div>

      <div className="pt-2 border-t border-slate-700 text-xs text-slate-400 space-y-1">
        <p>• 左键点击网格进行扫描</p>
        <p>• 右键点击标记/取消标记可疑区域</p>
        <p>• 点击"定位目标"后选择最终位置</p>
      </div>
    </motion.div>
  );
};
