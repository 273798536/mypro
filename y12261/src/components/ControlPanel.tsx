import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Move, Layers, Play, RefreshCw } from 'lucide-react';
import { Axis, GamePhase } from '@/types/game';
import { useGameStore } from '@/store/gameStore';

interface ControlPanelProps {
  currentPhase: GamePhase;
  onStartGame: () => void;
  hasSession: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  currentPhase,
  onStartGame,
  hasSession,
}) => {
  const { confirmFunction, selectAxis, setInterval, setSliceCount, triggerSimulation, resetGame, currentSession } = useGameStore();
  
  const [intervalStart, setIntervalStart] = useState<string>('');
  const [intervalEnd, setIntervalEnd] = useState<string>('');
  const [sliceCount, setSliceCountLocal] = useState<number>(20);

  const correctInterval = currentSession?.gameFunction.correctInterval;

  const handleAxisSelect = (axis: Axis) => {
    selectAxis(axis);
  };

  const handleIntervalSubmit = () => {
    const start = parseFloat(intervalStart);
    const end = parseFloat(intervalEnd);
    if (!isNaN(start) && !isNaN(end)) {
      setInterval(start, end);
    }
  };

  const handleSliceCountChange = (value: number) => {
    setSliceCountLocal(value);
  };

  const handleSliceSubmit = () => {
    setSliceCount(sliceCount);
  };

  const handleTriggerSimulation = () => {
    triggerSimulation();
  };

  const handleReset = () => {
    resetGame();
    setIntervalStart('');
    setIntervalEnd('');
    setSliceCountLocal(20);
  };

  return (
    <div className="factory-panel p-5 space-y-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-factory-text flex items-center gap-2">
          <Layers className="text-primary-400" size={20} />
          控制面板
        </h3>
        {hasSession && (
          <button
            onClick={handleReset}
            className="text-xs text-factory-muted hover:text-danger-400 transition-colors flex items-center gap-1"
          >
            <RefreshCw size={12} />
            重置
          </button>
        )}
      </div>

      {!hasSession ? (
        <div className="text-center py-8">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-500/20 flex items-center justify-center">
              <Layers className="text-primary-400" size={32} />
            </div>
            <h4 className="text-xl font-bold text-factory-text mb-2">微积分切片工厂</h4>
            <p className="text-sm text-factory-muted max-w-xs mx-auto">
              通过模拟切片和旋转过程，直观理解旋转体体积的计算原理
            </p>
          </div>
          <button onClick={onStartGame} className="factory-btn-primary text-base px-8 py-3">
            开始新一局
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {currentPhase === 'function' && (
                <motion.div
                  key="function"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                    <p className="text-sm text-primary-200">
                      <span className="font-bold">当前函数：</span>
                      <code className="font-mono bg-factory-bg px-2 py-0.5 rounded ml-2">
                        {currentSession?.gameFunction.displayName}
                      </code>
                    </p>
                    <p className="text-xs text-factory-muted mt-2">
                      请仔细观察函数曲线形态，然后选择合适的旋转轴
                    </p>
                  </div>
                  <button
                    onClick={confirmFunction}
                    className="factory-btn-primary w-full"
                  >
                    确认函数，开始操作
                  </button>
                </motion.div>
              )}

              {currentPhase === 'axis' && (
                <motion.div
                  key="axis"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm text-factory-text mb-3">
                    <RotateCcw size={16} className="text-primary-400" />
                    <span className="font-medium">选择旋转轴</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleAxisSelect('x')}
                      className="factory-btn h-20 flex flex-col items-center justify-center gap-2"
                    >
                      <span className="text-2xl font-mono font-bold">X</span>
                      <span className="text-xs">绕 X 轴旋转</span>
                    </button>
                    <button
                      onClick={() => handleAxisSelect('y')}
                      className="factory-btn h-20 flex flex-col items-center justify-center gap-2"
                    >
                      <span className="text-2xl font-mono font-bold">Y</span>
                      <span className="text-xs">绕 Y 轴旋转</span>
                    </button>
                  </div>
                  
                  <p className="text-xs text-factory-muted text-center">
                    提示：考虑函数的形式和积分方法，选择最合适的旋转轴
                  </p>
                </motion.div>
              )}

              {currentPhase === 'interval' && (
                <motion.div
                  key="interval"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm text-factory-text mb-3">
                    <Move size={16} className="text-primary-400" />
                    <span className="font-medium">设置积分区间</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-factory-muted block mb-1">下限 a</label>
                      <input
                        type="number"
                        value={intervalStart}
                        onChange={(e) => setIntervalStart(e.target.value)}
                        placeholder={correctInterval?.[0].toString()}
                        className="input-field font-mono"
                        step="0.1"
                      />
                    </div>
                    <span className="text-factory-muted mt-5">→</span>
                    <div className="flex-1">
                      <label className="text-xs text-factory-muted block mb-1">上限 b</label>
                      <input
                        type="number"
                        value={intervalEnd}
                        onChange={(e) => setIntervalEnd(e.target.value)}
                        placeholder={correctInterval?.[1].toString()}
                        className="input-field font-mono"
                        step="0.1"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleIntervalSubmit}
                    disabled={!intervalStart || !intervalEnd}
                    className="factory-btn-primary w-full"
                  >
                    确认区间 [a, b]
                  </button>

                  <p className="text-xs text-factory-muted text-center">
                    注意：积分上限必须大于下限，否则将被自动修正
                  </p>
                </motion.div>
              )}

              {currentPhase === 'slice' && (
                <motion.div
                  key="slice"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm text-factory-text mb-3">
                    <Layers size={16} className="text-primary-400" />
                    <span className="font-medium">设置切片数量</span>
                  </div>

                  <div className="text-center mb-4">
                    <span className="text-4xl font-mono font-bold text-primary-400">
                      {sliceCount}
                    </span>
                    <span className="text-sm text-factory-muted ml-2">片</span>
                  </div>

                  <div className="px-2">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={sliceCount}
                      onChange={(e) => handleSliceCountChange(parseInt(e.target.value))}
                      className="w-full h-2 bg-factory-border rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #165DFF 0%, #165DFF ${(sliceCount - 1) / 99 * 100}%, #334155 ${(sliceCount - 1) / 99 * 100}%, #334155 100%)`
                      }}
                    />
                    <div className="flex justify-between text-xs text-factory-muted mt-1">
                      <span>1</span>
                      <span>50</span>
                      <span>100</span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg text-sm ${sliceCount < 10 ? 'bg-danger-500/10 border border-danger-500/30 text-danger-200' : 'bg-green-500/10 border border-green-500/30 text-green-200'}`}>
                    {sliceCount < 10 ? (
                      <span>⚠️ 切片数过少会导致较大误差</span>
                    ) : (
                      <span>✓ 切片数量合适，误差将在可控范围内</span>
                    )}
                  </div>

                  <button
                    onClick={handleSliceSubmit}
                    className="factory-btn-primary w-full"
                  >
                    确认切片数量
                  </button>
                </motion.div>
              )}

              {currentPhase === 'simulation' && (
                <motion.div
                  key="simulation"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm text-factory-text mb-3">
                    <Play size={16} className="text-warning-500" />
                    <span className="font-medium">准备模拟</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-factory-border">
                      <span className="text-factory-muted">旋转轴</span>
                      <span className="font-mono text-factory-text">
                        {currentSession?.playerInput.selectedAxis?.toUpperCase()}轴
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-factory-border">
                      <span className="text-factory-muted">积分区间</span>
                      <span className="font-mono text-factory-text">
                        [{currentSession?.playerInput.interval?.[0]}, {currentSession?.playerInput.interval?.[1]}]
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-factory-muted">切片数量</span>
                      <span className="font-mono text-factory-text">
                        {currentSession?.playerInput.sliceCount} 片
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-warning-500/10 border border-warning-500/30 rounded-lg">
                    <p className="text-sm text-warning-200 text-center">
                      点击下方按钮开始切片模拟与旋转生成
                    </p>
                  </div>

                  <button
                    onClick={handleTriggerSimulation}
                    className="factory-btn-primary w-full py-3 text-base"
                  >
                    <Play size={16} className="inline mr-2" />
                    开始模拟
                  </button>
                </motion.div>
              )}

              {currentPhase === 'result' && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center py-4"
                >
                  <p className="text-factory-muted mb-4">模拟已完成，请查看结果页面</p>
                  <button
                    onClick={handleReset}
                    className="factory-btn-primary"
                  >
                    开始新一局
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
  );
};
