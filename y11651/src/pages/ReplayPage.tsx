import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Download, Home, Copy, Check } from 'lucide-react';
import { getReplayById, downloadReplay, exportReplayToJSON } from '../utils/storage';
import { createEmptyGrid } from '../utils/gridUtils';
import { Button } from '../components/ui/Button';
import type { ReplayRecord, Cell } from '../types/game';

export const ReplayPage: React.FC = () => {
  const { replayId } = useParams<{ replayId: string }>();
  const navigate = useNavigate();
  
  const [replay, setReplay] = useState<ReplayRecord | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showJSON, setShowJSON] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (replayId) {
      const data = getReplayById(replayId);
      if (data) {
        setReplay(data);
      }
    }
  }, [replayId]);

  useEffect(() => {
    if (!isPlaying || !replay) return;

    const maxStep = replay.scanHistory.length + replay.actions.length;
    if (currentStep >= maxStep) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStep(prev => prev + 1);
    }, 800);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, replay]);

  const handleCopyJSON = () => {
    if (replay) {
      navigator.clipboard.writeText(exportReplayToJSON(replay));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getReplayGrid = (): Cell[][] => {
    if (!replay) return [];
    
    const grid = createEmptyGrid(replay.levelConfig.gridSize);
    
    const scansToShow = replay.scanHistory.slice(0, Math.min(currentStep, replay.scanHistory.length));
    
    scansToShow.forEach(scan => {
      const cell = grid[scan.position.y]?.[scan.position.x];
      if (cell) {
        cell.scanned = true;
        cell.echoStrength = scan.echoStrength;
        cell.hasNoise = scan.hasNoise;
        cell.noiseLevel = scan.noiseLevel;
      }
    });

    return grid;
  };

  if (!replay) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">回放记录不存在</div>
      </div>
    );
  }

  const grid = getReplayGrid();
  const isSuccess = replay.result === 'success';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" />
            返回首页
          </Button>
          <h1 className="text-2xl font-bold text-white">游戏回放</h1>
          <div className="w-24" />
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-4">
            <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700">
              <div className="grid gap-1 p-4 bg-slate-900/80 rounded-xl" style={{
                gridTemplateColumns: `repeat(${replay.levelConfig.gridSize}, minmax(0, 1fr))`,
              }}>
                {grid.map((row, y) =>
                  row.map((cell, x) => {
                    const isActual = x === replay.actualPosition.x && y === replay.actualPosition.y;
                    const isGuess = replay.guessPosition && x === replay.guessPosition.x && y === replay.guessPosition.y;
                    const isInTrajectory = replay.submarineTrajectory.some(p => p.x === x && p.y === y);
                    
                    let bgColor = 'bg-slate-800/50';
                    if (cell.scanned) {
                      if (cell.echoStrength >= 60) bgColor = 'bg-green-500/60';
                      else if (cell.echoStrength >= 30) bgColor = 'bg-yellow-500/50';
                      else bgColor = 'bg-slate-700/50';
                    }
                    if (isInTrajectory) bgColor = 'bg-red-500/20';
                    if (cell.hasNoise) bgColor = 'bg-red-500/30';

                    return (
                      <div
                        key={`${x}-${y}`}
                        className={`
                          aspect-square flex items-center justify-center
                          rounded-sm border border-slate-600/30
                          ${bgColor}
                        `}
                      >
                        {isActual && <span className="text-red-400 text-lg">●</span>}
                        {isGuess && !isActual && <span className="text-blue-400 text-lg">◆</span>}
                        {cell.scanned && cell.echoStrength > 0 && !isActual && !isGuess && (
                          <span className="text-xs text-white/70">{cell.echoStrength}</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-4 flex items-center justify-center gap-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentStep(0)}
                  disabled={currentStep === 0}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentStep(Math.min(currentStep + 1, replay.scanHistory.length + replay.actions.length))}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>

              <div className="mt-4">
                <input
                  type="range"
                  min="0"
                  max={replay.scanHistory.length + replay.actions.length}
                  value={currentStep}
                  onChange={(e) => setCurrentStep(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <p className="text-center text-slate-400 text-sm mt-1">
                  步骤: {currentStep} / {replay.scanHistory.length + replay.actions.length}
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={() => setShowJSON(!showJSON)}>
                {showJSON ? '隐藏数据' : '查看JSON数据'}
              </Button>
              <Button variant="secondary" onClick={handleCopyJSON}>
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? '已复制' : '复制'}
              </Button>
              <Button variant="secondary" onClick={() => downloadReplay(replay)}>
                <Download className="w-4 h-4 mr-2" />
                下载
              </Button>
            </div>

            {showJSON && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 overflow-auto max-h-96"
              >
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                  {exportReplayToJSON(replay)}
                </pre>
              </motion.div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-3">游戏信息</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">关卡</span>
                  <span className="text-white">{replay.levelConfig.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">结果</span>
                  <span className={isSuccess ? 'text-green-400' : 'text-red-400'}>
                    {isSuccess ? '成功' : '失败'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">得分</span>
                  <span className="text-cyan-400 font-bold">{replay.finalScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">扫描次数</span>
                  <span className="text-white">{replay.scanHistory.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-3">位置对比</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-400">猜测位置:</span>
                  <span className="text-blue-400 ml-2">
                    {replay.guessPosition ? `(${replay.guessPosition.x}, ${replay.guessPosition.y})` : '未提交'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">实际位置:</span>
                  <span className="text-red-400 ml-2">
                    ({replay.actualPosition.x}, {replay.actualPosition.y})
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-3">图例</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500/60 rounded" />
                  <span className="text-slate-300">强回波</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500/50 rounded" />
                  <span className="text-slate-300">弱回波</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500/30 rounded" />
                  <span className="text-slate-300">噪声/轨迹</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-400">●</span>
                  <span className="text-slate-300">实际位置</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">◆</span>
                  <span className="text-slate-300">猜测位置</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
