import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import OrbitalCanvas from '@/components/OrbitalCanvas';
import {
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  RotateCcw,
  Flag,
  AlertTriangle,
} from 'lucide-react';

export default function ReplayPage() {
  const { history, steps, anomalies, restoreSnapshot } = useGameStore();
  const navigate = useNavigate();
  const [currentReplayStep, setCurrentReplayStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const maxStep = history.length - 1;

  useEffect(() => {
    if (!isPlaying || currentReplayStep >= maxStep) {
      setIsPlaying(false);
      return;
    }
    const timer = setInterval(() => {
      setCurrentReplayStep(prev => {
        const next = prev + 1;
        if (next >= maxStep) {
          setIsPlaying(false);
          return maxStep;
        }
        return next;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [isPlaying, currentReplayStep, maxStep]);

  useEffect(() => {
    restoreSnapshot(currentReplayStep);
  }, [currentReplayStep, restoreSnapshot]);

  const stepAnomalies = anomalies.filter(a => a.stepIndex === currentReplayStep);
  const stepInfo = steps[currentReplayStep - 1];

  return (
    <div className="h-full flex flex-col bg-space-900">
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Flag className="w-5 h-5 text-orbit-gold" />
          <h1 className="font-display text-lg tracking-wider text-orbit-gold">复盘回放</h1>
        </div>
        <button
          onClick={() => navigate('/settlement')}
          className="px-4 py-1.5 text-white/50 hover:text-white/80 transition-colors text-sm font-body"
        >
          返回结算
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <OrbitalCanvas />
        </div>

        <div className="w-80 flex flex-col border-l border-white/5 bg-space-800/30">
          <div className="p-4 border-b border-white/5">
            <h2 className="font-display text-xs text-white/40 tracking-wider mb-3">决策标注</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-body">
                <div className="w-3 h-3 rounded-full bg-orbit-gold/60" />
                <span className="text-white/60">当前步数</span>
                <span className="font-display text-orbit-gold ml-auto">
                  {currentReplayStep} / {maxStep}
                </span>
              </div>
              {stepInfo && (
                <>
                  <div className="flex items-center gap-2 text-sm font-body">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        stepInfo.resultType === 'success'
                          ? 'bg-fuel-green/60'
                          : 'bg-red-500/60'
                      }`}
                    />
                    <span className="text-white/60">操作结果</span>
                    <span
                      className={`ml-auto text-xs ${
                        stepInfo.resultType === 'success'
                          ? 'text-fuel-green'
                          : 'text-red-400'
                      }`}
                    >
                      {stepInfo.resultType === 'success'
                        ? '成功'
                        : stepInfo.resultType === 'window_missed'
                        ? '窗口错过'
                        : stepInfo.resultType === 'fuel_insufficient'
                        ? '燃料不足'
                        : '轨道相交'}
                    </span>
                  </div>
                  <div className="text-xs text-white/40 font-body mt-2 px-1">
                    {stepInfo.description}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-space-900/50 rounded p-2 text-center">
                      <div className="text-xs text-white/30">燃料消耗</div>
                      <div className="font-display text-sm text-white/70">
                        {stepInfo.fuelConsumed.toFixed(1)}
                      </div>
                    </div>
                    <div className="bg-space-900/50 rounded p-2 text-center">
                      <div className="text-xs text-white/30">得分变化</div>
                      <div
                        className={`font-display text-sm ${
                          stepInfo.scoreDelta >= 0 ? 'text-fuel-green' : 'text-red-400'
                        }`}
                      >
                        {stepInfo.scoreDelta >= 0 ? '+' : ''}{stepInfo.scoreDelta}
                      </div>
                    </div>
                  </div>
                </>
              )}
              {!stepInfo && currentReplayStep === 0 && (
                <div className="text-xs text-white/30 font-body">初始状态，尚未执行操作</div>
              )}
            </div>
          </div>

          {stepAnomalies.length > 0 && (
            <div className="p-4 border-b border-white/5">
              <h2 className="font-display text-xs text-red-400/80 tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                异常标记
              </h2>
              {stepAnomalies.map(a => (
                <div key={a.id} className="text-xs text-red-300/70 font-body">
                  {a.description}
                </div>
              ))}
            </div>
          )}

          <div className="p-4 border-b border-white/5">
            <h2 className="font-display text-xs text-white/40 tracking-wider mb-2">历史步骤</h2>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {steps.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentReplayStep(i + 1)}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs font-body transition-colors ${
                    currentReplayStep === i + 1
                      ? 'bg-orbit-gold/10 text-orbit-gold'
                      : 'text-white/40 hover:bg-white/5 hover:text-white/60'
                  }`}
                >
                  <span className="font-display mr-2">{i + 1}</span>
                  <span className={s.resultType === 'success' ? 'text-fuel-green/70' : 'text-red-400/70'}>
                    {s.targetPlanetName}
                  </span>
                  <span className="float-right text-white/20">
                    {s.scoreDelta >= 0 ? '+' : ''}{s.scoreDelta}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto p-4 border-t border-white/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/30 font-display">进度</span>
              <span className="text-xs text-white/50 font-display">
                {currentReplayStep} / {maxStep}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={maxStep}
              value={currentReplayStep}
              onChange={e => setCurrentReplayStep(Number(e.target.value))}
              className="w-full h-1 bg-space-700 rounded-lg appearance-none cursor-pointer accent-amber-500 mb-4"
            />
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentReplayStep(0)}
                className="p-2 text-white/40 hover:text-white/70 transition-colors"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentReplayStep(Math.max(0, currentReplayStep - 1))}
                className="p-2 text-white/40 hover:text-white/70 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-4 py-2 rounded font-display text-xs tracking-wider transition-colors ${
                  isPlaying
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-orbit-gold/20 text-orbit-gold'
                }`}
              >
                {isPlaying ? '暂停' : '播放'}
              </button>
              <button
                onClick={() => setCurrentReplayStep(Math.min(maxStep, currentReplayStep + 1))}
                className="p-2 text-white/40 hover:text-white/70 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentReplayStep(maxStep)}
                className="p-2 text-white/40 hover:text-white/70 transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => {
                const { restartGame } = useGameStore.getState();
                restartGame();
                navigate('/');
              }}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-space-700 text-white/50 rounded hover:text-white/80 transition-colors text-xs font-body"
            >
              <RotateCcw className="w-3 h-3" />
              重新开始
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
