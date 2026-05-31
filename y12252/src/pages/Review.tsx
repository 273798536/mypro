import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Play, Pause, RotateCcw, ArrowLeft,
  Layers, Clock
} from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';
import type { ConditionCard, LogicLink, StepRecord } from '@/types/game';

function reconstructState(stepRecords: StepRecord[], upToIndex: number, baseConditions: ConditionCard[]) {
  const conditions = baseConditions.map(c => ({ ...c, isOnCanvas: false, position: { x: c.position.x, y: c.position.y } }));
  const logicLinks: LogicLink[] = [];

  for (let i = 0; i <= upToIndex && i < stepRecords.length; i++) {
    const step = stepRecords[i];
    if (step.actionType === 'place_card') {
      const match = step.actionDetail.match(/放置条件卡: (\S+) 到画布 \((\d+), (\d+)\)/);
      if (match) {
        const card = conditions.find(c => c.id === match[1]);
        if (card) {
          card.isOnCanvas = true;
          card.position = { x: parseInt(match[2]), y: parseInt(match[3]) };
        }
      }
    } else if (step.actionType === 'link') {
      const match = step.actionDetail.match(/连线: (\S+) → (\S+) \((\w+)\)/);
      if (match) {
        logicLinks.push({
          id: `replay-link-${i}`,
          fromCardId: match[1],
          toCardId: match[2],
          status: 'pending',
          rule: match[3] as LogicLink['rule'],
          stepIndex: i + 1,
        });
      }
    } else if (step.actionType === 'judge') {
      const match = step.actionDetail.match(/判定连线: (\S+) → (\w+)/);
      if (match) {
        const link = logicLinks.find(l => l.id === match[1] || l.fromCardId === match[1]);
        if (link) link.status = match[2] as 'valid' | 'invalid';
      }
    } else if (step.actionType === 'remove_link') {
      const match = step.actionDetail.match(/移除连线: (\S+)/);
      if (match) {
        const idx = logicLinks.findIndex(l => l.id === match[1]);
        if (idx !== -1) logicLinks.splice(idx, 1);
      }
    }
  }

  return { conditions, logicLinks };
}

