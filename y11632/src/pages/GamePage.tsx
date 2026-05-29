import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useGameTimer } from '@/hooks/useGameTimer';
import { getLevelById } from '@/data/levels';
import { bondLibrary } from '@/data/bonds';
import Header from '@/components/layout/Header';
import FeedbackToast from '@/components/layout/FeedbackToast';
import BondCard from '@/components/game/BondCard';
import DurationSlot from '@/components/game/DurationSlot';
import YieldCurveChart from '@/components/game/YieldCurveChart';
import CashFlowTimeline from '@/components/game/CashFlowTimeline';

export default function GamePage() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();

  const startLevel = useGameStore(state => state.startLevel);
  const placeBond = useGameStore(state => state.placeBond);
  const removeBond = useGameStore(state => state.removeBond);
  const adjustCurve = useGameStore(state => state.adjustCurve);
  const setCashFlowEstimate = useGameStore(state => state.setCashFlowEstimate);
  const pauseGame = useGameStore(state => state.pauseGame);
  const resumeGame = useGameStore(state => state.resumeGame);
  const resetGame = useGameStore(state => state.resetGame);

  const phase = useGameStore(state => state.phase);
  const placedBonds = useGameStore(state => state.placedBonds);
  const currentCurveDirection = useGameStore(state => state.currentCurveDirection);
  const cashFlowEstimates = useGameStore(state => state.cashFlowEstimates);
  const score = useGameStore(state => state.score);

  const { formattedTime } = useGameTimer();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedBondId, setSelectedBondId] = useState<string | null>(null);
  const [showPauseMenu, setShowPauseMenu] = useState(false);

  const level = levelId ? getLevelById(levelId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    if (levelId && phase === 'start') {
      startLevel(levelId);
    }
  }, [levelId, phase, startLevel]);

  useEffect(() => {
    if (phase === 'finished' && levelId) {
      navigate(`/result/${levelId}`);
    }
  }, [phase, levelId, navigate]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over) {
      const bondId = String(active.id);
      const slotId = String(over.id);
      placeBond(bondId, slotId);
    }
  };

  if (!level) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">关卡不存在</h2>
          <button
            onClick={() => navigate('/levels')}
            className="px-6 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl"
          >
            返回关卡选择
          </button>
        </div>
      </div>
    );
  }

  const activeBond = activeId ? bondLibrary.find(b => b.id === activeId) : null;
  const selectedBond = selectedBondId ? bondLibrary.find(b => b.id === selectedBondId) : null;
  const placedBondIds = placedBonds.map(pb => pb.bondId);

  const handleBondClick = (bondId: string) => {
    if (placedBondIds.includes(bondId)) return;
    setSelectedBondId(bondId === selectedBondId ? null : bondId);
  };

  const handleGiveUp = () => {
    resetGame();
    navigate('/levels');
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Header
        levelName={level.name}
        onPause={() => {
          pauseGame();
          setShowPauseMenu(true);
        }}
      />

      <FeedbackToast />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <h2 className="text-lg font-bold text-white mb-4">债券卡牌</h2>
                <p className="text-sm text-slate-400 mb-4">
                  拖拽债券到右侧对应的久期槽位
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {bondLibrary.map(bond => (
                    <BondCard
                      key={bond.id}
                      bond={bond}
                      isPlaced={placedBondIds.includes(bond.id)}
                      isDragging={activeId === bond.id}
                      onClick={() => handleBondClick(bond.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <h2 className="text-lg font-bold text-white mb-4">收益率曲线</h2>
                <p className="text-sm text-slate-400 mb-4">
                  调整曲线方向以匹配市场预期
                </p>
                <YieldCurveChart
                  points={level.yieldCurve.points}
                  currentDirection={currentCurveDirection}
                  expectedDirection={level.yieldCurve.direction}
                  onAdjust={adjustCurve}
                  disabled={phase !== 'playing'}
                />
              </div>

              {selectedBond && (
                <motion.div
                  className="bg-slate-800 rounded-2xl p-6 border border-amber-500/50"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white">现金流分析</h2>
                    <button
                      onClick={() => setSelectedBondId(null)}
                      className="p-1 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                  <CashFlowTimeline
                    bond={selectedBond}
                    estimatedWeights={cashFlowEstimates[selectedBond.id]}
                    onWeightsChange={(weights) => setCashFlowEstimate(selectedBond.id, weights)}
                    showHint={true}
                  />
                </motion.div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <h2 className="text-lg font-bold text-white mb-4">久期槽位</h2>
                <div className="space-y-3">
                  {level.slots.map(slot => {
                    const slotBondIds = placedBonds
                      .filter(pb => pb.slotId === slot.id)
                      .map(pb => pb.bondId);
                    return (
                      <DurationSlot
                        key={slot.id}
                        slot={slot}
                        placedBondIds={slotBondIds}
                        onRemoveBond={removeBond}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <h3 className="text-sm font-bold text-slate-400 mb-3">关卡目标</h3>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex justify-between">
                    <span>目标分数</span>
                    <span className="text-amber-400 font-bold">{level.targetScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>当前分数</span>
                    <span className={`font-bold ${score >= level.targetScore ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {score}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>剩余时间</span>
                    <span className="text-emerald-400 font-bold">{formattedTime}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="text-xs text-slate-500 mb-2">已放置债券</div>
                  <div className="flex gap-1">
                    {bondLibrary.map(bond => (
                      <div
                        key={bond.id}
                        className={`w-6 h-6 rounded ${
                          placedBondIds.includes(bond.id)
                            ? bond.category === 'short'
                              ? 'bg-emerald-500'
                              : bond.category === 'medium'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                            : 'bg-slate-600'
                        }`}
                        title={bond.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DragOverlay>
            {activeBond && (
              <div className="w-56 opacity-90">
                <BondCard bond={activeBond} isPlaced={false} isDragging />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </main>

      <AnimatePresence>
        {showPauseMenu && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="max-w-sm w-full bg-slate-800 rounded-2xl p-6 border border-slate-700"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h2 className="text-xl font-bold text-white mb-6 text-center">游戏暂停</h2>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    resumeGame();
                    setShowPauseMenu(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition-colors"
                >
                  <Play className="w-5 h-5" />
                  继续游戏
                </button>
                <button
                  onClick={handleGiveUp}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                  放弃本关
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
