import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, ScrollText } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useNavigate } from 'react-router-dom';
import CaseOverview from '@/components/CaseOverview';
import ConditionPanel from '@/components/ConditionPanel';
import ImportPanel from '@/components/ImportPanel';
import LogicCanvas from '@/components/LogicCanvas';
import Timer from '@/components/Timer';
import EvidencePanel from '@/components/EvidencePanel';
import ActionBar from '@/components/ActionBar';

export default function Home() {
  const { status, elapsedTime, totalTime, startGame, tick, conditions, placeCardOnCanvas } = useGameStore();
  const navigate = useNavigate();
  const [leftTab, setLeftTab] = useState<'case' | 'conditions' | 'import'>('conditions');
  const wasIdleOrPlaying = useRef(status === 'idle' || status === 'playing' || status === 'paused');

  useEffect(() => {
    if (status !== 'playing') return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, tick]);

  useEffect(() => {
    if (status === 'playing' && elapsedTime >= totalTime) {
      useGameStore.getState().finishGame();
    }
  }, [status, elapsedTime, totalTime]);

  useEffect(() => {
    if (status === 'finished' && wasIdleOrPlaying.current) {
      navigate('/settlement');
    }
    wasIdleOrPlaying.current = status === 'idle' || status === 'playing' || status === 'paused';
  }, [status, navigate]);

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const cardId = e.dataTransfer.getData('cardId');
      if (!cardId) return;
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left - 80;
      const y = e.clientY - rect.top - 28;
      placeCardOnCanvas(cardId, Math.max(10, x), Math.max(10, y));
    },
    [placeCardOnCanvas]
  );

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const isActive = status === 'playing' || status === 'paused';

  return (
    <div className="wood-grain h-screen w-screen flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-6 py-2.5 border-b border-court-border/50 bg-court-brown-dark/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <Gavel className="w-5 h-5 text-court-gold" />
          <h1 className="title-text text-xl font-bold text-court-gold tracking-wide">
            数学证明法庭
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {isActive && (
            <span className="flex items-center gap-1.5 text-court-parchment/40 text-xs">
              <ScrollText className="w-3.5 h-3.5" />
              <span className="math-text">步骤 {useGameStore.getState().stepCounter}</span>
            </span>
          )}
          <div
            className={`w-2 h-2 rounded-full ${status === 'playing' ? 'bg-court-green animate-pulse' : status === 'paused' ? 'bg-court-yellow' : 'bg-court-parchment/30'}`}
          />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-72 flex flex-col border-r border-court-border/40 shrink-0 bg-court-brown-dark/40">
          <div className="flex border-b border-court-border/30">
            {(['conditions', 'case', 'import'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={`flex-1 px-2 py-2 text-[11px] title-text font-bold tracking-wider transition-colors ${
                  leftTab === tab
                    ? 'text-court-gold border-b-2 border-court-gold bg-court-gold/5'
                    : 'text-court-parchment/40 hover:text-court-parchment/60'
                }`}
              >
                {tab === 'conditions' ? '条件卡' : tab === 'case' ? '案情' : '导入'}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={leftTab}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                {leftTab === 'conditions' && (
                  <div className="h-full p-2">
                    <ConditionPanel />
                  </div>
                )}
                {leftTab === 'case' && (
                  <div className="h-full p-2 overflow-y-auto">
                    <CaseOverview />
                  </div>
                )}
                {leftTab === 'import' && (
                  <div className="h-full p-2">
                    <ImportPanel />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </aside>

        <main className="flex-1 min-w-0 relative">
          <div
            className="absolute inset-2"
            onDrop={handleCanvasDrop}
            onDragOver={handleCanvasDragOver}
          >
            <LogicCanvas />
          </div>

          <div
            className={`absolute inset-0 z-50 flex items-center justify-center bg-court-brown-dark/92 backdrop-blur-md transition-all duration-500 ${status === 'idle' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="text-center space-y-6 max-w-lg px-8"
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                <Gavel className="w-12 h-12 text-court-gold" />
              </div>
              <h2 className="title-text text-3xl font-black text-court-gold gold-glow">
                {useGameStore.getState().theoremTitle}
              </h2>
              <p className="math-text text-sm text-court-parchment/60 leading-relaxed">
                {useGameStore.getState().theoremStatement}
              </p>
              <div className="border-t border-court-border/30 mx-8" />
              <div className="space-y-2.5 text-sm text-court-parchment/50">
                <p className="flex items-center justify-center gap-2">
                  <span className="text-court-gold">📋</span> 审查学生证明中的逻辑链路
                </p>
                <p className="flex items-center justify-center gap-2">
                  <span className="text-court-gold">🔗</span> 连接条件卡建立推理关系
                </p>
                <p className="flex items-center justify-center gap-2">
                  <span className="text-court-gold">⚡</span> 排除反例，判定证据有效性
                </p>
                <p className="flex items-center justify-center gap-2">
                  <span className="text-court-gold">⏱️</span> 限时 {Math.floor(totalTime / 60)} 分钟完成审判
                </p>
              </div>
              <button
                onClick={startGame}
                className="px-10 py-3.5 bg-court-gold text-court-brown-dark font-bold title-text text-lg rounded-lg hover:bg-court-gold-light transition-all shadow-lg shadow-court-gold/30 hover:shadow-court-gold/50 hover:scale-105 active:scale-95"
              >
                开始审判
              </button>
            </motion.div>
          </div>
        </main>

        <aside className="w-72 flex flex-col border-l border-court-border/40 shrink-0 bg-court-brown-dark/40">
          <div className="p-3 flex justify-center">
            <Timer />
          </div>

          <div className="flex-1 min-h-0 px-2 pb-1">
            <EvidencePanel />
          </div>

          <div className="p-3 border-t border-court-border/30">
            <ActionBar />
          </div>
        </aside>
      </div>
    </div>
  );
}
