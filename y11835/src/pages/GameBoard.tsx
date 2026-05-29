import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RotateCcw, Flag } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import StateCard from '@/components/StateCard';
import BasisCard from '@/components/BasisCard';
import ProbabilityBars from '@/components/ProbabilityBars';
import PendingZone from '@/components/PendingZone';
import ImportTimeline from '@/components/ImportTimeline';
import MeasureButton from '@/components/MeasureButton';
import FeedbackToast from '@/components/FeedbackToast';

export default function GameBoard() {
  const navigate = useNavigate();
  const store = useGameStore();

  useEffect(() => {
    store.initGame();
  }, []);

  const selectedState = store.states.find((s) => s.id === store.selectedStateId);
  const selectedBasis = store.bases.find((b) => b.id === store.selectedBasisId);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,212,255,0.08)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(0,255,136,0.05)_0%,_transparent_50%)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-4">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">ψ</span>
            </div>
            <h1 className="text-xl font-bold font-orbitron tracking-wider bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
              量子测量卡牌局
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={store.resetGame}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400
                bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重置
            </button>
            <button
              onClick={() => {
                store.endGame();
                navigate('/review');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-amber-300
                bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
            >
              <Flag className="w-3.5 h-3.5" />
              结束回溯
            </button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3 space-y-4">
            <div>
              <h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                量子态卡
              </h2>
              <div className="space-y-2">
                {store.states.map((state) => (
                  <StateCard
                    key={state.id}
                    state={state}
                    isSelected={store.selectedStateId === state.id}
                    onClick={() => store.selectState(state.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-6 space-y-4">
            <div>
              <h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                测量基选择
              </h2>
              <div className="flex gap-3">
                {store.bases.map((basis) => (
                  <BasisCard
                    key={basis.id}
                    basis={basis}
                    isSelected={store.selectedBasisId === basis.id}
                    onClick={() => store.selectBasis(basis.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                概率分布
              </h2>
              <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                <ProbabilityBars
                  probabilities={store.currentProbabilities}
                  eigenvectorLabels={
                    selectedBasis?.eigenvectors.map((ev) => ev.label) ?? ['|0⟩', '|1⟩']
                  }
                  basisColor={selectedBasis?.color ?? '#00d4ff'}
                  isNormalized={store.currentProbNormalized}
                  isMeasuring={store.isMeasuring}
                />
              </div>
            </div>

            <div>
              <h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                测量操作
              </h2>
              <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    当前: {selectedState?.label ?? '未选择态'} × {selectedBasis?.label ?? '未选择基'}
                  </span>
                  <span>已测量 {store.results.length} 次</span>
                </div>
                <MeasureButton
                  onClick={() => store.triggerMeasure()}
                  disabled={!store.selectedStateId || !store.selectedBasisId}
                  isMeasuring={store.isMeasuring}
                />
              </div>
            </div>

            {store.results.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  测量结果
                </h2>
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {store.results.map((result, i) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 bg-white/5 rounded-lg border border-white/10 px-3 py-2"
                    >
                      <span className="text-xs text-slate-500">#{i + 1}</span>
                      <span className="text-xs text-slate-400">
                        {store.states.find((s) => s.id === result.stateId)?.label}
                      </span>
                      <span className="text-xs text-slate-600">×</span>
                      <span className="text-xs text-slate-400">
                        {store.bases.find((b) => b.id === result.basisId)?.label}
                      </span>
                      <span className="text-xs text-slate-600">→</span>
                      <span className="text-sm font-bold text-cyan-300 font-orbitron">
                        {result.outcomeLabel}
                      </span>
                      <span className="text-[10px] text-slate-600 ml-auto">
                        seed: {result.randomSeed}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="col-span-3 space-y-4">
            <div className="bg-white/5 rounded-xl border border-white/10 p-3">
              <PendingZone warnings={store.warnings} onConfirm={store.confirmWarning} />
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 p-3">
              <ImportTimeline timeline={store.timeline} />
            </div>
          </div>
        </div>
      </div>

      <FeedbackToast feedbacks={store.feedbacks} onDismiss={store.dismissFeedback} />
    </div>
  );
}