export default function Review() {
  const navigate = useNavigate();
  const { stepRecords, conditions: baseConditions } = useGameStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playInterval, setPlayInterval] = useState<NodeJS.Timeout | null>(null);

  const totalSteps = stepRecords.length;
  const currentStep = stepRecords[currentIndex];

  const canvasState = useMemo(
    () => reconstructState(stepRecords, currentIndex, baseConditions),
    [stepRecords, currentIndex, baseConditions]
  );

  const goNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const goStart = useCallback(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const id = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
      setPlayInterval(id);
      return () => clearInterval(id);
    } else {
      if (playInterval) clearInterval(playInterval);
      setPlayInterval(null);
    }
  }, [isPlaying, totalSteps, playInterval]);

  useEffect(() => {
    if (currentIndex >= totalSteps - 1 && isPlaying) {
      setIsPlaying(false);
    }
  }, [currentIndex, totalSteps, isPlaying]);

  const actionTypeLabels: Record<string, string> = {
    link: '连线', exclude: '排除', import: '导入',
    judge: '判定', place_card: '放置', remove_link: '移除连线',
  };

  return (
    <div className="wood-grain h-screen flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-6 py-3 border-b court-divider bg-court-brown-dark/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settlement')}
            className="p-1.5 hover:bg-court-brown-light rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-court-parchment/60" />
          </button>
          <h1 className="title-text text-xl font-bold text-court-gold">审判复盘</h1>
        </div>
        <div className="flex items-center gap-2 text-court-parchment/60 text-sm">
          <Clock className="w-4 h-4" />
          <span className="math-text">
            步骤 {currentIndex + 1} / {totalSteps || 1}
          </span>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-80 flex flex-col border-r court-divider shrink-0 p-4 space-y-4">
          <div className="panel-border p-4 space-y-4">
            <h3 className="title-text text-court-gold font-bold text-sm flex items-center gap-2">
              <Layers className="w-4 h-4" />播放控制
            </h3>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={goStart}
                className="p-2 hover:bg-court-brown-light rounded transition-colors text-court-parchment/60 hover:text-court-gold"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={goPrev}
                disabled={currentIndex <= 0}
                className="p-2 hover:bg-court-brown-light rounded transition-colors text-court-parchment/60 hover:text-court-gold disabled:opacity-30"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={togglePlay}
                disabled={totalSteps === 0}
                className="p-3 bg-court-gold/20 border border-court-gold/50 rounded-full text-court-gold hover:bg-court-gold/30 transition-colors disabled:opacity-30"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              <button
                onClick={goNext}
                disabled={currentIndex >= totalSteps - 1}
                className="p-2 hover:bg-court-brown-light rounded transition-colors text-court-parchment/60 hover:text-court-gold disabled:opacity-30"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="relative h-2 bg-court-brown-dark rounded-full overflow-hidden">
                <div
                  className="absolute h-full bg-court-gold/60 rounded-full transition-all duration-300"
                  style={{ width: totalSteps > 0 ? `${((currentIndex + 1) / totalSteps) * 100}%` : '0%' }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-court-parchment/40">0</span>
                <span className="text-[10px] text-court-parchment/40">{totalSteps}</span>
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={Math.max(totalSteps - 1, 0)}
              value={currentIndex}
              onChange={e => setCurrentIndex(parseInt(e.target.value))}
              className="w-full accent-court-gold"
            />
          </div>

          <div className="panel-border p-4 flex-1 overflow-y-auto">
            <h3 className="title-text text-court-gold font-bold text-sm mb-3">步骤列表</h3>
            <div className="space-y-1">
              {stepRecords.map((step, i) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors',
                    i === currentIndex
                      ? 'bg-court-gold/20 border border-court-gold/40 text-court-gold'
                      : 'hover:bg-court-brown-light/50 text-court-parchment/60'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="math-text text-[10px] w-6 shrink-0">{i + 1}</span>
                    <span className={cn(
                      'px-1 py-0.5 rounded text-[10px]',
                      step.actionType === 'link' && 'bg-court-gold/10 text-court-gold/80',
                      step.actionType === 'judge' && 'bg-court-blue/10 text-court-blue/80',
                      step.actionType === 'exclude' && 'bg-court-green/10 text-court-green/80',
                      step.actionType === 'place_card' && 'bg-court-parchment/5 text-court-parchment/40',
                      step.actionType === 'remove_link' && 'bg-court-red/10 text-court-red/80',
                      step.actionType === 'import' && 'bg-court-orange/10 text-court-orange/80',
                    )}>
                      {actionTypeLabels[step.actionType] || step.actionType}
                    </span>
                    <span className="truncate">{step.actionDetail.substring(0, 20)}...</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-h-0 p-4 gap-4">
          <div className="panel-border p-5 shrink-0">
            <h3 className="title-text text-court-gold font-bold text-sm mb-3">当前步骤详情</h3>
            {currentStep ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="math-text text-court-parchment/40 text-sm">#{currentIndex + 1}</span>
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      currentStep.actionType === 'link' && 'bg-court-gold/20 text-court-gold',
                      currentStep.actionType === 'judge' && 'bg-court-blue/20 text-court-blue',
                      currentStep.actionType === 'exclude' && 'bg-court-green/20 text-court-green',
                      currentStep.actionType === 'place_card' && 'bg-court-parchment/10 text-court-parchment/70',
                      currentStep.actionType === 'remove_link' && 'bg-court-red/20 text-court-red',
                      currentStep.actionType === 'import' && 'bg-court-orange/20 text-court-orange',
                    )}>
                      {actionTypeLabels[currentStep.actionType] || currentStep.actionType}
                    </span>
                    <span className="math-text text-xs text-court-parchment/50">
                      时间: {currentStep.timestamp}s
                    </span>
                    {currentStep.scoreDelta !== 0 && (
                      <span className={cn(
                        'math-text text-sm font-bold',
                        currentStep.scoreDelta > 0 ? 'text-court-green' : 'text-court-red'
                      )}>
                        {currentStep.scoreDelta > 0 ? `+${currentStep.scoreDelta}` : currentStep.scoreDelta}
                      </span>
                    )}
                  </div>
                  <p className="math-text text-sm text-court-parchment/80 leading-relaxed">
                    {currentStep.actionDetail}
                  </p>
                  {currentStep.deductionReason && (
                    <div className="bg-court-red/10 border border-court-red/30 rounded px-3 py-2 text-xs text-court-red">
                      {currentStep.deductionReason}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            ) : (
              <p className="text-court-parchment/40 text-sm">无操作记录</p>
            )}
          </div>

          <div className="panel-border flex-1 overflow-hidden p-4 min-h-0">
            <h3 className="title-text text-court-gold font-bold text-sm mb-3">画布状态</h3>
            <div className="relative w-full h-[calc(100%-2rem)]">
              {canvasState.conditions.filter(c => c.isOnCanvas).length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-court-parchment/30 text-sm title-text">
                  当前步骤无画布内容
                </div>
              ) : (
                <div className="w-full h-full relative">
                  {canvasState.conditions.filter(c => c.isOnCanvas).map(c => (
                    <div
                      key={c.id}
                      className="absolute px-3 py-2 rounded bg-court-brown-light border border-court-gold/30 text-xs math-text max-w-48 shadow-lg shadow-court-brown-dark/50"
                      style={{ left: c.position.x, top: c.position.y }}
                    >
                      {c.content}
                    </div>
                  ))}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {canvasState.logicLinks.map(link => {
                      const from = canvasState.conditions.find(c => c.id === link.fromCardId);
                      const to = canvasState.conditions.find(c => c.id === link.toCardId);
                      if (!from?.isOnCanvas || !to?.isOnCanvas) return null;
                      return (
                        <line
                          key={link.id}
                          x1={from.position.x + 96}
                          y1={from.position.y + 16}
                          x2={to.position.x + 96}
                          y2={to.position.y + 16}
                          stroke={link.status === 'valid' ? '#27ae60' : link.status === 'invalid' ? '#c0392b' : '#c9a84c'}
                          strokeWidth={2}
                          strokeDasharray={link.status === 'pending' ? '6,3' : 'none'}
                        />
                      );
                    })}
                  </svg>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
