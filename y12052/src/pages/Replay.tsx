import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  Download,
  Copy,
  Check,
  Home,
  Cloud,
  Wind,
  AlertTriangle,
  CloudRain,
} from 'lucide-react';
import { useGameStore, calculateCloudMatchRate, isWindCorrect, isWarningCorrect } from '@/store/gameStore';
import { RAINFALL_CALCULATION, GRID_SIZE } from '@/data/mockData';
import type { OperationRecord, RadarBlock } from '@/types/game';

const Replay = () => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [copied, setCopied] = useState(false);
  const {
    operationHistory,
    score,
    maxScore,
    errors,
    conflicts,
    radarBlocks,
    windDirection,
    warningLevel,
    warningTime,
    startTime,
    replayOperation,
    resetGame,
  } = useGameStore();

  const cloudMatchRate = calculateCloudMatchRate();
  const windCorrect = isWindCorrect();
  const warningCorrect = isWarningCorrect();
  const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;

  const getCurrentState = useCallback(() => {
    if (currentStep < 0 || currentStep >= operationHistory.length) {
      return {
        radarBlocks,
        windDirection,
        warningLevel,
        warningTime,
        operation: null,
      };
    }
    const op = operationHistory[currentStep];
    return {
      radarBlocks: op.gameStateSnapshot.radarBlocks,
      windDirection: op.gameStateSnapshot.windDirection,
      warningLevel: op.gameStateSnapshot.warningLevel,
      warningTime: op.gameStateSnapshot.warningTime,
      operation: op,
    };
  }, [currentStep, operationHistory, radarBlocks, windDirection, warningLevel, warningTime]);

  const currentState = getCurrentState();
  const placedBlocksMap = new Map(
    currentState.radarBlocks
      .filter((b) => b.isPlaced)
      .map((b) => [`${b.position.x}-${b.position.y}`, b])
  );

  const handlePlay = () => {
    if (currentStep >= operationHistory.length - 1) {
      setCurrentStep(-1);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleStepChange = (step: number) => {
    setIsPlaying(false);
    setCurrentStep(step);
    if (step >= 0) {
      replayOperation(step);
    }
  };

  const handlePrevStep = () => {
    setIsPlaying(false);
    const newStep = Math.max(-1, currentStep - 1);
    setCurrentStep(newStep);
    if (newStep >= 0) {
      replayOperation(newStep);
    }
  };

  const handleNextStep = () => {
    setIsPlaying(false);
    const newStep = Math.min(operationHistory.length - 1, currentStep + 1);
    setCurrentStep(newStep);
    if (newStep >= 0) {
      replayOperation(newStep);
    }
  };

  const generateReport = () => {
    const report = `
气象雷达拼图赛 - 评分报告
========================

【基本信息】
最终得分: ${score} / ${maxScore}
云团匹配率: ${cloudMatchRate.toFixed(0)}%
风向判断: ${windCorrect ? '正确' : '错误'}
预警设置: ${warningCorrect ? '正确' : '错误'}
操作次数: ${operationHistory.length}
游戏时长: ${Math.floor(duration / 60)}分${duration % 60}秒

【错误记录】
${errors.length === 0 ? '无错误' : errors.map((e, i) => `
${i + 1}. [${e.type}] ${e.description}
   扣分: -${e.deduction}分
   严重程度: ${e.severity}
`).join('')}

【数据冲突】
${conflicts.length === 0 ? '无冲突' : conflicts.map((c, i) => `
${i + 1}. ${c.sourceA} vs ${c.sourceB}
   ${c.description}
`).join('')}

${RAINFALL_CALCULATION}

【操作记录】
${operationHistory.map((op, i) => `
${i + 1}. [${op.type}] ${op.triggeredMatch ? '✓ 匹配成功' : '✗ 未匹配'}
   ${JSON.stringify(op.detail)}
`).join('')}
    `.trim();
    return report;
  };

  const handleCopyReport = async () => {
    const report = generateReport();
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReport = () => {
    const report = generateReport();
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `气象雷达拼图赛报告_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getOperationLabel = (op: OperationRecord) => {
    switch (op.type) {
      case 'drag':
        return `放置 ${(op.detail as { blockLabel?: string }).blockLabel || '雷达块'}`;
      case 'rotate':
        return `调整风向至 ${(op.detail as { direction?: number }).direction}°`;
      case 'warning':
        return `设置预警`;
    }
  };

  const getDirectionLabel = (deg: number) => {
    const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/result')}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>返回结果</span>
        </button>

        <h1 className="font-orbitron text-xl md:text-2xl font-bold text-white">操作回放与报告</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyReport}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? '已复制' : '复制报告'}</span>
          </button>
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-radar-blue to-cyan-500 rounded-lg text-white hover:shadow-lg hover:shadow-radar-blue/30 transition-all"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">下载报告</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-orbitron font-bold text-white">拼图状态预览</h3>
              <span className="text-sm text-gray-400">
                步骤 {currentStep + 1} / {operationHistory.length}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-6">
              {Array.from({ length: GRID_SIZE }).map((_, y) =>
                Array.from({ length: GRID_SIZE }).map((_, x) => {
                  const block = placedBlocksMap.get(`${x}-${y}`) as RadarBlock | undefined;
                  return (
                    <div
                      key={`${x}-${y}`}
                      className={`aspect-square rounded-xl border-2 transition-all duration-300 flex items-center justify-center ${
                        block
                          ? block.isCorrect
                            ? 'border-green-500 bg-green-500/20'
                            : 'border-red-500 bg-red-500/20'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      {block && (
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: block.color }}
                          >
                            {block.type === 'cloud' && <Cloud className="w-5 h-5" />}
                            {block.type === 'rain' && <CloudRain className="w-5 h-5" />}
                            {block.type === 'storm' && <AlertTriangle className="w-5 h-5" />}
                          </div>
                          <span className="text-xs text-gray-300 truncate max-w-full px-1">
                            {block.label}
                          </span>
                        </div>
                      )}
                      {!block && (
                        <span className="text-xs text-gray-600">
                          ({x + 1}, {y + 1})
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center mx-auto mb-1">
                  <Wind className="w-5 h-5 text-teal-400" />
                </div>
                <div className="text-sm text-gray-300">
                  {currentState.windDirection}°
                </div>
                <div className="text-xs text-gray-500">
                  {getDirectionLabel(currentState.windDirection)}风
                </div>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center mx-auto mb-1">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-sm text-gray-300">
                  {currentState.warningLevel}
                </div>
                <div className="text-xs text-gray-500">
                  {currentState.warningTime}小时前
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={handlePrevStep}
                disabled={currentStep <= -1}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={isPlaying ? handlePause : handlePlay}
                className="p-3 rounded-full bg-gradient-to-r from-radar-blue to-cyan-500 text-white hover:shadow-lg hover:shadow-radar-blue/30 transition-all"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              <button
                onClick={handleNextStep}
                disabled={currentStep >= operationHistory.length - 1}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            <input
              type="range"
              min="-1"
              max={operationHistory.length - 1}
              value={currentStep}
              onChange={(e) => handleStepChange(Number(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #00D4FF 0%, #00D4FF ${((currentStep + 1) / operationHistory.length) * 100}%, rgba(255,255,255,0.1) ${((currentStep + 1) / operationHistory.length) * 100}%, rgba(255,255,255,0.1) 100%)`,
              }}
            />

            <div className="mt-4 max-h-48 overflow-y-auto scrollbar-thin space-y-2">
              {operationHistory.map((op, index) => (
                <button
                  key={op.id}
                  onClick={() => handleStepChange(index)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    currentStep === index
                      ? 'bg-radar-blue/20 border border-radar-blue/50'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-6">
                        {index + 1}
                      </span>
                      <span className="text-sm text-white">
                        {getOperationLabel(op)}
                      </span>
                    </div>
                    {op.triggeredMatch && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                        匹配
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <h3 className="font-orbitron font-bold text-white mb-4">评分概览</h3>
            <div className="text-center mb-6">
              <div className="font-orbitron text-5xl font-bold text-radar-blue mb-2">
                {score}
              </div>
              <div className="text-sm text-gray-400">/ {maxScore} 分</div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">云团匹配</span>
                <span className={cloudMatchRate >= 80 ? 'text-green-400' : cloudMatchRate >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                  {cloudMatchRate.toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">风向判断</span>
                <span className={windCorrect ? 'text-green-400' : 'text-red-400'}>
                  {windCorrect ? '正确' : '错误'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">预警设置</span>
                <span className={warningCorrect ? 'text-green-400' : 'text-red-400'}>
                  {warningCorrect ? '正确' : '错误'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">操作次数</span>
                <span className="text-white">{operationHistory.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 max-h-80 overflow-y-auto scrollbar-thin">
            <h3 className="font-orbitron font-bold text-white mb-4">雨量推演口径</h3>
            <div className="text-xs text-gray-300 space-y-3 whitespace-pre-line">
              {RAINFALL_CALCULATION}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                resetGame();
                navigate('/');
              }}
              className="w-full px-6 py-3 bg-white/5 border border-white/20 rounded-xl font-medium text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Replay;
